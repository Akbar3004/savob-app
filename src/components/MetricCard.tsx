import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  valueUZS: string;
  valueUSD: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  delay?: number;
  comparePct?: number | null;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  valueUZS,
  valueUSD,
  icon,
  gradient,
  iconBg,
  delay = 0,
  comparePct,
  children,
}) => {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 100 }}
      className="metric-card-3d card-3d p-6 flex flex-col justify-between h-full"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Background glow */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${gradient} pointer-events-none`} />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] font-display">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${iconBg} text-white shadow-lg`}
          style={{ transform: 'translateZ(10px)' }}>
          {icon}
        </div>
      </div>

      <div className="relative z-10" style={{ transform: 'translateZ(5px)' }}>
        {/* UZS value - primary */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-2xl md:text-3xl font-black font-display tracking-tight text-slate-800 leading-tight">
            {valueUZS}
          </h3>
          
          {/* Comparison Percentage Indicator */}
          {comparePct !== undefined && comparePct !== null && (
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
              comparePct >= 0 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              {comparePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {comparePct >= 0 ? '+' : ''}{comparePct.toFixed(1)}%
            </span>
          )}
        </div>

        {/* USD value - secondary */}
        <p className="text-sm font-bold text-indigo-500 font-display mt-0.5">
          {valueUSD}
        </p>

        {children && <div className="mt-3">{children}</div>}
      </div>
    </motion.div>
  );
};
