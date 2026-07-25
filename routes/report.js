/**
 * /generate
 * - GET  /generate?number=01XXXXXXXXX  → lookup API JSON, then render PNG
 * - POST /generate                     → render PNG from full report JSON body
 */

import { Router } from 'express';
import { validateReportPayload } from '../utils/validate.js';
import { generateReportImage } from '../utils/imageGenerator.js';
import { cleanupOldImages } from '../utils/storage.js';
import { lookupFraudByNumber } from '../utils/fraudLookup.js';

const router = Router();

const respondWithImage = async (reportData, res) => {
  const imageUrl = await generateReportImage(reportData);
  await cleanupOldImages();
  res.json({ success: true, image: imageUrl, data: reportData });
};

router.get('/generate', async (req, res, next) => {
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

    const payload = result.data?.data ?? result.data;
    const { valid, error, data } = validateReportPayload(payload);

    if (!valid) {
      return res.status(502).json({
        success: false,
        error: `Lookup returned invalid report data: ${error}`,
        data: payload,
      });
    }

    await respondWithImage(data, res);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    // Allow POST /generate with { "number": "01..." } as a shorthand
    const number = req.body?.number ?? req.body?.phone;
    const hasFullReport = Array.isArray(req.body?.couriers);

    if (number && !hasFullReport) {
      const result = await lookupFraudByNumber(number);

      if (!result.ok) {
        return res.status(result.status || 500).json({
          success: false,
          error: result.error,
          status: result.status,
          data: result.details ?? null,
        });
      }

      const payload = result.data?.data ?? result.data;
      const { valid, error, data } = validateReportPayload(payload);

      if (!valid) {
        return res.status(502).json({
          success: false,
          error: `Lookup returned invalid report data: ${error}`,
          data: payload,
        });
      }

      return respondWithImage(data, res);
    }

    const { valid, error, data } = validateReportPayload(req.body);

    if (!valid) {
      return res.status(400).json({ success: false, error });
    }

    await respondWithImage(data, res);
  } catch (err) {
    next(err);
  }
});

export default router;
