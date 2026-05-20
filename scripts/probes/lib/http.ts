// Minimal HTTP helpers for Phase 0 probes.
// NSE/BSE APIs require browser-like headers + (for NSE) a warmed-up cookie jar.

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface FetchResult {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  latency_ms: number;
  error?: string;
}

export interface FetchBinaryResult {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  bytes: number;
  buffer: Buffer | null;
  latency_ms: number;
  error?: string;
}

function flattenHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

export const BASE_HEADERS: Record<string, string> = {
  'User-Agent': BROWSER_UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

const COOKIE_JAR: Map<string, string> = new Map();

function setCookiesFrom(host: string, setCookieHeader: string | null) {
  if (!setCookieHeader) return;
  const parts = setCookieHeader.split(/,(?=[^ ]+=)/);
  const existing = COOKIE_JAR.get(host) ?? '';
  const map = new Map<string, string>();
  if (existing) {
    for (const c of existing.split('; ')) {
      const [k, ...v] = c.split('=');
      if (k) map.set(k, v.join('='));
    }
  }
  for (const p of parts) {
    const first = p.split(';')[0]!;
    const [k, ...v] = first.trim().split('=');
    if (k) map.set(k, v.join('='));
  }
  const merged = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  COOKIE_JAR.set(host, merged);
}

function cookieFor(host: string): string | undefined {
  return COOKIE_JAR.get(host);
}

export async function httpGet(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<FetchResult> {
  const started = Date.now();
  const host = new URL(url).host;
  const headers: Record<string, string> = { ...BASE_HEADERS, ...(opts.headers ?? {}) };
  const jar = cookieFor(host);
  if (jar && !headers['Cookie']) headers['Cookie'] = jar;
  headers['Accept'] = headers['Accept'] ?? 'application/json, text/plain, */*';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
    const setCookie = res.headers.get('set-cookie');
    setCookiesFrom(host, setCookie);
    const body = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      headers: flattenHeaders(res.headers),
      body,
      bytes: body.length,
      latency_ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      status: 0,
      ok: false,
      headers: {},
      body: '',
      bytes: 0,
      latency_ms: Date.now() - started,
      error: e?.message ?? String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function httpGetBinary(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<FetchBinaryResult> {
  const started = Date.now();
  const host = new URL(url).host;
  const headers: Record<string, string> = { ...BASE_HEADERS, ...(opts.headers ?? {}) };
  const jar = cookieFor(host);
  if (jar && !headers['Cookie']) headers['Cookie'] = jar;
  headers['Accept'] = headers['Accept'] ?? '*/*';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
    setCookiesFrom(host, res.headers.get('set-cookie'));
    if (!res.ok) {
      return {
        status: res.status,
        ok: false,
        headers: flattenHeaders(res.headers),
        bytes: 0,
        buffer: null,
        latency_ms: Date.now() - started,
      };
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    return {
      status: res.status,
      ok: true,
      headers: flattenHeaders(res.headers),
      bytes: buf.length,
      buffer: buf,
      latency_ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      status: 0,
      ok: false,
      headers: {},
      bytes: 0,
      buffer: null,
      latency_ms: Date.now() - started,
      error: e?.message ?? String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Warm NSE cookies by GETting the landing page first.
export async function warmNseCookies(): Promise<FetchResult> {
  return httpGet('https://www.nseindia.com/', {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      Referer: 'https://www.google.com/',
    },
    timeoutMs: 15_000,
  });
}

// Warm the per-symbol equity-section session that the historical OHLC API
// checks (in addition to the root cookies set by warmNseCookies). The
// historical endpoint rejects requests whose cookie jar lacks evidence of a
// recent visit to the equity get-quotes page.
export async function warmNseEquityPage(symbol: string): Promise<FetchResult> {
  return httpGet(`https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`, {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      Referer: 'https://www.nseindia.com/',
    },
    timeoutMs: 15_000,
  });
}

export function truncate(s: string | null | undefined, n = 500): string {
  if (s == null) return '';
  const str = String(s);
  if (str.length <= n) return str;
  return str.slice(0, n) + `…[truncated, total ${str.length} chars]`;
}
