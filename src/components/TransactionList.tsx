import React, { useState, useMemo } from 'react';
import { Transaction, Channel, SelfChannel, Payouts, PayoutFactors, CATEGORIES, formatUZS, formatUSD, hasCharityTx, CHANNEL_MODE_LABELS, SELF_CHANNEL_ID, txUZS, txUSD, isSettled, channelInfo, txDisplayName, channelKeyOf } from '../types';
import { Trash2, Edit2, Search, Filter, Calendar, DollarSign, Banknote, ArrowUpRight, ArrowDownRight, Youtube, User } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  currentPercentage: number;
  exchangeRate: number;
  channels: Channel[];
  selfChannel: SelfChannel | undefined;
  payouts: Payouts;
  factors: PayoutFactors;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDelete,
  onEdit,
  currentPercentage,
  exchangeRate,
  channels,
  selfChannel,
  payouts,
  factors,
}) => {
  // Har bir yozuv uchun kanal ma'lumoti (shaxsiy kanal ham o'z nomi/rangi bilan)
  const channelFor = (t: Transaction) => channelInfo(t.channelId, channels, selfChannel);
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  // Ro'yxat har oy boshida yangilanadi: sukut bo'yicha faqat joriy oy ko'rinadi.
  // Eski oylar tarixda saqlanadi va pastdagi tanlagichdan ochiladi.
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const uniqueMonths = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    set.add(currentMonth); // joriy oy bo'sh bo'lsa ham tanlanadigan bo'lib qolsin
    return (Array.from(set) as string[]).sort((a, b) => b.localeCompare(a));
  }, [transactions, currentMonth]);

  const getMonthNameUz = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthsUz: { [key: string]: string } = {
      '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
      '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
      '09': 'Sentyabr', '10': 'Oktyabr', '11': 'Noyabr', '12': 'Dekabr',
    };
    return `${monthsUz[month] || month} ${year}`;
  };

  /** Bir xil sanadagi yozuvlarni tartiblash uchun id ichidagi vaqt tamg'asi. */
  const idStamp = (id: string) => {
    const digits = id.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          t.description.toLowerCase().includes(q) ||
          channelInfo(t.channelId, channels, selfChannel).name.toLowerCase().includes(q) ||
          CATEGORIES.find((c) => c.id === t.category)
            ?.label.toLowerCase()
            .includes(q);
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
        return matchesSearch && matchesCategory && matchesMonth;
      })
      // Eng yangi sana yuqorida; bir xil sanada esa keyin kiritilgani yuqorida
      .sort((a, b) => b.date.localeCompare(a.date) || idStamp(b.id) - idStamp(a.id));
  }, [transactions, searchTerm, selectedCategory, selectedMonth, channels, selfChannel]);

  const getAmountInUZS = (t: Transaction) => txUZS(t, payouts, exchangeRate, factors);
  const getAmountInUSD = (t: Transaction) => txUSD(t, payouts, exchangeRate, factors);

  // Helper to get previous month string
  const getPrevMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 - 1, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  };

  /** Yozuv qaysi kanalga tegishli (kalit sifatida). Eski yozuvlar — 'self'. */
  const channelKey = (t: Transaction) => t.channelId || SELF_CHANNEL_ID;

  // Har bir KANAL uchun alohida oylik o'rtacha.
  // Kalit: "<kanal>|<YYYY-MM>" — shunda har bir kanal faqat o'zi bilan solishtiriladi.
  const channelMonthAverages = useMemo(() => {
    const sums: { [key: string]: number } = {};
    const counts: { [key: string]: number } = {};

    transactions.forEach((t) => {
      const key = `${channelKey(t)}|${t.date.slice(0, 7)}`;
      const amtUZS = txUZS(t, payouts, exchangeRate, factors);
      sums[key] = (sums[key] || 0) + amtUZS;
      counts[key] = (counts[key] || 0) + 1;
    });

    const avgs: { [key: string]: number } = {};
    Object.keys(sums).forEach((k) => {
      avgs[k] = sums[k] / counts[k];
    });
    return avgs;
  }, [transactions, exchangeRate, payouts]);

  return (
    <div className="card-glow p-6 flex flex-col h-full">
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
          <p className="text-sm font-semibold text-slate-500">
            {selectedMonth === currentMonth && searchTerm === '' && selectedCategory === 'all'
              ? 'Bu oy hali tushum kiritilmagan'
              : "Hech qanday ma'lumot topilmadi"}
          </p>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
            {selectedMonth === currentMonth && searchTerm === '' && selectedCategory === 'all'
              ? "Yangi oy boshlandi. Oldingi oylar tarixi «oylar» ro'yxatidan ochiladi."
              : "Filtr sozlamalarini o'zgartiring yoki birinchi tushumni qo'shing."}
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
                // Ehson faqat ehsonli kanaldan; ehsonsiz/boshqa kanal uchun 0
                const rowPct = hasCharityTx(t, channels) ? currentPercentage : 0;
                const charityUZS = (amtUZS * rowPct) / 100;
                const charityUSD = (amtUSD * rowPct) / 100;
                const netUZS = amtUZS - charityUZS;
                const netUSD = amtUSD - charityUSD;
                const cat = CATEGORIES.find((c) => c.id === t.category);
                const chan = channelFor(t);

                // Taqqoslash: shu yozuv AYNAN O'Z kanalining o'tgan oydagi
                // o'rtachasi bilan solishtiriladi (boshqa kanallar aralashmaydi).
                // To'lov kelganmi — summa qat'iymi yoki hali taxminiymi?
                const txMonth = t.date.slice(0, 7);
                const settled = isSettled(txMonth, payouts);
                // AdSense bo'yicha tuzatish qo'llanganmi (Studio raqamidan farqi)?
                const adjFactor = factors[txMonth]?.[channelKeyOf(t)];
                const adjusted = adjFactor !== undefined && t.currency === 'USD';

                const prevM = getPrevMonthStr(t.date.slice(0, 7));
                const prevAvg = channelMonthAverages[`${channelKey(t)}|${prevM}`];
                const scopeName = chan.name;
                let diffPct: number | null = null;
                if (prevAvg && prevAvg > 0) {
                  diffPct = ((amtUZS - prevAvg) / prevAvg) * 100;
                }

                return (
                  <tr key={t.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: chan.color }}
                        />
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {txDisplayName(t, channels, selfChannel)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">{t.date}</span>
                        <span
                          style={{ backgroundColor: `${chan.color}18`, color: chan.color }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                          title={CHANNEL_MODE_LABELS[chan.mode]}
                        >
                          {chan.owned ? <User className="w-2.5 h-2.5" /> : <Youtube className="w-2.5 h-2.5" />}
                          {chan.name}
                        </span>
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
                      <div
                        className="font-bold text-xs text-slate-700 font-display"
                        title={
                          (settled
                            ? "To'lov kursi kiritilgan — bu summa qat'iy"
                            : "To'lov hali kelmagan — joriy kurs bo'yicha taxminiy summa") +
                          (adjusted
                            ? `\nAdSense tuzatishi: Studio ${t.amount} → ${(t.amount * adjFactor).toFixed(2)} USD (${adjFactor >= 1 ? '+' : ''}${((adjFactor - 1) * 100).toFixed(1)}%)`
                            : '')
                        }
                      >
                        {settled ? '' : '≈ '}
                        {formatUZS(amtUZS)}
                      </div>
                      <div className="text-[10px] font-semibold text-indigo-400">{formatUSD(amtUSD)}</div>
                      {adjusted && (
                        <div className="text-[9px] font-bold text-sky-500 mt-0.5">
                          AdSense: {adjFactor >= 1 ? '+' : ''}
                          {((adjFactor - 1) * 100).toFixed(1)}%
                        </div>
                      )}
                      
                      {/* Row percentage comparison */}
                      {diffPct !== null && (
                        <div
                          className={`text-[9px] font-bold mt-0.5 flex items-center justify-end gap-0.5 ${
                            diffPct >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                          title={`«${scopeName}» ning o'tgan oydagi o'rtacha tushumiga nisbatan`}
                        >
                          {diffPct >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          <span>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}% vs {scopeName} o'tgan oy o'rt.
                          </span>
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
