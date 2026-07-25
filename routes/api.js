/**
 * GET /api?number=01XXXXXXXXX
 * Looks up courier fraud-check data for a phone number and returns JSON.
 */

import { Router } from 'express';
import { lookupFraudByNumber } from '../utils/fraudLookup.js';

const router = Router();

router.get('/api', async (req, res, next) => {
  try {
    const result = await lookupFraudByNumber(req.query.number);

    if (!result.ok) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error,
        status: result.status,
        data: result.details ?? null,
      });
    }

    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

export default router;
