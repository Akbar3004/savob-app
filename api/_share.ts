/**
 * Ulashish (mehmon kirishi).
 *
 * Maqsad: kanal egasiga parol berib, u FAQAT o'z kanalining ma'lumotini
 * ko'rsin. Egasining daromadi, ehsoni va boshqa kanallari unga umuman
 * yetib bormasin.
 *
 * ENG MUHIM QOIDA: filtrlash SERVERDA bajariladi. Agar ma'lumotni to'liq
 * yuborib, brauzerda yashirsak, bu himoya emas — mehmon brauzer konsolidan
 * hammasini ko'rgan bo'lardi. Shu sababli quyidagi funksiyalar egasining
 * ma'lumotidan faqat bitta kanalga tegishli qismini ajratib beradi.
 *
 * Mehmon egasining kalitini (xeshini) hech qachon bilmaydi, ya'ni
 * `savob:user:<owner>` ga yozish imkoni texnik jihatdan yo'q.
 */

export const SHARE_PREFIX = 'savob:share:';

/** Kanal id'si: 'ch-<raqamlar>' ko'rinishida. 'self' ULASHILMAYDI. */
const CHANNEL_RE = /^ch-[A-Za-z0-9_-]{1,64}$/;

export interface ShareRecord {
  /** Egasining parol xeshi — mehmonga HECH QACHON qaytarilmaydi. */
  owner: string;
  channelId: string;
  label: string;
  color?: string;
  /** Mehmonning O'Z maqsadlari. Egasining maqsadlariga aloqasi yo'q. */
  goals?: { [monthKey: string]: number };
  createdAt: number;
}

export function isValidChannelId(v: unknown): v is string {
  return typeof v === 'string' && CHANNEL_RE.test(v);
}

export function isShareRecord(v: unknown): v is ShareRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.owner === 'string' &&
    /^[a-f0-9]{64}$/.test(r.owner) &&
    isValidChannelId(r.channelId)
  );
}

/** Oy kaliti -> summa ko'rinishidagi obyektni tozalaydi. */
export function cleanGoals(v: unknown): { [monthKey: string]: number } {
  const out: { [m: string]: number } = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}$/.test(k) && typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      out[k] = val;
    }
  }
  return out;
}

/** Mehmonga yuboriladigan ma'lumot shakli. */
export interface GuestPayload {
  channelId: string;
  label: string;
  color?: string;
  transactions: unknown[];
  exchangeRate: number;
  /** Faqat shu kanalga tegishli to'lov ma'lumoti. */
  payouts: Record<string, { rate?: number; date?: string; actualUSD?: number }>;
  goals: { [monthKey: string]: number };
}

/**
 * Egasining ma'lumotidan FAQAT bitta kanalga tegishli qismini ajratadi.
 *
 * Qaytarilmaydigan narsalar (ataylab): egasining boshqa yozuvlari,
 * ehson foizi, shaxsiy kanali, kanallar ro'yxati, yillik maqsadlari,
 * o'chirilgan id'lari va egasining xeshi.
 */
export function buildGuestPayload(
  userData: unknown,
  share: ShareRecord
): GuestPayload {
  const d = (userData || {}) as Record<string, any>;
  const all: any[] = Array.isArray(d.transactions) ? d.transactions : [];

  // Faqat shu kanalning yozuvlari. Ehson foizi 0 ga majburlanadi —
  // bu kanaldan ehson ushlanmaydi va egasining foizi sirligicha qoladi.
  const transactions = all
    .filter((t) => t && t.channelId === share.channelId)
    .map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      category: t.category,
      description: t.description,
      channelId: share.channelId,
      charityPercentage: 0,
    }));

  // To'lov ma'lumoti: kurs va sana (mehmon qo'liga qancha tegishini
  // bilishi uchun kerak) + FAQAT shu kanalning haqiqiy summasi.
  const payouts: GuestPayload['payouts'] = {};
  const src = d.payouts && typeof d.payouts === 'object' ? d.payouts : {};
  for (const [monthKey, p] of Object.entries(src as Record<string, any>)) {
    if (!p || typeof p !== 'object') continue;
    const entry: { rate?: number; date?: string; actualUSD?: number } = {};
    if (typeof p.rate === 'number') entry.rate = p.rate;
    if (typeof p.date === 'string') entry.date = p.date;
    const mine = p.actualByChannel?.[share.channelId];
    if (typeof mine === 'number' && Number.isFinite(mine)) entry.actualUSD = mine;
    if (Object.keys(entry).length > 0) payouts[monthKey] = entry;
  }

  return {
    channelId: share.channelId,
    label: share.label || 'Kanal',
    color: share.color,
    transactions,
    exchangeRate: typeof d.exchangeRate === 'number' ? d.exchangeRate : 12850,
    payouts,
    goals: cleanGoals(share.goals),
  };
}
