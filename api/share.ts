import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, setCors, parseBody, isValidId, KEY_PREFIX, STORAGE_NOT_CONFIGURED } from './_redis.js';
import { SHARE_PREFIX, isShareRecord, isValidChannelId, type ShareRecord } from './_share.js';

/**
 * EGASI uchun: kirish berish va bekor qilish.
 *
 *   POST   { owner, guest, channelId, label, color }  -> kirish beradi
 *   DELETE { owner, guest }                            -> kirishni bekor qiladi
 *
 * `owner` va `guest` — parol xeshlari (64 ta hex). Ochiq parol serverga
 * hech qachon yuborilmaydi; xesh brauzerda hisoblanadi.
 *
 * Ruxsat: egasining xeshini bilgan odamgina ulashish yarata oladi. Bu xesh
 * allaqachon to'liq kirish beradi, ya'ni qo'shimcha xavf yo'q.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(503).json(STORAGE_NOT_CONFIGURED);
    return;
  }

  const body = parseBody(req.body) as Record<string, unknown> | null;
  const owner = body?.owner;
  const guest = body?.guest;

  if (!isValidId(owner) || !isValidId(guest)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  try {
    // Egasi haqiqatan mavjudmi — yo'q hisobga ulashish yaratilmasin
    const ownerData = await redis.get(KEY_PREFIX + owner);
    if (ownerData === null || ownerData === undefined) {
      res.status(404).json({ error: 'Owner not found' });
      return;
    }

    if (req.method === 'POST') {
      const channelId = body?.channelId;
      if (!isValidChannelId(channelId)) {
        res.status(400).json({ error: 'Invalid channelId' });
        return;
      }

      // Bu parol allaqachon ishlatilganmi? (o'z hisobi yoki boshqa ulashish)
      const clash = await redis.get(KEY_PREFIX + guest);
      if (clash !== null && clash !== undefined) {
        res.status(409).json({ error: 'Password in use' });
        return;
      }
      const existing = await redis.get(SHARE_PREFIX + guest);
      if (existing !== null && existing !== undefined) {
        res.status(409).json({ error: 'Password in use' });
        return;
      }

      const record: ShareRecord = {
        owner,
        channelId,
        label: typeof body?.label === 'string' ? body.label.slice(0, 60) : 'Kanal',
        color: typeof body?.color === 'string' ? body.color.slice(0, 20) : undefined,
        goals: {},
        createdAt: Date.now(),
      };
      await redis.set(SHARE_PREFIX + guest, record);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      // Faqat O'ZI yaratgan ulashishni bekor qila oladi
      const record = await redis.get(SHARE_PREFIX + guest);
      if (!isShareRecord(record)) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (record.owner !== owner) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      await redis.del(SHARE_PREFIX + guest);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Share admin error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}
