import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const base = process.env.PY_BACKEND_URL || 'http://localhost:8000';
    const backendURL = `${base.replace(/\/$/, '')}/run-opt`;
    const r = await fetch(backendURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error', details: e.message });
  }
} 