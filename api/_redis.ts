import { Redis } from '@upstash/redis';
import type { VercelResponse } from '@vercel/node';

/**
 * Durable storage helper (Upstash Redis / Vercel KV).
 *
 * Har bir foydalanuvchi ma'lumoti parol xeshi (SHA-256, hex) bo'yicha
 * `savob:user:<hash>` kalitida saqlanadi. Redis kaliti hech qachon
 * muddati o'tib o'chib ketmaydi — jsonblob.com dan farqli o'laroq.
 */

export const KEY_PREFIX = 'savob:user:';

// SHA-256 hex xesh: qat'iy 64 ta [a-f0-9] belgi.
const ID_RE = /^[a-f0-9]{64}$/;

let cached: Redis | null | undefined;

// REST URL/token o'zgaruvchilarining barcha keng tarqalgan nomlari
// (Vercel KV, Upstash Marketplace, to'g'ridan-to'g'ri Upstash integratsiyasi).
const URL_ENV_NAMES = [
  'KV_REST_API_URL',
  'UPSTASH_REDIS_REST_URL',
  'REDIS_REST_API_URL',
  'STORAGE_REST_API_URL',
];
const TOKEN_ENV_NAMES = [
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_REST_API_TOKEN',
  'STORAGE_REST_API_TOKEN',
];

function firstEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

/** Muhitdan Redis mijozini oladi. Sozlanmagan bo'lsa `null` qaytaradi. */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const url = firstEnv(URL_ENV_NAMES);
  const token = firstEnv(TOKEN_ENV_NAMES);

  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

/** Diagnostika uchun: qaysi env o'zgaruvchilari mavjudligini (qiymatsiz) qaytaradi. */
export function redisEnvStatus(): { present: string[]; hasUrl: boolean; hasToken: boolean } {
  const present = [...URL_ENV_NAMES, ...TOKEN_ENV_NAMES].filter((n) => !!process.env[n]);
  return {
    present,
    hasUrl: !!firstEnv(URL_ENV_NAMES),
    hasToken: !!firstEnv(TOKEN_ENV_NAMES),
  };
}

export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id);
}

export interface UserPayload {
  transactions: unknown[];
  charityPercentage: number;
  exchangeRate: number;
  updatedAt?: number;
}

/** Kelgan ma'lumot to'g'ri shaklda ekanini tekshiradi (ombor buzilmasligi uchun). */
export function isValidPayload(data: unknown): data is UserPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.transactions) &&
    typeof d.charityPercentage === 'number' &&
    typeof d.exchangeRate === 'number'
  );
}

/** Body'ni JSON obyektga aylantiradi (Vercel string yoki obyekt berishi mumkin). */
export function parseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

export function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export const STORAGE_NOT_CONFIGURED = {
  error:
    "Ma'lumotlar ombori sozlanmagan. Vercel'da Upstash Redis (Storage) ulang " +
    'yoki KV_REST_API_URL / KV_REST_API_TOKEN muhit o\'zgaruvchilarini kiriting.',
};
