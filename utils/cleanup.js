/**
 * Old image cleanup job.
 * Deletes generated PNGs older than 24 hours so the disk never fills up.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // run every hour

/** Deletes every report PNG older than 24 hours. */
export const cleanupOldImages = async () => {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      if (!file.startsWith('report-') || !file.endsWith('.png')) continue;

      const filePath = path.join(IMAGES_DIR, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > MAX_AGE_MS) {
        await fs.unlink(filePath);
        deleted += 1;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleanup: deleted ${deleted} image(s) older than 24h`);
    }
  } catch (err) {
    // Missing directory on first boot is fine — it is created on demand
    if (err.code !== 'ENOENT') {
      console.error('[cleanup] failed:', err.message);
    }
  }
};

/** Runs cleanup immediately, then every hour. */
export const scheduleImageCleanup = () => {
  cleanupOldImages();
  const timer = setInterval(cleanupOldImages, CHECK_INTERVAL_MS);
  timer.unref(); // never keep the process alive just for cleanup
};
