import { Transaction, Channel, Payouts } from '../types';

// Har bir foydalanuvchi ma'lumoti parol xeshi bo'yicha saqlanadi.
// binId === parol xeshi (SHA-256, hex). Alohida registry kerak emas.
const BASE_URL = '/api/bins';

export interface UserData {
  transactions: Transaction[];
  charityPercentage: number;
  exchangeRate: number;
  // Oyma-oy sof daromad maqsadlari. Kalit: "YYYY-MM", qiymat: so'mda maqsad summasi.
  incomeGoals?: { [monthKey: string]: number };
  // Yillik sof daromad maqsadlari. Kalit: "YYYY", qiymat: so'mda maqsad summasi.
  yearlyGoals?: { [year: string]: number };
  // Boshqa (o'zimniki bo'lmagan) kanallar ro'yxati.
  channels?: Channel[];
  // Ish oyi bo'yicha to'lov kurslari. Kalit: "YYYY-MM" (daromad topilgan oy).
  payouts?: Payouts;
  // O'chirilgan tranzaksiya id'lari (tombstone) — birlashtirishda qayta tirilmasligi uchun.
  deletedIds?: string[];
  // Oxirgi yozilgan vaqt (ms). Server har PUT'da yangilaydi; qurilmalarni solishtirishda ishlatiladi.
  updatedAt?: number;
}

/** Bulutdan o'qish natijasi — tarmoq xatosini "topilmadi" dan ajratish uchun. */
export type FetchResult =
  | { status: 'ok'; data: UserData }
  | { status: 'notfound' }
  | { status: 'error' };

const DEFAULT_PERCENT = 10;
const DEFAULT_RATE = 12850;

export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Kelgan ma'lumotni xavfsiz normal shaklga keltiradi. */
function normalize(data: any): UserData {
  return {
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    charityPercentage:
      typeof data?.charityPercentage === 'number' ? data.charityPercentage : DEFAULT_PERCENT,
    exchangeRate: typeof data?.exchangeRate === 'number' ? data.exchangeRate : DEFAULT_RATE,
    incomeGoals:
      data?.incomeGoals && typeof data.incomeGoals === 'object' ? data.incomeGoals : {},
    yearlyGoals:
      data?.yearlyGoals && typeof data.yearlyGoals === 'object' ? data.yearlyGoals : {},
    channels: Array.isArray(data?.channels) ? data.channels : [],
    payouts: data?.payouts && typeof data.payouts === 'object' ? data.payouts : {},
    deletedIds: Array.isArray(data?.deletedIds) ? data.deletedIds : [],
    updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

/**
 * Ikki qurilmadagi ma'lumotni yo'qotishsiz birlashtiradi.
 * - Tranzaksiyalar id bo'yicha birlashtiriladi (ikkalasidagi ham saqlanadi).
 * - O'chirilgan id'lar (tombstone) qayta tirilmaydi.
 * - Sozlamalar/maqsadlar uchun updatedAt yangiroq bo'lgan nusxa ustunlik qiladi.
 */
export function mergeUserData(a: UserData, b: UserData): UserData {
  const aTime = a.updatedAt || 0;
  const bTime = b.updatedAt || 0;
  const newer = aTime >= bTime ? a : b;
  const older = newer === a ? b : a;

  const deletedIds = Array.from(new Set([...(a.deletedIds || []), ...(b.deletedIds || [])]));
  const delSet = new Set(deletedIds);

  const byId = new Map<string, Transaction>();
  for (const t of older.transactions) if (!delSet.has(t.id)) byId.set(t.id, t);
  for (const t of newer.transactions) if (!delSet.has(t.id)) byId.set(t.id, t); // yangiroq nusxa ustidan yozadi

  // Kanallarni id bo'yicha birlashtiramiz (yangiroq nusxadagi nom ustunlik qiladi)
  const chanById = new Map<string, Channel>();
  for (const c of older.channels || []) chanById.set(c.id, c);
  for (const c of newer.channels || []) chanById.set(c.id, c);

  return {
    transactions: Array.from(byId.values()),
    charityPercentage: newer.charityPercentage,
    exchangeRate: newer.exchangeRate,
    incomeGoals: { ...(older.incomeGoals || {}), ...(newer.incomeGoals || {}) },
    yearlyGoals: { ...(older.yearlyGoals || {}), ...(newer.yearlyGoals || {}) },
    channels: Array.from(chanById.values()),
    payouts: { ...(older.payouts || {}), ...(newer.payouts || {}) },
    deletedIds,
    updatedAt: Math.max(aTime, bTime),
  };
}

/**
 * Parol xeshi ro'yxatdan o'tganini tekshiradi.
 * @returns binId (xesh) — mavjud bo'lsa; `null` — mavjud emas yoki xatolik.
 */
export async function checkPasswordExists(hashedPassword: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/${hashedPassword}`);
    return res.ok ? hashedPassword : null;
  } catch (error) {
    console.error('Error checking password:', error);
    return null;
  }
}

/**
 * Yangi hisob yaratadi.
 * @returns binId (xesh) — muvaffaqiyatli bo'lsa; `null` — xatolik/band bo'lsa.
 */
export async function registerUser(
  hashedPassword: string,
  initialData: UserData
): Promise<string | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: hashedPassword, data: initialData }),
    });
    return res.ok ? hashedPassword : null;
  } catch (error) {
    console.error('Error registering user:', error);
    return null;
  }
}

/**
 * Bulutdan yuklaydi va holatni ajratadi:
 *  - `ok`       — ma'lumot topildi
 *  - `notfound` — hisob mavjud, lekin ma'lumot yo'q (404)
 *  - `error`    — tarmoq/server xatosi (mahalliy nusxani BOSIB O'TMASLIK kerak)
 */
export async function fetchUserData(binId: string): Promise<FetchResult> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`, { cache: 'no-store' });
    if (res.status === 404) return { status: 'notfound' };
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    return { status: 'ok', data: normalize(data) };
  } catch (error) {
    console.error('Error loading user data:', error);
    return { status: 'error' };
  }
}

/** Eski chaqiruvchilar uchun soddalashtirilgan variant (topilmasa/xatoda `null`). */
export async function loadUserData(binId: string): Promise<UserData | null> {
  const r = await fetchUserData(binId);
  return r.status === 'ok' ? r.data : null;
}

/**
 * Ma'lumotni bulutga yozadi.
 * @returns muvaffaqiyatda server bergan `updatedAt` (ms), aks holda `null`.
 */
export async function saveUserData(binId: string, data: UserData): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return typeof body?.updatedAt === 'number' ? body.updatedAt : Date.now();
  } catch (error) {
    console.error('Error saving user data:', error);
    return null;
  }
}
