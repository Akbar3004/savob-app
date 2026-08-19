/**
 * Chuqur tahlil: mavsumiylik, kanallar taqqoslash va oy kunlari naqshi.
 *
 * Barcha funksiyalar sof (React'siz) — shuning uchun alohida sinovdan
 * o'tkazish oson. Har bir natija yonida "nechta oy asosida" degan son
 * qaytariladi, chunki kam ma'lumotdagi xulosaga ishonch ham kam bo'ladi.
 */

/** Bitta kun uchun bitta kanalning summasi. */
export interface DayPoint {
  date: string; // YYYY-MM-DD
  channelId: string;
  uzs: number;
}

export interface MonthPoint {
  monthKey: string; // YYYY-MM
  uzs: number;
}

// ─────────────────────────── 1) MAVSUMIYLIK ───────────────────────────

export interface SeasonMonth {
  /** Yil ichidagi oy raqami: "01".."12" */
  month: string;
  /** Shu oyning o'rtacha summasi (barcha yillar bo'yicha). */
  avg: number;
  /** Umumiy o'rtachaga nisbatan indeks: 1.0 = odatiy, 1.2 = 20% kuchli. */
  index: number;
  /** Nechta yil ma'lumoti asosida. */
  years: number;
  /** Shu oyning barcha yillardagi summalari. */
  values: number[];
}

export interface Seasonality {
  months: SeasonMonth[];
  /** Barcha to'liq oylarning o'rtachasi. */
  overallAvg: number;
  /** Nechta to'liq oy ishlatilgan. */
  monthsUsed: number;
  best: SeasonMonth | null;
  worst: SeasonMonth | null;
  /** Xulosa chiqarish uchun ma'lumot yetarlimi (kamida 2 ta to'liq yil kerak). */
  reliable: boolean;
}

/**
 * Oylik summalardan mavsumiylikni chiqaradi.
 * @param months to'liq oylar (joriy, tugallanmagan oy kiritilmasin)
 */
export function computeSeasonality(months: MonthPoint[]): Seasonality {
  const byMonthNum: { [mm: string]: number[] } = {};
  for (const m of months) {
    const mm = m.monthKey.slice(5, 7);
    (byMonthNum[mm] ||= []).push(m.uzs);
  }

  const all = months.map((m) => m.uzs);
  const overallAvg = all.length ? all.reduce((s, v) => s + v, 0) / all.length : 0;

  const list: SeasonMonth[] = Object.keys(byMonthNum)
    .sort()
    .map((mm) => {
      const values = byMonthNum[mm];
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      return {
        month: mm,
        avg,
        index: overallAvg > 0 ? avg / overallAvg : 1,
        years: values.length,
        values,
      };
    });

  const sorted = [...list].sort((a, b) => b.avg - a.avg);

  return {
    months: list,
    overallAvg,
    monthsUsed: months.length,
    best: sorted[0] || null,
    worst: sorted[sorted.length - 1] || null,
    // Mavsumiylik haqida gapirish uchun kamida bitta oy ikki marta takrorlanishi kerak
    reliable: list.some((m) => m.years >= 2) && months.length >= 12,
  };
}

// ──────────────────── 2) KANALLAR TAQQOSLASH ────────────────────

export interface ChannelTrendPoint {
  monthKey: string;
  uzs: number;
}

export interface ChannelSummary {
  channelId: string;
  total: number;
  /** Oyma-oy qatori (eskidan yangiga). */
  trend: ChannelTrendPoint[];
  /** Oxirgi to'liq oy va undan oldingisi orasidagi o'zgarish, %. */
  growthPct: number | null;
  /** Eng kuchli oy. */
  bestMonth: ChannelTrendPoint | null;
  /** O'rtacha oylik summa. */
  avgMonth: number;
  /** Umumiy daromaddagi ulushi, %. */
  sharePct: number;
  /** Faol oylar soni. */
  activeMonths: number;
}

/**
 * Har bir kanal uchun oyma-oy qator, o'sish va ulush.
 * @param points kunlik nuqtalar (kanal bo'yicha)
 * @param excludeMonth tugallanmagan oy (masalan joriy oy) — o'sishni buzmasligi uchun
 */
export function compareChannels(points: DayPoint[], excludeMonth?: string): ChannelSummary[] {
  const byCh: { [ch: string]: { [m: string]: number } } = {};
  for (const p of points) {
    const m = p.date.slice(0, 7);
    (byCh[p.channelId] ||= {});
    byCh[p.channelId][m] = (byCh[p.channelId][m] || 0) + p.uzs;
  }

  const grandTotal = points.reduce((s, p) => s + p.uzs, 0);

  return Object.keys(byCh)
    .map((ch) => {
      const monthsMap = byCh[ch];
      const trend: ChannelTrendPoint[] = Object.keys(monthsMap)
        .sort()
        .map((m) => ({ monthKey: m, uzs: monthsMap[m] }));

      // O'sishni hisoblashda tugallanmagan oy ishlatilmaydi — aks holda
      // oy o'rtasida har doim "tushib ketdi" degan noto'g'ri xulosa chiqardi
      const complete = trend.filter((t) => t.monthKey !== excludeMonth);
      const last = complete[complete.length - 1];
      const prev = complete[complete.length - 2];
      const growthPct = last && prev && prev.uzs > 0 ? ((last.uzs - prev.uzs) / prev.uzs) * 100 : null;

      const total = trend.reduce((s, t) => s + t.uzs, 0);
      const best = trend.reduce<ChannelTrendPoint | null>(
        (b, t) => (!b || t.uzs > b.uzs ? t : b),
        null
      );

      return {
        channelId: ch,
        total,
        trend,
        growthPct,
        bestMonth: best,
        avgMonth: trend.length ? total / trend.length : 0,
        sharePct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        activeMonths: trend.length,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ──────────────────── 3) OY KUNLARI NAQSHI ────────────────────

export interface DayOfMonthStat {
  /** Oy kuni: 1..31 */
  day: number;
  /** Shu kunning o'rtacha summasi. */
  avg: number;
  /** Umumiy kunlik o'rtachaga nisbatan indeks. */
  index: number;
  /** Nechta oyda shu kun uchun ma'lumot bor. */
  samples: number;
  total: number;
}

export interface DayOfMonthPattern {
  days: DayOfMonthStat[];
  overallAvg: number;
  best: DayOfMonthStat | null;
  worst: DayOfMonthStat | null;
  /** Oyning uch qismi bo'yicha ulush: 1-10, 11-20, 21-31 kunlar. */
  thirds: { label: string; total: number; pct: number }[];
  monthsUsed: number;
  reliable: boolean;
}

/**
 * Oyning qaysi sanalarida ko'proq daromad kelishini aniqlaydi.
 * @param points kunlik nuqtalar
 * @param excludeMonth tugallanmagan oy — uning "hali kelmagan" kunlari
 *                     o'rtachani sun'iy pasaytirmasligi uchun chiqarib tashlanadi
 */
export function computeDayOfMonthPattern(
  points: DayPoint[],
  excludeMonth?: string
): DayOfMonthPattern {
  const used = points.filter((p) => p.date.slice(0, 7) !== excludeMonth);

  const totals: { [day: number]: number } = {};
  const monthsSeen = new Set<string>();
  const daySeenInMonth: { [day: number]: Set<string> } = {};

  for (const p of used) {
    const day = Number(p.date.slice(8, 10));
    const m = p.date.slice(0, 7);
    monthsSeen.add(m);
    totals[day] = (totals[day] || 0) + p.uzs;
    (daySeenInMonth[day] ||= new Set()).add(m);
  }

  const monthsUsed = monthsSeen.size;

  const days: DayOfMonthStat[] = [];
  for (let d = 1; d <= 31; d++) {
    const total = totals[d] || 0;
    // Namunalar soni — shu kun mavjud bo'lgan oylar soni (31-kun har oyda yo'q)
    const samples = daySeenInMonth[d]?.size || 0;
    if (samples === 0 && total === 0) continue;
    days.push({ day: d, avg: samples ? total / samples : 0, index: 1, samples, total });
  }

  const avgAll = days.length ? days.reduce((s, d) => s + d.avg, 0) / days.length : 0;
  for (const d of days) d.index = avgAll > 0 ? d.avg / avgAll : 1;

  const sorted = [...days].sort((a, b) => b.avg - a.avg);

  const sumRange = (from: number, to: number) =>
    days.filter((d) => d.day >= from && d.day <= to).reduce((s, d) => s + d.total, 0);
  const grand = days.reduce((s, d) => s + d.total, 0);
  const thirds = [
    { label: '1–10', total: sumRange(1, 10), pct: 0 },
    { label: '11–20', total: sumRange(11, 20), pct: 0 },
    { label: '21–31', total: sumRange(21, 31), pct: 0 },
  ].map((t) => ({ ...t, pct: grand > 0 ? (t.total / grand) * 100 : 0 }));

  return {
    days,
    overallAvg: avgAll,
    best: sorted[0] || null,
    worst: sorted[sorted.length - 1] || null,
    thirds,
    monthsUsed,
    // Kunlik naqsh haqida gapirish uchun kamida 3 ta to'liq oy kerak
    reliable: monthsUsed >= 3,
  };
}
