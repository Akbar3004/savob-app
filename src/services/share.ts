import { hashPassword } from './db';
export type { ShareEntry } from './db';
import type { Transaction, Payouts } from '../types';

/**
 * Ulashish — kanal egasiga faqat o'z kanalini ko'rish uchun kirish berish.
 *
 * Mehmon oladigan ma'lumot serverda filtrlanadi. Bu yerdagi kod hech qachon
 * egasining to'liq ma'lumotini so'ramaydi va mehmon egasining kalitini
 * bilmaydi.
 */

/** Mehmon ekranida ko'rinadigan ma'lumot. */
export interface GuestData {
  channelId: string;
  label: string;
  color?: string;
  transactions: Transaction[];
  exchangeRate: number;
  payouts: Payouts;
  goals: { [monthKey: string]: number };
}

/**
 * Chalkashmaydigan belgilardan tasodifiy parol.
 * 0/O va 1/l/I qo'shilmagan — qo'lda ko'chirishda xato bo'lmasin.
 */
export function generateShareCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

/** Mehmon parolini tekshiradi. Topilsa ma'lumotini qaytaradi. */
export async function fetchGuestData(guestHash: string): Promise<GuestData | null> {
  try {
    const res = await fetch(`/api/share/${guestHash}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as GuestData;
  } catch {
    return null;
  }
}

/** Mehmon o'z maqsadlarini saqlaydi. Egasining ma'lumotiga tegmaydi. */
export async function saveGuestGoals(
  guestHash: string,
  goals: { [monthKey: string]: number }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/share/${guestHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type ShareCreateResult = 'ok' | 'taken' | 'error';

/** Egasi kanalga kirish beradi. */
export async function createShare(
  ownerHash: string,
  code: string,
  channelId: string,
  label: string,
  color?: string
): Promise<ShareCreateResult> {
  try {
    const guest = await hashPassword(code);
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: ownerHash, guest, channelId, label, color }),
    });
    if (res.ok) return 'ok';
    if (res.status === 409) return 'taken';
    return 'error';
  } catch {
    return 'error';
  }
}

/** Egasi kirishni bekor qiladi — parol shu zahoti ishlamay qoladi. */
export async function revokeShare(ownerHash: string, code: string): Promise<boolean> {
  try {
    const guest = await hashPassword(code);
    const res = await fetch('/api/share', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: ownerHash, guest }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
