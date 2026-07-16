import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Wallet, Heart, TrendingUp, BarChart3, Percent, Check } from 'lucide-react';
import { Transaction, CATEGORIES, formatUZS, formatUSD } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  exchangeRate: number;
}

type RangeType = 'today' | 'week' | 'month' | 'prev_month' | 'all' | 'custom';

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
}) => {
  const [rangeType, setRangeType] = useState<RangeType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const toUZS = (t: Transaction) => t.currency === 'USD' ? t.amount * exchangeRate : t.amount;
  const toUSD = (t: Transaction) => t.currency === 'UZS' ? t.amount / exchangeRate : t.amount;

  const dateFilteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get start of week
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekStr = new Date(now.setDate(diff)).toISOString().split('T')[0];

    // Get current month prefix
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Get previous month prefix
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    return transactions.filter((t) => {
      if (rangeType === 'today') {
        return t.date === todayStr;
      }
      if (rangeType === 'week') {
        return t.date >= startOfWeekStr && t.date <= todayStr;
      }
      if (rangeType === 'month') {
        return t.date.startsWith(currentMonthPrefix);
      }
      if (rangeType === 'prev_month') {
        return t.date.startsWith(prevMonthPrefix);
      }
      if (rangeType === 'custom') {
        if (customStart && customEnd) {
          return t.date >= customStart && t.date <= customEnd;
        }
        if (customStart) {
          return t.date >= customStart;
        }
        if (customEnd) {
          return t.date <= customEnd;
        }
      }
      return true; // 'all'
    });
  }, [transactions, rangeType, customStart, customEnd]);

  // Calculations
  const stats = useMemo(() => {
    let totalUZS = 0;
    let totalUSD = 0;
    let charityUZS = 0;
    let charityUSD = 0;

    const categoryBreakdown: { [catId: string]: { uzs: number; count: number } } = {};

    dateFilteredTransactions.forEach((t) => {
      const u = toUZS(t);
      const d = toUSD(t);
      const cU = (u * t.charityPercentage) / 100;
      const cD = (d * t.charityPercentage) / 100;

      totalUZS += u;
      totalUSD += d;
      charityUZS += cU;
      charityUSD += cD;

      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { uzs: 0, count: 0 };
      }
      categoryBreakdown[t.category].uzs += u;
      categoryBreakdown[t.category].count += 1;
    });

    const netUZS = totalUZS - charityUZS;
    const netUSD = totalUSD - charityUSD;

    const breakdownList = Object.keys(categoryBreakdown).map((catId) => {
      const cat = CATEGORIES.find((c) => c.id === catId);
      const amount = categoryBreakdown[catId].uzs;
      return {
        id: catId,
        label: cat?.label || 'Boshqa',
        icon: cat?.icon || '📦',
        color: cat?.color || '#6B7280',
        amount,
        percentage: totalUZS > 0 ? (amount / totalUZS) * 100 : 0,
        count: categoryBreakdown[catId].count,
      };
    }).sort((a, b) => b.amount - a.amount);

    return {
      totalUZS,
      totalUSD,
      charityUZS,
      charityUSD,
      netUZS,
      netUSD,
      breakdownList,
      count: dateFilteredTransactions.length,
    };
  }, [dateFilteredTransactions, exchangeRate]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-4xl w-full p-6 md:p-8 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">
                Batafsil Statistika
              </h2>
              <p className="text-xs text-slate-400 font-semibold">Tushumlar va ehson tahlili</p>
            </div>
          </div>

          {/* Filter Range Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-6 relative z-10">
            {(
              [
                { id: 'today', label: 'Bugun' },
                { id: 'week', label: 'Shu hafta' },
                { id: 'month', label: 'Shu oy' },
                { id: 'prev_month', label: 'O\'tgan oy' },
                { id: 'all', label: 'Barchasi' },
                { id: 'custom', label: 'Maxsus' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setRangeType(item.id)}
                className={`py-2 px-1 text-2xs font-bold rounded-xl border transition-all text-center ${
                  rangeType === item.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {rangeType === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-2 gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 relative z-10"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Boshlanish sanasi</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tugash sanasi</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>
            </motion.div>
          )}

          {/* Metric Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
            <div className="p-5 bg-gradient-to-tr from-indigo-50 to-indigo-100/50 border border-indigo-100/60 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Jami daromad</span>
                <Wallet className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-xl font-black font-display text-indigo-950">{formatUZS(stats.totalUZS)}</h3>
              <p className="text-xs font-bold text-indigo-500 mt-0.5">{formatUSD(stats.totalUSD)}</p>
            </div>

            <div className="p-5 bg-gradient-to-tr from-amber-50 to-amber-100/50 border border-amber-100/60 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Hisoblangan hayriya</span>
                <Heart className="w-4 h-4 text-amber-500 fill-current" />
              </div>
              <h3 className="text-xl font-black font-display text-amber-950">{formatUZS(stats.charityUZS)}</h3>
              <p className="text-xs font-bold text-amber-600 mt-0.5">{formatUSD(stats.charityUSD)}</p>
            </div>

            <div className="p-5 bg-gradient-to-tr from-emerald-50 to-emerald-100/50 border border-emerald-100/60 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Sof jamg'arma</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black font-display text-emerald-950">{formatUZS(stats.netUZS)}</h3>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatUSD(stats.netUSD)}</p>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Category list */}
            <div>
              <h4 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-indigo-500" /> Kategoriya ulushlari
              </h4>
              {stats.breakdownList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Ushbu davrda tushumlar mavjud emas.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.breakdownList.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-bold text-slate-700">{item.label}</span>
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded">
                            {item.count} ta
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 block">{formatUZS(item.amount)}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{item.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Indicators */}
            <div className="flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-sm text-slate-700 mb-3">
                  💡 Jamlanma ma'lumot
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5 text-xs text-slate-500 leading-normal">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span>Tushumlar soni:</span>
                    <strong className="text-slate-800">{stats.count} ta</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span>O'rtacha kirim miqdori:</span>
                    <strong className="text-slate-800">
                      {stats.count > 0 ? formatUZS(stats.totalUZS / stats.count) : "0 so'm"}
                    </strong>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>Eng ko'p daromad keltirgan kategoriya:</span>
                    <strong className="text-indigo-600">
                      {stats.breakdownList[0] ? `${stats.breakdownList[0].icon} ${stats.breakdownList[0].label}` : "Mavjud emas"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Status summary */}
              <div className="p-4 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl border border-indigo-100/40 text-3xs font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
                📊 Hisobotlar avtomatik real vaqtda hisoblanadi
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
