import type { VercelRequest, VercelResponse } from '@vercel/node';

const CBU_BASE = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json';

// Qat'iy YYYY-MM-DD (tashqi manzilga ishonchsiz qiymat qo'shilmasligi uchun)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function findUsdRate(data: unknown): { rate: number; date?: string } | null {
  const entry = Array.isArray(data) ? data.find((i: any) => i?.Ccy === 'USD') : null;
  const rate = entry ? parseFloat(entry.Rate) : NaN;
  return Number.isFinite(rate) && rate > 0 ? { rate, date: entry?.Date } : null;
}

/**
 * USD kursi.
 *   GET /api/rate                     -> bugungi kurs
 *   GET /api/rate?date=YYYY-MM-DD     -> o'sha kundagi (arxiv) kurs
 *
 * Arxiv topilmasa 404 qaytaradi — bunda ilova foydalanuvchidan kursni
 * qo'lda kiritishni so'raydi, ya'ni hech narsa buzilmaydi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const dateParam = typeof req.query.date === 'string' ? req.query.date : '';
  if (dateParam && !DATE_RE.test(dateParam)) {
    res.status(400).json({ error: "Sana formati noto'g'ri. Kutilgan format: YYYY-MM-DD" });
    return;
  }

  const url = dateParam ? `${CBU_BASE}/USD/${dateParam}/` : `${CBU_BASE}/`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`CBU API returned status ${response.status}`);
    }
    const data = await response.json();
    const found = findUsdRate(data);

    if (found) {
      res.status(200).json({ rate: found.rate, date: found.date || dateParam || undefined });
      return;
    }

    res.status(404).json({
      error: dateParam
        ? `${dateParam} sanasi uchun CBU kursi topilmadi. Kursni qo'lda kiriting.`
        : 'USD rate not found in CBU response',
    });
  } catch (error: any) {
    console.error('Error fetching CBU rate:', error);
    res.status(502).json({
      error: "Kursni olishda xatolik. Kursni qo'lda kiriting.",
      message: error?.message,
    });
  }
}
