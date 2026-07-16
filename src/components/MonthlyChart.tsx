import React, { useState } from 'react';
import { MonthlyStats, formatUZS, formatUSD, formatCompact } from '../types';
import { BarChart3, Heart, TrendingUp, ArrowUpRight } from 'lucide-react';

interface MonthlyChartProps {
  stats: MonthlyStats[];
  charityPercentage: number;
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ stats, charityPercentage }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (stats.length === 0) {
    return (
      <div className="card-3d-dark p-8 h-full flex flex-col items-center justify-center min-h-[380px]">
        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 mb-5 border border-white/10 float-animation">
          <BarChart3 className="w-10 h-10" />
        </div>
        <h4 className="font-display font-bold text-white text-lg mb-2">Oylik statistika mavjud emas</h4>
        <p className="text-sm text-indigo-300 text-center max-w-[300px]">
          Statistika shakllanishi uchun kamida bitta tushum summasini kiriting.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...stats.map((s) => s.totalUZS), 1);
  const activeIdx = hoveredIdx !== null ? hoveredIdx : stats.length - 1;
  const activeStat = stats[activeIdx];

  return (
    <div className="card-3d-dark p-6 flex flex-col justify-between h-full min-h-[380px] text-white">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-indigo-300 backdrop-blur-sm border border-white/5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base tracking-wide">Oylik tahlil</h3>
              <p className="text-[11px] text-indigo-300/80">Daromadlar va ehson ulushi</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-indigo-800/60 text-white rounded-full text-[11px] font-bold border border-indigo-600/30 backdrop-blur-sm">
            {charityPercentage}% Hayriya
          </span>
        </div>

        {/* Chart Bars */}
        <div className="relative pt-4 px-1">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="border-b border-white/5 w-full" />
            ))}
          </div>

          <div className="flex justify-between items-end gap-2 h-[160px] border-b border-white/10 pb-1 relative z-10">
            {stats.map((item, idx) => {
              const totalHeightPercent = (item.totalUZS / maxTotal) * 100;
              const charityHeightPercent = (item.charityUZS / item.totalUZS) * totalHeightPercent;
              const netHeightPercent = totalHeightPercent - charityHeightPercent;
              const isActive = activeIdx === idx;

              return (
                <div
                  key={item.monthKey}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip */}
                  <div className={`absolute bottom-full mb-3 z-20 bg-slate-900/95 backdrop-blur-md text-white text-[11px] p-4 rounded-2xl shadow-2xl border border-slate-700/50 pointer-events-none min-w-[180px] transition-all duration-300 ${
                    hoveredIdx === idx ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90 invisible'
                  }`}>
                    <p className="font-bold text-white border-b border-slate-700 pb-2 mb-2 text-xs">
                      📅 {item.monthName}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">Jami:</span>
                        <div className="text-right">
                          <span className="font-bold block">{formatUZS(item.totalUZS)}</span>
                          <span className="text-indigo-300 text-[10px]">{formatUSD(item.totalUSD)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-amber-400">Ehson:</span>
                        <div className="text-right">
                          <span className="font-bold text-amber-300 block">{formatUZS(item.charityUZS)}</span>
                          <span className="text-amber-400/70 text-[10px]">{formatUSD(item.charityUSD)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-emerald-400">Sof:</span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-300 block">{formatUZS(item.netUZS)}</span>
                          <span className="text-emerald-400/70 text-[10px]">{formatUSD(item.netUSD)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between gap-6 pt-1 border-t border-slate-700/50">
                        <span className="text-slate-500">Kirimlar:</span>
                        <span className="font-bold text-white">{item.transactionCount} ta</span>
                      </div>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className={`w-full max-w-[32px] flex flex-col justify-end h-[130px] rounded-t-lg overflow-hidden transition-all duration-300 bar-animated ${
                    isActive ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : ''
                  }`} style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div
                      style={{ height: `${Math.max(charityHeightPercent, 2)}%` }}
                      className={`w-full transition-all duration-300 ${isActive ? 'bg-amber-400' : 'bg-amber-500/60'}`}
                    />
                    <div
                      style={{ height: `${Math.max(netHeightPercent, 2)}%` }}
                      className={`w-full transition-all duration-300 ${isActive ? 'bg-white' : 'bg-white/20'}`}
                    />
                  </div>

                  {/* X-axis label */}
                  <span className={`text-[10px] font-bold mt-2.5 font-display uppercase tracking-wider transition-all ${
                    isActive ? 'text-white' : 'text-indigo-300/50'
                  }`}>
                    {item.monthName.split(' ')[0].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-6 border-t border-white/10 pt-5 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-indigo-200">
          <span className="font-bold tracking-wide uppercase flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            {activeStat.monthName}
          </span>
          <span className="text-indigo-300/60 text-[10px]">
            {hoveredIdx !== null ? 'Tanlangan oy' : 'Oxirgi oy'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" />
              <p className="text-[9px] text-indigo-300 uppercase font-bold tracking-wider">Jami</p>
            </div>
            <p className="text-sm font-black font-display text-white">{formatCompact(activeStat.totalUZS)}</p>
            <p className="text-[10px] font-semibold text-indigo-300">{formatUSD(activeStat.totalUSD)}</p>
          </div>
          <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <Heart className="w-3 h-3 text-amber-400 fill-current" />
              <p className="text-[9px] text-amber-300 uppercase font-bold tracking-wider">Ehson</p>
            </div>
            <p className="text-sm font-black font-display text-amber-400">{formatCompact(activeStat.charityUZS)}</p>
            <p className="text-[10px] font-semibold text-amber-300/70">{formatUSD(activeStat.charityUSD)}</p>
          </div>
          <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <p className="text-[9px] text-emerald-300 uppercase font-bold tracking-wider">Sof</p>
            </div>
            <p className="text-sm font-black font-display text-emerald-400">{formatCompact(activeStat.netUZS)}</p>
            <p className="text-[10px] font-semibold text-emerald-300/70">{formatUSD(activeStat.netUSD)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
