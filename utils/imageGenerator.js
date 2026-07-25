/**
 * Puppeteer-based PNG generator.
 *
 * Renders the EJS report template to HTML, loads it in a headless
 * Chromium page and screenshots it as a high-quality 1080x1350 PNG.
 *
 * The browser instance is created once and reused across requests
 * (launching Chromium per request is the main performance killer).
 */

import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'report.ejs');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

/**
 * Target output: 1080 x 1350 PNG.
 * We render a 540 x 675 CSS viewport at deviceScaleFactor 2,
 * which produces a crisp, retina-quality 1080 x 1350 image.
 */
const VIEWPORT = { width: 540, height: 675, deviceScaleFactor: 2 };

/** @type {import('puppeteer').Browser | null} */
let browserInstance = null;

/** Lazily launch (and reuse) a single headless browser. */
const getBrowser = async () => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  return browserInstance;
};

/** Close the shared browser (used on graceful shutdown). */
export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
};

/**
 * Generates a report PNG from validated report data.
 *
 * @param {object} reportData - Normalized fraud report data
 * @returns {Promise<string>} Public URL path of the generated image, e.g. "/images/report-172345678.png"
 */
export const generateReportImage = async (reportData) => {
  // 1. Render the EJS template to a full HTML document
  const html = await ejs.renderFile(TEMPLATE_PATH, { report: reportData });

  // 2. Ensure the output directory exists
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  // 3. Auto filename using timestamp
  const filename = `report-${Date.now()}.png`;
  const outputPath = path.join(IMAGES_DIR, filename);

  // 4. Screenshot with Puppeteer
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport(VIEWPORT);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Make sure web fonts are fully loaded before capturing
    await page.evaluate(() => document.fonts.ready);

    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
  } finally {
    // Always release the page, even if the screenshot fails
    await page.close().catch(() => {});
  }

  return `/images/${filename}`;
};
