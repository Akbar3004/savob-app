import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  setCors,
  parseBody,
  isValidId,
  isValidPayload,
  KEY_PREFIX,
  STORAGE_NOT_CONFIGURED,
} from '../_redis';

/**
 * Foydalanuvchi ma'lumotini o'qish va yozish.
 *   GET  /api/bins/<parol xeshi>  -> saqlangan ma'lumot yoki 404
 *   PUT  /api/bins/<parol xeshi>  -> ma'lumotni yangilaydi
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Invalid bin ID' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(503).json(STORAGE_NOT_CONFIGURED);
    return;
  }

  const key = KEY_PREFIX + id;

  try {
    if (req.method === 'GET') {
      const data = await redis.get(key);
      if (data === null || data === undefined) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(data);
      return;
    }

    if (req.method === 'PUT') {
      const body = parseBody(req.body);
      if (!isValidPayload(body)) {
        res.status(400).json({ error: 'Invalid data' });
        return;
      }
      const payload = { ...body, updatedAt: Date.now() };
      await redis.set(key, payload);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error(`Storage ${req.method} error for ${id}:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}
