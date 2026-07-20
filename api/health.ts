import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, setCors, redisEnvStatus } from './_redis';

/**
 * Diagnostika endpoint'i — sinxronlash nega ishlamayotganini aniqlash uchun.
 *   GET /api/health
 * Hech qanday maxfiy qiymat (URL/token) qaytarilmaydi — faqat holat.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  setCors(res);

  const env = redisEnvStatus();
  const redis = getRedis();

  const result: Record<string, unknown> = {
    ok: false,
    redisClientBuilt: !!redis,
    env: {
      present: env.present, // faqat NOMLAR, qiymat emas
      hasUrl: env.hasUrl,
      hasToken: env.hasToken,
    },
    ping: 'skipped',
  };

  if (!redis) {
    result.hint =
      'Redis mijozi qurilmadi: REST URL/token env o\'zgaruvchilari topilmadi. ' +
      'Vercel Storage\'da Redis ulangach loyihani QAYTA DEPLOY qiling.';
    res.status(200).json(result);
    return;
  }

  try {
    const key = 'savob:health:ping';
    const stamp = Date.now();
    await redis.set(key, stamp, { ex: 60 });
    const got = await redis.get<number>(key);
    result.ping = got === stamp ? 'ok' : 'mismatch';
    result.ok = got === stamp;
  } catch (error: any) {
    // Xato matnidan URL/token bo'laklarini olib tashlaymiz
    const raw = String(error?.message || error || 'unknown');
    result.ping = 'error';
    result.pingError = raw.replace(/https?:\/\/\S+/g, '[redacted]').slice(0, 200);
    result.hint =
      'Env o\'zgaruvchilari bor, lekin Redis\'ga ulanib bo\'lmadi. ' +
      'Token noto\'g\'ri yoki eski deploy bo\'lishi mumkin — qayta deploy qiling.';
  }

  res.status(200).json(result);
}
