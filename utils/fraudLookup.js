/**
 * Fraud-check lookup against EliteMart.
 *
 * Vercel datacenter IPs are often blocked by Cloudflare (403). We:
 * 1. Warm up cookies from the fraud-check page
 * 2. Send browser-like headers
 * 3. Allow FRAUD_CHECK_COOKIE / FRAUD_CHECK_LOOKUP_URL overrides
 */

const DEFAULT_LOOKUP_URL = 'https://elitemart.com.bd/fraud-check/lookup';
const WARMUP_URL = 'https://elitemart.com.bd/fraud-check';

const BROWSER_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Origin: 'https://elitemart.com.bd',
  Referer: 'https://elitemart.com.bd/fraud-check',
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

const collectSetCookie = (response) => {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(',').map((c) => c.split(';')[0].trim()).join('; ') : '';
};

const warmUpCookies = async () => {
  try {
    const response = await fetch(WARMUP_URL, {
      method: 'GET',
      headers: {
        ...BROWSER_HEADERS,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });
    return collectSetCookie(response);
  } catch {
    return '';
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

  const lookupUrl = process.env.FRAUD_CHECK_LOOKUP_URL || DEFAULT_LOOKUP_URL;
  const warmed = await warmUpCookies();
  const cookie = [process.env.FRAUD_CHECK_COOKIE, warmed].filter(Boolean).join('; ');

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

  if (!response.ok) {
    const cloudflareHint =
      response.status === 403
        ? ' Upstream blocked this server IP (common on Vercel/Cloudflare). Set FRAUD_CHECK_COOKIE from a browser session, or host outside blocked cloud IPs.'
        : '';

    return {
      ok: false,
      status: response.status,
      error: `Fraud check lookup failed.${cloudflareHint}`.trim(),
      details: parsed ?? raw.slice(0, 300),
    };
  }

  return { ok: true, data: parsed };
};
