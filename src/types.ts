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
 * Bir oylik daromad IKKI bosqichda aniq bo'ladi va ular turli vaqtda sodir
 * bo'ladi, shuning uchun har biri ALOHIDA kiritiladi:
 *
 *   1) AdSense'ga pul tushadi (taxminan keyingi oyning 7-12 kunlari)
 *      -> `actualUSD` ma'lum bo'ladi, kurs esa hali yo'q
 *   2) Bankdan pul yechiladi (taxminan 26-28 kunlari)
 *      -> `rate` ma'lum bo'ladi va oy butunlay qotadi
 *
 * Shu sababli ikkala maydon ham ixtiyoriy: birini kiritib, ikkinchisini
 * keyinroq qo'shish mumkin.
 */
export interface Payout {
  /**
   * 1 USD necha so'm — pul BANKDAN YECHILGAN kundagi kurs.
   * Kiritilmagan bo'lsa, so'mdagi summalar joriy kurs bo'yicha taxminiy.
   */
  rate?: number;
  /** Pul bankdan yechilgan sana (YYYY-MM-DD). Ixtiyoriy. */
  date?: string;
  /**
   * AdSense'ga ASLIDA kelgan summa (USD).
   *
   * YouTube Studio taxminiy raqam ko'rsatadi; AdSense'ga esa YouTube qayta
   * hisoblab (yaroqsiz trafik va h.k. chiqarib tashlanib) boshqa summa keladi.
   * Bu qiymat kiritilsa, o'sha oyning USD yozuvlari bir xil NISBATDA qayta
   * hisoblanadi — ya'ni har bir kanal bir xil foizda kamayadi (yoki oshadi).
   */
  actualUSD?: number;
}

/** Ish oyi -> tuzatish koeffitsienti (1 = tuzatish yo'q). */
export type PayoutFactors = { [monthKey: string]: number };

/** Kalit — ish oyi ("YYYY-MM"), ya'ni daromad TOPILGAN oy. */
export type Payouts = { [monthKey: string]: Payout };

/** Yozuv qaysi ish oyiga tegishli. */
export function monthOf(t: Transaction): string {
  return t.date.slice(0, 7);
}

/** Kurs haqiqiy sonmi? (buzuq ma'lumot hisobni buzmasligi uchun) */
export function isValidRate(r: unknown): r is number {
  return typeof r === 'number' && Number.isFinite(r) && r > 0;
}

/** Bankdan yechilganmi — ya'ni kurs kiritilib, oy qotganmi? */
export function isSettled(monthKey: string, payouts?: Payouts): boolean {
  return isValidRate(payouts?.[monthKey]?.rate);
}

/** AdSense'ga kelgan haqiqiy summa kiritilganmi? */
export function hasActual(monthKey: string, payouts?: Payouts): boolean {
  const a = payouts?.[monthKey]?.actualUSD;
  return typeof a === 'number' && Number.isFinite(a) && a >= 0;
}

/** Oyning bosqichi: hali hech narsa yo'q -> AdSense keldi -> bankdan yechildi. */
export type PayoutStage = 'pending' | 'received' | 'settled';

export function payoutStage(monthKey: string, payouts?: Payouts): PayoutStage {
  if (isSettled(monthKey, payouts)) return 'settled';
  if (hasActual(monthKey, payouts)) return 'received';
  return 'pending';
}

/** To'lov yozuvi bo'shmi (saqlashga arzimaydimi)? */
export function isEmptyPayout(p?: Payout): boolean {
  if (!p) return true;
  return !isValidRate(p.rate) && !(typeof p.actualUSD === 'number' && Number.isFinite(p.actualUSD));
}

/**
 * Ish oyi uchun amaldagi kurs.
 * To'lov kiritilgan bo'lsa — o'sha (qotgan) kurs; aks holda joriy kurs (taxminiy).
 */
export function rateForMonth(monthKey: string, payouts: Payouts | undefined, currentRate: number): number {
  const r = payouts?.[monthKey]?.rate;
  return isValidRate(r) ? r : currentRate;
}

/**
 * Har bir ish oyi uchun AdSense tuzatish koeffitsientini hisoblaydi.
 *
 * koeffitsient = AdSense'ga kelgan haqiqiy summa / o'sha oydagi USD yozuvlar yig'indisi
 *
 * Bitta umumiy koeffitsient barcha yozuvlarga qo'llangani uchun HAR BIR KANAL
 * bir xil FOIZDA kamayadi — kichik kanal katta kanalning kamomadini ko'tarmaydi
 * va hech qachon manfiyga tushmaydi.
 *
 * DIQQAT: to'liq tranzaksiyalar ro'yxatidan hisoblanishi shart (filtrlangan
 * ro'yxatdan emas), aks holda koeffitsient noto'g'ri chiqadi.
 */
export function payoutFactors(transactions: Transaction[], payouts?: Payouts): PayoutFactors {
  if (!payouts) return {};

  // Tuzatish faqat USD (AdSense) tushumlariga tegishli.
  // So'mdagi yozuvlar (hadya va h.k.) AdSense pulidan kelmaydi — ular tegilmaydi.
  const loggedUSD: { [m: string]: number } = {};
  for (const t of transactions) {
    if (t.currency !== 'USD') continue;
    const m = monthOf(t);
    loggedUSD[m] = (loggedUSD[m] || 0) + t.amount;
  }

  const out: PayoutFactors = {};
  for (const m of Object.keys(payouts)) {
    const actual = payouts[m]?.actualUSD;
    const logged = loggedUSD[m] || 0;
    if (typeof actual === 'number' && Number.isFinite(actual) && actual >= 0 && logged > 0) {
      out[m] = actual / logged;
    }
  }
  return out;
}

function factorFor(monthKey: string, factors?: PayoutFactors): number {
  const f = factors?.[monthKey];
  return typeof f === 'number' && Number.isFinite(f) && f >= 0 ? f : 1;
}

/** Oyga AdSense tuzatishi qo'llanganmi? */
export function hasAdjustment(monthKey: string, factors?: PayoutFactors): boolean {
  return factors?.[monthKey] !== undefined;
}

/** Yozuvning so'mdagi qiymati — o'z oyining kursi va AdSense tuzatishi bo'yicha. */
export function txUZS(
  t: Transaction,
  payouts: Payouts | undefined,
  currentRate: number,
  factors?: PayoutFactors
): number {
  if (t.currency !== 'USD') return t.amount;
  return t.amount * factorFor(monthOf(t), factors) * rateForMonth(monthOf(t), payouts, currentRate);
}

/** Yozuvning dollardagi qiymati — o'z oyining kursi va AdSense tuzatishi bo'yicha. */
export function txUSD(
  t: Transaction,
  payouts: Payouts | undefined,
  currentRate: number,
  factors?: PayoutFactors
): number {
  if (t.currency === 'USD') return t.amount * factorFor(monthOf(t), factors);
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
