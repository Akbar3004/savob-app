import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, setCors, parseBody, isValidId, KEY_PREFIX, STORAGE_NOT_CONFIGURED } from '../_redis.js';
import { SHARE_PREFIX, isShareRecord, cleanGoals, buildGuestPayload } from '../_share.js';

/**
 * MEHMON endpoint'i.
 *
 *   GET /api/share/<mehmon paroli xeshi>  -> faqat o'z kanalining ma'lumoti
 *   PUT /api/share/<mehmon paroli xeshi>  -> faqat o'z maqsadlarini yozadi
 *
 * Bu faylda egasining ma'lumotiga YOZADIGAN birorta yo'l yo'q. Mehmon
 * egasining kalitini bilmaydi va uni bu yerdan bilib ham ololmaydi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Invalid share ID' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(503).json(STORAGE_NOT_CONFIGURED);
    return;
  }

  try {
    const share = await redis.get(SHARE_PREFIX + id);
    if (!isShareRecord(share)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (req.method === 'GET') {
      const owner = await redis.get(KEY_PREFIX + share.owner);
      if (owner === null || owner === undefined) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      // Filtrlash SHU YERDA — mehmonga faqat o'z kanali yuboriladi
      res.status(200).json(buildGuestPayload(owner, share));
      return;
    }

    if (req.method === 'PUT') {
      // Mehmon FAQAT o'z maqsadlarini yozadi. Boshqa hech narsa emas.
      const body = parseBody(req.body) as { goals?: unknown } | null;
      const goals = cleanGoals(body?.goals);
      await redis.set(SHARE_PREFIX + id, { ...share, goals });
      res.status(200).json({ ok: true, goals });
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}
