import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  setCors,
  parseBody,
  isValidId,
  isValidPayload,
  KEY_PREFIX,
  STORAGE_NOT_CONFIGURED,
} from './_redis';

/**
 * Yangi hisob yaratish (register).
 * POST body: { id: <parol xeshi>, data: { transactions, charityPercentage, exchangeRate } }
 * Kalit faqat mavjud bo'lmaganda yoziladi (SET NX) — mavjud hisob ustiga yozilmaydi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(503).json(STORAGE_NOT_CONFIGURED);
    return;
  }

  const body = parseBody(req.body) as { id?: unknown; data?: unknown } | null;
  const id = body?.id;
  const data = body?.data;

  if (!isValidId(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  if (!isValidPayload(data)) {
    res.status(400).json({ error: 'Invalid data' });
    return;
  }

  try {
    const payload = { ...data, updatedAt: Date.now() };
    // NX: faqat kalit mavjud bo'lmasa yozadi. Aks holda `null` qaytaradi.
    const result = await redis.set(KEY_PREFIX + id, payload, { nx: true });

    if (result === null) {
      res.status(409).json({ error: 'Already exists' });
      return;
    }

    res.status(200).json({ id });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}
