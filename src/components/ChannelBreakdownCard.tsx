import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Layers, User, Youtube, Heart } from 'lucide-react';
import {
  Transaction,
  Channel,
  SelfChannel,
  Payouts,
  PayoutFactors,
  formatUZS,
  formatUSD,
  MONTH_NAMES,
  txUZS,
  txUSD,
  isSelfTx,
  channelInfo,
  SELF_CHANNEL_ID,
} from '../types';

interface ChannelBreakdownCardProps {
  /** Tanlangan davr bo'yicha allaqachon filtrlangan yozuvlar. */
  transactions: Transaction[];
  channels: Channel[];
  selfChannel: SelfChannel | undefined;
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  /** "YYYY-MM" yoki "all" — faqat sarlavhada ko'rsatiladi. */
  period: string;
}

const periodLabel = (p: string) => {
  if (p === 'all') return 'Barcha davr';
  const [y, m] = p.split('-');
  return `${MONTH_NAMES[m] || m} ${y}`;
};

export const ChannelBreakdownCard: React.FC<ChannelBreakdownCardProps> = ({
  transactions,
  channels,
  selfChannel,
  charityPercentage,
  exchangeRate,
  payouts,
  factors,
  period,
}) => {
  const rows = useMemo(() => {
    const acc: {
      [id: string]: { uzs: number; usd: number; charityUZS: number; count: number };
    } = {};

    transactions.forEach((t) => {
      const id = isSelfTx(t) ? SELF_CHANNEL_ID : t.channelId!;
      if (!acc[id]) acc[id] = { uzs: 0, usd: 0, charityUZS: 0, count: 0 };
      const uzs = txUZS(t, payouts, exchangeRate, factors);
      acc[id].uzs += uzs;
      acc[id].usd += txUSD(t, payouts, exchangeRate, factors);
      // Ehson faqat shaxsiy kanaldan ushlanadi
      if (isSelfTx(t)) acc[id].charityUZS += (uzs * charityPercentage) / 100;
      acc[id].count += 1;
    });

    const total = Object.values(acc).reduce((s, v) => s + v.uzs, 0);

    return Object.keys(acc)
      .map((id) => {
        const info = channelInfo(id === SELF_CHANNEL_ID ? undefined : id, channels, selfChannel);
        return {
          ...info,
          ...acc[id],
          pct: total > 0 ? (acc[id].uzs / total) * 100 : 0,
        };
      })
      // Eng ko'p daromad keltirgani doim yuqorida
      .sort((a, b) => b.uzs - a.uzs);
  }, [transactions, channels, selfChannel, charityPercentage, exchangeRate, payouts, factors]);

  const totalUZS = rows.reduce((s, r) => s + r.uzs, 0);

  if (rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-3d p-6 relative overflow-hidden mb-8"
    >
      <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-r from-sky-500 to-indigo-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-5 relative z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-100 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-slate-800 text-base">Kanallar kesimi</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              {periodLabel(period)} · eng ko'p daromad yuqorida
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-slate-800 font-display">{formatUZS(totalUZS)}</p>
          <p className="text-[10px] font-bold text-slate-400">{rows.length} ta kanal</p>
        </div>
      </div>

      <div className="space-y-3.5 relative z-10">
        {rows.map((r, i) => (
          <div key={r.id}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-black text-slate-300 w-4 shrink-0">{i + 1}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                {r.isSelf ? (
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                ) : (
                  <Youtube className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-700 truncate">{r.name}</span>
                {r.isSelf && (
                  <span className="hidden sm:inline text-[9px] font-black text-amber-500 uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                    Ehsonli
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-slate-800 font-display tabular-nums">
                  {formatUZS(r.uzs)}
                </p>
                <p className="text-[10px] font-semibold text-indigo-400 tabular-nums">
                  {formatUSD(r.usd)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.pct}%` }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: r.color }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[10px] font-bold text-slate-400 tabular-nums">
                {r.pct.toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 pl-6">
              <span className="text-[9px] font-semibold text-slate-400">
                {r.count} ta yozuv
              </span>
              {r.charityUZS > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500">
                  <Heart className="w-2.5 h-2.5 fill-current" />
                  {formatUZS(r.charityUZS)} ehson
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
