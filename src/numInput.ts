/**
 * RAQAM KIRITISH MAYDONLARI uchun umumiy tozalash.
 *
 * Nega vergul kerak: telefon klaviaturasi inputMode="decimal" da o'nlik
 * ajratgichni tildan oladi — ko'p sozlamalarda bu NUQTA emas, VERGUL bo'lib
 * chiqadi. Foydalanuvchi "41,02" yozadi, vergul esa tozalashda tashlab
 * yuborilib summa 4102 bo'lib ketardi — 100 barobar xato.
 *
 * Shuning uchun vergul (va unga o'xshash ajratgichlar) NUQTAGA aylantiriladi,
 * tashlab yuborilmaydi.
 */

/** Vergul va unga o'xshash o'nlik ajratgichlar. */
const DECIMAL_SEPARATORS = /[,،٫‚·]/g;

/**
 * O'nlik son uchun: "41,02" -> "41.02", "1.2.3" -> "1.23", "41.029" -> "41.02".
 * Kiritish jarayonida chaqiriladi, shuning uchun "41." holati SAQLANADI —
 * aks holda nuqta yozilishi bilan o'chib ketardi.
 */
export function cleanDecimal(raw: string, maxDecimals = 2): string {
  const clean = raw.replace(DECIMAL_SEPARATORS, '.').replace(/[^\d.]/g, '');
  const firstDot = clean.indexOf('.');
  if (firstDot === -1) return clean;
  const intPart = clean.slice(0, firstDot);
  const decPart = clean
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, maxDecimals);
  return `${intPart}.${decPart}`;
}

/** Butun son uchun: faqat raqamlar qoladi. */
export function cleanInteger(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Tozalangan matnni songa aylantiradi; bo'sh yoki noto'g'ri bo'lsa NaN. */
export function toNumber(raw: string): number {
  const n = parseFloat(cleanDecimal(raw));
  return Number.isFinite(n) ? n : NaN;
}
