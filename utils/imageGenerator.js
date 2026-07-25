/**
 * Puppeteer-based PNG generator.
 *
 * Renders the EJS report template to HTML, loads it in a headless
 * Chromium page and screenshots it as a high-quality 1080x1350 PNG.
 *
 * The browser instance is created once and reused across requests
 * (launching Chromium per request is the main performance killer).
 */

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ejs from 'ejs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { saveReportImage } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'report.ejs');

/**
 * Target output: 1080 x 1350 PNG.
 * We render a 540 x 675 CSS viewport at deviceScaleFactor 2,
 * which produces a crisp, retina-quality 1080 x 1350 image.
 */
const VIEWPORT = { width: 540, height: 675, deviceScaleFactor: 2 };

/** @type {import('puppeteer').Browser | null} */
let browserInstance = null;

const findLocalBrowser = async () => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        )
      : null,
  ].filter(Boolean);

  for (const executablePath of candidates) {
    try {
      await fs.access(executablePath);
      return executablePath;
    } catch {
      // Try the next known browser location.
    }
  }

  throw new Error(
    'No local Chrome/Chromium installation found. Set PUPPETEER_EXECUTABLE_PATH.',
  );
};

/** Lazily launch (and reuse) a single headless browser. */
export const getBrowser = async () => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const isVercel = Boolean(process.env.VERCEL);
  const executablePath = isVercel
    ? await chromium.executablePath()
    : await findLocalBrowser();

  browserInstance = await puppeteer.launch({
    executablePath,
    headless: true,
    args: isVercel
      ? [...chromium.args, '--disable-blink-features=AutomationControlled']
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=none',
          '--disable-blink-features=AutomationControlled',
        ],
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
 * @returns {Promise<string>} Public image URL
 */
export const generateReportImage = async (reportData) => {
  // 1. Render the EJS template to a full HTML document
  const html = await ejs.renderFile(TEMPLATE_PATH, { report: reportData });

  // 2. Auto filename using timestamp
  const filename = `report-${Date.now()}.png`;

  // 3. Screenshot into memory; Vercel's deployment filesystem is read-only.
  const browser = await getBrowser();
  const page = await browser.newPage();
  let screenshot;

  try {
    await page.setViewport(VIEWPORT);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Make sure web fonts are fully loaded before capturing
    await page.evaluate(() => document.fonts.ready);

    screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
  } finally {
    // Always release the page, even if the screenshot fails
    await page.close().catch(() => {});
  }

  // 4. Vercel Blob in production; public/images during local development.
  return saveReportImage(Buffer.from(screenshot), filename);
};
