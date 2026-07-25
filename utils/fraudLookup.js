/**
 * Fraud-check lookup against EliteMart.
 *
 * Raw fetch from Vercel often hits Cloudflare's "Just a moment..." wall.
 * Strategy:
 * 1. Try a normal HTTP POST (works on most home/office IPs)
 * 2. On Cloudflare challenge / 403, open a real Chromium page, wait out the
 *    challenge, then call /fraud-check/lookup from same-origin browser JS
 */

import { getBrowser } from './imageGenerator.js';

const DEFAULT_LOOKUP_URL = 'https://elitemart.com.bd/fraud-check/lookup';
const FRAUD_CHECK_PAGE = 'https://elitemart.com.bd/fraud-check';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
  'User-Agent': BROWSER_UA,
  Origin: 'https://elitemart.com.bd',
  Referer: 'https://elitemart.com.bd/fraud-check',
  'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

const isCloudflareChallenge = (status, bodyText) => {
  if (status === 403) return true;
  const text = String(bodyText || '');
  return (
    text.includes('Just a moment...') ||
    text.includes('cf-browser-verification') ||
    text.includes('challenge-platform') ||
    text.includes('cf-challenge')
  );
};

const parseJsonSafe = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const lookupViaFetch = async (phone) => {
  const lookupUrl = process.env.FRAUD_CHECK_LOOKUP_URL || DEFAULT_LOOKUP_URL;
  const cookie = process.env.FRAUD_CHECK_COOKIE || '';

  const response = await fetch(lookupUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ phone }),
  });

  const raw = await response.text();
  return {
    status: response.status,
    raw,
    parsed: parseJsonSafe(raw),
  };
};

/**
 * Uses the same Chromium we already ship for PNG rendering.
 * Same-origin fetch inside the page bypasses CORS and usually clears CF.
 */
const lookupViaBrowser = async (phone) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(BROWSER_UA);
    await page.setExtraHTTPHeaders({
      'Accept-Language': BROWSER_HEADERS['Accept-Language'],
    });

    // Soften obvious automation signals
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(FRAUD_CHECK_PAGE, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // Wait until Cloudflare interstitial is gone (or timeout)
    await page
      .waitForFunction(
        () => {
          const title = document.title || '';
          return !title.includes('Just a moment') && !title.includes('Attention Required');
        },
        { timeout: 40000 },
      )
      .catch(() => {});

    // Give challenge JS a short moment after title clears
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await page.evaluate(async (mobile) => {
      const response = await fetch('/fraud-check/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({ phone: mobile }),
        credentials: 'include',
      });

      const raw = await response.text();
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      return {
        status: response.status,
        raw: raw.slice(0, 2000),
        parsed,
      };
    }, phone);

    return result;
  } finally {
    await page.close().catch(() => {});
  }
};

/**
 * @param {string} number
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, error: string, details?: string }>}
 */
export const lookupFraudByNumber = async (number) => {
  const phone = String(number ?? '').trim();

  if (!phone) {
    return { ok: false, status: 400, error: '"number" query parameter is required' };
  }

  // 1) Fast path — plain fetch (works locally / non-blocked IPs)
  let result = await lookupViaFetch(phone);

  // 2) Cloudflare wall — retry inside real Chromium
  if (isCloudflareChallenge(result.status, result.raw) || !result.parsed) {
    try {
      result = await lookupViaBrowser(phone);
    } catch (err) {
      return {
        ok: false,
        status: 502,
        error: `Browser lookup failed: ${err.message}`,
        details: result.raw?.slice?.(0, 300) ?? null,
      };
    }
  }

  if (result.status < 200 || result.status >= 300 || !result.parsed) {
    return {
      ok: false,
      status: result.status || 502,
      error:
        'Fraud check lookup failed. Cloudflare is still blocking this server. Try again, or host outside Vercel.',
      details: result.parsed ?? result.raw?.slice?.(0, 300) ?? null,
    };
  }

  return { ok: true, data: result.parsed };
};
