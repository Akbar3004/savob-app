export interface Transaction {
  id: string;
  amount: number;
  currency: 'UZS' | 'USD';
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  charityPercentage: number;
  // Qaysi kanalga tegishli: 'self' (meniki) yoki boshqa kanal id'si.
  // Bo'sh/mavjud emas => eski yozuv, 'self' deb hisoblanadi.
  channelId?: string;
}

// Boshqa (o'zimniki bo'lmagan) YouTube kanallari. 'self' bu ro'yxatga kirmaydi.
export interface Channel {
  id: string;
  name: string;
  color?: string;
}

export const SELF_CHANNEL_ID = 'self';

/** Tranzaksiya sizning ("meniki") daromadingizmi? Faqat 'self' dan ehson ushlanadi. */
export function isSelfTx(t: Transaction): boolean {
  return !t.channelId || t.channelId === SELF_CHANNEL_ID;
}

// Yangi kanallar uchun tavsiya etilgan ranglar
export const CHANNEL_COLORS = [
  '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899', '#84cc16', '#6366f1',
];

/**
 * Ish oyi uchun to'lov ma'lumoti.
 *
 * YouTube daromadi ishlangan oydan keyin to'lanadi (masalan, iyul daromadi
 * avgust oxirida keladi) va so'mga o'sha KUNDAGI kurs bilan aylantiriladi.
 * Shuning uchun kurs har bir ish oyiga biriktiriladi: to'lov kelgach kiritiladi
 * va o'sha oyning barcha hisob-kitoblari abadiy qotib qoladi.
 */
export interface Payout {
  /** 1 USD necha so'm — to'lov kelgan kundagi kurs. */
  rate: number;
  /** To'lov kelgan sana (YYYY-MM-DD). Ixtiyoriy. */
  date?: string;
}

/** Kalit — ish oyi ("YYYY-MM"), ya'ni daromad TOPILGAN oy. */
export type Payouts = { [monthKey: string]: Payout };

/** Yozuv qaysi ish oyiga tegishli. */
export function monthOf(t: Transaction): string {
  return t.date.slice(0, 7);
}

/** Kurs haqiqiy sonmi? (buzuq ma'lumot hisobni buzmasligi uchun) */
function validRate(r: unknown): r is number {
  return typeof r === 'number' && Number.isFinite(r) && r > 0;
}

/** Oy to'langanmi — ya'ni kursi qotganmi? */
export function isSettled(monthKey: string, payouts?: Payouts): boolean {
  return validRate(payouts?.[monthKey]?.rate);
}

/**
 * Ish oyi uchun amaldagi kurs.
 * To'lov kiritilgan bo'lsa — o'sha (qotgan) kurs; aks holda joriy kurs (taxminiy).
 */
export function rateForMonth(monthKey: string, payouts: Payouts | undefined, currentRate: number): number {
  const r = payouts?.[monthKey]?.rate;
  return validRate(r) ? r : currentRate;
}

/** Yozuvning so'mdagi qiymati — o'z oyining kursi bo'yicha. */
export function txUZS(t: Transaction, payouts: Payouts | undefined, currentRate: number): number {
  if (t.currency !== 'USD') return t.amount;
  return t.amount * rateForMonth(monthOf(t), payouts, currentRate);
}

/** Yozuvning dollardagi qiymati — o'z oyining kursi bo'yicha. */
export function txUSD(t: Transaction, payouts: Payouts | undefined, currentRate: number): number {
  if (t.currency === 'USD') return t.amount;
  const rate = rateForMonth(monthOf(t), payouts, currentRate);
  return rate > 0 ? t.amount / rate : 0;
}

export interface MonthlyStats {
  monthKey: string; // YYYY-MM
  monthName: string;
  totalUZS: number;
  totalUSD: number;
  charityUZS: number;
  charityUSD: number;
  netUZS: number;
  netUSD: number;
  transactionCount: number;
}

export const CATEGORIES = [
  { id: 'oylik', label: 'Oylik ish haqi', icon: '💼', color: '#6366f1' },
  { id: 'biznes', label: 'Tadbirkorlik / Biznes', icon: '🏪', color: '#3b82f6' },
  { id: 'frilans', label: 'Frilans / Xizmatlar', icon: '💻', color: '#8b5cf6' },
  { id: 'social_media', label: 'Ijtimoiy tarmoq', icon: '🌐', color: '#ec4899' },
  { id: 'hadya', label: 'Hadya / Sovg\'a', icon: '🎁', color: '#f59e0b' },
  { id: 'boshqa', label: 'Boshqa tushum', icon: '📦', color: '#6b7280' },
];

export function formatUZS(amount: number): string {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
}

export function formatUSD(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' mlrd';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' mln';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' ming';
  return amount.toString();
}

export const MONTH_NAMES: { [key: string]: string } = {
  '01': 'Yanvar',
  '02': 'Fevral',
  '03': 'Mart',
  '04': 'Aprel',
  '05': 'May',
  '06': 'Iyun',
  '07': 'Iyul',
  '08': 'Avgust',
  '09': 'Sentyabr',
  '10': 'Oktyabr',
  '11': 'Noyabr',
  '12': 'Dekabr',
};
