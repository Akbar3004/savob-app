import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Calendar, CheckSquare, Square, Download } from 'lucide-react';
import { Transaction, Payouts, PayoutFactors, CATEGORIES, formatUZS, formatUSD, MONTH_NAMES, txUZS, txUSD } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
}

type RangeType = 'today' | 'week' | 'month' | 'prev_month' | 'multiple';

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  payouts,
  factors,
}) => {
  const [rangeType, setRangeType] = useState<RangeType>('month');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Unique list of YYYY-MM months
  const uniqueMonths = useMemo(() => {
    return Array.from(
      new Set<string>(transactions.map((t) => t.date.slice(0, 7)))
    ).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const getMonthNameUz = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${MONTH_NAMES[month] || month} ${year}`;
  };

  const handleMonthToggle = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekStr = new Date(now.setDate(diff)).toISOString().split('T')[0];

    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    
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
      if (rangeType === 'multiple') {
        return selectedMonths.some((m) => t.date.startsWith(m));
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, rangeType, selectedMonths]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      alert("Tanlangan davr uchun hech qanday ma'lumot topilmadi.");
      return;
    }

    const doc = new jsPDF();
    const w = doc.internal.pageSize.width;

    // Header Title
    doc.setTextColor(30, 27, 75);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SAVOB APP - TUSHUMLAR VA HAYRIYA HISOBOTI', w / 2, 20, { align: 'center' });

    // Subtitle Date Range Info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    let rangeText = '';
    if (rangeType === 'today') rangeText = `Bugungi hisobot (${new Date().toISOString().split('T')[0]})`;
    else if (rangeType === 'week') rangeText = 'Haftalik hisobot';
    else if (rangeType === 'month') rangeText = 'Joriy oylik hisobot';
    else if (rangeType === 'prev_month') rangeText = 'O\'tgan oylik hisobot';
    else if (rangeType === 'multiple') rangeText = `Tanlangan oylar: ${selectedMonths.map(getMonthNameUz).join(', ')}`;
    doc.text(rangeText, w / 2, 26, { align: 'center' });

    // Table setup
    const tableHeaders = [['#', 'Sana', 'Kategoriya', 'Izoh', 'Daromad (so\'m)', 'Daromad ($)', `Ehson UZS`, `Sof UZS` ]];

    let totalUZS = 0;
    let totalUSD = 0;
    let charityUZS = 0;
    let netUZS = 0;

    const tableRows = filteredTransactions.map((t, idx) => {
      const u = txUZS(t, payouts, exchangeRate, factors);
      const d = txUSD(t, payouts, exchangeRate, factors);
      const cU = (u * t.charityPercentage) / 100;
      const nU = u - cU;

      totalUZS += u;
      totalUSD += d;
      charityUZS += cU;
      netUZS += nU;

      const catLabel = CATEGORIES.find((c) => c.id === t.category)?.label || 'Boshqa';

      return [
        String(idx + 1),
        t.date,
        catLabel,
        t.description,
        Math.round(u).toLocaleString() + " so'm",
        "$" + d.toFixed(2),
        Math.round(cU).toLocaleString() + " so'm",
        Math.round(nU).toLocaleString() + " so'm"
      ];
    });

    // Add totals row
    tableRows.push([
      '',
      'JAMI:',
      '',
      '',
      Math.round(totalUZS).toLocaleString() + " so'm",
      "$" + totalUSD.toFixed(2),
      Math.round(charityUZS).toLocaleString() + " so'm",
      Math.round(netUZS).toLocaleString() + " so'm"
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 34,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }, // Indigo
      footStyles: { fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      },
      didParseCell: (data) => {
        // Style the last totals row differently
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [224, 231, 255]; // Indigo-100
          data.cell.styles.textColor = [30, 27, 75];
        }
      }
    });

    // Save PDF
    doc.save(`Savob_Jadval_Hisoboti_${new Date().toISOString().split('T')[0]}.pdf`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-lg w-full p-6 md:p-8 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-slate-800">
                PDF Eksport Sozlamalari
              </h2>
              <p className="text-xs text-slate-400 font-semibold">Tushumlar jadvalini PDF formatida yuklab olish</p>
            </div>
          </div>

          <div className="space-y-5 relative z-10">
            {/* Range selection */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Eksport davrini belgilang:</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'today', label: 'Bugun' },
                    { id: 'week', label: 'Shu hafta' },
                    { id: 'month', label: 'Shu oy' },
                    { id: 'prev_month', label: 'O\'tgan oy' },
                    { id: 'multiple', label: 'Oylar...' },
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
            </div>

            {/* Multiple months checklist */}
            {rangeType === 'multiple' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 max-h-[160px] overflow-y-auto space-y-2"
              >
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Oylarni tanlang:</span>
                {uniqueMonths.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center">Tarixda oylar topilmadi.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uniqueMonths.map((m) => {
                      const isSelected = selectedMonths.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMonthToggle(m)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200/60 text-left text-xs font-semibold text-slate-700 transition-all"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span>{getMonthNameUz(m)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Selected Count Preview */}
            <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 flex items-center justify-between text-xs text-indigo-700">
              <span className="font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Tanlangan yozuvlar:
              </span>
              <strong className="text-sm font-black font-display">{filteredTransactions.length} ta</strong>
            </div>

            {/* Submit */}
            <button
              onClick={handleExport}
              disabled={filteredTransactions.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100/50 hover:shadow-indigo-200/60 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> PDF Jadvalni Yuklab Olish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
