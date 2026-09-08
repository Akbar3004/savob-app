import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, LogOut, Youtube, Wallet, TrendingUp, CalendarRange, FileDown, Check, Info, Target, Edit3 } from 'lucide-react';
import {
  Transaction,
  Channel,
  MonthlyStats,
  payoutFactors,
  txUZS,
  txUSD,
  isSettled,
  hasActual,
  rateForMonth,
  formatUZS,
  formatUSD,
  formatCompact,
  MONTH_NAMES,
} from './types';
import { appMonthKey } from './appDate';
import { MonthlyChart } from './components/MonthlyChart';
import { TransactionList } from './components/TransactionList';
import { ExportPDFModal } from './components/ExportPDFModal';
import { saveGuestGoals, type GuestData } from './services/share';

interface GuestAppProps {
  guestHash: string;
  data: GuestData;
  onLogout: () => void;
}

/**
 * MEHMON EKRANI — kanal egasi o'z kanalini ko'rish uchun.
 *
 * Bu ekranda ma'lumot O'ZGARTIRADIGAN birorta yo'l yo'q: tushum qo'shish,
 * tahrirlash, o'chirish, kanal/to'lov/kurs sozlash — hech biri yo'q.
 * Yagona yoziladigan narsa — mehmonning O'Z maqsadi, u ham alohida
 * ulashish yozuviga boradi, egasining ma'lumotiga emas.
 *
 * Ma'lumot allaqachon serverda filtrlangan: bu yerga faqat shu kanalning
 * yozuvlari keladi.
 */
export const GuestApp: React.FC<GuestAppProps> = ({ guestHash, data, onLogout }) => {
  const [period, setPeriod] = useState<string>(appMonthKey());
  const [goals, setGoals] = useState(data.goals || {});
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  // Mehmon kanali "meniki, ehsonsiz" sifatida qaraladi — ehson ushlanmaydi
  const channels: Channel[] = useMemo(
    () => [{ id: data.channelId, name: data.label, color: data.color, owned: true, charity: false }],
    [data.channelId, data.label, data.color]
  );

  const txs = data.transactions;
  const factors = useMemo(() => payoutFactors(txs, data.payouts), [txs, data.payouts]);
  const toUZS = (t: Transaction) => txUZS(t, data.payouts, data.exchangeRate, factors);
  const toUSD = (t: Transaction) => txUSD(t, data.payouts, data.exchangeRate, factors);

  const periods = useMemo(() => {
    const set = new Set(txs.map((t) => t.date.slice(0, 7)));
    set.add(appMonthKey());
    return (Array.from(set) as string[]).sort((a, b) => b.localeCompare(a));
  }, [txs]);

  useEffect(() => {
    if (!periods.includes(period) && periods.length) setPeriod(periods[0]);
  }, [periods, period]);

  const inPeriod = useMemo(
    () => (period === 'all' ? txs : txs.filter((t) => t.date.startsWith(period))),
    [txs, period]
  );

  const totalUZS = inPeriod.reduce((s, t) => s + toUZS(t), 0);
  const totalUSD = inPeriod.reduce((s, t) => s + toUSD(t), 0);

  const year = period === 'all' ? null : period.slice(0, 4);
  const yearTx = year ? txs.filter((t) => t.date.startsWith(year)) : txs;
  const yearUZS = yearTx.reduce((s, t) => s + toUZS(t), 0);
  const yearUSD = yearTx.reduce((s, t) => s + toUSD(t), 0);

  // Grafik uchun oylik jamlar. Ehson yo'q, shuning uchun 0.
  const monthly: MonthlyStats[] = useMemo(() => {
    const g: { [m: string]: { uzs: number; usd: number; n: number } } = {};
    txs.forEach((t) => {
      const m = t.date.slice(0, 7);
      (g[m] ||= { uzs: 0, usd: 0, n: 0 });
      g[m].uzs += toUZS(t);
      g[m].usd += toUSD(t);
      g[m].n += 1;
    });
    return Object.keys(g)
      .sort()
      .map((m) => {
        const [y, mm] = m.split('-');
        return {
          monthKey: m,
          monthName: MONTH_NAMES[mm] ? `${MONTH_NAMES[mm]} ${y}` : m,
          totalUZS: g[m].uzs,
          totalUSD: g[m].usd,
          charityUZS: 0,
          charityUSD: 0,
          netUZS: g[m].uzs,
          netUSD: g[m].usd,
          transactionCount: g[m].n,
        };
      });
  }, [txs, data.payouts, data.exchangeRate, factors]);

  const monthLabel = (m: string) =>
    m === 'all' ? 'Barcha davrlar' : `${MONTH_NAMES[m.slice(5, 7)] || m} ${m.slice(0, 4)}`;

  // To'lov holati — mehmon pulini qachon va qaysi kurs bilan olishini bilishi kerak
  const payoutNote = useMemo(() => {
    if (period === 'all') return null;
    const p = data.payouts?.[period];
    if (isSettled(period, data.payouts)) {
      return {
        tone: 'done' as const,
        text: `To'langan · kurs ${rateForMonth(period, data.payouts, data.exchangeRate)} so'm${
          p?.date ? ` · ${p.date}` : ''
        }`,
      };
    }
    if (hasActual(period, data.payouts)) {
      return { tone: 'partial' as const, text: "AdSense'ga tushgan, bankdan hali yechilmagan — so'mdagi summa taxminiy" };
    }
    return { tone: 'pending' as const, text: `To'lov hali kelmagan — so'mdagi summa joriy kurs (${data.exchangeRate}) bo'yicha taxminiy` };
  }, [period, data.payouts, data.exchangeRate]);

  const goal = period === 'all' ? 0 : goals[period] || 0;
  const goalPct = goal > 0 ? Math.min((totalUZS / goal) * 100, 100) : 0;

  const saveGoal = async () => {
    const value = parseInt(goalDraft.replace(/\D/g, ''), 10);
    const next = { ...goals };
    if (!value || value <= 0) delete next[period];
    else next[period] = value;
    setSaving(true);
    setGoals(next);
    await saveGuestGoals(guestHash, next);
    setSaving(false);
    setEditingGoal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-pattern text-slate-800 flex flex-col font-sans pb-16">
      {/* Sarlavha */}
      <header className="glass sticky top-0 z-40 border-b border-white/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: data.color || '#0ea5e9' }}
            >
              <Youtube className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black font-display tracking-tight truncate">
                {data.label}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <Eye className="w-3 h-3" /> Faqat ko'rish
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsPdfOpen(true)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200/60 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="PDF yuklab olish"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl border border-slate-200/60 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 w-full space-y-6">
        {/* Davr tanlash */}
        <div className="flex items-center gap-2 p-3 bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm">
          <CalendarRange className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="hidden sm:inline text-xs font-bold text-slate-500 uppercase tracking-wider">Davr:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="min-w-0 pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">Barcha davrlar</option>
            {periods.map((p) => (
              <option key={p} value={p}>{monthLabel(p)}</option>
            ))}
          </select>
        </div>

        {/* Summalar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-3d p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {monthLabel(period)} · Jami
                </p>
                <p className="font-display font-black text-[26px] leading-none tracking-tight text-slate-800 tabular-nums">
                  {formatUZS(totalUZS)}
                </p>
                <p className="text-sm font-bold text-indigo-500 mt-1.5 tabular-nums">{formatUSD(totalUSD)}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">{inPeriod.length} ta kirim</p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            {payoutNote && (
              <div
                className={`mt-4 flex items-start gap-2 p-2.5 rounded-xl text-[10.5px] font-semibold leading-snug ${
                  payoutNote.tone === 'done'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : payoutNote.tone === 'partial'
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                }`}
              >
                {payoutNote.tone === 'done' ? (
                  <Check className="w-3.5 h-3.5 shrink-0 mt-px" />
                ) : (
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                )}
                <span>{payoutNote.text}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-3d p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {year ? `${year} yil` : 'Barcha davr'} · Jami
                </p>
                <p className="font-display font-black text-[26px] leading-none tracking-tight text-slate-800 tabular-nums">
                  {formatUZS(yearUZS)}
                </p>
                <p className="text-sm font-bold text-emerald-500 mt-1.5 tabular-nums">{formatUSD(yearUSD)}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">{yearTx.length} ta kirim</p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Maqsad — mehmonning O'ZINIKI */}
        {period !== 'all' && (
          <div className="card-3d p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-slate-800 text-sm">Oylik maqsadim</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {monthLabel(period)} · faqat siz ko'rasiz
                  </p>
                </div>
              </div>
              {!editingGoal && (
                <button
                  onClick={() => {
                    setGoalDraft(goal ? String(goal) : '');
                    setEditingGoal(true);
                  }}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 text-[11px] font-bold transition-all"
                >
                  <Edit3 className="w-3 h-3" /> {goal ? "O'zgartirish" : 'Belgilash'}
                </button>
              )}
            </div>

            {editingGoal ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={goalDraft.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  onChange={(e) => setGoalDraft(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  placeholder="Masalan: 5 000 000"
                  className="flex-1 min-w-[160px] text-sm font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={saveGoal}
                  disabled={saving}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl transition-all"
                >
                  {saving ? 'Saqlanmoqda' : 'Saqlash'}
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="py-2.5 px-3 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-xl"
                >
                  Bekor
                </button>
              </div>
            ) : goal > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="font-display font-black text-lg text-slate-800 tabular-nums">
                    {formatCompact(totalUZS)}{' '}
                    <span className="text-sm font-bold text-slate-400">/ {formatUZS(goal)}</span>
                  </p>
                  <p className="font-display font-black text-lg text-indigo-600 tabular-nums">
                    {goalPct.toFixed(0)}%
                  </p>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  />
                </div>
                {totalUZS < goal && (
                  <p className="text-[11px] font-semibold text-slate-400 mt-2">
                    Qolgan: <span className="text-slate-600">{formatUZS(goal - totalUZS)}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">
                Maqsad belgilanmagan. O'zingizga oylik maqsad qo'yishingiz mumkin.
              </p>
            )}
          </div>
        )}

        {/* Grafik */}
        <MonthlyChart stats={monthly} charityPercentage={0} showCharity={false} />

        {/* Yozuvlar — faqat o'qish */}
        <TransactionList
          transactions={txs}
          onDelete={() => {}}
          onEdit={() => {}}
          readOnly
          showCharity={false}
          currentPercentage={0}
          exchangeRate={data.exchangeRate}
          channels={channels}
          selfChannel={undefined}
          payouts={data.payouts}
          factors={factors}
        />

        <p className="text-center text-[11px] text-slate-400 font-semibold leading-relaxed pt-2">
          Bu — faqat ko'rish uchun kirish. Bu yerda ma'lumot o'zgartirilmaydi.
        </p>
      </main>

      {isPdfOpen && (
        <ExportPDFModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          transactions={txs}
          exchangeRate={data.exchangeRate}
          payouts={data.payouts}
          factors={factors}
        />
      )}
    </div>
  );
};
