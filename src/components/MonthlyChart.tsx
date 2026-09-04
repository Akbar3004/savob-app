import React, { useState, useMemo } from 'react';
import { MonthlyStats, formatUZS, formatUSD, formatCompact, MONTH_ABBR } from '../types';
import { BarChart3, Heart, TrendingUp, TrendingDown, Wallet, CalendarRange } from 'lucide-react';

interface MonthlyChartProps {
  stats: MonthlyStats[];
  charityPercentage: number;
}

// Ustun ranglari. "Sof" yashil — pastdagi SOF kartasi bilan bir xil;
// "Ehson" oltin — EHSON kartasi bilan bir xil. Oq rang ishlatilmaydi,
// chunki u pastdagi kartalarning hech biriga mos kelmasdi.
const NET_FILL = 'linear-gradient(180deg, #10b981 0%, #047857 100%)';
const CHARITY_FILL = 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)';

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ stats, charityPercentage }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeIdx = hoveredIdx !== null ? Math.min(hoveredIdx, stats.length - 1) : stats.length - 1;
  const active = stats[activeIdx];
  const prev = activeIdx > 0 ? stats[activeIdx - 1] : null;

  // Tanlangan oy qaysi yilga tegishli bo'lsa, o'sha yilning jami summasi
  const year = useMemo(() => {
    if (!active) return null;
    const y = active.monthKey.slice(0, 4);
    const months = stats.filter((s) => s.monthKey.slice(0, 4) === y);
    return {
      label: y,
      uzs: months.reduce((sum, s) => sum + s.totalUZS, 0),
      usd: months.reduce((sum, s) => sum + s.totalUSD, 0),
      count: months.length,
    };
  }, [stats, active]);

  if (stats.length === 0 || !active || !year) {
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

  // O'tgan oyga nisbatan o'zgarish. Taqqoslanadigan oy nomi yozib qo'yiladi —
  // oralig'ida bo'sh oy bo'lsa ham foydalanuvchi nimaga nisbatan ekanini biladi.
  const deltaPct =
    prev && prev.totalUZS > 0 ? ((active.totalUZS - prev.totalUZS) / prev.totalUZS) * 100 : null;
  const up = (deltaPct ?? 0) >= 0;

  return (
    <div className="card-3d-dark p-6 flex flex-col h-full min-h-[380px] text-white">
      {/* ── Sarlavha va legenda ── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-white/10 text-indigo-300 backdrop-blur-sm border border-white/5 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base tracking-wide">Oylik tahlil</h3>
            <p className="text-[11px] text-indigo-300/80 truncate">Daromadlar va ehson ulushi</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200/70 shrink-0">
          <span className="flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm" style={{ background: NET_FILL }} />
            Sof
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm" style={{ background: CHARITY_FILL }} />
            Ehson
          </span>
        </div>
      </div>

      {/* ── Katta raqam (tanlangan oy) + yillik jami ── */}
      <div className="flex items-stretch gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-black uppercase tracking-[.11em] text-indigo-300/80 mb-1">
            {active.monthName} · Jami
          </p>
          <p className="font-display font-bold text-[38px] leading-none tracking-tight tabular-nums">
            {formatCompact(active.totalUZS)}
          </p>
          <p className="text-[11.5px] font-semibold text-indigo-300/85 mt-1.5 tabular-nums">
            {formatUSD(active.totalUSD)} · {active.transactionCount} ta kirim
          </p>
          {deltaPct !== null && prev && (
            <span
              className="inline-flex items-center gap-1 mt-2.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: up ? 'rgba(16,185,129,.16)' : 'rgba(244,63,94,.16)',
                color: up ? '#34d399' : '#fb7185',
              }}
            >
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(deltaPct).toFixed(0)}% · {prev.monthName.split(' ')[0]}ga nisbatan
            </span>
          )}
        </div>

        <div className="w-px bg-white/10 shrink-0" />

        <div className="min-w-0 shrink-0 text-right">
          <p className="text-[9.5px] font-black uppercase tracking-[.11em] text-indigo-300/80 mb-1 flex items-center justify-end gap-1">
            <CalendarRange className="w-3 h-3" />
            {year.label} yil · Jami
          </p>
          <p className="font-display font-bold text-[25px] leading-none tracking-tight text-indigo-100 tabular-nums">
            {formatCompact(year.uzs)}
          </p>
          <p className="text-[11px] font-semibold text-indigo-300/70 mt-1.5 tabular-nums">
            {formatUSD(year.usd)}
          </p>
          <p className="text-[10px] font-semibold text-indigo-300/50 mt-0.5">
            {year.count} oy ma'lumoti
          </p>
        </div>
      </div>

      {/* ── Ustunli grafik ── */}
      <div className="flex-1 min-h-[150px] grid grid-cols-[42px_1fr] gap-2.5">
        {/* O'lchov raqamlari */}
        <div className="flex flex-col justify-between items-end pb-5 text-[9.5px] font-bold text-indigo-300/55 tabular-nums">
          <span>{formatCompact(maxTotal)}</span>
          <span>{formatCompact(maxTotal / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative flex items-stretch gap-2.5 pb-5">
          {/* Xira gorizontal chiziqlar */}
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed border-white/[0.07]" />
            <div className="border-t border-dashed border-white/[0.07]" />
            <div className="border-t border-dashed border-white/[0.07]" />
          </div>

          {stats.map((item, idx) => {
            const barPct = (item.totalUZS / maxTotal) * 100;
            // Ehson ulushi ustun ICHIDAGI foiz sifatida
            const charityOfBar =
              item.totalUZS > 0 ? (item.charityUZS / item.totalUZS) * 100 : 0;
            const isActive = activeIdx === idx;

            return (
              <div
                key={item.monthKey}
                className="relative flex-1 flex flex-col justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(idx)}
                title={`${item.monthName} — ${formatUZS(item.totalUZS)} (ehson ${formatUZS(item.charityUZS)})`}
              >
                {/* Ustun orqasidagi xira yo'lak */}
                <div
                  className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[58px] rounded-xl transition-colors ${
                    isActive ? 'bg-white/[0.075]' : 'bg-white/[0.035] group-hover:bg-white/[0.06]'
                  }`}
                />

                {/* Tanlangan ustun tepasidagi summa */}
                <span
                  className={`absolute inset-x-0 text-center font-display font-bold text-[11px] tabular-nums transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ bottom: `calc(${barPct}% + 4px)` }}
                >
                  {formatCompact(item.totalUZS)}
                </span>

                {/* Ustun: pastda sof, tepada ehson, orasida 2px tirqish */}
                <div
                  className={`relative self-center w-full max-w-[58px] flex flex-col justify-end gap-0.5 px-[7px] pb-1.5 bar-animated transition-[filter] ${
                    isActive ? '' : 'saturate-[.55] brightness-[.82]'
                  }`}
                  style={{ height: `${barPct}%`, animationDelay: `${idx * 0.08}s` }}
                >
                  {item.charityUZS > 0 && (
                    <div
                      className="w-full rounded shrink-0"
                      style={{
                        height: `${charityOfBar}%`,
                        minHeight: 3,
                        background: CHARITY_FILL,
                      }}
                    />
                  )}
                  <div className="w-full flex-1 rounded" style={{ background: NET_FILL }} />
                </div>

                {/* Oy qisqartmasi */}
                <span
                  className={`absolute inset-x-0 -bottom-5 text-center text-[10px] font-bold font-display uppercase tracking-wider transition-colors ${
                    isActive ? 'text-white' : 'text-indigo-300/50'
                  }`}
                >
                  {MONTH_ABBR[item.monthKey.slice(5, 7)] || item.monthName.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tanlangan oyning taqsimoti ── */}
      <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/10">
        <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
          <p className="text-[9px] text-indigo-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Jami
          </p>
          <p className="text-sm font-black font-display text-white tabular-nums">
            {formatCompact(active.totalUZS)}
          </p>
          <p className="text-[10px] font-semibold text-indigo-300 tabular-nums">
            {formatUSD(active.totalUSD)}
          </p>
        </div>
        <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
          <p className="text-[9px] text-amber-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
            <Heart className="w-3 h-3 fill-current" /> Ehson ({charityPercentage}%)
          </p>
          <p className="text-sm font-black font-display text-amber-400 tabular-nums">
            {formatCompact(active.charityUZS)}
          </p>
          <p className="text-[10px] font-semibold text-amber-300/70 tabular-nums">
            {formatUSD(active.charityUSD)}
          </p>
        </div>
        <div className="bg-white/[0.04] p-3 rounded-xl border border-white/5">
          <p className="text-[9px] text-emerald-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Sof
          </p>
          <p className="text-sm font-black font-display text-emerald-400 tabular-nums">
            {formatCompact(active.netUZS)}
          </p>
          <p className="text-[10px] font-semibold text-emerald-300/70 tabular-nums">
            {formatUSD(active.netUSD)}
          </p>
        </div>
      </div>
    </div>
  );
};
