import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Target, Check, Edit2, X, CalendarClock, Trophy, Flag } from 'lucide-react';
import { Transaction, formatUZS, formatUSD, MONTH_NAMES } from '../types';

interface IncomeGoalCardProps {
  transactions: Transaction[];
  charityPercentage: number;
  exchangeRate: number;
  monthKey: string; // "YYYY-MM" — maqsad qo'yiladigan oy
  goal: number; // shu oy uchun so'mdagi sof daromad maqsadi (0 = belgilanmagan)
  onSetGoal: (monthKey: string, value: number) => void;
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

export const IncomeGoalCard: React.FC<IncomeGoalCardProps> = ({
  transactions,
  charityPercentage,
  exchangeRate,
  monthKey,
  goal,
  onSetGoal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');

  // Tashqi maqsad yoki oy o'zgarsa, tahrirlash rejimidan chiqamiz
  useEffect(() => {
    setIsEditing(false);
    setDraft('');
  }, [monthKey, goal]);

  const toUZS = (t: Transaction) => (t.currency === 'USD' ? t.amount * exchangeRate : t.amount);

  // Berilgan oyning SOF (menga qoladigan) summasini hisoblaymiz
  const netForMonth = (mKey: string): number => {
    const totalUZS = transactions
      .filter((t) => t.date.startsWith(mKey))
      .reduce((sum, t) => sum + toUZS(t), 0);
    return totalUZS - (totalUZS * charityPercentage) / 100;
  };

  const netThisMonthUZS = useMemo(
    () => netForMonth(monthKey),
    [transactions, monthKey, charityPercentage, exchangeRate]
  );

  const prevMonthKey = useMemo(() => getPrevMonthKey(monthKey), [monthKey]);
  const netPrevMonthUZS = useMemo(
    () => netForMonth(prevMonthKey),
    [transactions, prevMonthKey, charityPercentage, exchangeRate]
  );

  const remainingUZS = Math.max(goal - netThisMonthUZS, 0);
  const progressPct = goal > 0 ? Math.min((netThisMonthUZS / goal) * 100, 100) : 0;
  const isReached = goal > 0 && netThisMonthUZS >= goal;

  // Kirim maydoni uchun formatlash (raqamlarni 3 xonadan ajratish)
  const sanitize = (v: string) => v.replace(/[^\d]/g, '');
  const formatDisplay = (v: string) => (v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

  const startEdit = () => {
    setDraft(goal > 0 ? String(goal) : '');
    setIsEditing(true);
  };

  const saveGoal = () => {
    const val = parseFloat(sanitize(draft)) || 0;
    onSetGoal(monthKey, val);
    setIsEditing(false);
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
              ≈ {formatUSD(parseFloat(sanitize(draft)) / exchangeRate)}
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
                {formatUSD(goal / exchangeRate)}
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
                    {formatUSD(remainingUZS / exchangeRate)}
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
                {formatUSD(netPrevMonthUZS / exchangeRate)}
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
                  {formatUSD(netThisMonthUZS / exchangeRate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
