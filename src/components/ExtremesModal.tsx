import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gauge, ArrowUpCircle, ArrowDownCircle, Equal, CalendarDays, CalendarRange } from 'lucide-react';
import { Transaction, Payouts, CATEGORIES, formatUZS, formatUSD, txUZS, txUSD } from '../types';

interface ExtremesModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  exchangeRate: number;
  payouts: Payouts;
}

interface PeriodAnalysis {
  maxTx: Transaction;
  minTx: Transaction;
  avgUZS: number;
  avgUSD: number;
  count: number;
}

export const ExtremesModal: React.FC<ExtremesModalProps> = ({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  payouts,
}) => {
  const toUZS = (t: Transaction) => txUZS(t, payouts, exchangeRate);
  const toUSD = (t: Transaction) => txUSD(t, payouts, exchangeRate);

  const analyze = (txs: Transaction[]): PeriodAnalysis | null => {
    if (txs.length === 0) return null;
    let maxTx = txs[0];
    let minTx = txs[0];
    let sum = 0;
    txs.forEach((t) => {
      const u = toUZS(t);
      sum += u;
      if (u > toUZS(maxTx)) maxTx = t;
      if (u < toUZS(minTx)) minTx = t;
    });
    const avgUZS = sum / txs.length;
    return { maxTx, minTx, avgUZS, avgUSD: avgUZS / exchangeRate, count: txs.length };
  };

  const { monthStats, yearStats, monthLabel, yearLabel } = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const yearPrefix = new Date().toISOString().slice(0, 4); // YYYY
    return {
      monthStats: analyze(transactions.filter((t) => t.date.startsWith(monthPrefix))),
      yearStats: analyze(transactions.filter((t) => t.date.startsWith(yearPrefix))),
      monthLabel: 'Shu oy',
      yearLabel: `${yearPrefix}-yil`,
    };
  }, [transactions, exchangeRate]);

  const getCatLabel = (catId: string) =>
    CATEGORIES.find((c) => c.id === catId)?.label || 'Boshqa';

  if (!isOpen) return null;

  const renderStatRow = (
    icon: React.ReactNode,
    label: string,
    uzs: number,
    usd: number,
    sub: string | null,
    colorClasses: { bg: string; label: string; value: string; sub: string }
  ) => (
    <div className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${colorClasses.bg}`}>
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-wider ${colorClasses.label}`}>{label}</p>
          {sub && <p className={`text-[9px] font-semibold mt-0.5 truncate ${colorClasses.sub}`}>{sub}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black font-display ${colorClasses.value}`}>{formatUZS(uzs)}</p>
        <p className={`text-[10px] font-bold ${colorClasses.sub}`}>{formatUSD(usd)}</p>
      </div>
    </div>
  );

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    data: PeriodAnalysis | null
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display font-bold text-sm text-slate-700 flex items-center gap-1.5">
          {icon} {title}
        </h4>
        {data && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {data.count} ta kirim
          </span>
        )}
      </div>
      {!data ? (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Ushbu davrda kirimlar mavjud emas.
        </div>
      ) : (
        <div className="space-y-2">
          {renderStatRow(
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />,
            'Eng katta kirim',
            toUZS(data.maxTx),
            toUSD(data.maxTx),
            `${data.maxTx.date} · ${getCatLabel(data.maxTx.category)}`,
            { bg: 'bg-emerald-50/60 border-emerald-100', label: 'text-emerald-600', value: 'text-emerald-700', sub: 'text-emerald-500/70' }
          )}
          {renderStatRow(
            <ArrowDownCircle className="w-4 h-4 text-rose-500" />,
            'Eng kichik kirim',
            toUZS(data.minTx),
            toUSD(data.minTx),
            `${data.minTx.date} · ${getCatLabel(data.minTx.category)}`,
            { bg: 'bg-rose-50/60 border-rose-100', label: 'text-rose-600', value: 'text-rose-700', sub: 'text-rose-400' }
          )}
          {renderStatRow(
            <Equal className="w-4 h-4 text-indigo-500" />,
            "O'rtacha kirim",
            data.avgUZS,
            data.avgUSD,
            'Bir kirimga to\'g\'ri keladigan o\'rtacha',
            { bg: 'bg-indigo-50/60 border-indigo-100', label: 'text-indigo-600', value: 'text-indigo-700', sub: 'text-indigo-400' }
          )}
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-md w-full p-6 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh]"
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
          <div className="flex items-center gap-3 mb-5 relative z-10 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-slate-800">Shaxsiy Tahlil</h2>
              <p className="text-xs text-slate-400 font-semibold">Eng katta, eng kichik va o'rtacha kirimlar</p>
            </div>
          </div>

          <div className="space-y-5 relative z-10">
            {renderSection(monthLabel, <CalendarDays className="w-4 h-4 text-indigo-500" />, monthStats)}
            {renderSection(yearLabel, <CalendarRange className="w-4 h-4 text-purple-500" />, yearStats)}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
