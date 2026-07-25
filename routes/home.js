/**
 * GET /
 * API home — JSON-first fraud check service.
 */

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Bornoland Fraud Checker API',
    status: 'online',
    version: '1.0.0',
    primary: 'GET /api?number=01XXXXXXXXX',
    note: 'Main response is JSON. Image routes are optional.',
    endpoints: {
      home: 'GET /',
      health: 'GET /health',
      api: 'GET /api?number=01XXXXXXXXX',
      generate: 'GET /generate?number=01XXXXXXXXX (optional PNG)',
      generatePost: 'POST /generate (optional PNG from JSON body)',
      preview: 'GET /preview',
    },
  });
});

export default router;
