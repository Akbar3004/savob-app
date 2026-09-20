import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Flag,
  Edit2,
  Check,
  X,
  TrendingDown,
  Minus,
  TrendingUp,
  Trophy,
  Info,
  Users,
  User,
} from 'lucide-react';
import {
  Transaction,
  Channel,
  Payouts,
  PayoutFactors,
  formatUZS,
  formatUSD,
  MONTH_NAMES,
  txUZS,
  txUSD,
  isOwnedTx,
  hasCharityTx,
} from '../types';
import type { DailyTotals } from '../services/forecast';
import {
  computeMilestone,
  formatDuration,
  DEFAULT_MILESTONE,
  type Milestone,
  type Pace,
} from '../services/milestone';
import { appTodayISO } from '../appDate';
import { cleanInteger } from '../numInput';

interface MilestoneCardProps {
  transactions: Transaction[];
  channels: Channel[];
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  milestone: Milestone | undefined;
  onSet: (m: Milestone) => void;
}

const PACE_META: {
  [k in Pace['key']]: {
    icon: React.ElementType;
    label: string;
    hint: string;
    dot: string;
    text: string;
  };
} = {
  slow: {
    icon: TrendingDown,
    label: 'Sekinlashsa',
    hint: 'eng past oy darajasi',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
  },
  now: {
    icon: Minus,
    label: "Hozirgi sur'atda",
    hint: '3 oy o‘rtachasi',
    dot: 'bg-indigo-500',
    text: 'text-indigo-600',
  },
  fast: {
    icon: TrendingUp,
    label: "O‘sish davom etsa",
    hint: 'kuzatilgan o‘sish bilan',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
};

const CONF_META = {
  past: { label: 'Ishonch: past', cls: 'bg-slate-100 text-slate-500' },
  orta: { label: "Ishonch: o'rta", cls: 'bg-amber-100 text-amber-700' },
  yuqori: { label: 'Ishonch: yuqori', cls: 'bg-emerald-100 text-emerald-700' },
};

/** "2027-04-06" -> "6-aprel 2027" */
const dateUz = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}-${(MONTH_NAMES[m] || m).toLowerCase()} ${y}`;
};

const group = (v: string) => (v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

/**
 * MARRA KARTASI — "shu sur'atda ketsa, $10 000 ga qachon yetaman?"
 *
 * Bitta sana emas, UCHTA ko'rsatiladi. Sabab: YouTube daromadi bitta viral
 * video bilan ham, mavsum bilan ham keskin o'zgaradi. Bitta sana berish
 * yolg'on aniqlik bo'lardi — bu esa pul masalasi.
 *
 * Nimalar sanalishini foydalanuvchi o'zi tanlaydi. Sukut bo'yicha FAQAT
 * MENIKI va EHSONDAN KEYINGI sof summa: boshqa kanal egasining puli
 * shaxsiy marraga kirmasligi kerak.
 */
export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  transactions,
  channels,
  charityPercentage,
  exchangeRate,
  payouts,
  factors,
  milestone,
  onSet,
}) => {
  const ms = milestone || DEFAULT_MILESTONE;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftCur, setDraftCur] = useState<Milestone['currency']>(ms.currency);

  // Kunlik summalar marra valyutasida to'g'ridan-to'g'ri hisoblanadi —
  // oxirida bitta kursga bo'lib qo'yilmaydi. Sabab: har ish oyining o'z
  // to'lov kursi bor, va txUSD aynan shuni hisobga oladi.
  const daily: DailyTotals = useMemo(() => {
    const out: DailyTotals = {};
    for (const t of transactions) {
      if (ms.scope === 'mine' && !isOwnedTx(t, channels)) continue;
      const gross =
        ms.currency === 'USD'
          ? txUSD(t, payouts, exchangeRate, factors)
          : txUZS(t, payouts, exchangeRate, factors);
      const net = hasCharityTx(t, channels)
        ? gross - (gross * charityPercentage) / 100
        : gross;
      out[t.date] = (out[t.date] || 0) + net;
    }
    return out;
  }, [transactions, channels, payouts, exchangeRate, factors, charityPercentage, ms.scope, ms.currency]);

  const result = useMemo(
    () => computeMilestone(daily, ms.amount, appTodayISO()),
    [daily, ms.amount]
  );

  const fmt = (v: number) =>
    ms.currency === 'USD' ? formatUSD(v) : formatUZS(v);

  const startEdit = () => {
    setDraft(String(Math.round(ms.amount)));
    setDraftCur(ms.currency);
    setIsEditing(true);
  };

  const save = () => {
    const amount = parseFloat(cleanInteger(draft));
    if (!Number.isFinite(amount) || amount <= 0) return;
    onSet({ ...ms, amount, currency: draftCur });
    setIsEditing(false);
  };

  const setScope = (scope: Milestone['scope']) => onSet({ ...ms, scope });

  const pct = result
    ? Math.min(Math.max((result.current / result.target) * 100, 0), 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-3d p-6 relative overflow-hidden mb-8"
    >
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-amber-400 to-rose-500 pointer-events-none" />

      {/* Sarlavha */}
      <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-100">
            <Flag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-black text-lg text-slate-800 leading-tight">
              Marra
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              {ms.scope === 'mine' ? 'Faqat meniki' : 'Uch kanal birga'} · sof summa
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={startEdit}
            className="shrink-0 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
          >
            <Edit2 className="w-3 h-3" /> Tahrir
          </button>
        )}
      </div>

      {/* Marra summasini o'zgartirish */}
      {isEditing && (
        <div className="mb-5 relative z-10">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Marra summasi
          </span>
          <div className="flex gap-2 mb-2">
            {(['USD', 'UZS'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraftCur(c)}
                className={`flex-1 py-2 text-[11px] font-black rounded-xl border transition-all ${
                  draftCur === c
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {c === 'USD' ? 'Dollar ($)' : "So'm"}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={group(draft)}
            onChange={(e) => setDraft(cleanInteger(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={draftCur === 'USD' ? 'Masalan: 10 000' : 'Masalan: 100 000 000'}
            className="w-full px-4 py-3 text-lg font-bold font-display bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800 placeholder-slate-300 tabular-nums"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={save}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-200/50"
            >
              <Check className="w-4 h-4" /> Saqlash
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all active:scale-95"
            >
              <X className="w-3.5 h-3.5" /> Bekor
            </button>
          </div>
        </div>
      )}

      {/* Nimalar sanaladi */}
      <div className="flex gap-1.5 mb-5 relative z-10">
        {([
          { k: 'mine' as const, icon: User, label: 'Faqat meniki' },
          { k: 'all' as const, icon: Users, label: 'Uch kanal' },
        ]).map(({ k, icon: Icon, label }) => (
          <button
            key={k}
            onClick={() => setScope(k)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-[10px] font-bold transition-all ${
              ms.scope === k
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200/70 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {!result ? (
        <p className="text-sm font-semibold text-slate-400 text-center py-4 relative z-10">
          Taxmin uchun hali ma'lumot yetarli emas.
        </p>
      ) : result.reached ? (
        <div className="relative z-10 text-center py-2">
          <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-display font-black text-2xl text-slate-800">
            {fmt(result.target)} marrasi bosib o'tilgan
          </p>
          <p className="text-xs font-bold text-emerald-600 mt-1">
            Jami to'plangan: {fmt(result.current)}
          </p>
        </div>
      ) : (
        <div className="relative z-10">
          {/* Progress */}
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="font-display font-black text-2xl sm:text-3xl text-slate-800 tabular-nums">
              {fmt(result.current)}
            </span>
            <span className="text-xs font-bold text-slate-400 tabular-nums">
              / {fmt(result.target)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold mb-5">
            <span className="text-amber-600 tabular-nums">{pct.toFixed(1)}%</span>
            <span className="text-slate-400 tabular-nums">
              Qoldi: {fmt(result.remaining)}
            </span>
          </div>

          {/* Uch ssenariy */}
          <div className="space-y-2">
            {(['fast', 'now', 'slow'] as const).map((key) => {
              const p = result.paces[key];
              const meta = PACE_META[key];
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    key === 'now'
                      ? 'bg-indigo-50/60 border-indigo-200/70'
                      : 'bg-slate-50/70 border-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${meta.text}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-black ${meta.text}`}>{meta.label}</p>
                    <p className="text-[9px] font-semibold text-slate-400 leading-snug">
                      {fmt(p.perMonth)}/oy
                      {p.growth !== 1
                        ? `, har oy ${p.growth > 1 ? '+' : ''}${((p.growth - 1) * 100).toFixed(0)}%`
                        : ` · ${meta.hint}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {p.date === null ? (
                      <p className="text-[11px] font-bold text-slate-400">
                        Bu sur'atda yetmaydi
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-black text-slate-800 tabular-nums">
                          {dateUz(p.date)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          {formatDuration(p.months || 0)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Izoh */}
          <div className="flex items-start gap-1.5 mt-4 pt-3 border-t border-slate-100">
            <Info className="w-3 h-3 text-slate-300 shrink-0 mt-px" />
            <p className="text-[9.5px] font-semibold text-slate-400 leading-snug">
              {result.monthsUsed > 0
                ? `Oxirgi ${Math.min(result.monthsUsed, 3)} ta to'liq oy asosida.`
                : "Hali to'liq oy yo'q — butun davr bo'yicha o'rtacha sur'at."}{' '}
              Ma'lumot {dateUz(result.asOf)} gacha
              {result.growth !== null && (
                <>
                  , kuzatilgan o'zgarish{' '}
                  <span className={result.growth >= 1 ? 'text-emerald-600' : 'text-rose-500'}>
                    {result.growth >= 1 ? '+' : ''}
                    {((result.growth - 1) * 100).toFixed(0)}%/oy
                  </span>
                </>
              )}
              . Taxmin — kafolat emas: bitta viral video ham, mavsumiy pasayish ham
              sanani sezilarli siljitadi.
            </p>
          </div>

          <div className="mt-3">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                CONF_META[result.confidence].cls
              }`}
            >
              {CONF_META[result.confidence].label}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
