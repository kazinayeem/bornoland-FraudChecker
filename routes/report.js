/**
 * POST /generate
 * Receives fraud report JSON, validates it, renders the PNG
 * and responds with the public image URL.
 */

import { Router } from 'express';
import { validateReportPayload } from '../utils/validate.js';
import { generateReportImage } from '../utils/imageGenerator.js';
import { cleanupOldImages } from '../utils/storage.js';

const router = Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { valid, error, data } = validateReportPayload(req.body);

    if (!valid) {
      return res.status(400).json({ success: false, error });
    }

    const imageUrl = await generateReportImage(data);

    // Vercel Functions cannot rely on setInterval. Opportunistic cleanup keeps
    // Blob/local storage bounded whenever the API is actively used.
    await cleanupOldImages();

    res.json({ success: true, image: imageUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
