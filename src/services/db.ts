import { Transaction } from '../types';

// Har bir foydalanuvchi ma'lumoti parol xeshi bo'yicha saqlanadi.
// binId === parol xeshi (SHA-256, hex). Alohida registry kerak emas.
const BASE_URL = '/api/bins';

export interface UserData {
  transactions: Transaction[];
  charityPercentage: number;
  exchangeRate: number;
  // Oyma-oy sof daromad maqsadlari. Kalit: "YYYY-MM", qiymat: so'mda maqsad summasi.
  incomeGoals?: { [monthKey: string]: number };
}

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

/** Ma'lumotni bulutdan yuklaydi. Topilmasa yoki tarmoq xatosida `null`. */
export async function loadUserData(binId: string): Promise<UserData | null> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return normalize(data);
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
}

/** Ma'lumotni bulutga yozadi. @returns muvaffaqiyat holati. */
export async function saveUserData(binId: string, data: UserData): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}
