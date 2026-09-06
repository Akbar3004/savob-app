/**
 * Ilovaning "bugun"i.
 *
 * YouTube daromadi darhol ko'rinmaydi — taxminan IKKI KUN kechikadi.
 * Ya'ni bugun ochib qaraganingizda eng yangi to'liq ma'lumot ikki kun
 * oldingi kunga tegishli bo'ladi.
 *
 * Shuning uchun ilova ichida "bugun" degani — haqiqiy kun EMAS, undan
 * DATA_LAG_DAYS kun oldingi kun. Bu quyidagilarga ta'sir qiladi:
 *   - yangi tushum formasidagi sana
 *   - ochilganda qaysi oy tanlangani
 *   - oy oxiri taxmini (necha kun o'tgani)
 *   - maqsad sur'ati (kuniga qancha kerak)
 *   - "bugun" va "shu hafta" statistika oraliqlari
 *
 * Hujjat sanalari bunga kirmaydi: PDF va zaxira faylining nomi hamda
 * "Tayyorlandi" yozuvi HAQIQIY kunni ko'rsatadi — ular hisobot qachon
 * olinganini bildiradi, ma'lumot qaysi kunga tegishli ekanini emas.
 * Ular uchun realTodayISO() ishlatiladi.
 */
export const DATA_LAG_DAYS = 2;

/** Sanani "YYYY-MM-DD" ko'rinishida, MAHALLIY vaqt bo'yicha. */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ilova ichidagi "bugun" (Date obyekti).
 *
 * Diqqat: toISOString() ishlatilmaydi — u UTC ga o'tkazadi va O'zbekistonda
 * (UTC+5) tunda sana bir kunga orqaga surilib ketardi.
 */
export function appToday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - DATA_LAG_DAYS);
  return d;
}

/** Ilova ichidagi "bugun" — "YYYY-MM-DD". */
export function appTodayISO(): string {
  return ymd(appToday());
}

/** Ilova ichidagi joriy oy — "YYYY-MM". */
export function appMonthKey(): string {
  return appTodayISO().slice(0, 7);
}

/** Ilova ichidagi bugungi kunning oy ichidagi raqami (1..31). */
export function appDayOfMonth(): number {
  return appToday().getDate();
}

/** Haqiqiy bugungi kun — faqat hujjat/fayl sanalari uchun. */
export function realTodayISO(): string {
  return ymd(new Date());
}

/** Ilova "bugun"i tegishli haftaning dushanbasi — "YYYY-MM-DD". */
export function appWeekStartISO(): string {
  const d = appToday();
  const dow = d.getDay(); // 0 = yakshanba
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return ymd(d);
}

/** N oy oldingi oy kaliti ("YYYY-MM"), ilova "bugun"idan hisoblab. */
export function appMonthKeyOffset(monthsBack: number): string {
  const d = appToday();
  d.setDate(1); // oyni surishdan oldin 1-kunga o'tamiz, aks holda 31-mart → 3-mart bo'lardi
  d.setMonth(d.getMonth() - monthsBack);
  return ymd(d).slice(0, 7);
}
