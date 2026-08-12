import React, { useState, useEffect } from 'react';
import { Plus, Check, Edit2, X, DollarSign, Banknote, User, Youtube } from 'lucide-react';
import { CATEGORIES, Transaction, Channel, SelfChannel, Payouts, PayoutFactors, SELF_CHANNEL_ID, formatUZS, formatUSD, rateForMonth, channelInfo } from '../types';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id' | 'charityPercentage'>) => void;
  onUpdate: (id: string, updated: Omit<Transaction, 'id' | 'charityPercentage'>) => void;
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  factors: PayoutFactors;
  channels: Channel[];
  selfChannel: SelfChannel | undefined;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAdd,
  onUpdate,
  editingTransaction,
  onCancelEdit,
  charityPercentage,
  exchangeRate,
  payouts,
  factors,
  channels,
  selfChannel,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [category, setCategory] = useState<string>('oylik');
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [channelId, setChannelId] = useState<string>(SELF_CHANNEL_ID);
  const [error, setError] = useState<string>('');

  const isSelf = channelId === SELF_CHANNEL_ID;
  // Tanlangan kanalning nomi va rangi (self ham, boshqa kanal ham)
  const activeChannel = channelInfo(channelId, channels, selfChannel);
  // Ijtimoiy tarmoq tushumida izoh = kanal nomi, shuning uchun izoh maydoni yashiriladi
  const isSocial = category === 'social_media';

  useEffect(() => {
    if (!editingTransaction) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      setCurrency(editingTransaction.currency);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
      setChannelId(editingTransaction.channelId || SELF_CHANNEL_ID);
      setError('');
    } else {
      setAmount('');
      setCurrency('UZS');
      setCategory('oylik');
      setDescription('');
      setChannelId(SELF_CHANNEL_ID);
      setError('');
    }
  }, [editingTransaction]);

  // Ro'yxatdan o'chirilgan kanal tanlangan bo'lib qolmasligi uchun
  useEffect(() => {
    if (channelId !== SELF_CHANNEL_ID && !channels.some((c) => c.id === channelId)) {
      setChannelId(SELF_CHANNEL_ID);
    }
  }, [channels, channelId]);

  // Keep a clean numeric string in state ("12300.50"), render it grouped ("12,300.50")
  const sanitizeAmount = (value: string, allowDecimal: boolean): string => {
    let clean = value.replace(/[^\d.]/g, '');
    if (!allowDecimal) return clean.replace(/\./g, '');
    const firstDot = clean.indexOf('.');
    if (firstDot !== -1) {
      const intPart = clean.slice(0, firstDot);
      const decPart = clean.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
      clean = `${intPart}.${decPart}`;
    }
    return clean;
  };

  const formatAmountDisplay = (value: string): string => {
    if (!value) return '';
    const [intPart, decPart] = value.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return value.includes('.') ? `${grouped}.${decPart ?? ''}` : grouped;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmount(e.target.value, currency === 'USD'));
  };

  // Phone keyboards often lack the "." key — this button inserts it for cents
  const handleInsertDecimalPoint = () => {
    if (!amount.includes('.')) {
      setAmount((amount || '0') + '.');
    }
  };

  const handleQuickAdd = (value: number) => {
    const currentVal = parseFloat(amount || '0');
    setAmount((currentVal + value).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Iltimos, noldan katta va to'g'ri summa kiriting.");
      return;
    }
    if (!date) {
      setError('Iltimos, sanani belgilang.');
      return;
    }

    const data = {
      amount: parsedAmount,
      currency,
      date,
      category,
      // Ijtimoiy tarmoq tushumi har doim kanal nomi bilan saqlanadi —
      // izohni har kuni qo'lda yozish shart emas.
      description: isSocial
        ? activeChannel.name
        : description.trim() || CATEGORIES.find((c) => c.id === category)?.label || 'Tushum',
      channelId,
    };

    if (editingTransaction) {
      onUpdate(editingTransaction.id, data);
    } else {
      onAdd(data);
      setAmount('');
      setDescription('');
    }
  };

  const currentAmountNum = parseFloat(amount || '0');
  // Kiritilayotgan sana qaysi ish oyiga tushsa, o'sha oyning kursi ishlatiladi
  // (to'lovi kelgan oy bo'lsa — qotgan kurs, aks holda joriy kurs).
  const formRate = rateForMonth(date.slice(0, 7), payouts, exchangeRate);
  const amountInUZS = currency === 'USD' ? currentAmountNum * formRate : currentAmountNum;
  const amountInUSD = currency === 'UZS' ? currentAmountNum / formRate : currentAmountNum;
  // Ehson faqat "meniki" (self) kanaldan ushlanadi; boshqa kanallarda 0
  const effectivePct = isSelf ? charityPercentage : 0;
  const liveCharityUZS = (amountInUZS * effectivePct) / 100;
  const liveCharityUSD = (amountInUSD * effectivePct) / 100;
  const liveNetUZS = amountInUZS - liveCharityUZS;
  const liveNetUSD = amountInUSD - liveCharityUSD;

  return (
    <div className="card-3d p-6 relative overflow-hidden">
      {/* Left accent bar */}
      <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-3xl ${editingTransaction ? 'bg-gradient-to-b from-amber-400 to-amber-600' : 'bg-gradient-to-b from-indigo-500 to-purple-600'}`} />

      <div className="flex items-center gap-3 mb-6 pl-3">
        <div className={`p-2.5 rounded-xl shadow-lg ${editingTransaction ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} text-white`}>
          {editingTransaction ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-800 text-base">
            {editingTransaction ? 'Kirimni tahrirlash' : 'Yangi tushum kiritish'}
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">Summa va ma'lumotlarni kiriting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pl-3">
        {/* Currency Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valyuta:</span>
          <div className="currency-toggle">
            <button
              type="button"
              onClick={() => {
                setCurrency('UZS');
                setAmount((prev) => prev.split('.')[0]);
              }}
              className={currency === 'UZS' ? 'active' : ''}
            >
              <span className="flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> SO'M
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={currency === 'USD' ? 'active' : ''}
            >
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> USD
              </span>
            </button>
          </div>
        </div>

        {/* Channel selector — faqat boshqa kanal(lar) mavjud bo'lsa ko'rsatiladi */}
        {channels.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Qaysi kanal uchun
            </label>
            <div className="relative">
              {isSelf ? (
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
              ) : (
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
              )}
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 cursor-pointer"
              >
                <option value={SELF_CHANNEL_ID}>Meniki (ehson ushlanadi)</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (ehsonsiz)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Tushum summasi
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode={currency === 'UZS' ? 'numeric' : 'decimal'}
              value={formatAmountDisplay(amount)}
              onChange={handleAmountChange}
              placeholder={currency === 'UZS' ? "Masalan: 500,000" : "Masalan: 100.00"}
              className={`w-full text-xl font-bold font-display px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-300 ${currency === 'USD' ? 'pr-24' : 'pr-16'}`}
            />
            {currency === 'USD' && (
              <button
                type="button"
                onClick={handleInsertDecimalPoint}
                disabled={amount.includes('.')}
                title="Sent kiritish uchun nuqta qo'shish"
                className="absolute right-14 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-indigo-100 hover:bg-indigo-200 disabled:opacity-30 disabled:hover:bg-indigo-100 text-indigo-700 font-black text-xl leading-none flex items-center justify-center transition-all active:scale-95"
              >
                .
              </button>
            )}
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 pointer-events-none text-sm">
              {currency === 'UZS' ? "SO'M" : 'USD'}
            </span>
          </div>
          {currency === 'USD' && (
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5 pl-1">
              💡 Sent kiritish uchun yuqoridagi <span className="font-black text-indigo-500">[ . ]</span> tugmasini bosing (masalan: 100<span className="font-black text-indigo-500">.</span>50)
            </p>
          )}
        </div>

        {/* Quick Add Buttons */}
        {!editingTransaction && (
          <div className="grid grid-cols-3 gap-1.5">
            {currency === 'UZS'
              ? [50000, 100000, 500000, 1000000, 2000000, 5000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="py-2 px-2 text-[11px] font-bold bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 transition-all active:scale-95 text-center truncate"
                  >
                    +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                  </button>
                ))
              : [10, 50, 100, 200, 500, 1000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="py-2 px-2 text-[11px] font-bold bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 transition-all active:scale-95 text-center truncate"
                  >
                    +${val}
                  </button>
                ))}
          </div>
        )}

        {/* Live Preview: Both Currencies */}
        {currentAmountNum > 0 && (
          <div className="space-y-2">
            {/* Converted amount */}
            <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-indigo-100/60">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                {currency === 'UZS' ? 'Dollar ekvivalenti' : "So'm ekvivalenti"}
              </p>
              <p className="text-sm font-bold text-indigo-600">
                {currency === 'UZS' ? formatUSD(amountInUSD) : formatUZS(amountInUZS)}
              </p>
            </div>

            {isSelf ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100/60">
                  <p className="text-[10px] text-amber-500 font-bold uppercase mb-0.5">Hayriya ({charityPercentage}%)</p>
                  <p className="text-xs font-bold text-amber-600">{formatUZS(liveCharityUZS)}</p>
                  <p className="text-[10px] font-semibold text-amber-400">{formatUSD(liveCharityUSD)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100/60">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase mb-0.5">Sizga qoladi</p>
                  <p className="text-xs font-bold text-emerald-600">{formatUZS(liveNetUZS)}</p>
                  <p className="text-[10px] font-semibold text-emerald-400">{formatUSD(liveNetUSD)}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gradient-to-br from-rose-50 to-red-50 rounded-xl border border-rose-100/60">
                <p className="text-[10px] text-rose-500 font-bold uppercase mb-0.5">
                  Boshqa kanal puli · ehsonsiz
                </p>
                <p className="text-sm font-bold text-rose-600">{formatUZS(amountInUZS)}</p>
                <p className="text-[10px] font-semibold text-rose-400">{formatUSD(amountInUSD)}</p>
              </div>
            )}
          </div>
        )}

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Kategoriya
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Sana
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700"
            />
          </div>
        </div>

        {/* Izoh — Ijtimoiy tarmoqda kanal nomi avtomatik qo'yiladi, maydon yashiriladi */}
        {isSocial ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeChannel.color }}
            />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Izoh avtomatik
              </p>
              <p className="text-xs font-bold text-slate-700 truncate">{activeChannel.name}</p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tavsif (Izoh)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masalan: Frilans loyiha uchun to'lov..."
              className="w-full text-xs px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 placeholder-slate-300"
            />
          </div>
        )}

        {error && (
          <p className="text-[11px] font-semibold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
            {error}
          </p>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-2 pt-1">
          {editingTransaction && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all active:scale-95"
            >
              <X className="w-3.5 h-3.5" /> Bekor qilish
            </button>
          )}
          <button
            type="submit"
            className={`flex-2 w-full flex items-center justify-center gap-2 py-3.5 px-4 font-bold text-xs rounded-xl text-white transition-all active:scale-95 shadow-lg ${
              editingTransaction
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200/50 hover:shadow-amber-300/60'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-200/50 hover:shadow-indigo-300/60'
            }`}
          >
            {editingTransaction ? (
              <><Check className="w-4 h-4" /> Yangilash</>
            ) : (
              <><Plus className="w-4 h-4" /> Hisobga qo'shish</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
