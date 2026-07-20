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

// Boshqa (o'zimniki bo'lmagan) YouTube kanallari. 'self' bu ro'yxatga kirmaydi.
export interface Channel {
  id: string;
  name: string;
  color?: string;
}

export const SELF_CHANNEL_ID = 'self';

/** Tranzaksiya sizning ("meniki") daromadingizmi? Faqat 'self' dan ehson ushlanadi. */
export function isSelfTx(t: Transaction): boolean {
  return !t.channelId || t.channelId === SELF_CHANNEL_ID;
}

// Yangi kanallar uchun tavsiya etilgan ranglar
export const CHANNEL_COLORS = [
  '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899', '#84cc16', '#6366f1',
];

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
