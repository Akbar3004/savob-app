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
  User,
  Youtube,
  ArrowRight,
} from 'lucide-react';
import {
  Transaction,
  Channel,
  Payout,
  Payouts,
  PayoutFactors,
  payoutStage,
  isValidRate,
  formatUZS,
  formatUSD,
  MONTH_NAMES,
  txUZS,
  rateForMonth,
  isSettled,
  isSelfTx,
  SELF_CHANNEL_ID,
} from '../types';

interface PayoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  channels: Channel[];
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  /** payout = null bo'lsa, oyning to'lov ma'lumoti o'chiriladi (yana taxminiy bo'ladi). */
  onChange: (monthKey: string, payout: Payout | null) => void;
}

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `${MONTH_NAMES[mm] || mm} ${y}`;
};

const sanitize = (v: string) => v.replace(/[^\d.]/g, '');
const num = (v: string) => {
  const n = parseFloat(sanitize(v));
  return Number.isFinite(n) ? n : NaN;
};

export const PayoutsModal: React.FC<PayoutsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  channels,
  exchangeRate,
  payouts,
  factors,
  onChange,
}) => {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');
  const [actualDraft, setActualDraft] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);

  const channelName = (id?: string) => {
    if (!id || id === SELF_CHANNEL_ID) return 'Meniki';
    return channels.find((c) => c.id === id)?.name || 'Boshqa kanal';
  };
  const channelColor = (id?: string) => {
    if (!id || id === SELF_CHANNEL_ID) return '#6366f1';
    return channels.find((c) => c.id === id)?.color || '#f43f5e';
  };

  // Daromad kiritilgan oylar (yangisidan eskisiga)
  const months = useMemo(() => {
    const loggedUSD: { [m: string]: number } = {};
    const counts: { [m: string]: number } = {};
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      counts[m] = (counts[m] || 0) + 1;
      // Faqat USD tushumlar AdSense'dan keladi
      if (t.currency === 'USD') loggedUSD[m] = (loggedUSD[m] || 0) + t.amount;
    });

    return Object.keys(counts)
      .sort((a, b) => b.localeCompare(a))
      .map((m) => {
        const uzs = transactions
          .filter((t) => t.date.startsWith(m))
          .reduce((s, t) => s + txUZS(t, payouts, exchangeRate, factors), 0);
        return {
          key: m,
          loggedUSD: loggedUSD[m] || 0,
          count: counts[m],
          settled: isSettled(m, payouts),
          stage: payoutStage(m, payouts),
          rate: rateForMonth(m, payouts, exchangeRate),
          uzs,
          payoutDate: payouts[m]?.date,
          actualUSD: payouts[m]?.actualUSD,
          factor: factors[m],
        };
      });
  }, [transactions, payouts, exchangeRate, factors]);

  // AdSense summasi hali kiritilmagan oylar (Studio raqami bo'yicha kutilyapti)
  const awaitingAdSense = useMemo(
    () => months.filter((m) => m.stage === 'pending' && m.loggedUSD > 0),
    [months]
  );
  const awaitingAdSenseUSD = awaitingAdSense.reduce((s, m) => s + m.loggedUSD, 0);

  // AdSense'ga tushgan, lekin hali bankdan yechilmagan (kurs yo'q) oylar
  const awaitingRate = useMemo(() => months.filter((m) => m.stage === 'received'), [months]);
  const awaitingRateUSD = awaitingRate.reduce((s, m) => s + (m.actualUSD || 0), 0);

  /** Oyning kanallar kesimi — tuzatishdan oldingi va keyingi USD summalari. */
  const channelSplit = (monthKey: string, factor: number) => {
    const byChannel: { [id: string]: number } = {};
    transactions
      .filter((t) => t.date.startsWith(monthKey) && t.currency === 'USD')
      .forEach((t) => {
        const id = isSelfTx(t) ? SELF_CHANNEL_ID : t.channelId!;
        byChannel[id] = (byChannel[id] || 0) + t.amount;
      });
    return Object.keys(byChannel)
      .map((id) => ({
        id,
        name: channelName(id),
        color: channelColor(id),
        before: byChannel[id],
        after: byChannel[id] * factor,
      }))
      .sort((a, b) => b.before - a.before);
  };

  if (!isOpen) return null;

  const startEdit = (monthKey: string) => {
    setEditingMonth(monthKey);
    setRateDraft(payouts[monthKey]?.rate ? String(payouts[monthKey].rate) : '');
    setDateDraft(payouts[monthKey]?.date || '');
    setActualDraft(
      typeof payouts[monthKey]?.actualUSD === 'number' ? String(payouts[monthKey].actualUSD) : ''
    );
    setFetchNote(null);
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setRateDraft('');
    setDateDraft('');
    setActualDraft('');
    setFetchNote(null);
  };

  // Kurs va AdSense summasi MUSTAQIL: birini kiritib, ikkinchisini keyin qo'shsa bo'ladi.
  const save = (monthKey: string) => {
    let rate: number | undefined;
    if (rateDraft.trim() !== '') {
      const r = num(rateDraft);
      if (!isValidRate(r)) {
        setFetchNote("Kurs 0 dan katta son bo'lishi kerak (yoki bo'sh qoldiring).");
        return;
      }
      rate = r;
    }

    let actual: number | undefined;
    if (actualDraft.trim() !== '') {
      const a = num(actualDraft);
      if (!Number.isFinite(a) || a < 0) {
        setFetchNote("AdSense summasi manfiy bo'lmagan son bo'lishi kerak.");
        return;
      }
      actual = a;
    }

    if (rate === undefined && actual === undefined) {
      setFetchNote("Kamida bittasini kiriting: AdSense summasi yoki kurs.");
      return;
    }

    onChange(monthKey, {
      ...(rate !== undefined ? { rate } : {}),
      ...(dateDraft ? { date: dateDraft } : {}),
      ...(actual !== undefined ? { actualUSD: actual } : {}),
    });
    cancelEdit();
  };

  const clear = (monthKey: string) => {
    if (
      confirm(
        `${monthLabel(monthKey)} uchun to'lov ma'lumotini o'chirasizmi? Oy yana taxminiy hisoblanadi.`
      )
    ) {
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
                AdSense'ga kelgan haqiqiy summa bo'yicha qayta hisoblash
              </p>
            </div>
          </div>

          {/* Tushuntirish */}
          <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl bg-sky-50 border border-sky-100">
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-sky-900 font-medium">
              Bir oylik daromad ikki bosqichda aniq bo'ladi:{' '}
              <b>1) AdSense'ga pul tushadi</b> — summani kiriting, farq barcha kanallarga bir xil
              foizda taqsimlanib, ehson va sof foyda qayta hisoblanadi.{' '}
              <b>2) Bankdan yechasiz</b> — kursni kiriting, shunda oyning so'mdagi hisobi qotadi.
              Ikkalasi mustaqil: birini hozir, ikkinchisini keyin kiritsangiz bo'ladi. Kunlik
              yozuvlaringizga tegilmaydi.
            </p>
          </div>

          {/* AdSense'ga tushgan, bankdan yechilishi kutilayotgan pul */}
          {awaitingRateUSD > 0 && (
            <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">AdSense'da turibdi</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {awaitingRate.length} ta oy · bankdan yechilmagan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-indigo-600">{formatUSD(awaitingRateUSD)}</p>
                <p className="text-[10px] font-semibold text-indigo-400">
                  ≈ {formatUZS(awaitingRateUSD * exchangeRate)}
                </p>
              </div>
            </div>
          )}

          {/* AdSense summasi hali ma'lum bo'lmagan oylar */}
          {awaitingAdSenseUSD > 0 && (
            <div className="flex items-center justify-between p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">AdSense kutilmoqda</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {awaitingAdSense.length} ta oy · Studio bo'yicha
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-amber-600">{formatUSD(awaitingAdSenseUSD)}</p>
                <p className="text-[10px] font-semibold text-amber-400">
                  ≈ {formatUZS(awaitingAdSenseUSD * exchangeRate)}
                </p>
              </div>
            </div>
          )}

          {/* Oylar ro'yxati */}
          <div className="space-y-2.5">
            {months.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Hali tushum kiritilmagan.</p>
            )}

            {months.map((m) => {
              const adjusted = m.factor !== undefined;
              const diffUSD = adjusted ? (m.actualUSD || 0) - m.loggedUSD : 0;
              const diffPct = adjusted && m.loggedUSD > 0 ? (diffUSD / m.loggedUSD) * 100 : 0;

              return (
                <div
                  key={m.key}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    m.settled ? 'bg-emerald-50/60 border-emerald-100' : 'bg-slate-50 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800">{monthLabel(m.key)}</p>
                        {m.stage === 'settled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wide">
                            <Lock className="w-2.5 h-2.5" /> Yechildi
                          </span>
                        )}
                        {m.stage === 'received' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wide"
                            title="AdSense'ga pul tushgan. Kurs bankdan yechganingizda kiritiladi."
                          >
                            <Check className="w-2.5 h-2.5" /> AdSense keldi
                          </span>
                        )}
                        {m.stage === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wide">
                            <Clock className="w-2.5 h-2.5" /> Kutilmoqda
                          </span>
                        )}
                        {adjusted && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${
                              diffUSD < 0 ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-700'
                            }`}
                            title="AdSense bo'yicha tuzatish qo'llangan"
                          >
                            {diffPct >= 0 ? '+' : ''}
                            {diffPct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {adjusted ? (
                          <>
                            Studio {formatUSD(m.loggedUSD)} → AdSense{' '}
                            <b className="text-slate-600">{formatUSD(m.actualUSD || 0)}</b>
                          </>
                        ) : (
                          <>Studio {formatUSD(m.loggedUSD)}</>
                        )}
                        {' · '}
                        {m.count} ta yozuv
                        {m.stage === 'settled'
                          ? ` · kurs ${Math.round(m.rate)}${m.payoutDate ? ` · ${m.payoutDate}` : ''}`
                          : ` · kurs kutilmoqda (≈${Math.round(m.rate)})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-xs font-black text-slate-700 font-display mr-1">
                        {m.settled ? '' : '≈ '}
                        {formatUZS(m.uzs)}
                      </p>
                      <button
                        onClick={() => (editingMonth === m.key ? cancelEdit() : startEdit(m.key))}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title={m.settled ? "To'lovni tahrirlash" : "To'lov ma'lumotini kiritish"}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {m.settled && (
                        <button
                          onClick={() => clear(m.key)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="To'lov ma'lumotini o'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kanallar kesimi (tuzatish qo'llangan oylarda) */}
                  {adjusted && m.factor !== undefined && (
                    <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-1.5">
                      {channelSplit(m.key, m.factor).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5 font-bold text-slate-600">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            {c.id === SELF_CHANNEL_ID ? (
                              <User className="w-2.5 h-2.5 text-slate-400" />
                            ) : (
                              <Youtube className="w-2.5 h-2.5 text-slate-400" />
                            )}
                            {c.name}
                          </span>
                          <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                            <span className="text-slate-400 line-through">
                              {formatUSD(c.before)}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                            <b className="text-slate-700">{formatUSD(c.after)}</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tahrirlash paneli */}
                  {editingMonth === m.key && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-slate-200/70"
                    >
                      {/* 1-bosqich: AdSense'ga pul tushdi (oyning ~7-12 kunlari) */}
                      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                            1
                          </span>
                          <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                            AdSense'ga kelgan summa (USD)
                          </label>
                        </div>
                        <input
                          inputMode="decimal"
                          value={actualDraft}
                          onChange={(e) => setActualDraft(sanitize(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && save(m.key)}
                          placeholder={`Studio bo'yicha ${m.loggedUSD.toFixed(2)}`}
                          className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder-slate-300"
                        />
                        <p className="text-[9px] text-indigo-400 font-semibold mt-1">
                          Faqat shuni kiritsangiz ham bo'ladi — kurs keyin so'raladi.
                        </p>
                      </div>

                      {/* 2-bosqich: bankdan yechildi (oyning ~26-28 kunlari) */}
                      <div className="mt-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                            2
                          </span>
                          <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                            Bankdan yechilganda
                          </label>
                          <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal">
                            (ixtiyoriy)
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1">
                            <input
                              type="date"
                              value={dateDraft}
                              onChange={(e) => setDateDraft(e.target.value)}
                              className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              inputMode="decimal"
                              value={rateDraft}
                              onChange={(e) => setRateDraft(sanitize(e.target.value))}
                              onKeyDown={(e) => e.key === 'Enter' && save(m.key)}
                              placeholder="1 USD = ? so'm"
                              className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 placeholder-slate-300"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-emerald-600/70 font-semibold mt-1">
                          Kurs kiritilgach bu oyning so'mdagi hisobi qotadi.
                        </p>
                      </div>

                      {/* Jonli oldindan ko'rish */}
                      {actualDraft.trim() !== '' &&
                        Number.isFinite(num(actualDraft)) &&
                        m.loggedUSD > 0 && (
                          <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 mb-2">
                              Studio {formatUSD(m.loggedUSD)} → AdSense{' '}
                              {formatUSD(num(actualDraft))}{' '}
                              <span
                                className={
                                  num(actualDraft) < m.loggedUSD ? 'text-rose-500' : 'text-emerald-600'
                                }
                              >
                                ({num(actualDraft) >= m.loggedUSD ? '+' : ''}
                                {(((num(actualDraft) - m.loggedUSD) / m.loggedUSD) * 100).toFixed(1)}%)
                              </span>
                            </p>
                            <div className="space-y-1">
                              {channelSplit(m.key, num(actualDraft) / m.loggedUSD).map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between text-[10px]"
                                >
                                  <span className="flex items-center gap-1.5 font-bold text-slate-600">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: c.color }}
                                    />
                                    {c.name}
                                  </span>
                                  <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                                    <span className="text-slate-400 line-through">
                                      {formatUSD(c.before)}
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                                    <b className="text-slate-700">{formatUSD(c.after)}</b>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
