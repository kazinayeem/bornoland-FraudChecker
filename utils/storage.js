/**
 * Persists generated PNGs.
 *
 * Vercel Functions have a read-only, ephemeral filesystem, so production
 * images are stored in a public Vercel Blob store. Local development keeps
 * using public/images to avoid requiring cloud credentials.
 */

import { del, list, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const BLOB_PREFIX = 'reports/';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const hasBlobCredentials = () =>
  Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );

const shouldUseBlob = () => Boolean(process.env.VERCEL || hasBlobCredentials());

/**
 * @param {Buffer} image
 * @param {string} filename
 * @returns {Promise<string>} Public image URL
 */
export const saveReportImage = async (image, filename) => {
  if (shouldUseBlob()) {
    if (!hasBlobCredentials()) {
      throw new Error(
        'Vercel Blob is not configured. Connect a public Blob store to this project.',
      );
    }

    const blob = await put(`${BLOB_PREFIX}${filename}`, image, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/png',
    });

    return blob.url;
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.writeFile(path.join(IMAGES_DIR, filename), image);
  return `/images/${filename}`;
};

const cleanupLocalImages = async () => {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    const now = Date.now();

    await Promise.all(
      files
        .filter((file) => file.startsWith('report-') && file.endsWith('.png'))
        .map(async (file) => {
          const filePath = path.join(IMAGES_DIR, file);
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > MAX_AGE_MS) await fs.unlink(filePath);
        }),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const cleanupBlobImages = async () => {
  if (!hasBlobCredentials()) return;

  const cutoff = Date.now() - MAX_AGE_MS;
  let cursor;

  do {
    const page = await list({
      prefix: BLOB_PREFIX,
      cursor,
      limit: 1000,
    });

    const expiredUrls = page.blobs
      .filter((blob) => new Date(blob.uploadedAt).getTime() < cutoff)
      .map((blob) => blob.url);

    if (expiredUrls.length > 0) await del(expiredUrls);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
};

/**
 * Deletes reports older than 24 hours. On Vercel this is run after each
 * generation because background intervals are not reliable in Functions.
 */
export const cleanupOldImages = async () => {
  try {
    if (shouldUseBlob()) {
      await cleanupBlobImages();
    } else {
      await cleanupLocalImages();
    }
  } catch (error) {
    // Cleanup must never turn a successful image generation into a 500.
    console.error('[cleanup] failed:', error.message);
  }
};
