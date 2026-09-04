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

// Qo'shimcha YouTube kanallari. Asosiy shaxsiy kanal ('self') bu ro'yxatga kirmaydi.
export interface Channel {
  id: string;
  name: string;
  color?: string;
  /**
   * Kanal "meniki"mi — ya'ni daromadi shaxsiy statistikaga (jami daromad,
   * maqsad, taxmin, oylik hisobot) qo'shiladimi?
   * Eski kanallarda yo'q => `false` (avvalgi xatti-harakat aynan saqlanadi).
   */
  owned?: boolean;
  /**
   * Shu kanaldan ehson ushlanadimi? Faqat `owned` bo'lganda ma'noga ega.
   * Shunday qilib kanal uch xil bo'ladi:
   *   owned + charity  -> meniki, ehson ushlanadi
   *   owned            -> meniki, lekin ehsonsiz (masalan sherikning ulushi)
   *   (hech biri)      -> boshqa kanal: statistikaga ham, ehsonga ham kirmaydi
   */
  charity?: boolean;
}

/** Kanalning uch rejimi — UI va mantiq uchun yagona nom. */
export type ChannelMode = 'own_charity' | 'own_plain' | 'other';

export function channelMode(c: Pick<Channel, 'owned' | 'charity'>): ChannelMode {
  if (!c.owned) return 'other';
  return c.charity ? 'own_charity' : 'own_plain';
}

export function modeFlags(mode: ChannelMode): { owned: boolean; charity: boolean } {
  if (mode === 'own_charity') return { owned: true, charity: true };
  if (mode === 'own_plain') return { owned: true, charity: false };
  return { owned: false, charity: false };
}

export const CHANNEL_MODE_LABELS: { [k in ChannelMode]: string } = {
  own_charity: 'Meniki — ehson ushlanadi',
  own_plain: 'Meniki — ehsonsiz',
  other: 'Boshqa kanal — ehsonsiz',
};

/** Ro'yxat/tanlov ichida qisqa ko'rsatish uchun. */
export const CHANNEL_MODE_SHORT: { [k in ChannelMode]: string } = {
  own_charity: 'meniki, ehsonli',
  own_plain: 'meniki, ehsonsiz',
  other: 'boshqa kanal',
};

export const SELF_CHANNEL_ID = 'self';

/**
 * Shaxsiy kanal — ehson AYNAN shundan ushlanadi.
 * Foydalanuvchi unga o'z kanalining nomini va rangini bera oladi.
 */
export interface SelfChannel {
  name: string;
  color?: string;
}

export const DEFAULT_SELF_NAME = 'Meniki';
export const DEFAULT_SELF_COLOR = '#6366f1';

/** Faqat kanal tegishliligi muhim bo'lgan joylar uchun (yozuv to'liq bo'lishi shart emas). */
type HasChannel = Pick<Transaction, 'channelId'>;

/** Yozuv asosiy shaxsiy kanalgami ('self')? */
export function isSelfTx(t: HasChannel): boolean {
  return !t.channelId || t.channelId === SELF_CHANNEL_ID;
}

/**
 * Yozuv SHAXSIY statistikaga kiradimi (jami daromad, maqsad, taxmin, hisobot)?
 * 'self' har doim meniki; qo'shimcha kanal esa "meniki" deb belgilangan bo'lsa.
 */
export function isOwnedTx(t: HasChannel, channels: Channel[]): boolean {
  if (isSelfTx(t)) return true;
  return channels.find((c) => c.id === t.channelId)?.owned === true;
}

/**
 * Shu yozuvdan ehson ushlanadimi?
 * 'self' — har doim; boshqa kanal — faqat "meniki + ehsonli" bo'lsa.
 */
export function hasCharityTx(t: HasChannel, channels: Channel[]): boolean {
  if (isSelfTx(t)) return true;
  const c = channels.find((x) => x.id === t.channelId);
  return c?.owned === true && c?.charity === true;
}

/** Kanal ko'rinishi (nom + rang) — self va boshqa kanallar uchun yagona manba. */
export interface ChannelInfo {
  id: string;
  name: string;
  color: string;
  /** Asosiy shaxsiy kanalmi ('self')? */
  isSelf: boolean;
  /** Shaxsiy statistikaga kiradimi ('self' yoki "meniki" deb belgilangan kanal)? */
  owned: boolean;
  /** Ehson ushlanadimi? */
  charity: boolean;
  mode: ChannelMode;
}

/**
 * Kanal id'si bo'yicha ko'rsatiladigan nom va rangni qaytaradi.
 * Kanal o'chirilgan bo'lsa ham ma'noli qiymat beradi (yozuvlar nomsiz qolmasin).
 */
export function channelInfo(
  channelId: string | undefined,
  channels: Channel[],
  self?: SelfChannel
): ChannelInfo {
  if (!channelId || channelId === SELF_CHANNEL_ID) {
    return {
      id: SELF_CHANNEL_ID,
      name: self?.name?.trim() || DEFAULT_SELF_NAME,
      color: self?.color || DEFAULT_SELF_COLOR,
      isSelf: true,
      owned: true,
      charity: true,
      mode: 'own_charity',
    };
  }
  const c = channels.find((x) => x.id === channelId);
  const owned = c?.owned === true;
  const charity = owned && c?.charity === true;
  return {
    id: channelId,
    name: c?.name || 'Boshqa kanal',
    color: c?.color || '#f43f5e',
    isSelf: false,
    owned,
    charity,
    mode: channelMode({ owned, charity }),
  };
}

/** Yozuv ro'yxat/statistikada qanday nom bilan ko'rinadi. */
export function txDisplayName(
  t: Transaction,
  channels: Channel[],
  self?: SelfChannel
): string {
  // Ijtimoiy tarmoq tushumi har doim kanal nomi bilan ko'rinadi —
  // kanal keyin qayta nomlansa, eski yozuvlar ham yangi nomni ko'rsatadi.
  if (t.category === 'social_media') return channelInfo(t.channelId, channels, self).name;
  return t.description;
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
   * Har bir kanal uchun AdSense'ga ASLIDA kelgan summa (USD).
   * Kalit — kanal id'si ('self' yoki 'ch-...').
   *
   * YouTube Studio taxminiy raqam ko'rsatadi; YouTube qayta hisoblab
   * (yaroqsiz trafik va h.k. chiqarib tashlanib) boshqa summa to'laydi.
   * Kamomad har bir kanalda alohida bo'ladi, shuning uchun umumiy summani
   * kanallarga bo'lish NOTO'G'RI — har bir kanalning o'z haqiqiy summasi
   * alohida kiritiladi.
   */
  actualByChannel?: { [channelId: string]: number };
  /**
   * ESKI maydon: butun oy uchun bitta summa (kanallarga nisbatan bo'linardi).
   * Faqat orqaga moslik uchun o'qiladi — yangi yozuvlar `actualByChannel` ga
   * yoziladi. Kanal uchun alohida summa kiritilgan bo'lsa, u ustun turadi.
   */
  actualUSD?: number;
}

/**
 * Ish oyi -> kanal -> tuzatish koeffitsienti (1 = tuzatish yo'q).
 * Har bir kanal o'z koeffitsientiga ega, chunki kamomad har xil bo'ladi.
 */
export type PayoutFactors = { [monthKey: string]: { [channelId: string]: number } };

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

/** AdSense'ga kelgan haqiqiy summa (biror kanal uchun) kiritilganmi? */
export function hasActual(monthKey: string, payouts?: Payouts): boolean {
  const p = payouts?.[monthKey];
  if (!p) return false;
  if (typeof p.actualUSD === 'number' && Number.isFinite(p.actualUSD)) return true;
  const byCh = p.actualByChannel;
  return !!byCh && Object.values(byCh).some((v) => typeof v === 'number' && Number.isFinite(v));
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
  if (isValidRate(p.rate)) return false;
  if (typeof p.actualUSD === 'number' && Number.isFinite(p.actualUSD)) return false;
  const byCh = p.actualByChannel;
  if (byCh && Object.values(byCh).some((v) => typeof v === 'number' && Number.isFinite(v))) {
    return false;
  }
  return true;
}

/**
 * Ish oyi uchun amaldagi kurs.
 * To'lov kiritilgan bo'lsa — o'sha (qotgan) kurs; aks holda joriy kurs (taxminiy).
 */
export function rateForMonth(monthKey: string, payouts: Payouts | undefined, currentRate: number): number {
  const r = payouts?.[monthKey]?.rate;
  return isValidRate(r) ? r : currentRate;
}

/** Yozuv qaysi kanalga tegishli (kalit sifatida). */
export function channelKeyOf(t: Transaction): string {
  return isSelfTx(t) ? SELF_CHANNEL_ID : t.channelId!;
}

function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * Har bir ish oyi va HAR BIR KANAL uchun AdSense tuzatish koeffitsienti.
 *
 * koeffitsient = kanalning haqiqiy summasi / o'sha kanalning Studio summasi
 *
 * Har bir kanal alohida hisoblanadi, chunki YouTube'ning qayta hisobidagi
 * kamomad har bir kanalda har xil bo'ladi. Umumiy summani bo'lish bir
 * kanalning kamomadini boshqasiga yuklab qo'yardi.
 *
 * DIQQAT: to'liq tranzaksiyalar ro'yxatidan hisoblanishi shart (filtrlangan
 * ro'yxatdan emas), aks holda koeffitsient noto'g'ri chiqadi.
 */
export function payoutFactors(transactions: Transaction[], payouts?: Payouts): PayoutFactors {
  if (!payouts) return {};

  // Tuzatish faqat USD (AdSense) tushumlariga tegishli.
  // So'mdagi yozuvlar (hadya va h.k.) AdSense pulidan kelmaydi — ular tegilmaydi.
  const logged: { [m: string]: { [ch: string]: number } } = {};
  for (const t of transactions) {
    if (t.currency !== 'USD') continue;
    const m = monthOf(t);
    const ch = channelKeyOf(t);
    if (!logged[m]) logged[m] = {};
    logged[m][ch] = (logged[m][ch] || 0) + t.amount;
  }

  const out: PayoutFactors = {};
  const put = (m: string, ch: string, f: number) => {
    if (!out[m]) out[m] = {};
    out[m][ch] = f;
  };

  for (const m of Object.keys(payouts)) {
    const p = payouts[m];
    const byCh = logged[m] || {};

    // 1) Kanal bo'yicha alohida kiritilgan haqiqiy summalar — asosiy manba
    if (p?.actualByChannel) {
      for (const ch of Object.keys(p.actualByChannel)) {
        const actual = p.actualByChannel[ch];
        const lg = byCh[ch] || 0;
        if (isAmount(actual) && lg > 0) put(m, ch, actual / lg);
      }
    }

    // 2) ESKI ma'lumot: butun oy uchun bitta summa. Faqat hali alohida
    //    tuzatilmagan kanallarga qo'llanadi, shunda eski yozuvlar buzilmaydi.
    if (isAmount(p?.actualUSD)) {
      const totalLogged = Object.values(byCh).reduce((s, v) => s + v, 0);
      if (totalLogged > 0) {
        const f = p!.actualUSD! / totalLogged;
        for (const ch of Object.keys(byCh)) {
          if (out[m]?.[ch] === undefined) put(m, ch, f);
        }
      }
    }
  }
  return out;
}

function factorFor(monthKey: string, channelId: string, factors?: PayoutFactors): number {
  const f = factors?.[monthKey]?.[channelId];
  return typeof f === 'number' && Number.isFinite(f) && f >= 0 ? f : 1;
}

/** Shu oy va kanalga AdSense tuzatishi qo'llanganmi? */
export function hasAdjustment(
  monthKey: string,
  channelId: string,
  factors?: PayoutFactors
): boolean {
  return factors?.[monthKey]?.[channelId] !== undefined;
}

/** Shu oyda umuman biror kanalga tuzatish qo'llanganmi? */
export function monthHasAdjustment(monthKey: string, factors?: PayoutFactors): boolean {
  const m = factors?.[monthKey];
  return !!m && Object.keys(m).length > 0;
}

/** Yozuvning so'mdagi qiymati — o'z oyining kursi va AdSense tuzatishi bo'yicha. */
export function txUZS(
  t: Transaction,
  payouts: Payouts | undefined,
  currentRate: number,
  factors?: PayoutFactors
): number {
  if (t.currency !== 'USD') return t.amount;
  return (
    t.amount *
    factorFor(monthOf(t), channelKeyOf(t), factors) *
    rateForMonth(monthOf(t), payouts, currentRate)
  );
}

/** Yozuvning dollardagi qiymati — o'z oyining kursi va AdSense tuzatishi bo'yicha. */
export function txUSD(
  t: Transaction,
  payouts: Payouts | undefined,
  currentRate: number,
  factors?: PayoutFactors
): number {
  if (t.currency === 'USD') return t.amount * factorFor(monthOf(t), channelKeyOf(t), factors);
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

/**
 * Oyning uch harfli qisqartmasi (grafik o'qi uchun).
 * Nomni shunchaki kesib olib bo'lmaydi: "Iyun" va "Iyul" ikkalasi ham
 * "Iyu" bo'lib qolar va grafikda ikkita bir xil yorliq turardi.
 */
export const MONTH_ABBR: { [key: string]: string } = {
  '01': 'Yan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Iyn',
  '07': 'Iyl',
  '08': 'Avg',
  '09': 'Sen',
  '10': 'Okt',
  '11': 'Noy',
  '12': 'Dek',
};

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
