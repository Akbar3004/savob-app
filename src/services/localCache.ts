import type { UserData } from './db';

/**
 * Qurilmadagi mahalliy nusxa (localStorage).
 *
 * Bu nusxa ikki vazifani bajaradi:
 *   1) ilova darhol ochiladi — bulutdan javob kutilmaydi
 *   2) internet yo'q bo'lganda ham ma'lumot ko'rinadi va ishlash davom etadi
 *
 * Kalitlar parol xeshi bo'yicha ajratiladi, ya'ni bitta qurilmada bir necha
 * hisob bo'lsa ular aralashmaydi.
 */

export const cacheKeys = (id: string) => ({
  tx: `savob_tx_${id}`,
  percent: `savob_percent_${id}`,
  rate: `savob_rate_${id}`,
  goals: `savob_goals_${id}`,
  yearGoals: `savob_yeargoals_${id}`,
  deleted: `savob_deleted_${id}`,
  updated: `savob_updated_${id}`,
  channels: `savob_channels_${id}`,
  payouts: `savob_payouts_${id}`,
  selfChan: `savob_selfchan_${id}`,
  shares: `savob_shares_${id}`,
});

export function writeCache(id: string, d: UserData): void {
  const k = cacheKeys(id);
  try {
    localStorage.setItem(k.tx, JSON.stringify(d.transactions));
    localStorage.setItem(k.percent, String(d.charityPercentage));
    localStorage.setItem(k.rate, String(d.exchangeRate));
    localStorage.setItem(k.goals, JSON.stringify(d.incomeGoals || {}));
    localStorage.setItem(k.yearGoals, JSON.stringify(d.yearlyGoals || {}));
    localStorage.setItem(k.deleted, JSON.stringify(d.deletedIds || []));
    localStorage.setItem(k.updated, String(d.updatedAt || 0));
    localStorage.setItem(k.channels, JSON.stringify(d.channels || []));
    localStorage.setItem(k.payouts, JSON.stringify(d.payouts || {}));
    localStorage.setItem(k.selfChan, JSON.stringify(d.selfChannel || null));
    localStorage.setItem(k.shares, JSON.stringify(d.shares || []));
  } catch {
    // Xotira to'lgan yoki maxfiy rejim — yozib bo'lmasa ilova baribir ishlaydi
  }
}

export function readCache(id: string): UserData | null {
  const k = cacheKeys(id);
  try {
    const tx = localStorage.getItem(k.tx);
    if (tx === null) return null;
    return {
      transactions: JSON.parse(tx),
      charityPercentage: parseInt(localStorage.getItem(k.percent) || '10', 10),
      exchangeRate: parseFloat(localStorage.getItem(k.rate) || '12850'),
      incomeGoals: JSON.parse(localStorage.getItem(k.goals) || '{}'),
      yearlyGoals: JSON.parse(localStorage.getItem(k.yearGoals) || '{}'),
      deletedIds: JSON.parse(localStorage.getItem(k.deleted) || '[]'),
      updatedAt: parseInt(localStorage.getItem(k.updated) || '0', 10),
      channels: JSON.parse(localStorage.getItem(k.channels) || '[]'),
      payouts: JSON.parse(localStorage.getItem(k.payouts) || '{}'),
      selfChannel: JSON.parse(localStorage.getItem(k.selfChan) || 'null') || undefined,
      shares: JSON.parse(localStorage.getItem(k.shares) || '[]'),
    };
  } catch {
    return null;
  }
}

/** Shu hisob uchun qurilmada nusxa bormi? */
export function hasCache(id: string): boolean {
  try {
    return localStorage.getItem(cacheKeys(id).tx) !== null;
  } catch {
    return false;
  }
}
