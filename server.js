/**
 * Fraud Report Image API
 * ----------------------
 * Express server that receives fraud report JSON and renders a
 * premium dashboard-style PNG (1080x1350) using Puppeteer.
 *
 * Entry point: boots the HTTP server, mounts routes, serves generated
 * images statically and schedules the 24-hour image cleanup job.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import reportRoutes from './routes/report.js';
import previewRoutes from './routes/preview.js';
import { closeBrowser } from './utils/imageGenerator.js';
import { scheduleImageCleanup } from './utils/cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();

/* ---------------------------- App configuration --------------------------- */

// EJS is used both for the preview page and the report template
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Parse JSON bodies (reports are small, 1mb is plenty)
app.use(express.json({ limit: '1mb' }));

// Serve generated images: GET /images/report-xxxx.png
app.use(express.static(path.join(__dirname, 'public')));

/* --------------------------------- Routes --------------------------------- */

app.use('/', previewRoutes);
app.use('/', reportRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Centralized error handler — every thrown/next(err) lands here
app.use((err, req, res, next) => {
  console.error('[error]', err);

  // Malformed JSON body sent by the client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

/* --------------------------------- Startup -------------------------------- */

const server = app.listen(PORT, () => {
  console.log(`✅ Fraud Report Image API running at http://localhost:${PORT}`);
});

// Delete images older than 24 hours, checked every hour
scheduleImageCleanup();

/* ---------------------------- Graceful shutdown --------------------------- */

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close();
  await closeBrowser();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
