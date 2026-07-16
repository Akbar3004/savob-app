import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Invalid bin ID' });
    return;
  }

  const targetUrl = `https://jsonbin-zeta.vercel.app/api/bins/${id}`;

  try {
    if (req.method === 'GET') {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        res.status(response.status).json({ error: `Failed to fetch bin from target: ${response.statusText}` });
        return;
      }
      const data = await response.json();
      res.status(200).json(data);
    } else if (req.method === 'PUT') {
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        res.status(response.status).json({ error: `Failed to update bin at target: ${response.statusText}` });
        return;
      }
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error: any) {
    console.error(`Proxy ${req.method} error for bin ${id}:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
