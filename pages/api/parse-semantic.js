/**
 * T16 Phase 2.3: Frontend API proxy for semantic analysis
 * Проксирует запросы к Backend API /api/parse-semantic
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || process.env.PY_BACKEND_URL || 'https://agent-template-edl8.onrender.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проксируем запрос к Backend API
    const response = await axios.post(`${BACKEND_URL}/api/parse-semantic`, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 секунд для семантического анализа
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Parse semantic proxy error:', error.message);
    
    if (error.response) {
      // Backend вернул ошибку
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Backend service unavailable' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
