import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Target,
  Check,
  Edit2,
  X,
  CalendarClock,
  Trophy,
  Flag,
  Zap,
  CalendarDays,
  Flame,
} from 'lucide-react';
import { Transaction, Channel, Payouts, PayoutFactors, formatUZS, formatUSD, MONTH_NAMES, isOwnedTx, hasCharityTx, txUZS, rateForMonth } from '../types';

interface IncomeGoalCardProps {
  transactions: Transaction[];
  /** Kanal rejimlari kerak: qaysi kanal "meniki" va qaysisidan ehson ushlanadi. */
  channels: Channel[];
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  monthKey: string; // "YYYY-MM" — maqsad qo'yiladigan oy
  incomeGoals: { [monthKey: string]: number }; // barcha oylik maqsadlar (streak uchun)
  yearlyGoals: { [year: string]: number }; // yillik maqsadlar
  onSetGoal: (monthKey: string, value: number) => void;
  onSetYearlyGoal: (year: string, value: number) => void;
}

const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return `${MONTH_NAMES[month] || month} ${year}`;
};

const getPrevMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 2, 1); // month - 1 (0-index) - 1 (oldingi oy)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Kirim maydoni uchun formatlash (raqamlarni 3 xonadan ajratish)
const sanitize = (v: string) => v.replace(/[^\d]/g, '');
const formatDisplay = (v: string) => (v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

export const IncomeGoalCard: React.FC<IncomeGoalCardProps> = ({
  transactions,
  channels,
  charityPercentage,
  exchangeRate,
  payouts,
  factors,
  monthKey,
  incomeGoals,
  yearlyGoals,
  onSetGoal,
  onSetYearlyGoal,
}) => {
  const goal = incomeGoals[monthKey] || 0;
  const year = monthKey.slice(0, 4);
  const yearlyGoal = yearlyGoals[year] || 0;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearDraft, setYearDraft] = useState<string>('');

  // Tashqi maqsad yoki oy o'zgarsa, tahrirlash rejimidan chiqamiz
  useEffect(() => {
    setIsEditing(false);
    setDraft('');
    setIsEditingYear(false);
    setYearDraft('');
  }, [monthKey, goal, yearlyGoal]);

  const toUZS = (t: Transaction) => txUZS(t, payouts, exchangeRate, factors);
  // Shu oyning so'm/dollar nisbati — to'lov kelgan bo'lsa qotgan kurs bo'yicha
  const monthRate = rateForMonth(monthKey, payouts, exchangeRate);

  // Berilgan prefiks ("YYYY-MM" yoki "YYYY") bo'yicha FAQAT MENING sof summam.
  // Maqsadlar shaxsiy daromadga tegishli: asosiy kanal + "meniki" deb
  // belgilangan kanallar. Ehson esa faqat ehsonli kanallardan ayiriladi —
  // ehsonsiz "meniki" kanalning puli to'liq hisobga olinadi.
  const netForPrefix = (prefix: string): number =>
    transactions
      .filter((t) => isOwnedTx(t, channels) && t.date.startsWith(prefix))
      .reduce((sum, t) => {
        const uzs = toUZS(t);
        return sum + (hasCharityTx(t, channels) ? uzs - (uzs * charityPercentage) / 100 : uzs);
      }, 0);

  const netThisMonthUZS = useMemo(
    () => netForPrefix(monthKey),
    [transactions, channels, monthKey, charityPercentage, exchangeRate, payouts]
  );

  const prevMonthKey = useMemo(() => getPrevMonthKey(monthKey), [monthKey]);
  const prevMonthRate = rateForMonth(prevMonthKey, payouts, exchangeRate);
  const netPrevMonthUZS = useMemo(
    () => netForPrefix(prevMonthKey),
    [transactions, channels, prevMonthKey, charityPercentage, exchangeRate, payouts]
  );

  const netThisYearUZS = useMemo(
    () => netForPrefix(year),
    [transactions, channels, year, charityPercentage, exchangeRate, payouts]
  );

  const remainingUZS = Math.max(goal - netThisMonthUZS, 0);
  const progressPct = goal > 0 ? Math.min((netThisMonthUZS / goal) * 100, 100) : 0;
  const isReached = goal > 0 && netThisMonthUZS >= goal;

  const yearRemainingUZS = Math.max(yearlyGoal - netThisYearUZS, 0);
  const yearProgressPct = yearlyGoal > 0 ? Math.min((netThisYearUZS / yearlyGoal) * 100, 100) : 0;
  const isYearReached = yearlyGoal > 0 && netThisYearUZS >= yearlyGoal;

  // --- Tempo (kunlik / haftalik sur'at) — faqat joriy oy uchun ---
  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = monthKey === todayMonthKey;
  const tempo = useMemo(() => {
    if (!isCurrentMonth || goal <= 0 || isReached) return null;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemainingRaw = daysInMonth - now.getDate() + 1; // bugungi kun ham hisobga olinadi
    const daysRemaining = Math.max(daysRemainingRaw, 1);
    const dailyUZS = remainingUZS / daysRemaining;
    const weeklyUZS = Math.min(dailyUZS * 7, remainingUZS);
    return { daysRemaining, dailyUZS, weeklyUZS };
  }, [isCurrentMonth, goal, isReached, remainingUZS]);

  // --- Streak (ketma-ket maqsadga yetilgan oylar) ---
  const streak = useMemo(() => {
    let count = 0;
    let cursor = monthKey;
    for (let i = 0; i < 120; i++) {
      const g = incomeGoals[cursor] || 0;
      const reached = g > 0 && netForPrefix(cursor) >= g;
      if (reached) {
        count++;
      } else if (i === 0) {
        // Joriy oy hali maqsadga yetmagan bo'lishi mumkin — streakni buzmaymiz
      } else {
        break;
      }
      cursor = getPrevMonthKey(cursor);
    }
    return count;
  }, [monthKey, incomeGoals, transactions, charityPercentage, exchangeRate, payouts]);

  const startEdit = () => {
    setDraft(goal > 0 ? String(goal) : '');
    setIsEditing(true);
  };
  const saveGoal = () => {
    onSetGoal(monthKey, parseFloat(sanitize(draft)) || 0);
    setIsEditing(false);
  };

  const startEditYear = () => {
    setYearDraft(yearlyGoal > 0 ? String(yearlyGoal) : '');
    setIsEditingYear(true);
  };
  const saveYearGoal = () => {
    onSetYearlyGoal(year, parseFloat(sanitize(yearDraft)) || 0);
    setIsEditingYear(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-3d p-6 relative overflow-hidden mb-8"
    >
      {/* Fon nur effekti */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-fuchsia-500 to-indigo-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow-lg shadow-indigo-100">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base">Oylik maqsad</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {getMonthLabel(monthKey)} · sof summadan hisoblanadi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Streak belgisi */}
          {streak > 0 && (
            <div
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100"
              title={`Ketma-ket ${streak} oy maqsadga yetildi`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-black text-orange-600">{streak}</span>
              <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide hidden sm:inline">
                oy streak
              </span>
            </div>
          )}
          {!isEditing && (
            <button
              onClick={startEdit}
              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <Edit2 className="w-3 h-3" />
              {goal > 0 ? 'Tahrir' : 'Belgilash'}
            </button>
          )}
        </div>
      </div>

      {/* Maqsad kiritish rejimi */}
      {isEditing && (
        <div className="mb-5 relative z-10">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Bu oy topmoqchi bo'lgan sof summa (so'm)
          </label>
          <div className="relative">
            <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-500" />
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={formatDisplay(draft)}
              onChange={(e) => setDraft(sanitize(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
              placeholder="Masalan: 10 000 000"
              className="w-full pl-9 pr-4 py-3 text-lg font-bold font-display bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:bg-white transition-all text-slate-800 placeholder-slate-300"
            />
          </div>
          {parseFloat(sanitize(draft)) > 0 && (
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5 pl-1">
              ≈ {formatUSD(parseFloat(sanitize(draft)) / monthRate)}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveGoal}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-200/50"
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

      {/* Maqsad belgilanmagan holat */}
      {!isEditing && goal <= 0 && (
        <div className="text-center py-6 relative z-10">
          <p className="text-sm font-semibold text-slate-400">
            Bu oy uchun daromad maqsadi hali belgilanmagan.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            "Belgilash" tugmasini bosib, o'zingizga maqsad qo'ying.
          </p>
        </div>
      )}

      {/* Maqsad belgilangan holat */}
      {!isEditing && goal > 0 && (
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chap: Maqsad va qolgan summa */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Maqsad
                </span>
                <span className="text-[10px] font-bold text-indigo-500">
                  {progressPct.toFixed(0)}%
                </span>
              </div>
              <h4 className="text-2xl font-black font-display tracking-tight text-slate-800 leading-tight">
                {formatUZS(goal)}
              </h4>
              <p className="text-xs font-bold text-indigo-500 font-display mt-0.5">
                {formatUSD(goal / monthRate)}
              </p>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    isReached
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-r from-fuchsia-500 to-indigo-500'
                  }`}
                />
              </div>

              {/* Qolgan summa yoki erishildi */}
              {isReached ? (
                <div className="mt-3 flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <Trophy className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-600">
                    Maqsadga erishildi! Tabriklaymiz 🎉
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-fuchsia-50/50 rounded-xl border border-fuchsia-100/60">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                    Maqsadga qolgan summa
                  </p>
                  <p className="text-base font-black font-display text-fuchsia-600">
                    {formatUZS(remainingUZS)}
                  </p>
                  <p className="text-[11px] font-bold text-fuchsia-400">
                    {formatUSD(remainingUZS / monthRate)}
                  </p>
                </div>
              )}
            </div>

            {/* O'ng: Oldingi oy natijasi */}
            <div className="md:border-l md:border-slate-100 md:pl-5">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Oldingi oy ({getMonthLabel(prevMonthKey)})
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mb-1">
                Sizga qolgan sof daromad
              </p>
              <h4 className="text-2xl font-black font-display tracking-tight text-slate-700 leading-tight">
                {formatUZS(netPrevMonthUZS)}
              </h4>
              <p className="text-xs font-bold text-indigo-500 font-display mt-0.5">
                {formatUSD(netPrevMonthUZS / prevMonthRate)}
              </p>

              {/* Joriy oy sof daromadi (maqsad bilan solishtirish uchun) */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                  Bu oy hozirgacha topilgan sof
                </p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatUZS(netThisMonthUZS)}
                </p>
                <p className="text-[10px] font-semibold text-emerald-400">
                  {formatUSD(netThisMonthUZS / monthRate)}
                </p>
              </div>
            </div>
          </div>

          {/* Tempo — kunlik / haftalik sur'at */}
          {tempo && (
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-fuchsia-50/70 border border-indigo-100/70">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  Maqsadga yetish sur'ati · oy oxirigacha {tempo.daysRemaining} kun
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/70 rounded-xl border border-indigo-100/60">
                  <div className="flex items-center gap-1 mb-0.5">
                    <CalendarDays className="w-3 h-3 text-indigo-400" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Kuniga</p>
                  </div>
                  <p className="text-sm font-black font-display text-indigo-600">
                    {formatUZS(tempo.dailyUZS)}
                  </p>
                  <p className="text-[10px] font-semibold text-indigo-400">
                    {formatUSD(tempo.dailyUZS / monthRate)}
                  </p>
                </div>
                <div className="p-3 bg-white/70 rounded-xl border border-indigo-100/60">
                  <div className="flex items-center gap-1 mb-0.5">
                    <CalendarDays className="w-3 h-3 text-fuchsia-400" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Haftasiga</p>
                  </div>
                  <p className="text-sm font-black font-display text-fuchsia-600">
                    {formatUZS(tempo.weeklyUZS)}
                  </p>
                  <p className="text-[10px] font-semibold text-fuchsia-400">
                    {formatUSD(tempo.weeklyUZS / monthRate)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 text-center">
                Maqsadga yetish uchun o'rtacha shuncha sof daromad topishingiz kerak.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Yillik maqsad bo'limi */}
      <div className="mt-5 pt-5 border-t border-slate-100 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-700 font-display">
              Yillik maqsad · {year}
            </span>
          </div>
          {!isEditingYear && (
            <button
              onClick={startEditYear}
              className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <Edit2 className="w-3 h-3" />
              {yearlyGoal > 0 ? 'Tahrir' : 'Belgilash'}
            </button>
          )}
        </div>

        {isEditingYear ? (
          <div>
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={formatDisplay(yearDraft)}
                onChange={(e) => setYearDraft(sanitize(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && saveYearGoal()}
                placeholder="Masalan: 120 000 000"
                className="w-full pl-9 pr-4 py-3 text-lg font-bold font-display bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800 placeholder-slate-300"
              />
            </div>
            {parseFloat(sanitize(yearDraft)) > 0 && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5 pl-1">
                ≈ {formatUSD(parseFloat(sanitize(yearDraft)) / exchangeRate)}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={saveYearGoal}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-200/50"
              >
                <Check className="w-4 h-4" /> Saqlash
              </button>
              <button
                onClick={() => setIsEditingYear(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" /> Bekor
              </button>
            </div>
          </div>
        ) : yearlyGoal > 0 ? (
          <div>
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                  {year}-yil sof daromad maqsadi
                </p>
                <p className="text-lg font-black font-display text-slate-800 leading-tight">
                  {formatUZS(yearlyGoal)}
                </p>
                <p className="text-[11px] font-bold text-amber-500">
                  {formatUSD(yearlyGoal / exchangeRate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                  {isYearReached ? 'Maqsadga qadar' : 'Yetishga qolgan'}
                </p>
                {isYearReached ? (
                  <p className="text-sm font-black font-display text-emerald-600">Bajarildi 🎉</p>
                ) : (
                  <>
                    <p className="text-sm font-black font-display text-amber-600">
                      {formatUZS(yearRemainingUZS)}
                    </p>
                    <p className="text-[10px] font-semibold text-amber-400">
                      {formatUSD(yearRemainingUZS / exchangeRate)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Yillik progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${yearProgressPct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-full rounded-full ${
                  isYearReached
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500'
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-semibold text-slate-400">
                Topilgan: {formatUZS(netThisYearUZS)}
              </span>
              <span className="text-[10px] font-black text-amber-500">
                {yearProgressPct.toFixed(0)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-400 py-1">
            {year}-yil uchun umumiy maqsad belgilanmagan. Topilgan sof: {formatUZS(netThisYearUZS)}.
          </p>
        )}
      </div>
    </motion.div>
  );
};
