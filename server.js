/**
 * Fraud Report Image API
 * ----------------------
 * Express server that receives fraud report JSON and renders a
 * premium dashboard-style PNG (1080x1350) using Puppeteer.
 *
 * Vercel imports the default Express app as one Node.js Function.
 * Local development starts a normal HTTP server from this same file.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import homeRoutes from './routes/home.js';
import healthRoutes from './routes/health.js';
import reportRoutes from './routes/report.js';
import previewRoutes from './routes/preview.js';
import apiRoutes from './routes/api.js';
import { closeBrowser } from './utils/imageGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();

/* ---------------------------- App configuration --------------------------- */

// EJS is used both for the preview page and the report template
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Parse JSON bodies (reports are small, 1mb is plenty)
app.use(express.json({ limit: '1mb' }));

// Local images are served by Express. On Vercel, public/** is served by its CDN
// and generated images are returned directly from Vercel Blob.
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, 'public')));
}

/* --------------------------------- Routes --------------------------------- */

app.use('/', homeRoutes);
app.use('/', healthRoutes);
app.use('/', previewRoutes);
app.use('/', reportRoutes);
app.use('/', apiRoutes);

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

/* ----------------------------- Runtime startup ---------------------------- */

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Fraud Report Image API running at http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close();
    await closeBrowser();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Required by Vercel's zero-config Express deployment.
export default app;
