import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
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

  try {
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
    if (!response.ok) {
      throw new Error(`CBU API returned status ${response.status}`);
    }
    const data = await response.json();
    
    // Find USD currency entry
    const usdEntry = Array.isArray(data) ? data.find((item: any) => item.Ccy === 'USD') : null;
    
    if (usdEntry && usdEntry.Rate) {
      const rate = parseFloat(usdEntry.Rate);
      res.status(200).json({ rate, date: usdEntry.Date });
    } else {
      res.status(404).json({ error: 'USD rate not found in CBU response' });
    }
  } catch (error: any) {
    console.error('Error fetching CBU rate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
