import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles, Target, Info, ShieldCheck, Scale, Rocket } from 'lucide-react';
import {
  Transaction,
  Payouts,
  PayoutFactors,
  formatUZS,
  formatUSD,
  MONTH_NAMES,
  txUZS,
  rateForMonth,
  isSelfTx,
} from '../types';
import {
  computeForecast,
  recommendGoals,
  daysInMonth,
  type DailyTotals,
  type GoalLevel,
} from '../services/forecast';

interface IncomeForecastCardProps {
  transactions: Transaction[];
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  /** Qaysi oy uchun taxmin ("YYYY-MM"). */
  monthKey: string;
  currentGoal: number;
  onSetGoal: (monthKey: string, value: number) => void;
}

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `${MONTH_NAMES[mm] || mm} ${y}`;
};

const CONF_META: { [k: string]: { label: string; cls: string } } = {
  past: { label: 'Ishonch: past', cls: 'bg-slate-100 text-slate-500' },
  orta: { label: "Ishonch: o'rta", cls: 'bg-amber-100 text-amber-700' },
  yuqori: { label: 'Ishonch: yuqori', cls: 'bg-emerald-100 text-emerald-700' },
};

const LEVEL_META: {
  [k in GoalLevel['key']]: { icon: React.ElementType; ring: string; text: string; bar: string };
} = {
  safe: { icon: ShieldCheck, ring: 'border-emerald-200 hover:border-emerald-400', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  balanced: { icon: Scale, ring: 'border-indigo-200 hover:border-indigo-400', text: 'text-indigo-600', bar: 'bg-indigo-500' },
  stretch: { icon: Rocket, ring: 'border-amber-200 hover:border-amber-400', text: 'text-amber-600', bar: 'bg-amber-500' },
};

export const IncomeForecastCard: React.FC<IncomeForecastCardProps> = ({
  transactions,
  charityPercentage,
  exchangeRate,
  payouts,
  factors,
  monthKey,
  currentGoal,
  onSetGoal,
}) => {
  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = monthKey === todayMonthKey;

  // Taxmin maqsad bilan BIR XIL asosda hisoblanadi: faqat shaxsiy kanal,
  // ehson ayirilgandan keyingi sof summa. Shunda tavsiya qilingan maqsad
  // to'g'ridan-to'g'ri maqsad kartasi bilan solishtiriladi.
  const daily: DailyTotals = useMemo(() => {
    const out: DailyTotals = {};
    for (const t of transactions) {
      if (!isSelfTx(t)) continue;
      const uzs = txUZS(t, payouts, exchangeRate, factors);
      const net = uzs - (uzs * charityPercentage) / 100;
      out[t.date] = (out[t.date] || 0) + net;
    }
    return out;
  }, [transactions, payouts, exchangeRate, factors, charityPercentage]);

  const forecast = useMemo(() => {
    if (!isCurrentMonth) return null;
    return computeForecast(daily, monthKey, new Date().getDate());
  }, [daily, monthKey, isCurrentMonth]);

  const pastTotals = useMemo(() => {
    const byMonth: { [m: string]: number } = {};
    for (const date of Object.keys(daily)) {
      const m = date.slice(0, 7);
      if (m >= monthKey) continue;
      byMonth[m] = (byMonth[m] || 0) + daily[date];
    }
    return Object.values(byMonth);
  }, [daily, monthKey]);

  const goals = useMemo(() => recommendGoals(pastTotals, forecast), [pastTotals, forecast]);

  // Joriy oy emas yoki taxmin uchun asos yo'q — kartani ko'rsatmaymiz
  if (!isCurrentMonth || !forecast) return null;

  const monthRate = rateForMonth(monthKey, payouts, exchangeRate);
  const dim = daysInMonth(monthKey);
  const day = new Date().getDate();
  const conf = CONF_META[forecast.confidence];

  // Oraliqni chiziqda ko'rsatish uchun
  const span = Math.max(forecast.high - forecast.low, 1);
  const pointPct = ((forecast.point - forecast.low) / span) * 100;
  const currentPct = Math.min(
    Math.max(((forecast.current - forecast.low) / span) * 100, 0),
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-3d p-6 relative overflow-hidden mb-8"
    >
      <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-emerald-400 to-sky-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-5 relative z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-lg shadow-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-slate-800 text-base">Oy oxiri taxmini</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              {monthLabel(monthKey)} · sof summa · {day}/{dim} kun
            </p>
          </div>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shrink-0 ${conf.cls}`}>
          {conf.label}
        </span>
      </div>

      {/* Asosiy taxmin */}
      <div className="relative z-10 text-center mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Oy oxirida taxminan
        </p>
        <p className="font-display text-3xl font-black text-slate-800 tabular-nums mt-1">
          {formatUZS(forecast.point)}
        </p>
        <p className="text-[11px] font-semibold text-indigo-400 mt-0.5">
          {formatUSD(forecast.point / monthRate)}
        </p>
      </div>

      {/* Oraliq chizig'i */}
      <div className="relative z-10 mb-5">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-200 via-emerald-200 to-slate-200">
          {/* hozirgi holat */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-slate-400"
            style={{ left: `${currentPct}%` }}
            title="Hozirgacha to'plangan"
          />
          {/* eng ehtimolli nuqta */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"
            style={{ left: `${pointPct}%` }}
            title="Eng ehtimolli"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] font-bold text-slate-400 tabular-nums">
          <span>{formatUZS(forecast.low)}</span>
          <span>{formatUZS(forecast.high)}</span>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-start gap-1.5">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          {forecast.method === 'shape' ? (
            <span>
              {forecast.monthsUsed} ta o'tgan oyning shakli asosida. Hozirgacha{' '}
              <b className="text-slate-500">{formatUZS(forecast.current)}</b> to'plandi.
            </span>
          ) : (
            <span>
              Tarix hali yetarli emas — hozirgi sur'at bo'yicha hisoblandi. Oylar to'planib
              borgani sayin taxmin aniqlashadi.
            </span>
          )}
        </p>
      </div>

      {/* Maqsad tavsiyalari */}
      {goals.length > 0 && (
        <div className="relative z-10 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Maqsad uchun tavsiya
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {goals.map((g) => {
              const meta = LEVEL_META[g.key];
              const Icon = meta.icon;
              const isActive = currentGoal > 0 && Math.abs(currentGoal - g.amount) < 1;
              return (
                <button
                  key={g.key}
                  onClick={() => onSetGoal(monthKey, g.amount)}
                  className={`text-left p-3 rounded-2xl border bg-white/70 transition-all active:scale-[0.98] ${meta.ring} ${
                    isActive ? 'ring-2 ring-offset-1 ring-slate-300' : ''
                  }`}
                  title="Bosing — shu summa oylik maqsad qilib qo'yiladi"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wide ${meta.text}`}>
                      {g.label}
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800 font-display tabular-nums">
                    {formatUZS(g.amount)}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 mt-1 leading-tight">
                    {g.months > 0
                      ? `O'tgan ${g.months} oyning ${g.beaten} tasida oshgan`
                      : g.hint}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="text-[9px] text-slate-400 font-semibold mt-2.5">
            Bosish bilan maqsad qo'yiladi. Taxmin — yo'l ko'rsatkichi, kafolat emas:
            viral video yoki mavsumiy o'zgarish uni oshirib yoki tushirib yuborishi mumkin.
          </p>
        </div>
      )}
    </motion.div>
  );
};
