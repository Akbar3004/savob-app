import React, { useState, useMemo } from 'react';
import { Transaction, Channel, CATEGORIES, formatUZS, formatUSD, isSelfTx, SELF_CHANNEL_ID } from '../types';
import { Trash2, Edit2, Search, Filter, Calendar, DollarSign, Banknote, ArrowUpRight, ArrowDownRight, Youtube } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  currentPercentage: number;
  exchangeRate: number;
  channels: Channel[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDelete,
  onEdit,
  currentPercentage,
  exchangeRate,
  channels,
}) => {
  const channelFor = (t: Transaction) => {
    if (isSelfTx(t)) return null;
    return channels.find((c) => c.id === t.channelId) || { id: t.channelId || '', name: 'Boshqa kanal', color: '#f43f5e' };
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const uniqueMonths = useMemo(() => {
    return (Array.from(
      new Set(transactions.map((t) => t.date.slice(0, 7)))
    ) as string[]).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const getMonthNameUz = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthsUz: { [key: string]: string } = {
      '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
      '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
      '09': 'Sentyabr', '10': 'Oktyabr', '11': 'Noyabr', '12': 'Dekabr',
    };
    return `${monthsUz[month] || month} ${year}`;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        CATEGORIES.find((c) => c.id === t.category)
          ?.label.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [transactions, searchTerm, selectedCategory, selectedMonth]);

  const getAmountInUZS = (t: Transaction) => t.currency === 'USD' ? t.amount * exchangeRate : t.amount;
  const getAmountInUSD = (t: Transaction) => t.currency === 'UZS' ? t.amount / exchangeRate : t.amount;

  // Helper to get previous month string
  const getPrevMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 - 1, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  };

  // Pre-calculate month averages
  const monthAverages = useMemo(() => {
    const sums: { [month: string]: number } = {};
    const counts: { [month: string]: number } = {};
    
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      const amtUZS = t.currency === 'USD' ? t.amount * exchangeRate : t.amount;
      sums[m] = (sums[m] || 0) + amtUZS;
      counts[m] = (counts[m] || 0) + 1;
    });

    const avgs: { [month: string]: number } = {};
    Object.keys(sums).forEach((m) => {
      avgs[m] = sums[m] / counts[m];
    });
    return avgs;
  }, [transactions, exchangeRate]);

  return (
    <div className="card-3d p-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display font-bold text-slate-800 text-lg">Kundalik tushumlar tarixi</h3>
          <p className="text-xs text-slate-400">Barcha yozilgan summalarni saralash va tahrirlash</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Qidirish..."
              className="pl-9 pr-4 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 w-full md:w-44"
            />
          </div>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 appearance-none cursor-pointer font-semibold"
            >
              <option value="all">Barcha oylar</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>{getMonthNameUz(m)}</option>
              ))}
            </select>
            <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 appearance-none cursor-pointer font-semibold"
            >
              <option value="all">Barcha kategoriyalar</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8">
          <p className="text-sm font-semibold text-slate-500">Hech qanday ma'lumot topilmadi</p>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
            Filtr sozlamalarini o'zgartiring yoki birinchi tushumni qo'shing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Sana va Izoh</th>
                <th className="py-3 px-4">Kategoriya</th>
                <th className="py-3 px-4 text-center">Valyuta</th>
                <th className="py-3 px-4 text-right">Jami summa</th>
                <th className="py-3 px-4 text-right text-amber-500">Hayriya ({currentPercentage}%)</th>
                <th className="py-3 px-4 text-right text-emerald-600">Qolgan</th>
                <th className="py-3 px-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => {
                const amtUZS = getAmountInUZS(t);
                const amtUSD = getAmountInUSD(t);
                // Ehson faqat "meniki" yozuvdan; boshqa kanal uchun 0
                const rowPct = isSelfTx(t) ? currentPercentage : 0;
                const charityUZS = (amtUZS * rowPct) / 100;
                const charityUSD = (amtUSD * rowPct) / 100;
                const netUZS = amtUZS - charityUZS;
                const netUSD = amtUSD - charityUSD;
                const cat = CATEGORIES.find((c) => c.id === t.category);
                const chan = channelFor(t);

                // Row comparison percentage
                const m = t.date.slice(0, 7);
                const prevM = getPrevMonthStr(m);
                const prevAvg = monthAverages[prevM];
                let diffPct: number | null = null;
                if (prevAvg && prevAvg > 0) {
                  diffPct = ((amtUZS - prevAvg) / prevAvg) * 100;
                }

                return (
                  <tr key={t.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-xs text-slate-800">{t.description}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">{t.date}</span>
                        {chan && (
                          <span
                            style={{ backgroundColor: `${chan.color}18`, color: chan.color || '#f43f5e' }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                            title="Boshqa kanal — ehsonsiz"
                          >
                            <Youtube className="w-2.5 h-2.5" />
                            {chan.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        style={{
                          backgroundColor: `${cat?.color}12`,
                          color: cat?.color || '#6B7280',
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                      >
                        <span>{cat?.icon}</span>
                        {cat?.label || 'Boshqa'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        t.currency === 'USD' 
                          ? 'bg-green-50 text-green-600 border border-green-100' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {t.currency === 'USD' ? <DollarSign className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        {t.currency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-xs text-slate-700 font-display">{formatUZS(amtUZS)}</div>
                      <div className="text-[10px] font-semibold text-indigo-400">{formatUSD(amtUSD)}</div>
                      
                      {/* Row percentage comparison */}
                      {diffPct !== null && (
                        <div className={`text-[9px] font-bold mt-0.5 flex items-center justify-end gap-0.5 ${
                          diffPct >= 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}>
                          {diffPct >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          <span>{diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}% vs o'tgan oy o'rtachasi</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-medium text-xs text-amber-500 font-display">{formatUZS(charityUZS)}</div>
                      <div className="text-[10px] text-amber-400">{formatUSD(charityUSD)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-xs text-emerald-600 font-display">{formatUZS(netUZS)}</div>
                      <div className="text-[10px] text-emerald-400">{formatUSD(netUSD)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
