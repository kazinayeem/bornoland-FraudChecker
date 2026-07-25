/**
 * GET /api?number=01XXXXXXXXX
 * Looks up courier fraud-check data for a phone number and returns JSON.
 */

import { Router } from 'express';

const router = Router();

const LOOKUP_URL = 'https://elitemart.com.bd/fraud-check/lookup';

router.get('/api', async (req, res, next) => {
  try {
    const number = String(req.query.number ?? '').trim();

    if (!number) {
      return res.status(400).json({
        success: false,
        error: '"number" query parameter is required',
      });
    }

    const response = await fetch(LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://elitemart.com.bd',
        Referer: 'https://elitemart.com.bd/',
      },
      body: JSON.stringify({ phone: number }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Fraud check lookup failed',
        status: response.status,
        data,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
