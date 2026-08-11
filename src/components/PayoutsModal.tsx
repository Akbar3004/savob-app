import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Banknote,
  Check,
  Clock,
  Lock,
  Edit2,
  RefreshCw,
  Trash2,
  Info,
} from 'lucide-react';
import {
  Transaction,
  Payouts,
  formatUZS,
  formatUSD,
  MONTH_NAMES,
  txUZS,
  rateForMonth,
  isSettled,
} from '../types';

interface PayoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  exchangeRate: number;
  payouts: Payouts;
  /** rate = null bo'lsa, oyning to'lov kursi o'chiriladi (yana taxminiy bo'ladi). */
  onChange: (monthKey: string, rate: number | null, date?: string) => void;
}

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `${MONTH_NAMES[mm] || mm} ${y}`;
};

const sanitize = (v: string) => v.replace(/[^\d.]/g, '');

export const PayoutsModal: React.FC<PayoutsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  payouts,
  onChange,
}) => {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);

  // Daromad kiritilgan oylar (yangisidan eskisiga)
  const months = useMemo(() => {
    const map: { [m: string]: { usd: number; count: number } } = {};
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      if (!map[m]) map[m] = { usd: 0, count: 0 };
      // Faqat USD tushumlar kursga bog'liq
      if (t.currency === 'USD') map[m].usd += t.amount;
      map[m].count += 1;
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((m) => {
        const settled = isSettled(m, payouts);
        const rate = rateForMonth(m, payouts, exchangeRate);
        const uzs = transactions
          .filter((t) => t.date.startsWith(m))
          .reduce((s, t) => s + txUZS(t, payouts, exchangeRate), 0);
        return {
          key: m,
          usd: map[m].usd,
          count: map[m].count,
          settled,
          rate,
          uzs,
          payoutDate: payouts[m]?.date,
        };
      });
  }, [transactions, payouts, exchangeRate]);

  const pending = useMemo(
    () => months.filter((m) => !m.settled && m.usd > 0),
    [months]
  );
  const pendingUSD = pending.reduce((s, m) => s + m.usd, 0);

  if (!isOpen) return null;

  const startEdit = (monthKey: string) => {
    setEditingMonth(monthKey);
    setRateDraft(payouts[monthKey]?.rate ? String(payouts[monthKey].rate) : '');
    setDateDraft(payouts[monthKey]?.date || '');
    setFetchNote(null);
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setRateDraft('');
    setDateDraft('');
    setFetchNote(null);
  };

  const save = (monthKey: string) => {
    const value = parseFloat(sanitize(rateDraft));
    if (!Number.isFinite(value) || value <= 0) {
      setFetchNote("Kurs 0 dan katta son bo'lishi kerak.");
      return;
    }
    onChange(monthKey, value, dateDraft || undefined);
    cancelEdit();
  };

  const clear = (monthKey: string) => {
    if (confirm(`${monthLabel(monthKey)} uchun to'lov kursini o'chirasizmi? Oy yana taxminiy hisoblanadi.`)) {
      onChange(monthKey, null);
      cancelEdit();
    }
  };

  // CBU'dan tanlangan sanadagi kursni olishga urinish.
  // Muvaffaqiyatsiz bo'lsa — foydalanuvchi qo'lda kiritadi (hech narsa buzilmaydi).
  const fetchRateForDate = async () => {
    if (!dateDraft) {
      setFetchNote("Avval to'lov sanasini tanlang.");
      return;
    }
    setFetching(true);
    setFetchNote(null);
    try {
      const res = await fetch(`/api/rate?date=${encodeURIComponent(dateDraft)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.rate) {
        setRateDraft(String(data.rate));
        setFetchNote(`CBU kursi olindi: ${data.rate}`);
      } else {
        setFetchNote(data?.error || "Kurs topilmadi — qo'lda kiriting.");
      }
    } catch {
      setFetchNote("Tarmoq xatosi — kursni qo'lda kiriting.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-xl w-full p-6 md:p-7 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh] relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sarlavha */}
          <div className="flex items-center gap-3 mb-5 relative z-10 border-b border-slate-100 pb-4 pr-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-100">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">To'lovlar va kurs</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Har bir ish oyi o'z to'lov kursi bilan hisoblanadi
              </p>
            </div>
          </div>

          {/* Tushuntirish */}
          <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl bg-sky-50 border border-sky-100">
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-sky-900 font-medium">
              Daromad ishlangan oydan keyin to'lanadi (masalan, iyul puli avgust oxirida keladi)
              va so'mga <b>o'sha kundagi kurs</b> bilan aylantiriladi. To'lov kelgach kursni
              kiriting — o'sha oyning barcha hisoblari <b>qotib qoladi</b> va kurs keyin
              o'zgarsa ham o'zgarmaydi. Kurs kiritilmagan oylar joriy kurs bo'yicha
              <b> taxminiy</b> ko'rsatiladi.
            </p>
          </div>

          {/* Kutilayotgan to'lovlar */}
          {pendingUSD > 0 && (
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Kutilayotgan to'lovlar</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {pending.length} ta oy · kursi hali kiritilmagan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-amber-600">{formatUSD(pendingUSD)}</p>
                <p className="text-[10px] font-semibold text-amber-400">
                  ≈ {formatUZS(pendingUSD * exchangeRate)}
                </p>
              </div>
            </div>
          )}

          {/* Oylar ro'yxati */}
          <div className="space-y-2.5">
            {months.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">
                Hali tushum kiritilmagan.
              </p>
            )}

            {months.map((m) => (
              <div
                key={m.key}
                className={`rounded-2xl border p-3.5 transition-all ${
                  m.settled
                    ? 'bg-emerald-50/60 border-emerald-100'
                    : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{monthLabel(m.key)}</p>
                      {m.settled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wide">
                          <Lock className="w-2.5 h-2.5" /> To'langan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wide">
                          <Clock className="w-2.5 h-2.5" /> Taxminiy
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {formatUSD(m.usd)} · {m.count} ta yozuv · kurs {Math.round(m.rate)}
                      {m.payoutDate ? ` · ${m.payoutDate}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right mr-1">
                      <p className="text-xs font-black text-slate-700 font-display">
                        {m.settled ? '' : '≈ '}
                        {formatUZS(m.uzs)}
                      </p>
                    </div>
                    <button
                      onClick={() => (editingMonth === m.key ? cancelEdit() : startEdit(m.key))}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      title={m.settled ? 'Kursni tahrirlash' : "To'lov kursini kiritish"}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {m.settled && (
                      <button
                        onClick={() => clear(m.key)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Kursni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tahrirlash paneli */}
                {editingMonth === m.key && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-slate-200/70"
                  >
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          To'lov sanasi
                        </label>
                        <input
                          type="date"
                          value={dateDraft}
                          onChange={(e) => setDateDraft(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          1 USD = ? so'm
                        </label>
                        <input
                          inputMode="decimal"
                          value={rateDraft}
                          onChange={(e) => setRateDraft(sanitize(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && save(m.key)}
                          placeholder="12340"
                          className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder-slate-300"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={fetchRateForDate}
                        disabled={fetching || !dateDraft}
                        className="flex items-center gap-1.5 py-2 px-3 bg-white border border-slate-200 text-slate-600 font-bold text-[11px] rounded-xl transition-all active:scale-95 disabled:opacity-40 hover:border-indigo-200 hover:text-indigo-600"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
                        CBU dan olish
                      </button>
                      <button
                        onClick={() => save(m.key)}
                        className="flex items-center gap-1.5 py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-200/50"
                      >
                        <Check className="w-3.5 h-3.5" /> Saqlash
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="py-2 px-3 bg-slate-100 text-slate-500 font-bold text-[11px] rounded-xl transition-all active:scale-95"
                      >
                        Bekor
                      </button>
                    </div>

                    {fetchNote && (
                      <p className="text-[10px] font-semibold text-slate-500 mt-2">{fetchNote}</p>
                    )}

                    {rateDraft && parseFloat(sanitize(rateDraft)) > 0 && (
                      <p className="text-[10px] font-semibold text-slate-400 mt-2">
                        Shu kurs bilan:{' '}
                        <b className="text-slate-600">
                          {formatUZS(
                            transactions
                              .filter((t) => t.date.startsWith(m.key))
                              .reduce(
                                (s, t) =>
                                  s +
                                  (t.currency === 'USD'
                                    ? t.amount * parseFloat(sanitize(rateDraft))
                                    : t.amount),
                                0
                              )
                          )}
                        </b>
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
