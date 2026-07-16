import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, Share2, Download, Flame, Star, Sparkles, Heart } from 'lucide-react';
import { Transaction, CATEGORIES, formatUZS, formatUSD, MONTH_NAMES } from '../types';
import { jsPDF } from 'jspdf';

interface MonthlyWrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  monthKey: string; // YYYY-MM
  exchangeRate: number;
}

export const MonthlyWrapModal: React.FC<MonthlyWrapModalProps> = ({
  isOpen,
  onClose,
  transactions,
  monthKey,
  exchangeRate,
}) => {
  // Parse month name
  const monthName = React.useMemo(() => {
    const [year, month] = monthKey.split('-');
    return `${MONTH_NAMES[month] || month} ${year}`;
  }, [monthKey]);

  // Filter transactions of this month
  const monthTransactions = React.useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(monthKey));
  }, [transactions, monthKey]);

  // Calculate stats
  const wrapStats = React.useMemo(() => {
    let totalUZS = 0;
    let charityUZS = 0;
    let charityPercentage = 10;
    const catAmounts: { [catId: string]: number } = {};

    monthTransactions.forEach((t) => {
      const amt = t.currency === 'USD' ? t.amount * exchangeRate : t.amount;
      totalUZS += amt;
      charityUZS += (amt * t.charityPercentage) / 100;
      charityPercentage = t.charityPercentage;

      catAmounts[t.category] = (catAmounts[t.category] || 0) + amt;
    });

    const netUZS = totalUZS - charityUZS;
    const totalUSD = totalUZS / exchangeRate;
    const charityUSD = charityUZS / exchangeRate;
    const netUSD = netUZS / exchangeRate;

    // Find top category
    let topCatId = '';
    let maxAmt = 0;
    Object.keys(catAmounts).forEach((catId) => {
      if (catAmounts[catId] > maxAmt) {
        maxAmt = catAmounts[catId];
        topCatId = catId;
      }
    });
    const topCat = CATEGORIES.find((c) => c.id === topCatId);

    // Rank title
    let rankTitle = "Saxovatpesha";
    let rankSubtitle = "Ezgulik yo'lida kichik qadamlar";
    let rankEmoji = "🌱";

    if (charityUZS >= 2_000_000) {
      rankTitle = "Saxovat Qiroli";
      rankSubtitle = "Boshqalar hayotini tubdan o'zgartiruvchi saxovat";
      rankEmoji = "👑";
    } else if (charityUZS >= 500_000) {
      rankTitle = "Muruvvat Qahramoni";
      rankSubtitle = "Yaxshilik ulashishni kundalik odat qilgan inson";
      rankEmoji = "🛡️";
    } else if (charityUZS > 0) {
      rankTitle = "Yaxshilik Elchisi";
      rankSubtitle = "Ehsan va muruvvat ulashuvchi saxovatli qalb";
      rankEmoji = "✨";
    }

    return {
      totalUZS,
      totalUSD,
      charityUZS,
      charityUSD,
      netUZS,
      netUSD,
      topCat,
      charityPercentage,
      rankTitle,
      rankSubtitle,
      rankEmoji,
      count: monthTransactions.length,
    };
  }, [monthTransactions, exchangeRate]);

  // Export beautiful PDF wrapped card
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    });

    const w = 148;
    const h = 210;

    // Draw gradient background using boxes
    doc.setFillColor(30, 27, 75); // Dark blue indigo background
    doc.rect(0, 0, w, h, 'F');

    // Draw card border glow
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.rect(5, 5, w - 10, h - 10);

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SAVOB WRAPPED', w / 2, 25, { align: 'center' });

    // Month
    doc.setTextColor(199, 210, 254);
    doc.setFontSize(12);
    doc.text(monthName.toUpperCase() + ' JAMLANMASI', w / 2, 33, { align: 'center' });

    // Rank box decoration
    doc.setFillColor(49, 46, 129);
    doc.roundedRect(15, 45, w - 30, 35, 3, 3, 'F');

    // Rank Badge
    doc.setTextColor(251, 191, 36); // Amber
    doc.setFontSize(11);
    doc.text('SIZNING SHU OYDAGI MAQOMINGIZ', w / 2, 53, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(wrapStats.rankTitle.toUpperCase(), w / 2, 63, { align: 'center' });

    doc.setTextColor(224, 231, 255);
    doc.setFontSize(9);
    doc.text(wrapStats.rankSubtitle, w / 2, 71, { align: 'center' });

    // Stat Items
    const drawStatItem = (label: string, valueUZS: string, valueUSD: string, yPos: number) => {
      doc.setTextColor(165, 180, 252);
      doc.setFontSize(9);
      doc.text(label, 20, yPos);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(valueUZS, w - 20, yPos, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setTextColor(129, 140, 248);
      doc.text(valueUSD, w - 20, yPos + 4.5, { align: 'right' });
    };

    drawStatItem('JAMI JAMG\'ARILGAN MABLAG\'', formatUZS(wrapStats.totalUZS), formatUSD(wrapStats.totalUSD), 98);
    drawStatItem(`AJRATILGAN EHSON ULUSHI (${wrapStats.charityPercentage}%)`, formatUZS(wrapStats.charityUZS), formatUSD(wrapStats.charityUSD), 118);
    drawStatItem('SOF FOYDA (QO\'LDA QOLGAN)', formatUZS(wrapStats.netUZS), formatUSD(wrapStats.netUSD), 138);

    // Top Category
    doc.setDrawColor(49, 46, 129);
    doc.line(20, 160, w - 20, 160);

    doc.setTextColor(165, 180, 252);
    doc.setFontSize(9);
    doc.text('ENG KO\'P DAROMAD KELTIRGAN KATEGORIYA', w / 2, 172, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    const topCatName = wrapStats.topCat ? `${wrapStats.topCat.icon} ${wrapStats.topCat.label}` : 'Mavjud emas';
    doc.text(topCatName.toUpperCase(), w / 2, 180, { align: 'center' });

    // Footer signature
    doc.setTextColor(129, 140, 248);
    doc.setFontSize(8);
    doc.text('savob-app.vercel.app orqali tayyorlandi', w / 2, 198, { align: 'center' });

    doc.save(`Savob_Wrapped_${monthKey}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotateY: 15 }}
          className="card-3d max-w-sm w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white p-6 relative overflow-hidden shadow-2xl border border-indigo-500/20 flex flex-col justify-between min-h-[500px]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative items */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center relative z-10 pt-4" style={{ transform: 'translateZ(10px)' }}>
            <span className="px-3.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest">
              ✨ Oylik Jamlanma
            </span>
            <h2 className="text-xl font-black font-display tracking-tight text-white mt-3">
              SAVOB WRAPPED
            </h2>
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">
              {monthName} Hisoboti
            </p>
          </div>

          {/* Rank Badge with 3D feeling */}
          <div
            className="my-5 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center relative z-10"
            style={{ transform: 'translateZ(15px)' }}
          >
            <span className="text-3xl mb-1 float-animation">{wrapStats.rankEmoji}</span>
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5">
              Sizning Maqomingiz:
            </span>
            <h3 className="text-lg font-black font-display text-white tracking-wide">
              {wrapStats.rankTitle}
            </h3>
            <p className="text-[10px] text-slate-300 mt-1 leading-normal max-w-[220px]">
              {wrapStats.rankSubtitle}
            </p>
          </div>

          {/* Stats List */}
          <div className="space-y-3.5 relative z-10" style={{ transform: 'translateZ(5px)' }}>
            <div className="flex justify-between items-start border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">
                Jami Jamg'arma:
              </span>
              <div className="text-right">
                <span className="font-bold text-xs block">{formatUZS(wrapStats.totalUZS)}</span>
                <span className="text-[9px] font-semibold text-slate-400">{formatUSD(wrapStats.totalUSD)}</span>
              </div>
            </div>

            <div className="flex justify-between items-start border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-current" /> Ehson ({wrapStats.charityPercentage}%):
              </span>
              <div className="text-right">
                <span className="font-bold text-xs text-amber-300 block">+{formatUZS(wrapStats.charityUZS)}</span>
                <span className="text-[9px] font-semibold text-amber-400/70">{formatUSD(wrapStats.charityUSD)}</span>
              </div>
            </div>

            <div className="flex justify-between items-start border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                Sof daromad:
              </span>
              <div className="text-right">
                <span className="font-bold text-xs text-emerald-300 block">{formatUZS(wrapStats.netUZS)}</span>
                <span className="text-[9px] font-semibold text-emerald-400/70">{formatUSD(wrapStats.netUSD)}</span>
              </div>
            </div>

            {/* Top Category */}
            {wrapStats.topCat && (
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  Top Kategoriya:
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold">
                  <span>{wrapStats.topCat.icon}</span>
                  {wrapStats.topCat.label}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-2 relative z-10" style={{ transform: 'translateZ(10px)' }}>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> PDF Yuklab Olish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
