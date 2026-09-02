import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Activity,
  CalendarRange,
  Layers,
  CalendarDays,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  User,
  Youtube,
  Trophy,
} from 'lucide-react';
import {
  Transaction,
  Channel,
  SelfChannel,
  Payouts,
  PayoutFactors,
  formatUZS,
  formatCompact,
  MONTH_NAMES,
  txUZS,
  channelKeyOf,
  channelInfo,
  SELF_CHANNEL_ID,
} from '../types';
import {
  computeSeasonality,
  compareChannels,
  computeDayOfMonthPattern,
  type DayPoint,
  type MonthPoint,
} from '../services/analytics';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  channels: Channel[];
  selfChannel: SelfChannel | undefined;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
}

type Tab = 'season' | 'channels' | 'days';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'season', label: 'Mavsumiylik', icon: CalendarRange },
  { id: 'channels', label: 'Kanallar', icon: Layers },
  { id: 'days', label: 'Oy kunlari', icon: CalendarDays },
];

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `${MONTH_NAMES[mm] || mm} ${y}`;
};

/** Ma'lumot kamligini ochiq aytadigan eslatma. */
const NotEnough: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
    <p className="text-[11px] leading-relaxed text-amber-900 font-medium">{text}</p>
  </div>
);

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  channels,
  selfChannel,
  exchangeRate,
  payouts,
  factors,
}) => {
  const [tab, setTab] = useState<Tab>('season');

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Barcha hisoblar bitta manbadan: kunlik, kanal kesimidagi so'm summalari
  const points: DayPoint[] = useMemo(
    () =>
      transactions.map((t) => ({
        date: t.date,
        channelId: channelKeyOf(t),
        uzs: txUZS(t, payouts, exchangeRate, factors),
      })),
    [transactions, payouts, exchangeRate, factors]
  );

  // Mavsumiylik faqat TUGALLANGAN oylardan hisoblanadi
  const completeMonths: MonthPoint[] = useMemo(() => {
    const by: { [m: string]: number } = {};
    for (const p of points) {
      const m = p.date.slice(0, 7);
      if (m === currentMonth) continue;
      by[m] = (by[m] || 0) + p.uzs;
    }
    return Object.keys(by)
      .sort()
      .map((m) => ({ monthKey: m, uzs: by[m] }));
  }, [points, currentMonth]);

  const season = useMemo(() => computeSeasonality(completeMonths), [completeMonths]);
  const chanStats = useMemo(() => compareChannels(points, currentMonth), [points, currentMonth]);
  const dayPattern = useMemo(
    () => computeDayOfMonthPattern(points, currentMonth),
    [points, currentMonth]
  );

  const info = (id: string) =>
    channelInfo(id === SELF_CHANNEL_ID ? undefined : id, channels, selfChannel);

  if (!isOpen) return null;

  const maxMonthUzs = Math.max(...completeMonths.map((m) => m.uzs), 1);
  const maxDayAvg = Math.max(...dayPattern.days.map((d) => d.avg), 1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-2xl w-full p-6 md:p-7 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh] relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sarlavha */}
          <div className="flex items-center gap-3 mb-5 relative z-10 border-b border-slate-100 pb-4 pr-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">Chuqur tahlil</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Naqshlar va tendensiyalar — asosiy oynani band qilmasdan
              </p>
            </div>
          </div>

          {/* Bo'limlar */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 border border-slate-200/60">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-xl transition-all ${
                    tab === t.id
                      ? 'bg-white text-violet-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─────────── MAVSUMIYLIK ─────────── */}
          {tab === 'season' && (
            <div className="space-y-4">
              {!season.reliable && (
                <NotEnough
                  text={`Mavsumiylik uchun kamida bir yillik tarix kerak — hozir ${season.monthsUsed} ta tugallangan oy bor. Quyidagi raqamlar ko'rsatilyapti, lekin ulardan "qaysi oy kuchli" degan xulosa chiqarish hali erta.`}
                />
              )}

              {completeMonths.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  Hali tugallangan oy yo'q.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                        Eng kuchli oy
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-1">
                        {season.best ? MONTH_NAMES[season.best.month] : '—'}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {season.best ? formatUZS(season.best.avg) : ''}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">
                        Eng zaif oy
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-1">
                        {season.worst ? MONTH_NAMES[season.worst.month] : '—'}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {season.worst ? formatUZS(season.worst.avg) : ''}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Oylar bo'yicha o'rtacha
                    </p>
                    <div className="space-y-2">
                      {season.months.map((m) => (
                        <div key={m.month} className="flex items-center gap-2.5">
                          <span className="w-16 shrink-0 text-[10px] font-bold text-slate-600">
                            {MONTH_NAMES[m.month]}
                          </span>
                          <div className="h-2.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(m.avg / maxMonthUzs) * 100}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full ${
                                m.index >= 1.1
                                  ? 'bg-emerald-500'
                                  : m.index <= 0.9
                                  ? 'bg-rose-400'
                                  : 'bg-indigo-400'
                              }`}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right text-[10px] font-bold text-slate-700 tabular-nums">
                            {formatCompact(m.avg)}
                          </span>
                          <span
                            className={`w-12 shrink-0 text-right text-[10px] font-black tabular-nums ${
                              m.index >= 1.1
                                ? 'text-emerald-600'
                                : m.index <= 0.9
                                ? 'text-rose-500'
                                : 'text-slate-400'
                            }`}
                          >
                            {m.index >= 1 ? '+' : ''}
                            {((m.index - 1) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold mt-2.5">
                      Foiz — o'rtacha oyga nisbatan. Har bir oy {season.months[0]?.years || 1} yillik
                      ma'lumotdan hisoblangan.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─────────── KANALLAR ─────────── */}
          {tab === 'channels' && (
            <div className="space-y-3">
              {chanStats.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Hali ma'lumot yo'q.</p>
              ) : (
                chanStats.map((c, i) => {
                  const meta = info(c.channelId);
                  const g = c.growthPct;
                  const maxTrend = Math.max(...c.trend.map((t) => t.uzs), 1);
                  return (
                    <div
                      key={c.channelId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.owned ? (
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                          ) : (
                            <Youtube className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {meta.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {g === null ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <Minus className="w-3 h-3" /> yangi
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black ${
                                g >= 0 ? 'text-emerald-600' : 'text-rose-500'
                              }`}
                              title="Oxirgi ikki tugallangan oy taqqoslandi"
                            >
                              {g >= 0 ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {g >= 0 ? '+' : ''}
                              {g.toFixed(0)}%
                            </span>
                          )}
                          <span className="text-xs font-black text-slate-800 font-display tabular-nums">
                            {formatCompact(c.total)}
                          </span>
                        </div>
                      </div>

                      {/* Oyma-oy ustunlar */}
                      <div className="flex items-end gap-1 h-12">
                        {c.trend.map((t) => (
                          <div
                            key={t.monthKey}
                            className="flex-1 rounded-t transition-all"
                            style={{
                              height: `${Math.max((t.uzs / maxTrend) * 100, 4)}%`,
                              backgroundColor: meta.color,
                              opacity: t.monthKey === currentMonth ? 0.4 : 1,
                            }}
                            title={`${monthLabel(t.monthKey)}: ${formatUZS(t.uzs)}${
                              t.monthKey === currentMonth ? ' (tugallanmagan)' : ''
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[9px] font-semibold text-slate-400">
                        <span>{monthLabel(c.trend[0]?.monthKey || '')}</span>
                        <span>{monthLabel(c.trend[c.trend.length - 1]?.monthKey || '')}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-slate-200/70 text-[9px] font-semibold text-slate-500">
                        <span>Ulush: <b className="text-slate-700">{c.sharePct.toFixed(0)}%</b></span>
                        <span>O'rtacha: <b className="text-slate-700">{formatCompact(c.avgMonth)}</b></span>
                        <span>{c.activeMonths} ta oy</span>
                        {c.bestMonth && (
                          <span className="inline-flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5 text-amber-500" />
                            {monthLabel(c.bestMonth.monthKey)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <p className="text-[9px] text-slate-400 font-semibold">
                O'sish foizi oxirgi ikki <b>tugallangan</b> oyni taqqoslaydi — joriy oy hali
                tugamagani uchun hisobga olinmaydi.
              </p>
            </div>
          )}

          {/* ─────────── OY KUNLARI ─────────── */}
          {tab === 'days' && (
            <div className="space-y-4">
              {!dayPattern.reliable && (
                <NotEnough
                  text={`Kunlik naqsh uchun kamida 3 ta tugallangan oy kerak — hozir ${dayPattern.monthsUsed} ta bor. Raqamlar ko'rsatilyapti, lekin naqsh hali barqaror emas.`}
                />
              )}

              {dayPattern.days.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Hali ma'lumot yo'q.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5">
                    {dayPattern.thirds.map((t) => (
                      <div
                        key={t.label}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {t.label} kun
                        </p>
                        <p className="text-base font-black text-slate-800 font-display mt-0.5 tabular-nums">
                          {t.pct.toFixed(0)}%
                        </p>
                        <p className="text-[9px] font-semibold text-slate-400">
                          {formatCompact(t.total)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {dayPattern.best && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">
                          Eng samarali kun
                        </p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">
                          Oyning {dayPattern.best.day}-kuni
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-violet-600 tabular-nums">
                          {formatCompact(dayPattern.best.avg)}
                        </p>
                        <p className="text-[10px] font-bold text-violet-400">
                          o'rtachadan +{((dayPattern.best.index - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Kunlar bo'yicha o'rtacha
                    </p>
                    <div className="flex items-end gap-[3px] h-24">
                      {dayPattern.days.map((d) => (
                        <div
                          key={d.day}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${Math.max((d.avg / maxDayAvg) * 100, 3)}%`,
                            backgroundColor:
                              d.index >= 1.15
                                ? '#10b981'
                                : d.index <= 0.85
                                ? '#fda4af'
                                : '#a5b4fc',
                          }}
                          title={`${d.day}-kun: ${formatUZS(d.avg)} (${d.samples} ta oy)`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold text-slate-400">
                      <span>1</span>
                      <span>15</span>
                      <span>31</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold mt-2">
                      Yashil — o'rtachadan kuchli kunlar, pushti — zaif. {dayPattern.monthsUsed} ta
                      tugallangan oy asosida.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
