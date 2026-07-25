/**
 * Fraud-check JSON lookup against EliteMart.
 * Primary product: GET /api?number=01XXXXXXXXX → upstream JSON.
 *
 * Note: Vercel IPs are blocked by Cloudflare. Deploy on a VPS/local server
 * for this endpoint to work reliably.
 */

const DEFAULT_LOOKUP_URL = 'https://elitemart.com.bd/fraud-check/lookup';

const BROWSER_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  Origin: 'https://elitemart.com.bd',
  Referer: 'https://elitemart.com.bd/fraud-check',
  'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

/**
 * @param {string} number
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, error: string, details?: unknown }>}
 */
export const lookupFraudByNumber = async (number) => {
  const phone = String(number ?? '').trim();

  if (!phone) {
    return { ok: false, status: 400, error: '"number" query parameter is required' };
  }

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
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed) {
    const blocked =
      response.status === 403 ||
      String(raw).includes('Just a moment...') ||
      String(raw).includes('challenge-platform');

    return {
      ok: false,
      status: response.status || 502,
      error: blocked
        ? 'Upstream Cloudflare blocked this server IP. Deploy on a VPS (not Vercel) for JSON lookup.'
        : 'Fraud check lookup failed',
      details: parsed ?? raw.slice(0, 300),
    };
  }

  return { ok: true, data: parsed };
};
