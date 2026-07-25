/**
 * GET /preview
 * Interactive preview page: JSON editor, generate button,
 * live preview and download button.
 */

import { Router } from 'express';

const router = Router();

// Default payload shown in the JSON editor on first load
const SAMPLE_PAYLOAD = {
  phone: '01943124216',
  total_orders: 1,
  total_delivered: 1,
  total_cancelled: 0,
  delivery_rate: '100%',
  couriers: [
    {
      courier_name: 'Pathao',
      orders: 0,
      delivered: 0,
      cancelled: 0,
      delivery_rate: '95%',
      customer_rating: 'Excellent Customer',
    },
    {
      courier_name: 'RedX',
      orders: 1,
      delivered: 1,
      cancelled: 0,
      delivery_rate: '100%',
    },
    {
      courier_name: 'Steadfast',
      orders: 0,
      delivered: 0,
      cancelled: 0,
      delivery_rate: '0%',
    },
  ],
};

router.get('/preview', (req, res) => {
  res.render('preview', {
    samplePayload: JSON.stringify(SAMPLE_PAYLOAD, null, 2),
  });
});

export default router;
