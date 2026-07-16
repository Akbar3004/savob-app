import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Wallet, Heart, TrendingUp, BarChart3, Percent, Check, Download } from 'lucide-react';
import { Transaction, CATEGORIES, formatUZS, formatUSD } from '../types';
import { jsPDF } from 'jspdf';

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

  const RANGE_LABELS: { [key in RangeType]: string } = {
    today: 'Bugungi hisobot',
    week: 'Haftalik hisobot',
    month: 'Joriy oylik hisobot',
    prev_month: "O'tgan oylik hisobot",
    all: 'Barcha davrlar hisoboti',
    custom: 'Maxsus davr hisoboti',
  };

  // Designed statistics PDF (A4, one page)
  const handleDownloadPDF = () => {
    if (dateFilteredTransactions.length === 0) {
      alert("Tanlangan davr uchun hech qanday ma'lumot topilmadi.");
      return;
    }

    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    };

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 14; // page margin
    const CW = W - M * 2; // content width

    // ===== Header band =====
    doc.setFillColor(30, 27, 75); // indigo-950
    doc.rect(0, 0, W, 42, 'F');
    // Tricolor accent strip under the header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 42, W / 3, 1.8, 'F');
    doc.setFillColor(245, 158, 11);
    doc.rect(W / 3, 42, W / 3, 1.8, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect((W / 3) * 2, 42, W / 3, 1.8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('SAVOB APP', M, 19);
    doc.setTextColor(165, 180, 252);
    doc.setFontSize(10);
    doc.text('STATISTIKA HISOBOTI', M, 27);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.line(M, 31, M + 40, 31);

    doc.setTextColor(199, 210, 254);
    doc.setFontSize(9);
    doc.text(RANGE_LABELS[rangeType], W - M, 19, { align: 'right' });
    if (rangeType === 'custom' && (customStart || customEnd)) {
      doc.text(`${customStart || '...'} — ${customEnd || '...'}`, W - M, 25, { align: 'right' });
    }
    doc.setTextColor(129, 140, 248);
    doc.setFontSize(8);
    doc.text(`Tayyorlandi: ${new Date().toISOString().split('T')[0]}`, W - M, rangeType === 'custom' ? 31 : 25, { align: 'right' });

    // ===== Metric cards =====
    const cardY = 52;
    const cardH = 28;
    const gap = 6;
    const cardW = (CW - gap * 2) / 3;
    const cards: { label: string; uzs: string; usd: string; accent: [number, number, number]; bg: [number, number, number]; dark: [number, number, number] }[] = [
      { label: 'JAMI DAROMAD', uzs: formatUZS(stats.totalUZS), usd: formatUSD(stats.totalUSD), accent: [99, 102, 241], bg: [238, 242, 255], dark: [30, 27, 75] },
      { label: 'HISOBLANGAN HAYRIYA', uzs: formatUZS(stats.charityUZS), usd: formatUSD(stats.charityUSD), accent: [245, 158, 11], bg: [255, 251, 235], dark: [69, 26, 3] },
      { label: "SOF JAMG'ARMA", uzs: formatUZS(stats.netUZS), usd: formatUSD(stats.netUSD), accent: [16, 185, 129], bg: [236, 253, 245], dark: [2, 44, 34] },
    ];

    cards.forEach((c, i) => {
      const x = M + i * (cardW + gap);
      doc.setFillColor(...c.bg);
      doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'F');
      doc.setFillColor(...c.accent);
      doc.roundedRect(x, cardY, 1.6, cardH, 0.8, 0.8, 'F');

      doc.setTextColor(...c.accent);
      doc.setFontSize(6.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(c.label, x + 5, cardY + 7);

      doc.setTextColor(...c.dark);
      doc.setFontSize(11.5);
      doc.text(c.uzs, x + 5, cardY + 15.5);

      doc.setTextColor(...c.accent);
      doc.setFontSize(8.5);
      doc.text(c.usd, x + 5, cardY + 22.5);
    });

    // ===== Category breakdown =====
    let y = cardY + cardH + 14;
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(M, y - 4, 2.5, 5, 0.6, 0.6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('Kategoriya ulushlari', M + 5.5, y);
    y += 8;

    stats.breakdownList.forEach((item) => {
      const [r, g, b] = hexToRgb(item.color);

      // Color dot + label
      doc.setFillColor(r, g, b);
      doc.circle(M + 2, y - 1, 1.6, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(item.label, M + 6.5, y);
      // Measure label width while the bold 9.5pt font is still active
      const labelWidth = doc.getTextWidth(item.label);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text(`(${item.count} ta kirim)`, M + 6.5 + labelWidth + 2.5, y);

      // Amount + percent (right)
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(formatUZS(item.amount), W - M, y, { align: 'right' });
      doc.setTextColor(r, g, b);
      doc.setFontSize(8);
      doc.text(`${item.percentage.toFixed(1)}%`, W - M, y + 4.5, { align: 'right' });

      // Progress bar
      const barY = y + 3;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(M, barY, CW - 30, 2.2, 1.1, 1.1, 'F');
      const fillW = Math.max(((CW - 30) * item.percentage) / 100, 2.2);
      doc.setFillColor(r, g, b);
      doc.roundedRect(M, barY, fillW, 2.2, 1.1, 1.1, 'F');

      y += 13.5;
    });

    // ===== Monthly dynamics (bar chart) =====
    const monthGroups: { [key: string]: { total: number; charity: number } } = {};
    dateFilteredTransactions.forEach((t) => {
      const mk = t.date.slice(0, 7);
      if (!monthGroups[mk]) monthGroups[mk] = { total: 0, charity: 0 };
      const u = toUZS(t);
      monthGroups[mk].total += u;
      monthGroups[mk].charity += (u * t.charityPercentage) / 100;
    });
    const monthKeys = Object.keys(monthGroups).sort().slice(-12);

    if (monthKeys.length > 1) {
      y += 6;
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(M, y - 4, 2.5, 5, 0.6, 0.6, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('Oylik dinamika', M + 5.5, y);
      y += 6;

      const chartH = 34;
      const chartTop = y;
      const maxTotal = Math.max(...monthKeys.map((k) => monthGroups[k].total), 1);
      const slotW = CW / monthKeys.length;
      const barW = Math.min(slotW * 0.5, 14);

      // Baseline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(M, chartTop + chartH, M + CW, chartTop + chartH);

      monthKeys.forEach((mk, i) => {
        const g = monthGroups[mk];
        const x = M + i * slotW + (slotW - barW) / 2;
        const totalH = Math.max((g.total / maxTotal) * chartH, 1.5);
        const charityH = Math.max((g.charity / g.total) * totalH, 1);
        const netH = totalH - charityH;

        // Net (indigo, bottom) + charity (amber, top)
        doc.setFillColor(99, 102, 241);
        doc.rect(x, chartTop + chartH - netH, barW, netH, 'F');
        doc.setFillColor(245, 158, 11);
        doc.rect(x, chartTop + chartH - totalH, barW, charityH, 'F');

        const [yy, mm] = mk.split('-');
        // Iyun/Iyul share the same first 3 letters, so use distinct short names
        const MONTH_SHORT: { [key: string]: string } = {
          '01': 'Yan', '02': 'Fev', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Iyn',
          '07': 'Iyl', '08': 'Avg', '09': 'Sen', '10': 'Okt', '11': 'Noy', '12': 'Dek',
        };
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(`${MONTH_SHORT[mm] || mm} ${yy.slice(2)}`, x + barW / 2, chartTop + chartH + 4.5, { align: 'center' });
      });

      // Legend
      const legendY = chartTop + chartH + 10;
      doc.setFillColor(99, 102, 241);
      doc.rect(M, legendY - 2, 3, 3, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text("Sof jamg'arma", M + 5, legendY + 0.5);
      doc.setFillColor(245, 158, 11);
      doc.rect(M + 32, legendY - 2, 3, 3, 'F');
      doc.text('Hayriya ulushi', M + 37, legendY + 0.5);

      y = legendY + 8;
    } else {
      y += 4;
    }

    // ===== Summary box =====
    const boxH = 30;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, 'S');

    const col = CW / 3;
    const summaryItems = [
      { label: 'TUSHUMLAR SONI', value: `${stats.count} ta` },
      { label: "O'RTACHA KIRIM", value: stats.count > 0 ? formatUZS(stats.totalUZS / stats.count) : "0 so'm" },
      { label: 'TOP KATEGORIYA', value: stats.breakdownList[0] ? stats.breakdownList[0].label : 'Mavjud emas' },
    ];
    summaryItems.forEach((s, i) => {
      const cx = M + col * i + col / 2;
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(6.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(s.label, cx, y + 10, { align: 'center' });
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text(s.value, cx, y + 19, { align: 'center' });
      if (i > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.line(M + col * i, y + 6, M + col * i, y + boxH - 6);
      }
    });

    // ===== Footer =====
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M, 285, W - M, 285);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text('savob-app.vercel.app — SAVOB APP orqali avtomatik tayyorlandi', W / 2, 290, { align: 'center' });

    doc.save(`Savob_Statistika_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
          <div className="flex items-center justify-between gap-3 mb-6 relative z-10 border-b border-slate-100 pb-4 pr-10">
            <div className="flex items-center gap-3">
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

            <button
              onClick={handleDownloadPDF}
              disabled={dateFilteredTransactions.length === 0}
              className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 shrink-0"
              title="Statistikani chiroyli PDF formatida yuklab olish"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF yuklab olish</span>
            </button>
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
