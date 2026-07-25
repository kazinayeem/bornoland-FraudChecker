/**
 * GET /
 * API home — shows service info and available endpoints.
 */

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Fraud Report Image API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      home: 'GET /',
      health: 'GET /health',
      preview: 'GET /preview',
      generate: 'GET /generate?number=01XXXXXXXXX',
      generatePost: 'POST /generate',
      api: 'GET /api?number=01XXXXXXXXX',
      images: 'GET /images/report-xxxx.png',
    },
  });
});

export default router;
