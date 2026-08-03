import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, TrendingUp, Heart, Wallet, CalendarDays, Layers, Sparkles } from 'lucide-react';
import { Transaction, CATEGORIES, formatUSD, MONTH_NAMES } from '../types';
import { jsPDF } from 'jspdf';

interface MonthlyWrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  monthKey: string; // YYYY-MM
  exchangeRate: number;
}

/** Raqamni ming ajratgichlari bilan formatlaydi ("15 174 120"). */
const fmtNum = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

interface RankTier {
  title: string;
  subtitle: string;
  emoji: string;
}

function resolveRank(charityUZS: number): RankTier {
  if (charityUZS >= 5_000_000) {
    return {
      title: 'Oltin Saxovat',
      subtitle: "Saxovati bilan yuzlab qalblarga umid ulashgan inson",
      emoji: '👑',
    };
  }
  if (charityUZS >= 2_000_000) {
    return {
      title: 'Saxovat Qiroli',
      subtitle: "Ehsoni birovning hayotini o'zgartirishga qodir",
      emoji: '🏆',
    };
  }
  if (charityUZS >= 500_000) {
    return {
      title: 'Muruvvat Qahramoni',
      subtitle: "Yaxshilikni kundalik odatga aylantirgan qalb",
      emoji: '🛡️',
    };
  }
  if (charityUZS > 0) {
    return {
      title: 'Yaxshilik Elchisi',
      subtitle: "Har bir ehson — ezgulik sari qo'yilgan qadam",
      emoji: '✨',
    };
  }
  return {
    title: 'Yangi Boshlanish',
    subtitle: "Eng katta yo'l ham birinchi qadamdan boshlanadi",
    emoji: '🌱',
  };
}

export const MonthlyWrapModal: React.FC<MonthlyWrapModalProps> = ({
  isOpen,
  onClose,
  transactions,
  monthKey,
  exchangeRate,
}) => {
  const monthName = React.useMemo(() => {
    const [year, month] = monthKey.split('-');
    return `${MONTH_NAMES[month] || month} ${year}`;
  }, [monthKey]);

  const prevMonthKey = React.useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthKey]);

  const stats = React.useMemo(() => {
    const toUZS = (t: Transaction) =>
      t.currency === 'USD' ? t.amount * exchangeRate : t.amount;

    const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));

    let totalUZS = 0;
    let charityUZS = 0;
    let charityPercentage = 10;
    const catAmounts: { [catId: string]: number } = {};
    const dayAmounts: { [date: string]: number } = {};

    monthTx.forEach((t) => {
      const amt = toUZS(t);
      totalUZS += amt;
      charityUZS += (amt * t.charityPercentage) / 100;
      // Yorliq foizi faqat ehson ushlanadigan (self) yozuvdan olinadi
      if (t.charityPercentage > 0) charityPercentage = t.charityPercentage;
      catAmounts[t.category] = (catAmounts[t.category] || 0) + amt;
      dayAmounts[t.date] = (dayAmounts[t.date] || 0) + amt;
    });

    const netUZS = totalUZS - charityUZS;

    // Har bir daromad manbai — alohida, ulushi bilan
    const categories = Object.keys(catAmounts)
      .map((id) => {
        const meta = CATEGORIES.find((c) => c.id === id);
        return {
          id,
          label: meta?.label || id,
          icon: meta?.icon || '📦',
          color: meta?.color || '#6b7280',
          amount: catAmounts[id],
          pct: totalUZS > 0 ? (catAmounts[id] / totalUZS) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // O'tgan oy bilan taqqoslash — natija kuchini ko'rsatadi
    const prevTotal = transactions
      .filter((t) => t.date.startsWith(prevMonthKey))
      .reduce((sum, t) => sum + toUZS(t), 0);
    const growthPct = prevTotal > 0 ? ((totalUZS - prevTotal) / prevTotal) * 100 : null;

    const activeDays = Object.keys(dayAmounts).length;
    const bestDayAmount = Object.values(dayAmounts).reduce((m, v) => Math.max(m, v), 0);
    const avgPerDay = activeDays > 0 ? totalUZS / activeDays : 0;

    return {
      totalUZS,
      totalUSD: totalUZS / exchangeRate,
      charityUZS,
      charityUSD: charityUZS / exchangeRate,
      netUZS,
      netUSD: netUZS / exchangeRate,
      charityPercentage,
      categories,
      growthPct,
      activeDays,
      bestDayAmount,
      avgPerDay,
      count: monthTx.length,
      rank: resolveRank(charityUZS),
    };
  }, [transactions, monthKey, prevMonthKey, exchangeRate]);

  // ─────────────────────────────────────────────────────────────
  // PDF: emoji ishlatilmaydi (standart shriftlar uni buzib chizadi) —
  // uning o'rniga geometrik shakllar va rangli chiziqlar chiziladi.
  // ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const W = 148;
    const H = 210;

    const INK = {
      white: [255, 255, 255] as [number, number, number],
      muted: [148, 163, 210] as [number, number, number],
      soft: [199, 210, 254] as [number, number, number],
      gold: [251, 191, 36] as [number, number, number],
      mint: [52, 211, 153] as [number, number, number],
      line: [55, 60, 120] as [number, number, number],
    };

    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

    /** Matn maydonga sig'guncha shrift o'lchamini kichraytiradi. */
    const fitSize = (text: string, maxWidth: number, start: number, min = 7) => {
      let size = start;
      doc.setFontSize(size);
      while (doc.getTextWidth(text) > maxWidth && size > min) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      return size;
    };

    const clip = (text: string, maxWidth: number) => {
      if (doc.getTextWidth(text) <= maxWidth) return text;
      let out = text;
      while (out.length > 1 && doc.getTextWidth(out + '…') > maxWidth) {
        out = out.slice(0, -1);
      }
      return out + '…';
    };

    // ── Fon: yumshoq vertikal gradient ──
    const top: [number, number, number] = [12, 16, 46];
    const mid: [number, number, number] = [32, 29, 84];
    const bot: [number, number, number] = [9, 12, 34];
    for (let y = 0; y < H; y += 0.5) {
      const t = y / H;
      const from = t < 0.5 ? top : mid;
      const to = t < 0.5 ? mid : bot;
      const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
      setFill([
        Math.round(from[0] + (to[0] - from[0]) * k),
        Math.round(from[1] + (to[1] - from[1]) * k),
        Math.round(from[2] + (to[2] - from[2]) * k),
      ]);
      doc.rect(0, y, W, 1.2, 'F');
    }

    // ── Ramka ──
    doc.setDrawColor(INK.gold[0], INK.gold[1], INK.gold[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(6, 6, W - 12, H - 12, 3, 3, 'S');
    doc.setDrawColor(90, 95, 175);
    doc.setLineWidth(0.2);
    doc.roundedRect(8, 8, W - 16, H - 16, 2.4, 2.4, 'S');

    // ── Sarlavha ──
    doc.setFont('Helvetica', 'bold');
    setText(INK.white);
    doc.setFontSize(19);
    doc.text('SAVOB WRAPPED', W / 2, 23, { align: 'center', charSpace: 0.4 });

    setFill(INK.gold);
    doc.rect(W / 2 - 14, 26.5, 28, 0.5, 'F');

    setText(INK.gold);
    doc.setFontSize(8.5);
    doc.text(monthName.toUpperCase(), W / 2, 32.5, { align: 'center', charSpace: 1.6 });

    // ── Asosiy natija ──
    setText(INK.muted);
    doc.setFontSize(7.5);
    doc.text("SHU OYDA JAMG'ARILDI", W / 2, 43, { align: 'center', charSpace: 1.1 });

    const heroText = fmtNum(stats.totalUZS);
    const heroSize = fitSize(heroText, W - 40, 34, 14);
    setText(INK.white);
    doc.setFontSize(heroSize);
    doc.text(heroText, W / 2, 55, { align: 'center' });

    setText(INK.soft);
    doc.setFontSize(9);
    doc.text("so'm", W / 2, 61, { align: 'center', charSpace: 0.6 });

    setText(INK.muted);
    doc.setFontSize(8);
    doc.text(formatUSD(stats.totalUSD), W / 2, 66.5, { align: 'center' });

    // O'sish belgisi
    if (stats.growthPct !== null) {
      const up = stats.growthPct >= 0;
      const label = `${up ? '+' : ''}${stats.growthPct.toFixed(0)}%  O'TGAN OYGA NISBATAN`;
      doc.setFontSize(7);
      const tw = doc.getTextWidth(label);
      const pw = tw + 12;
      const px = W / 2 - pw / 2;
      setFill(up ? [16, 62, 52] : [66, 26, 34]);
      doc.roundedRect(px, 70, pw, 7, 3.5, 3.5, 'F');
      // yo'nalish uchburchagi
      setFill(up ? INK.mint : [248, 113, 113]);
      const ax = px + 5;
      const ay = 73.5;
      if (up) doc.triangle(ax, ay + 1.4, ax + 2.6, ay + 1.4, ax + 1.3, ay - 1.4, 'F');
      else doc.triangle(ax, ay - 1.4, ax + 2.6, ay - 1.4, ax + 1.3, ay + 1.4, 'F');
      setText(up ? INK.mint : [248, 113, 113]);
      doc.text(label, px + 9, 74.9, { charSpace: 0.3 });
    }

    // ── Maqom ──
    setFill([28, 27, 74]);
    doc.roundedRect(16, 82, W - 32, 21, 3, 3, 'F');
    setFill(INK.gold);
    doc.roundedRect(16, 82, 1.4, 21, 0.7, 0.7, 'F');

    setText(INK.gold);
    doc.setFontSize(7);
    doc.text('SIZNING MAQOMINGIZ', W / 2, 89, { align: 'center', charSpace: 1.2 });

    setText(INK.white);
    const rankSize = fitSize(stats.rank.title.toUpperCase(), W - 44, 15, 9);
    doc.setFontSize(rankSize);
    doc.text(stats.rank.title.toUpperCase(), W / 2, 96, { align: 'center', charSpace: 0.4 });

    doc.setFont('Helvetica', 'normal');
    setText(INK.soft);
    doc.setFontSize(7);
    doc.text(clip(stats.rank.subtitle, W - 40), W / 2, 101, { align: 'center' });

    // ── Ehson / Sof foyda ──
    const cardY = 107;
    const cardH = 21;
    const cardW = (W - 32) / 2 - 2;

    const drawCard = (
      x: number,
      label: string,
      valueUZS: number,
      valueUSD: number,
      accent: [number, number, number]
    ) => {
      setFill([24, 24, 66]);
      doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'F');
      setFill(accent);
      doc.roundedRect(x, cardY, cardW, 1.1, 0.55, 0.55, 'F');

      doc.setFont('Helvetica', 'normal');
      setText(INK.muted);
      doc.setFontSize(6.5);
      doc.text(label, x + cardW / 2, cardY + 6.5, { align: 'center', charSpace: 0.6 });

      doc.setFont('Helvetica', 'bold');
      setText(accent);
      const s = fitSize(fmtNum(valueUZS), cardW - 8, 13, 7.5);
      doc.setFontSize(s);
      doc.text(fmtNum(valueUZS), x + cardW / 2, cardY + 13.5, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      setText(INK.muted);
      doc.setFontSize(6.5);
      doc.text(formatUSD(valueUSD), x + cardW / 2, cardY + 18, { align: 'center' });
    };

    drawCard(16, `EHSON (${stats.charityPercentage}%)`, stats.charityUZS, stats.charityUSD, INK.gold);
    drawCard(16 + cardW + 4, "QO'LDA QOLGAN", stats.netUZS, stats.netUSD, INK.mint);

    // ── Kichik ko'rsatkichlar ──
    const metrics: [string, string][] = [
      ['FAOL KUNLAR', String(stats.activeDays)],
      ['KIRITISHLAR', String(stats.count)],
      ["KUNLIK O'RTACHA", fmtNum(stats.avgPerDay)],
    ];
    const mW = (W - 32) / 3;
    metrics.forEach(([label, value], i) => {
      const cx = 16 + mW * i + mW / 2;
      doc.setFont('Helvetica', 'bold');
      setText(INK.white);
      const s = fitSize(value, mW - 4, 11, 6.5);
      doc.setFontSize(s);
      doc.text(value, cx, 135, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      setText(INK.muted);
      doc.setFontSize(6);
      doc.text(label, cx, 139.5, { align: 'center', charSpace: 0.4 });

      if (i < 2) {
        setFill(INK.line);
        doc.rect(16 + mW * (i + 1), 129, 0.25, 12, 'F');
      }
    });

    // ── Daromad manbalari (har biri alohida) ──
    setFill(INK.line);
    doc.rect(16, 146, W - 32, 0.25, 'F');

    doc.setFont('Helvetica', 'bold');
    setText(INK.soft);
    doc.setFontSize(7);
    doc.text('DAROMAD MANBALARI', 16, 152, { charSpace: 1.1 });

    const rows = stats.categories.slice(0, 6);
    const startY = 158;
    const pitch = 6.5;
    const barX = 16;
    const barW = W - 32;

    if (rows.length === 0) {
      doc.setFont('Helvetica', 'normal');
      setText(INK.muted);
      doc.setFontSize(7.5);
      doc.text("Bu oyda tushum kiritilmagan", W / 2, startY + 4, { align: 'center' });
    }

    rows.forEach((cat, i) => {
      const y = startY + i * pitch;
      const rgb = hexToRgb(cat.color);

      // rang nuqtasi
      setFill(rgb);
      doc.circle(barX + 1.2, y - 1, 1.2, 'F');

      const amountText = fmtNum(cat.amount);
      const pctText = `${cat.pct.toFixed(0)}%`;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      const amountW = doc.getTextWidth(amountText);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.2);
      const pctW = doc.getTextWidth(pctText);

      // Nom + ulush foizi (chapda), summa (o'ngda) — bir qatorda
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      setText(INK.white);
      const name = clip(cat.label, barW - 4 - amountW - pctW - 10);
      doc.text(name, barX + 4, y);
      const nameW = doc.getTextWidth(name);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.2);
      setText(INK.muted);
      doc.text(pctText, barX + 6 + nameW, y);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      setText(INK.white);
      doc.text(amountText, barX + barW, y, { align: 'right' });

      // ulush chizig'i
      setFill([32, 34, 82]);
      doc.roundedRect(barX + 4, y + 1.4, barW - 4, 1.5, 0.75, 0.75, 'F');
      const fillW = Math.max(1.5, ((barW - 4) * cat.pct) / 100);
      setFill(rgb);
      doc.roundedRect(barX + 4, y + 1.4, fillW, 1.5, 0.75, 0.75, 'F');
    });

    // ── Pastki qism ──
    doc.setFont('Helvetica', 'normal');
    setText([110, 120, 190]);
    doc.setFontSize(6.5);
    doc.text('savob-app.vercel.app', W / 2, 200, { align: 'center', charSpace: 0.5 });

    doc.save(`Savob_Wrapped_${monthKey}.pdf`);
  };

  if (!isOpen) return null;

  const growth = stats.growthPct;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-400/25 bg-gradient-to-b from-[#141a3a] via-[#1f1d54] to-[#0a0d24] text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        >
          {/* Yorug'lik effektlari */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 rounded-xl p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 px-6 pb-6 pt-8">
            {/* Sarlavha */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-black tracking-tight text-white">
                SAVOB WRAPPED
              </h2>
              <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                {monthName}
              </p>
            </div>

            {/* Asosiy natija */}
            <div className="mt-7 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Shu oyda jamg'arildi
              </p>
              <div className="mt-2 flex items-baseline justify-center gap-1.5">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="font-display text-[2.6rem] font-black leading-none tracking-tight text-white tabular-nums"
                >
                  {fmtNum(stats.totalUZS)}
                </motion.span>
                <span className="text-sm font-bold text-indigo-200">so'm</span>
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                {formatUSD(stats.totalUSD)}
              </p>

              {growth !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    growth >= 0
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  <TrendingUp
                    className={`h-3.5 w-3.5 ${growth < 0 ? 'rotate-180' : ''}`}
                  />
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(0)}% o'tgan oyga nisbatan
                </motion.div>
              )}
            </div>

            {/* Maqom */}
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] p-4 pl-5 text-center">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 to-amber-500" />
              <span className="text-2xl">{stats.rank.emoji}</span>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
                Sizning maqomingiz
              </p>
              <h3 className="mt-0.5 font-display text-lg font-black tracking-wide text-white">
                {stats.rank.title}
              </h3>
              <p className="mx-auto mt-1 max-w-[240px] text-[10px] leading-relaxed text-slate-300">
                {stats.rank.subtitle}
              </p>
            </div>

            {/* Ehson / Sof foyda */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-t-2 border-amber-400 bg-white/[0.04] p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  <Heart className="h-3 w-3 fill-current text-amber-400" />
                  Ehson ({stats.charityPercentage}%)
                </div>
                <p className="mt-1.5 text-sm font-black tabular-nums text-amber-300">
                  {fmtNum(stats.charityUZS)}
                </p>
                <p className="text-[9px] font-semibold text-slate-500">
                  {formatUSD(stats.charityUSD)}
                </p>
              </div>
              <div className="rounded-2xl border-t-2 border-emerald-400 bg-white/[0.04] p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                  <Wallet className="h-3 w-3 text-emerald-400" />
                  Qo'lda qolgan
                </div>
                <p className="mt-1.5 text-sm font-black tabular-nums text-emerald-300">
                  {fmtNum(stats.netUZS)}
                </p>
                <p className="text-[9px] font-semibold text-slate-500">
                  {formatUSD(stats.netUSD)}
                </p>
              </div>
            </div>

            {/* Kichik ko'rsatkichlar */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-white/5 rounded-2xl bg-white/[0.03] py-3">
              {[
                { icon: CalendarDays, label: 'Faol kunlar', value: String(stats.activeDays) },
                { icon: Layers, label: 'Kiritishlar', value: String(stats.count) },
                { icon: Sparkles, label: "Kunlik o'rt.", value: fmtNum(stats.avgPerDay) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="px-1 text-center">
                  <Icon className="mx-auto mb-1 h-3 w-3 text-indigo-300" />
                  <p className="text-xs font-black tabular-nums text-white">{value}</p>
                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Daromad manbalari — har biri alohida */}
            <div className="mt-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Daromad manbalari
              </p>
              <div className="mt-3 space-y-3">
                {stats.categories.length === 0 && (
                  <p className="py-3 text-center text-[11px] font-semibold text-slate-500">
                    Bu oyda tushum kiritilmagan
                  </p>
                )}
                {stats.categories.map((cat, i) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-slate-200">
                        <span className="shrink-0">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-black tabular-nums text-white">
                        {fmtNum(cat.amount)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.pct}%` }}
                          transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[9px] font-bold tabular-nums text-slate-400">
                        {cat.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-xs font-black text-slate-900 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              <Download className="h-4 w-4" /> Kartani yuklab olish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
