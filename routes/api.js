/**
 * GET /api?number=01XXXXXXXXX
 * Main route — returns EliteMart fraud-check JSON for a phone number.
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

    // Pass through upstream JSON as-is
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

export default router;
