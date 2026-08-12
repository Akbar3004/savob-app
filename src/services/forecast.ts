/**
 * Oylik daromad taxmini.
 *
 * Asosiy g'oya: oddiy "kunlik o'rtachani oy oxirigacha ko'paytirish" yomon
 * natija beradi, chunki daromad oy davomida bir tekis kelmaydi. Shuning uchun
 * SIZNING O'Z TARIXINGIZDAN oyning "shakli" o'rganiladi:
 *
 *   "Odatda oyning 27% i o'tganda oylik daromadning ~31% i to'plangan bo'ladi"
 *
 * Keyin joriy oyda to'plangan summa shu ulushga bo'linadi.
 *
 * Tarix yetarli bo'lmasa oddiy sur'at (run-rate) usuliga tushadi va buni
 * ochiq "ishonch: past" deb belgilaydi — yolg'on aniqlik bermaslik uchun.
 */

export type Confidence = 'past' | 'orta' | 'yuqori';

export interface Forecast {
  /** Eng ehtimolli summa. */
  point: number;
  /** Oraliqning quyi va yuqori chegarasi. */
  low: number;
  high: number;
  confidence: Confidence;
  /** 'shape' — tarix shakli bo'yicha, 'runrate' — oddiy sur'at bo'yicha. */
  method: 'shape' | 'runrate';
  /** Taxminda nechta to'liq o'tgan oy ishlatilgani. */
  monthsUsed: number;
  /** Oyning necha ulushi o'tgani (0..1). */
  elapsed: number;
  /** Hozirgacha to'plangan summa. */
  current: number;
}

export interface GoalLevel {
  key: 'safe' | 'balanced' | 'stretch';
  label: string;
  hint: string;
  amount: number;
  /** Nechta o'tgan oyda shu summadan oshgan. */
  beaten: number;
  /** Taqqoslashda ishlatilgan oylar soni. */
  months: number;
}

export type DailyTotals = { [date: string]: number }; // "YYYY-MM-DD" -> summa

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Kunlik summalarni oylarga guruhlaydi. */
function groupByMonth(daily: DailyTotals): { [monthKey: string]: DailyTotals } {
  const out: { [m: string]: DailyTotals } = {};
  for (const date of Object.keys(daily)) {
    const m = date.slice(0, 7);
    if (!out[m]) out[m] = {};
    out[m][date] = daily[date];
  }
  return out;
}

function monthTotal(days: DailyTotals): number {
  return Object.values(days).reduce((s, v) => s + v, 0);
}

/** Oyning boshidan `dayCut` kunigacha (shu kun ham) to'plangan summa. */
function cumulativeTo(days: DailyTotals, dayCut: number): number {
  let sum = 0;
  for (const date of Object.keys(days)) {
    const d = Number(date.slice(8, 10));
    if (d <= dayCut) sum += days[date];
  }
  return sum;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/**
 * Joriy oy uchun taxmin.
 * @param daily      kunlik summalar ("YYYY-MM-DD" -> summa)
 * @param monthKey   joriy oy ("YYYY-MM")
 * @param dayOfMonth bugungi kun (1..31)
 */
export function computeForecast(
  daily: DailyTotals,
  monthKey: string,
  dayOfMonth: number
): Forecast | null {
  const byMonth = groupByMonth(daily);
  const dim = daysInMonth(monthKey);
  const day = Math.min(Math.max(dayOfMonth, 1), dim);
  const elapsed = day / dim;

  const current = monthTotal(byMonth[monthKey] || {});

  // Hali hech narsa kiritilmagan bo'lsa, taxmin qilishga asos yo'q
  if (current <= 0) return null;

  // Tarix shakli: har bir to'liq o'tgan oy uchun "shu ulushga borganda
  // oylik daromadning qanchasi to'plangan edi?" degan savolga javob
  const pastKeys = Object.keys(byMonth)
    .filter((m) => m < monthKey)
    .sort();

  const estimates: number[] = [];
  for (const pk of pastKeys) {
    const days = byMonth[pk];
    const total = monthTotal(days);
    if (total <= 0) continue;

    // Oylar uzunligi har xil — shuning uchun kun emas, ULUSH bo'yicha kesamiz
    const cut = Math.max(1, Math.min(daysInMonth(pk), Math.ceil(elapsed * daysInMonth(pk))));
    const cum = cumulativeTo(days, cut);
    const frac = cum / total;

    // Juda kichik ulush bo'lsa bo'lish natijasi portlab ketadi — tashlab ketamiz
    if (frac < 0.02) continue;
    estimates.push(current / frac);
  }

  let point: number;
  let low: number;
  let high: number;
  let method: 'shape' | 'runrate';

  if (estimates.length > 0) {
    method = 'shape';
    point = median(estimates);
    if (estimates.length === 1) {
      // Bitta oylik tarix — oraliq ataylab keng, chunki ishonch past
      low = point * 0.75;
      high = point * 1.25;
    } else {
      low = percentile(estimates, 0.25);
      high = percentile(estimates, 0.75);
      // Barcha baholar deyarli bir xil bo'lsa ham biroz oraliq qoldiramiz
      if (high - low < point * 0.08) {
        low = point * 0.92;
        high = point * 1.08;
      }
    }
  } else {
    // Tarix yo'q: oddiy sur'at. Oraliq keng, ishonch past.
    method = 'runrate';
    point = elapsed > 0 ? current / elapsed : current;
    low = point * 0.7;
    high = point * 1.3;
  }

  // Allaqachon topilgan summadan past taxmin bo'lishi mumkin emas
  low = Math.max(low, current);
  point = Math.max(point, current);
  high = Math.max(high, point);

  const monthsUsed = estimates.length;
  let confidence: Confidence = 'past';
  if (monthsUsed >= 4 && elapsed >= 0.4) confidence = 'yuqori';
  else if (monthsUsed >= 2 && elapsed >= 0.25) confidence = 'orta';

  return { point, low, high, confidence, method, monthsUsed, elapsed, current };
}

/** Summani "chiroyli" qadamga yaxlitlaydi. */
function roundTo(value: number, step: number, mode: 'down' | 'near' | 'up'): number {
  if (step <= 0) return value;
  const f = value / step;
  const r = mode === 'down' ? Math.floor(f) : mode === 'up' ? Math.ceil(f) : Math.round(f);
  return r * step;
}

/**
 * Summaning kattaligiga mos yaxlitlash qadami.
 * Qadam har doim summaning ~2% idan oshmaydi — aks holda kichik summalar
 * pastga yaxlitlanganda nolga aylanib qolardi.
 */
function stepFor(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const target = value / 50;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  return Math.max(1, mag);
}

/**
 * Maqsad uchun uch daraja.
 * Har biri yonida "o'tgan oylarning nechtasida shundan oshgan" ko'rsatiladi —
 * shunda tavsiya quruq taxmin emas, real tarixga asoslangan bo'ladi.
 */
export function recommendGoals(
  pastMonthTotals: number[],
  forecast: Forecast | null
): GoalLevel[] {
  const past = pastMonthTotals.filter((v) => v > 0);
  if (!forecast && past.length === 0) return [];

  const safeRaw = forecast ? forecast.low : percentile(past, 0.25);
  const balancedRaw = forecast ? forecast.point : median(past);
  const stretchRaw = forecast
    ? Math.max(forecast.high, past.length ? Math.max(...past) : 0)
    : Math.max(...past) * 1.1;

  const mk = (
    key: GoalLevel['key'],
    label: string,
    hint: string,
    raw: number,
    mode: 'down' | 'near' | 'up'
  ): GoalLevel => {
    const step = stepFor(raw);
    let amount = roundTo(raw, step, mode);
    // Xavfsizlik: pastga yaxlitlash hech qachon nolga tushirib yubormasin
    if (amount <= 0 && raw > 0) amount = roundTo(raw, step, 'near') || Math.round(raw);
    return {
      key,
      label,
      hint,
      amount,
      beaten: past.filter((v) => v >= amount).length,
      months: past.length,
    };
  };

  return [
    mk('safe', 'Ishonchli', 'Katta ehtimol bilan bajariladi', safeRaw, 'down'),
    mk('balanced', 'Muvozanatli', 'Odatiy darajangiz', balancedRaw, 'near'),
    mk('stretch', 'Ambitsiyali', 'Eng yaxshi oyingiz darajasi', stretchRaw, 'up'),
  ];
}
