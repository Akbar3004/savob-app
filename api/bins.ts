import type { VercelRequest, VercelResponse } from '@vercel/node';

const STORAGE_BASE = 'https://jsonblob.com/api/jsonBlob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for local development
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

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(STORAGE_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Failed to create bin: ${response.statusText}` });
      return;
    }

    // jsonblob returns the new blob id in the Location header
    const location = response.headers.get('location') || '';
    const id = location.split('/').pop();

    if (!id) {
      res.status(500).json({ error: 'Storage did not return a bin id' });
      return;
    }

    res.status(200).json({ id });
  } catch (error: any) {
    console.error('Proxy POST error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
