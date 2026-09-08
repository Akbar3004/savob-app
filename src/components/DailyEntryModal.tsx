import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CalendarDays, Check, DollarSign, Banknote, User, Youtube, Heart, Info } from 'lucide-react';
import {
  Transaction,
  Channel,
  SelfChannel,
  Payouts,
  SELF_CHANNEL_ID,
  channelInfo,
  hasCharityTx,
  rateForMonth,
  formatUZS,
  formatUSD,
} from '../types';
import { appTodayISO, DATA_LAG_DAYS } from '../appDate';

export interface DailyEntry {
  channelId: string;
  amount: number;
  currency: 'UZS' | 'USD';
}

interface DailyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Boshlang'ich sana (ro'yxatdan tahrirlashga kirilganda beriladi). */
  initialDate?: string;
  transactions: Transaction[];
  channels: Channel[];
  selfChannel: SelfChannel | undefined;
  charityPercentage: number;
  exchangeRate: number;
  payouts: Payouts;
  onSave: (date: string, entries: DailyEntry[]) => void;
}

const CURRENCY_KEY = 'savob_last_currency';

/**
 * KUNLIK TUSHUM — bitta sanaga BARCHA kanallarni birdan kiritish.
 *
 * Ilgari forma sahifaning ichida edi: bitta kanalga summa yozib saqlansa
 * sahifa tepaga qaytar, keyingi kanal uchun yana pastga tushish kerak
 * bo'lardi. Har kuni uchala kanal uchun uch marta.
 *
 * Endi hammasi bitta oynada: sana yuqorida, har kanal bitta qator,
 * bitta "Saqlash". Oyna saqlagandan keyin ham yopilmaydi — ketma-ket
 * bir necha kunni kiritish mumkin.
 *
 * Shu sana va kanalda yozuv allaqachon bo'lsa, u YANGILANADI — yangi
 * yozuv qo'shilmaydi. Bu tasodifan ikki marta kiritib yuborishning
 * oldini oladi.
 */
export const DailyEntryModal: React.FC<DailyEntryModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  transactions,
  channels,
  selfChannel,
  charityPercentage,
  exchangeRate,
  payouts,
  onSave,
}) => {
  const [date, setDate] = useState(initialDate || appTodayISO());
  const [currency, setCurrency] = useState<'UZS' | 'USD'>(() => {
    try {
      return (localStorage.getItem(CURRENCY_KEY) as 'UZS' | 'USD') || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [values, setValues] = useState<{ [channelId: string]: string }>({});
  const [saved, setSaved] = useState(false);

  // Barcha kanallar: asosiy kanal birinchi, keyin qolganlari
  const rows = useMemo(
    () => [SELF_CHANNEL_ID, ...channels.map((c) => c.id)],
    [channels]
  );

  /** Shu sana va kanaldagi mavjud yozuv. */
  const existing = (channelId: string) =>
    transactions.find(
      (t) => t.date === date && (t.channelId || SELF_CHANNEL_ID) === channelId
    );

  // Sana o'zgarganda (yoki oyna ochilganda) maydonlarni o'sha kunning
  // mavjud summalari bilan to'ldiramiz.
  //
  // `transactions` ataylab bog'liqlikka kiritilmagan: saqlagandan keyin u
  // o'zgaradi va bu effekt qayta ishga tushib "Saqlandi" xabarini darhol
  // o'chirib yuborardi.
  useEffect(() => {
    if (!isOpen) return;
    const next: { [k: string]: string } = {};
    let seenCurrency: 'UZS' | 'USD' | null = null;
    for (const id of rows) {
      const t = existing(id);
      if (t) {
        next[id] = String(t.amount);
        seenCurrency = t.currency;
      }
    }
    setValues(next);
    if (seenCurrency) setCurrency(seenCurrency);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isOpen]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const rate = rateForMonth(date.slice(0, 7), payouts, exchangeRate);

  const parsed = useMemo(
    () =>
      rows
        .map((id) => ({ channelId: id, amount: parseFloat(values[id] || '') }))
        .filter((r) => Number.isFinite(r.amount) && r.amount > 0),
    [rows, values]
  );

  const totals = useMemo(() => {
    let uzs = 0;
    let charity = 0;
    for (const r of parsed) {
      const inUzs = currency === 'USD' ? r.amount * rate : r.amount;
      uzs += inUzs;
      const chId = r.channelId === SELF_CHANNEL_ID ? undefined : r.channelId;
      if (hasCharityTx({ channelId: chId }, channels)) {
        charity += (inUzs * charityPercentage) / 100;
      }
    }
    return { uzs, usd: rate > 0 ? uzs / rate : 0, charity };
  }, [parsed, currency, rate, channels, charityPercentage]);

  if (!isOpen) return null;

  const save = () => {
    if (parsed.length === 0) return;
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      /* maxfiy rejim — muhim emas */
    }
    onSave(
      date,
      parsed.map((r) => ({ ...r, currency }))
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const setValue = (id: string, raw: string) => {
    // USD da nuqta bilan, so'mda faqat butun son
    const clean =
      currency === 'USD'
        ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
        : raw.replace(/\D/g, '');
    setValues((v) => ({ ...v, [id]: clean }));
  };

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${dd}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-md w-full p-6 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[92vh] relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4 pr-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">Kunlik tushum</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Bir kunga barcha kanallarni birdan kiriting
              </p>
            </div>
          </div>

          {/* Sana */}
          <div className="mb-4">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Sana
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold transition-all"
                title="Oldingi kun"
              >
                ‹
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 min-w-0 text-sm font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => shiftDate(1)}
                className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold transition-all"
                title="Keyingi kun"
              >
                ›
              </button>
            </div>
            {date === appTodayISO() && (
              <p className="text-[9.5px] font-semibold text-slate-400 mt-1.5 leading-snug">
                YouTube {DATA_LAG_DAYS} kun kechikadi — sana shunga moslandi.
              </p>
            )}
          </div>

          {/* Valyuta */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Valyuta
            </span>
            <div className="currency-toggle">
              <button type="button" onClick={() => setCurrency('UZS')} className={currency === 'UZS' ? 'active' : ''}>
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" /> SO'M
                </span>
              </button>
              <button type="button" onClick={() => setCurrency('USD')} className={currency === 'USD' ? 'active' : ''}>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> USD
                </span>
              </button>
            </div>
          </div>

          {/* Kanallar */}
          <div className="space-y-2 mb-4">
            {rows.map((id) => {
              const info = channelInfo(id === SELF_CHANNEL_ID ? undefined : id, channels, selfChannel);
              const had = existing(id);
              return (
                <div key={id} className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: info.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {info.owned ? (
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : (
                        <Youtube className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-700 truncate">{info.name}</span>
                      {info.charity && (
                        <Heart className="w-2.5 h-2.5 text-amber-500 fill-current shrink-0" />
                      )}
                    </div>
                    {had && (
                      <span className="text-[9px] font-semibold text-emerald-600">
                        allaqachon kiritilgan — yangilanadi
                      </span>
                    )}
                  </div>
                  <input
                    inputMode={currency === 'USD' ? 'decimal' : 'numeric'}
                    value={values[id] || ''}
                    onChange={(e) => setValue(id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                    placeholder="0"
                    className={`w-28 shrink-0 text-right text-sm font-bold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all tabular-nums ${
                      had ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Jami */}
          {parsed.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/60 border border-indigo-100/60 mb-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Shu kun jami
                </span>
                <span className="font-display font-black text-slate-800 tabular-nums">
                  {formatUZS(totals.uzs)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 mt-1">
                <span className="text-[9.5px] font-semibold text-slate-400">
                  {parsed.length} ta kanal · kurs {rate}
                </span>
                <span className="text-[11px] font-bold text-indigo-500 tabular-nums">
                  {formatUSD(totals.usd)}
                </span>
              </div>
              {totals.charity > 0 && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-indigo-100/70">
                  <Heart className="w-3 h-3 text-amber-500 fill-current" />
                  <span className="text-[10px] font-bold text-amber-600 tabular-nums">
                    Ehson: {formatUZS(totals.charity)}
                  </span>
                </div>
              )}
            </div>
          )}

          <p className="flex items-start gap-1.5 text-[9.5px] font-semibold text-slate-400 leading-snug mb-3">
            <Info className="w-3 h-3 shrink-0 mt-px" />
            Bo'sh qoldirilgan kanal o'zgarmaydi. Yozuvni o'chirish uchun ro'yxatdagi
            savat belgisidan foydalaning.
          </p>

          <button
            onClick={save}
            disabled={parsed.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-3.5 font-bold text-xs rounded-xl text-white transition-all active:scale-[0.98] shadow-lg disabled:opacity-40 ${
              saved
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-200/50'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-200/50'
            }`}
          >
            <Check className="w-4 h-4" />
            {saved ? 'Saqlandi — keyingi kunni kiritishingiz mumkin' : 'Saqlash'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
