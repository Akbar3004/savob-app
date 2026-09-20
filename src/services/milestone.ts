import type { DailyTotals } from './forecast';

/**
 * MARRA — to'plangan umumiy summa qachon belgilangan chegaraga yetadi.
 *
 * Oylik taxmindan (forecast.ts) farqi shundaki, bu yerda savol boshqa:
 * "shu sur'atda ketsa, $10 000 ga qachon yetaman?". Javob bitta sana emas,
 * UCHTA — chunki YouTube daromadi bitta viral video bilan ham, mavsum
 * bilan ham keskin o'zgaradi va bitta sana berish yolg'on aniqlik bo'lardi.
 *
 * Sur'at o'ylab topilmaydi, SIZNING oxirgi to'liq oylaringizdan olinadi:
 *   sekin  — o'sha oylarning eng pasti
 *   hozirgi — o'rtachasi
 *   o'sish — o'rtachadan boshlab, kuzatilgan o'sish bilan ko'payib boradi
 *
 * Ikki himoya qo'yilgan:
 *   1) o'sish cheksiz davom etmaydi — GROWTH_CAP_MONTHS dan keyin sur'at
 *      qotadi, aks holda "yiliga +15%" 10 yilda kulgili raqam berardi;
 *   2) o'sish koeffitsienti [0.75, 1.30] oralig'iga qisiladi — bitta g'alati
 *      oy butun bashoratni uchirib yubormasligi uchun.
 */

/** O'rtacha oy uzunligi — sanani hisoblashda ishlatiladi. */
const DAYS_PER_MONTH = 30.4375;

/** O'sish shuncha oydan keyin to'xtaydi (sur'at qotadi). */
const GROWTH_CAP_MONTHS = 24;

/** Bundan uzoq muddat "ko'rinadigan kelajakda yetmaydi" deb hisoblanadi. */
const MAX_MONTHS = 600;

/** Kuzatilgan o'sishning ruxsat etilgan chegaralari (ko'rsatish uchun). */
const GROWTH_MIN = 0.75;
const GROWTH_MAX = 1.3;

/**
 * BASHORATDA qo'llaniladigan chegaralar — kuzatilganidan ancha tor.
 *
 * Nega: oxirgi oylarda +22% o'sish bo'lishi mumkin, lekin uni 24 oy
 * murakkab foizda ko'paytirsak, oylik daromad xayoliy raqamga aylanadi.
 * Xuddi shunday, -25% pasayish ketma-ket 24 oy davom etsa, natija "hech
 * qachon yetmaydi" bo'lib chiqadi — bu ham foydasiz javob. Shuning uchun
 * bashoratda o'sish +12%, pasayish -6% bilan cheklanadi.
 */
const PROJECT_GROWTH_MAX = 1.12;
const PROJECT_DECLINE_MIN = 0.94;

export type MilestoneScope = 'mine' | 'all';
export type MilestoneCurrency = 'USD' | 'UZS';

export interface Milestone {
  amount: number;
  currency: MilestoneCurrency;
  scope: MilestoneScope;
}

export const DEFAULT_MILESTONE: Milestone = {
  amount: 10000,
  currency: 'USD',
  scope: 'mine',
};

export interface Pace {
  key: 'slow' | 'now' | 'fast';
  /** Boshlang'ich oylik sur'at. */
  perMonth: number;
  /** Har oy ko'payish koeffitsienti (1 = o'zgarmaydi). */
  growth: number;
  /** Marraga necha oy qolgani (kasr bo'lishi mumkin). null = yetmaydi. */
  months: number | null;
  /** Taxminiy sana "YYYY-MM-DD". null = yetmaydi. */
  date: string | null;
}

export interface MilestoneResult {
  /** Hozirgacha to'plangan. */
  current: number;
  target: number;
  remaining: number;
  reached: boolean;
  /** Oxirgi ma'lumot kiritilgan sana. */
  asOf: string;
  /** Hisobda ishlatilgan TO'LIQ oylar soni. */
  monthsUsed: number;
  /** Kuzatilgan oylik o'sish (1.12 = +12%). null = tarix yetmaydi. */
  growth: number | null;
  paces: { slow: Pace; now: Pace; fast: Pace };
  confidence: 'past' | 'orta' | 'yuqori';
}

function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Sanaga kun qo'shadi. toISOString ATAYLAB ishlatilmaydi — u UTC ga o'tkazib yuboradi. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Marraga necha oy qolgani.
 *
 * @param firstFrac joriy oyning qolgan ulushi (0..1) — oyning yarmi o'tgan
 *                  bo'lsa, shu oydan faqat yarmi qo'shiladi, aks holda
 *                  allaqachon topilgan pul ikki marta sanalardi.
 */
function monthsUntil(
  remaining: number,
  rate0: number,
  growth: number,
  firstFrac: number
): number | null {
  if (!(rate0 > 0) || !(remaining > 0)) return null;

  let rate = rate0;
  const first = rate * firstFrac;
  if (first >= remaining) return (remaining / rate);

  let acc = first;
  let elapsed = firstFrac;
  let grown = 0;

  for (let i = 0; i < MAX_MONTHS; i++) {
    if (grown < GROWTH_CAP_MONTHS) {
      rate *= growth;
      grown++;
    }
    if (!(rate > 0)) return null;
    if (acc + rate >= remaining) return elapsed + (remaining - acc) / rate;
    acc += rate;
    elapsed += 1;
  }
  return null;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

/**
 * @param daily   kunlik summalar — qaysi kanallar va ehson ayirilgan-ayirilmagani
 *                CHAQIRUVCHI tomonidan hal qilinadi; bu modul faqat sonlar bilan
 *                ishlaydi, shuning uchun so'm va dollarga bir xil yaraydi.
 * @param target  marra summasi (daily bilan bir xil valyutada)
 * @param todayISO ilovaning "bugun"i (haqiqiy kundan 2 kun orqada)
 */
export function computeMilestone(
  daily: DailyTotals,
  target: number,
  todayISO: string
): MilestoneResult | null {
  const dates = Object.keys(daily).sort();
  if (dates.length === 0 || !(target > 0)) return null;

  const current = dates.reduce((s, d) => s + daily[d], 0);
  const remaining = target - current;

  // Oxirgi ma'lumot ilovaning "bugun"idan orqada bo'lishi mumkin (bir necha
  // kun kiritilmay qolgan bo'lsa). Sur'atni o'sha oxirgi sanaga tayab
  // hisoblaymiz — aks holda kiritilmagan kunlar "daromad tushmadi" deb
  // o'qilib, sur'at sun'iy ravishda pasayib ketardi.
  const lastData = dates[dates.length - 1];
  const asOf = lastData < todayISO ? lastData : todayISO;

  // To'liq o'tgan oylar (joriy oy hisobga kirmaydi — u hali tugamagan)
  const curMonth = asOf.slice(0, 7);
  const byMonth: { [m: string]: number } = {};
  for (const d of dates) {
    const m = d.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + daily[d];
  }
  const doneMonths = Object.keys(byMonth)
    .filter((m) => m < curMonth && byMonth[m] > 0)
    .sort();

  const dim = daysInMonth(curMonth);
  const dayNow = Number(asOf.slice(8, 10));
  const firstFrac = Math.max(0, (dim - dayNow) / dim);

  let slowRate: number;
  let nowRate: number;
  let fastRate: number;
  let growth: number | null = null;

  if (doneMonths.length === 0) {
    // Hali birorta to'liq oy yo'q — butun davr bo'yicha oddiy sur'at.
    // Oraliq ataylab keng, ishonch past.
    const spanDays =
      Math.round(
        (new Date(asOf + 'T00:00:00').getTime() -
          new Date(dates[0] + 'T00:00:00').getTime()) /
          86400000
      ) + 1;
    const perMonth = spanDays > 0 ? (current / spanDays) * DAYS_PER_MONTH : 0;
    slowRate = perMonth * 0.7;
    nowRate = perMonth;
    fastRate = perMonth * 1.3;
  } else {
    const last3 = doneMonths.slice(-3).map((m) => byMonth[m]);
    nowRate = mean(last3);
    slowRate = last3.length > 1 ? Math.min(...last3) : nowRate * 0.8;
    fastRate = last3.length > 1 ? Math.max(...last3) : nowRate * 1.2;

    // O'sish: oxirgi 4 tagacha oy bo'yicha geometrik o'rtacha. Bitta oyning
    // sakrashi emas, umumiy yo'nalish olinadi.
    const win = doneMonths.slice(-4).map((m) => byMonth[m]);
    if (win.length >= 2 && win[0] > 0) {
      const g = Math.pow(win[win.length - 1] / win[0], 1 / (win.length - 1));
      if (Number.isFinite(g) && g > 0) growth = clamp(g, GROWTH_MIN, GROWTH_MAX);
    }
  }

  // "O'sish davom etsa" — kuzatilgan o'sish bo'lsa o'shani qo'llaymiz,
  // lekin bashorat chegarasi bilan. O'sish kuzatilmasa, eng yaxshi oy
  // darajasida turadi deb olamiz.
  const fastGrowth =
    growth !== null && growth > 1.02 ? Math.min(growth, PROJECT_GROWTH_MAX) : 1;
  const fastStart = fastGrowth > 1 ? nowRate : fastRate;

  // "Sekin" — pasayish kuzatilgan bo'lsa o'shani, aks holda eng past oy.
  const slowGrowth =
    growth !== null && growth < 0.98 ? Math.max(growth, PROJECT_DECLINE_MIN) : 1;
  const slowStart = slowGrowth < 1 ? nowRate : slowRate;

  const mk = (
    key: Pace['key'],
    perMonth: number,
    g: number
  ): Pace => {
    if (remaining <= 0) return { key, perMonth, growth: g, months: 0, date: asOf };
    const months = monthsUntil(remaining, perMonth, g, firstFrac);
    return {
      key,
      perMonth,
      growth: g,
      months,
      date: months === null ? null : addDays(asOf, Math.round(months * DAYS_PER_MONTH)),
    };
  };

  let confidence: MilestoneResult['confidence'] = 'past';
  if (doneMonths.length >= 4) confidence = 'yuqori';
  else if (doneMonths.length >= 2) confidence = 'orta';

  return {
    current,
    target,
    remaining,
    reached: remaining <= 0,
    asOf,
    monthsUsed: doneMonths.length,
    growth,
    paces: {
      slow: mk('slow', slowStart, slowGrowth),
      now: mk('now', nowRate, 1),
      fast: mk('fast', fastStart, fastGrowth),
    },
    confidence,
  };
}

/** "7 oy", "1 yil 3 oy" — muddatni o'zbekcha yozadi. */
export function formatDuration(months: number): string {
  const total = Math.max(0, Math.round(months));
  if (total < 1) return 'shu oy ichida';
  if (total < 12) return `${total} oy`;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m === 0 ? `${y} yil` : `${y} yil ${m} oy`;
}
