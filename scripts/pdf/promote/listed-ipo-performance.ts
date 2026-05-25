#!/usr/bin/env tsx
// Gate 2b — bounded source-ladder listing-performance fill for ONE listed IPO.
//
// Generalizes onemi-listing-performance.ts. Reads issue_price (price_band.high),
// listing_date and name from the IPO's master row, then walks a BOUNDED ladder
// and writes ONE ipo-listing-performance row IFF a SINGLE rung yields BOTH a
// listing-day gain AND a current gain. Never writes a partial / fake / manual /
// null-gain / mixed-rung row.
//
//   Ladder (stop at the first rung that yields BOTH sides):
//     1. OFFICIAL  — BSE scripcode + NSE symbol from symbol-map.ts. The official
//                    identity is VERIFIED against the official company name
//                    (BSE header / NSE companyName must contain the master-row
//                    name tokens) before any price is trusted. One bounded pass,
//                    no retry loop.  source=BSE|NSE, state=live.
//     2. CHITTORGARH — public detail URL (env CHITTORGARH_URL, must be a
//                    chittorgarh.com /ipo/ page). Single GET + conservative
//                    labelled extraction.  source=Chittorgarh, state=aggregator.
//     3. BROKER    — public broker IPO page (env BROKER_URL). Single GET +
//                    conservative labelled extraction.  source=Broker-ref, state=aggregator.
//
// Guardrails: no login/captcha/stealth/proxy; no retry loops; official mapping
// used ONLY after company-name verification; existing perf rows stay
// byte-identical (string-surgery insert); appends a run-result block to the
// status doc. Self-contained fetch helpers (mirrors onemi-listing-performance.ts,
// which avoids importing the auto-running ingest slice).
//
// Usage: npx tsx scripts/pdf/promote/listed-ipo-performance.ts <ipo_id>

import { appendFileSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';
import { httpGet, warmNseCookies, warmNseEquityPage, truncate } from '../../ingest/lib/http.ts';
import type { FetchResult } from '../../ingest/lib/http.ts';
import { bseScripcodeFor, nseSymbolFor } from '../../ingest/lib/symbol-map.ts';

const IPO_ID = process.argv[2];
const SNAP_DIR = join(process.cwd(), 'src', 'data', 'snapshots');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');
const PERF_PATH = join(SNAP_DIR, 'ipo-listing-performance.json');
const STATUS_DOC = join(process.cwd(), 'phase-real-listed-ipo-performance-status.md');
const NOW = new Date().toISOString();

// Public fallback config per ipo. CHITTORGARH_URL / BROKER_URL env (exposed as
// optional workflow_dispatch inputs) override everything. If no Chittorgarh URL
// is given, the Action resolves the detail page from `chittorgarhSlug` / the
// company name tokens. No guessed broker default (a wrong URL just 404s).
const FALLBACK_SOURCES: Record<string, { chittorgarh?: string; chittorgarhSlugs?: string[]; broker?: string }> = {
  'bajaj-housing-finance': {
    chittorgarh: '',
    chittorgarhSlugs: ['bajaj-housing-finance-ipo', 'bajaj-housing-finance-ltd-ipo'],
    broker: '',
  },
};

interface MasterRow {
  id: string;
  name?: string;
  status?: string;
  listing_exchange?: string[];
  listing_date?: string | null;
  price_band?: { high: number; low: number } | null;
}
interface MasterSnapshot {
  ipos: MasterRow[];
  [k: string]: unknown;
}

function fail(msg: string): never {
  console.error(`[listed-ipo-perf] FAIL: ${msg}`);
  process.exit(1);
}
function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const STOPWORDS = new Set(['limited', 'ltd', 'the', 'india', 'indian', 'company', 'corporation', 'corp']);
function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}
function nameMatches(candidate: string | null, tokens: string[]): boolean {
  if (!candidate || tokens.length === 0) return false;
  const c = candidate.toLowerCase();
  return tokens.every((t) => c.includes(t));
}
// Robust identity fallback: do ALL name tokens appear anywhere in a raw response
// body? Avoids guessing the exact company-name JSON key.
function textHasTokens(text: string | null, tokens: string[]): boolean {
  if (!text || tokens.length === 0) return false;
  const t = text.toLowerCase();
  return tokens.every((tok) => t.includes(tok));
}
// Pull the first positive number whose KEY contains one of the substrings
// (case-insensitive), tried in order — robust to OHLC field-name variants
// (Close / vClose / CLOSE / ...).
function pickNum(obj: any, ...substrs: string[]): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const s of substrs) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(s)) {
        const v = num(obj[k]);
        if (v != null) return v;
      }
    }
  }
  return null;
}
// Coerce a value to epoch-ms across the formats BSE/Indian feeds use: numeric
// epoch (s or ms), YYYYMMDD, DD-MM-YYYY / DD/MM/YYYY (day-first), or any
// JS-parseable string ("Mon May 25 2026 …", "16 Sep 2024", ISO). null if not a date.
function toEpoch(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v > 1e12 ? v : v > 1e9 ? v * 1000 : null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n > 1e12 ? n : n * 1000;
  }
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/); // YYYYMMDD
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); // DD-MM-YYYY (day-first)
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return Date.UTC(+m[3], mo - 1, d);
  }
  const p = Date.parse(s);
  return Number.isNaN(p) ? null : p;
}
// Parse one StockReachGraph element regardless of shape: [epoch, price] arrays,
// {x,y} chart points, or {Date, Close/...} OHLC objects. Keeps the raw element
// so OHLC sub-fields can be read when present.
function parsePoint(raw: any): { t: number | null; price: number | null; raw: any } {
  if (raw == null) return { t: null, price: null, raw };
  if (Array.isArray(raw)) {
    return { t: toEpoch(raw[0]), price: num(raw[1]) ?? num(raw[raw.length - 1]), raw };
  }
  if (typeof raw === 'object') {
    let t: number | null = null;
    for (const k of Object.keys(raw)) {
      const kl = k.toLowerCase();
      // BSE StockReachGraph uses misspelled keys, e.g. `dttm` (datetime).
      if (kl.includes('date') || kl.includes('time') || kl.includes('dt') || kl.includes('tm') || kl === 'x') {
        t = toEpoch(raw[k]);
        if (t != null) break;
      }
    }
    // …and `vale1` (a misspelling of "value1") for the price/close.
    const price =
      pickNum(raw, 'close') ?? num(raw.y ?? raw.Y) ?? pickNum(raw, 'value', 'vale', 'price', 'rate', 'last', 'ltp');
    return { t, price, raw };
  }
  return { t: null, price: num(raw), raw };
}

// ── Official fetch helpers (mirror scripts/ingest/listing-performance.ts) ──

async function fetchBseHistorical(scripcode: string): Promise<
  { ok: true; points: any[] } | { ok: false; error: string }
> {
  const url = `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=${scripcode}&flag=W&fromdate=&todate=&seriesid=`;
  const res = await httpGet(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.bseindia.com/stock-share-price/x/x/${scripcode}/`,
      Origin: 'https://www.bseindia.com',
    },
  });
  if (!res.ok) return { ok: false, error: `BSE historical HTTP ${res.status}` };
  try {
    const parsed = JSON.parse(res.body);
    let data: any = parsed?.Data ?? parsed?.data ?? parsed;
    // BSE frequently returns Data as a JSON-ENCODED STRING — parse again.
    if (typeof data === 'string') data = JSON.parse(data);
    if (!Array.isArray(data) || data.length === 0) return { ok: false, error: 'BSE historical empty/non-array' };
    return { ok: true, points: data };
  } catch (e: any) {
    return { ok: false, error: `BSE historical parse: ${e?.message ?? e}` };
  }
}

async function fetchBseHeader(scripcode: string): Promise<
  { ok: true; companyName: string | null; ltp: number | null; raw: string } | { ok: false; error: string }
> {
  const url = `https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${scripcode}&seriesid=`;
  const res = await httpGet(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.bseindia.com/stock-share-price/x/x/${scripcode}/`,
      Origin: 'https://www.bseindia.com',
    },
  });
  if (!res.ok) return { ok: false, error: `BSE header HTTP ${res.status}` };
  try {
    const p: any = JSON.parse(res.body);
    const h: any = p?.Header ?? p?.header ?? p ?? {};
    const nameRaw =
      h?.SecurityName ?? h?.Security_Name ?? h?.ScripName ?? h?.scrip_name ?? h?.Comp_Name ?? h?.CompName ?? p?.SecurityName ?? p?.ScripName ?? null;
    const ltpRaw = p?.CurrRate?.LTP ?? p?.CurrentRate?.LTP ?? p?.LTP ?? h?.LTP ?? null;
    return { ok: true, companyName: nameRaw ? String(nameRaw).trim() : null, ltp: num(ltpRaw), raw: res.body };
  } catch (e: any) {
    return { ok: false, error: `BSE header parse: ${e?.message ?? e}` };
  }
}

async function fetchNseQuote(symbol: string): Promise<
  { ok: true; lastPrice: number | null; companyName: string | null } | { ok: false; error: string }
> {
  const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
  await warmNseEquityPage(symbol).catch(() => {});
  const res = await httpGet(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) return { ok: false, error: `NSE HTTP ${res.status}: ${truncate(res.body, 80)}` };
  try {
    const p: any = JSON.parse(res.body);
    const lp = num(p?.priceInfo?.lastPrice ?? p?.lastPrice);
    const nameRaw = p?.info?.companyName ?? p?.info?.company ?? null;
    return { ok: true, lastPrice: lp, companyName: nameRaw ? String(nameRaw).trim() : null };
  } catch (e: any) {
    return { ok: false, error: `NSE parse: ${e?.message ?? e}` };
  }
}

// Single bounded public GET (no login/captcha/stealth/proxy).
async function fetchPublic(url: string): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  const res = await httpGet(url, {
    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  if (!res.body || res.body.length < 200) return { ok: false, error: `body too small (${res.body?.length ?? 0} bytes)` };
  return { ok: true, body: res.body };
}

// Resolve the public Chittorgarh /ipo/ detail URL for the target inside the
// Action (public, desktop-UA, redirect-following GET — no login/captcha/stealth
// /proxy; a 403/Cloudflare/Datadome challenge is a hard stop, never bypassed).
//
// Index/list pages mirror the repo's P-25 probe (the dashboards are commonly
// JS-rendered, so a static GET may legitimately yield 0 detail links — the
// diagnostics below make that explicit rather than silently "unresolved").
// Detail-URL discovery + challenge detection mirror P-25 exactly so behaviour
// is consistent with the proven probe.
const CHITTORGARH_INDEX_CANDIDATES = [
  'https://www.chittorgarh.com/ipo/ipo_dashboard.asp',
  'https://www.chittorgarh.com/ipo/ipo_dashboard.asp?a=sme',
  'https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/82/',
];
// Matches absolute or relative /ipo/<slug>/<numeric-id>/ at a quote/space/>
// boundary (identical to P-25 discoverDetailUrls).
const CHITTORGARH_DETAIL_RE = /(?<=["'\s>])(?:https?:\/\/(?:www\.)?chittorgarh\.com)?\/ipo\/([a-z0-9-]+)\/(\d+)\/?/gi;

function chittorgarhChallenge(res: FetchResult): string | null {
  if (res.status === 403 || res.status === 503 || res.status === 429) return `HTTP ${res.status}`;
  const body = res.body || '';
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim().slice(0, 100);
  if (/cf-challenge|just a moment|attention required|cf-mitigated|cf-browser-verification|datadome/i.test(body)) {
    return 'cloudflare/datadome markers in body';
  }
  if (/just a moment|attention required|cloudflare/i.test(title)) return `challenge title "${title}"`;
  return null;
}
function chittorgarhDetailLinks(body: string): Array<{ url: string; slug: string }> {
  const seen = new Set<string>();
  const out: Array<{ url: string; slug: string }> = [];
  CHITTORGARH_DETAIL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHITTORGARH_DETAIL_RE.exec(body))) {
    const url = `https://www.chittorgarh.com/ipo/${m[1]!}/${m[2]!}/`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, slug: m[1]!.toLowerCase() });
  }
  return out;
}
function chittorgarhSampleHrefs(body: string, tokens: string[]): string[] {
  const want = new RegExp(`${tokens.join('|')}|/ipo/`, 'i');
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']{1,200})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) && out.length < 10) {
    if (want.test(m[1]!)) out.push(m[1]!.slice(0, 120));
  }
  return out;
}
async function resolveChittorgarhUrl(
  slugs: string[],
  tokens: string[],
): Promise<{ url: string | null; notes: string[] }> {
  const notes: string[] = [];
  let reachableAny = false;
  const get = async (url: string) => {
    const res = await httpGet(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: 'https://www.chittorgarh.com/',
      },
      timeoutMs: 30_000,
    });
    const challenge = chittorgarhChallenge(res);
    const reachable = res.ok && !challenge && (res.body?.length ?? 0) > 500;
    if (reachable) reachableAny = true;
    return { res, challenge, reachable };
  };

  // 1) Direct detail slug URLs — Chittorgarh 301s /ipo/<slug>/ → /ipo/<slug>/<id>/.
  for (const slug of slugs) {
    const url = `https://www.chittorgarh.com/ipo/${slug}/`;
    const { res, challenge, reachable } = await get(url);
    const fin = res.finalUrl && res.finalUrl !== url ? ` → ${res.finalUrl}` : '';
    notes.push(
      `slug ${url}: HTTP ${res.status}${fin}, ${res.body?.length ?? 0}B${challenge ? `, CHALLENGE(${challenge})` : ''}${res.error ? `, err=${res.error}` : ''}${reachable ? '' : ' [NOT reachable]'}`,
    );
    if (!reachable) continue;
    const body = res.body!;
    const tokensPresent = tokens.every((t) => body.toLowerCase().includes(t));
    const canon = res.finalUrl ?? url;
    const isIdUrl = /^https?:\/\/(?:www\.)?chittorgarh\.com\/ipo\/[a-z0-9-]+\/\d+\/?$/i.test(canon);
    if (tokensPresent && isIdUrl) {
      notes.push(`→ resolved by slug redirect → ${canon} (name tokens present).`);
      return { url: canon, notes };
    }
    if (tokensPresent && /listing\s*(?:day|price|gain)|issue\s*price|ipo\s*details/i.test(body)) {
      notes.push(`→ using reachable detail page ${url} (name tokens present; no numeric id in final URL).`);
      return { url, notes };
    }
    notes.push(`   slug page reachable but ${tokensPresent ? 'final URL not an /ipo/<slug>/<id>/ detail' : 'name tokens absent'} — not used.`);
  }

  // 2) Index/list pages → discover an /ipo/<slug>/<id>/ link whose slug matches all tokens.
  for (const idx of CHITTORGARH_INDEX_CANDIDATES) {
    const { res, challenge, reachable } = await get(idx);
    const body = res.body ?? '';
    const links = reachable ? chittorgarhDetailLinks(body) : [];
    const fin = res.finalUrl && res.finalUrl !== idx ? ` → ${res.finalUrl}` : '';
    notes.push(
      `index ${idx}: HTTP ${res.status}${fin}, ${body.length}B${challenge ? `, CHALLENGE(${challenge})` : ''}${res.error ? `, err=${res.error}` : ''}, /ipo/ detail links=${links.length}${reachable ? '' : ' [NOT reachable]'}`,
    );
    const hrefs = chittorgarhSampleHrefs(body, tokens);
    if (hrefs.length) notes.push(`   sample hrefs: ${hrefs.join(' | ')}`);
    const match = links.find((l) => tokens.every((t) => l.slug.includes(t)));
    if (match) {
      notes.push(`→ resolved via ${idx} → ${match.url}`);
      return { url: match.url, notes };
    }
  }

  notes.push(
    reachableAny
      ? `UNRESOLVED but Chittorgarh was REACHABLE — no slug redirect and no /ipo/<slug>/<id>/ link matched [${tokens.join(',')}]. Most likely the list pages render their IPO table client-side (XHR), or Bajaj is not on the scanned pages. Next: provide the exact chittorgarh_url, or move to the broker rung.`
      : `UNRESOLVED and Chittorgarh was NOT reachable on any attempt (all blocked/challenge/error above) — Chittorgarh is not fetchable from CI; move to the broker rung.`,
  );
  return { url: null, notes };
}

// ── Conservative labelled extraction for the public fallback rungs ──
// Only clearly-labelled, internally-consistent values are accepted; anything
// ambiguous is rejected (→ fall through). Never guesses unlabelled numbers.

interface Extracted {
  listingGainPct: number | null;
  currentGainPct: number | null;
  listingClose: number | null;
  currentPrice: number | null;
  notes: string[];
  diag: string;
}
function firstNum(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m || m[1] == null) return null;
  const n = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
// Compact, committed view of the page's labelled numbers (preceding label →
// value) so the real Chittorgarh/broker wording is visible from the status doc
// without another blind round-trip. Bounded.
function diagSnippets(text: string): string {
  const out: string[] = [];
  const pctRe = /([A-Za-z][A-Za-z '/&-]{2,28}?)\s*[:\-]?\s*(-?[\d,]+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pctRe.exec(text)) && i < 10) {
    out.push(`"${m[1].trim()}"=${m[2]}%`);
    i++;
  }
  const priceRe = /([A-Za-z][A-Za-z '/&-]{2,28}?)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/gi;
  i = 0;
  while ((m = priceRe.exec(text)) && i < 10) {
    out.push(`"${m[1].trim()}"=₹${m[2]}`);
    i++;
  }
  return out.length ? out.join(' | ') : '(no labelled %/₹ candidates found)';
}
function extract(html: string, issuePrice: number): Extracted {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');
  const notes: string[] = [];

  const listingPrice = firstNum(text, /listing\s*(?:day\s*)?(?:close|price|open)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  const listingGainRaw = firstNum(text, /listing\s*(?:day\s*)?gains?\s*[:\-]?\s*(-?[\d.]+)\s*%/i);
  const currentPrice = firstNum(text, /(?:last\s*trade(?:d)?\s*price|last\s*price|ltp|current\s*(?:market\s*)?price|cmp)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  const currentGainRaw = firstNum(text, /(?:current|today'?s|total|overall)\s*(?:return|gain)s?\s*[:\-]?\s*(-?[\d.]+)\s*%/i);

  const inPriceRange = (p: number | null): boolean => p != null && p >= issuePrice * 0.2 && p <= issuePrice * 25;
  const inGainRange = (g: number | null): boolean => g != null && g >= -95 && g <= 2000;

  let listingClose: number | null = null;
  let listingGainPct: number | null = null;
  if (inPriceRange(listingPrice)) {
    listingClose = listingPrice;
    listingGainPct = round2(((listingPrice! - issuePrice) / issuePrice) * 100);
    if (listingGainRaw != null && Math.abs(listingGainRaw - listingGainPct) > 2) {
      notes.push(`listing price/gain mismatch (computed ${listingGainPct}% vs stated ${listingGainRaw}%) — rejecting listing side`);
      listingClose = null;
      listingGainPct = null;
    }
  } else if (inGainRange(listingGainRaw)) {
    listingGainPct = round2(listingGainRaw!);
  }

  let currentPx: number | null = null;
  let currentGainPct: number | null = null;
  if (inPriceRange(currentPrice)) {
    currentPx = currentPrice;
    currentGainPct = round2(((currentPrice! - issuePrice) / issuePrice) * 100);
    if (currentGainRaw != null && Math.abs(currentGainRaw - currentGainPct) > 2) {
      notes.push(`current price/gain mismatch (computed ${currentGainPct}% vs stated ${currentGainRaw}%) — rejecting current side`);
      currentPx = null;
      currentGainPct = null;
    }
  } else if (inGainRange(currentGainRaw)) {
    currentGainPct = round2(currentGainRaw!);
  }

  return { listingGainPct, currentGainPct, listingClose, currentPrice: currentPx, notes, diag: diagSnippets(text) };
}

// ── Byte-identity-preserving insert into by_ipo ──

interface PerfRow {
  ipo_id: string;
  state: 'live' | 'aggregator';
  issue_price: number;
  listing_open: number | null;
  listing_high: number | null;
  listing_low: number | null;
  listing_close: number | null;
  current_price: number | null;
  listing_gain_pct: number;
  current_gain_pct: number;
  listing_date: string | null;
  source: 'BSE' | 'NSE' | 'Chittorgarh' | 'Broker-ref';
}

function serializeBlock(r: PerfRow): string {
  const f = (v: number | null) => (v == null ? 'null' : String(v));
  const ld = r.listing_date == null ? 'null' : `"${r.listing_date}"`;
  return [
    `    "${r.ipo_id}": {`,
    `      "ipo_id": "${r.ipo_id}",`,
    `      "state": "${r.state}",`,
    `      "issue_price": ${r.issue_price},`,
    `      "listing_open": ${f(r.listing_open)},`,
    `      "listing_high": ${f(r.listing_high)},`,
    `      "listing_low": ${f(r.listing_low)},`,
    `      "listing_close": ${f(r.listing_close)},`,
    `      "current_price": ${f(r.current_price)},`,
    `      "listing_gain_pct": ${r.listing_gain_pct},`,
    `      "current_gain_pct": ${r.current_gain_pct},`,
    `      "listing_date": ${ld},`,
    `      "source": "${r.source}",`,
    `      "fetched_at_utc": "${NOW}"`,
    `    }`,
  ].join('\n');
}

function insertPerfRow(ipoId: string, block: string, state: string): 'written' | 'exists' {
  let content = readFileSync(PERF_PATH, 'utf-8');
  if (content.includes(`"${ipoId}"`)) return 'exists';

  const tsReplaced = content.replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${NOW}"`);
  if (tsReplaced === content) fail('could not bump generated_at_utc in perf snapshot');
  content = tsReplaced
    .replace(/("source_state"\s*:\s*)"[^"]*"/, `$1"${state}"`)
    .replace(/("last_attempted_utc"\s*:\s*)"[^"]*"/, `$1"${NOW}"`);

  const lines = content.split('\n');
  const closerIdx = lines.findIndex((l) => l === '  },'); // by_ipo closer
  if (closerIdx === -1) fail('could not locate by_ipo closer ("  },") in perf snapshot');
  const lastEntryCloserIdx = closerIdx - 1;
  if (lines[lastEntryCloserIdx] !== '    }') {
    fail(`unexpected last by_ipo entry closer: ${JSON.stringify(lines[lastEntryCloserIdx])} (expected "    }")`);
  }
  lines[lastEntryCloserIdx] = '    },';
  lines.splice(closerIdx, 0, block);

  const tmp = PERF_PATH + '.tmp';
  writeFileSync(tmp, lines.join('\n'), 'utf-8');
  renameSync(tmp, PERF_PATH);
  return 'written';
}

function appendStatus(lines: string[]): void {
  try {
    appendFileSync(STATUS_DOC, '\n' + lines.join('\n') + '\n', 'utf-8');
  } catch (e: any) {
    console.error(`[listed-ipo-perf] WARN: could not append status doc: ${e?.message ?? e}`);
  }
}

// ── main ──

async function main(): Promise<void> {
  if (!IPO_ID) fail('usage: listed-ipo-performance.ts <ipo_id>');
  const ipoId = IPO_ID;

  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master || !Array.isArray(master.ipos)) fail(`${MASTER_PATH} missing or malformed`);
  const row = master.ipos.find((r) => r.id === ipoId);
  if (!row) fail(`${ipoId} not found in ${MASTER_PATH} — run add-listed-ipo first`);
  if (row.status !== 'listed') fail(`${ipoId} status='${row.status}', expected 'listed'`);
  const issue_price = row.price_band?.high ?? null;
  if (!issue_price || issue_price <= 0) fail(`${ipoId} has no positive price_band.high (issue price)`);
  const listing_date = row.listing_date ?? null;
  const tokens = tokenize(row.name ?? ipoId);

  console.log(
    `[listed-ipo-perf] ${ipoId}: listed, issue ₹${issue_price}, listing_date ${listing_date ?? '—'}, name-tokens [${tokens.join(', ')}]`,
  );

  const rungNotes: string[] = [];
  let result: PerfRow | null = null;

  // ── Rung 1: OFFICIAL ──
  const scripcode = bseScripcodeFor(ipoId);
  const symbol = nseSymbolFor(ipoId);
  if (!scripcode && !symbol) {
    rungNotes.push('OFFICIAL: no verified BSE scripcode / NSE symbol in symbol-map.ts — skipped.');
  } else {
    await warmNseCookies().catch(() => {});
    let identityOk = false;
    const identitySources: string[] = [];
    let listing_open: number | null = null;
    let listing_high: number | null = null;
    let listing_low: number | null = null;
    let listing_close: number | null = null;
    let current_price: number | null = null;

    if (scripcode) {
      const header = await fetchBseHeader(scripcode);
      if (header.ok) {
        if (nameMatches(header.companyName, tokens) || textHasTokens(header.raw, tokens)) {
          identityOk = true;
          identitySources.push(`BSE ${header.companyName ? `name "${header.companyName}"` : 'header (raw name-token match)'}`);
        } else {
          rungNotes.push(`OFFICIAL/BSE: scripcode ${scripcode} header did not confirm [${tokens.join(',')}] (name="${header.companyName ?? '?'}")`);
          console.log(`[diag] BSE header raw (truncated): ${truncate(header.raw, 300)}`);
        }
        if (header.ltp != null) current_price = header.ltp;
      } else {
        rungNotes.push(`OFFICIAL/BSE header: ${header.error}`);
      }

      const hist = await fetchBseHistorical(scripcode);
      if (hist.ok) {
        const pts = hist.points.map(parsePoint).filter((p) => p.price != null);
        const withT = pts.filter((p) => p.t != null);
        const target = listing_date ? Date.parse(listing_date) : NaN;
        const iso = (t: number | null) => (t != null ? new Date(t).toISOString().slice(0, 10) : 'no-date');
        const TOL_MS = 14 * 24 * 60 * 60 * 1000; // bars may sit a few days off listing_date
        const sortedT = withT.map((p) => p.t!).sort((a, b) => a - b);
        const span = sortedT.length ? `${iso(sortedT[0])}…${iso(sortedT[sortedT.length - 1])}` : 'none';
        // Diagnostic for the non-success branches: dated-count, span, and the
        // OLDEST raw element (reveals the historical date format if unparsed).
        const diag = `${pts.length} pts (${withT.length} dated, span ${span}); rawLast=${truncate(JSON.stringify(hist.points[hist.points.length - 1]), 120)}`;
        if (withT.length && !Number.isNaN(target)) {
          // Listing-week point = closest date to listing_date (robust to series
          // ordering); latest = max date. Guard: never accept an out-of-window
          // point as the listing close (prevents a plausible-but-wrong value).
          const listingPt = withT.reduce((a, b) => (Math.abs(a.t! - target) <= Math.abs(b.t! - target) ? a : b));
          const latestPt = withT.reduce((a, b) => (a.t! >= b.t! ? a : b));
          if (current_price == null) current_price = latestPt.price;
          if (Math.abs(listingPt.t! - target) <= TOL_MS) {
            listing_close = listingPt.price;
            listing_open = pickNum(listingPt.raw, 'open');
            listing_high = pickNum(listingPt.raw, 'high');
            listing_low = pickNum(listingPt.raw, 'low');
            rungNotes.push(
              `OFFICIAL/BSE historical: ${pts.length} pts (span ${span}); listing-week → date=${iso(listingPt.t)} close=${listing_close}; latest → date=${iso(latestPt.t)} price=${latestPt.price}.`,
            );
          } else {
            rungNotes.push(
              `OFFICIAL/BSE historical: nearest date ${iso(listingPt.t)} is >14d from listing_date ${listing_date} — no listing_close. ${diag}`,
            );
          }
        } else {
          rungNotes.push(`OFFICIAL/BSE historical: no usable dated points. ${diag}`);
        }
      } else {
        rungNotes.push(`OFFICIAL/BSE historical: ${hist.error}`);
      }
    }

    if (symbol) {
      const nse = await fetchNseQuote(symbol);
      if (nse.ok) {
        if (nameMatches(nse.companyName, tokens)) {
          identityOk = true;
          identitySources.push(`NSE name "${nse.companyName}"`);
        } else if (nse.companyName) {
          rungNotes.push(`OFFICIAL/NSE: symbol ${symbol} name "${nse.companyName}" did not match [${tokens.join(',')}]`);
        }
        if (current_price == null && nse.lastPrice != null) current_price = nse.lastPrice;
      } else {
        rungNotes.push(`OFFICIAL/NSE quote: ${nse.error}`);
      }
    }

    const officialSource: 'BSE' | 'NSE' = scripcode ? 'BSE' : 'NSE';
    if (identityOk && listing_close != null && current_price != null) {
      result = {
        ipo_id: ipoId,
        state: 'live',
        issue_price,
        listing_open,
        listing_high,
        listing_low,
        listing_close,
        current_price,
        listing_gain_pct: round2(((listing_close - issue_price) / issue_price) * 100),
        current_gain_pct: round2(((current_price - issue_price) / issue_price) * 100),
        listing_date,
        source: officialSource,
      };
      rungNotes.push(`OFFICIAL: identity verified (${identitySources.join('; ')}); listing_close=${listing_close}, current=${current_price}.`);
    } else {
      rungNotes.push(
        `OFFICIAL: incomplete (identityOk=${identityOk}, listing_close=${listing_close ?? 'null'}, current=${current_price ?? 'null'}) — falling through.`,
      );
    }
  }

  // ── Rung 2: CHITTORGARH ──
  if (!result) {
    let url = (process.env.CHITTORGARH_URL || FALLBACK_SOURCES[ipoId]?.chittorgarh || '').trim();
    if (!url) {
      const r = await resolveChittorgarhUrl(FALLBACK_SOURCES[ipoId]?.chittorgarhSlugs ?? [], tokens);
      r.notes.forEach((n) => rungNotes.push(`CHITTORGARH resolve: ${n}`));
      if (r.url) url = r.url;
    }
    if (!url) {
      rungNotes.push('CHITTORGARH: no usable URL (provide chittorgarh_url) — skipped.');
    } else if (!/^https?:\/\/(www\.)?chittorgarh\.com\/ipo\//i.test(url)) {
      rungNotes.push(`CHITTORGARH: url "${url}" is not a chittorgarh.com /ipo/ detail URL — skipped.`);
    } else {
      const got = await fetchPublic(url);
      if (!got.ok) {
        rungNotes.push(`CHITTORGARH GET ${url}: ${got.error}`);
      } else {
        const ex = extract(got.body, issue_price);
        ex.notes.forEach((n) => rungNotes.push(`CHITTORGARH: ${n}`));
        if (ex.listingGainPct != null && ex.currentGainPct != null) {
          result = {
            ipo_id: ipoId,
            state: 'aggregator',
            issue_price,
            listing_open: null,
            listing_high: null,
            listing_low: null,
            listing_close: ex.listingClose,
            current_price: ex.currentPrice,
            listing_gain_pct: ex.listingGainPct,
            current_gain_pct: ex.currentGainPct,
            listing_date,
            source: 'Chittorgarh',
          };
          rungNotes.push(
            `CHITTORGARH: both sides from ${url} — listing_close=${ex.listingClose ?? 'n/a'} (${ex.listingGainPct}%), current=${ex.currentPrice ?? 'n/a'} (${ex.currentGainPct}%).`,
          );
        } else {
          rungNotes.push(
            `CHITTORGARH: incomplete from ${url} (listingGain=${ex.listingGainPct ?? 'null'}, currentGain=${ex.currentGainPct ?? 'null'}) — falling through. candidates: ${ex.diag}`,
          );
        }
      }
    }
  }

  // ── Rung 3: BROKER / PUBLIC ──
  if (!result) {
    const url = (process.env.BROKER_URL || FALLBACK_SOURCES[ipoId]?.broker || '').trim();
    if (!url) {
      rungNotes.push('BROKER: no URL (set BROKER_URL) — skipped.');
    } else if (!/^https?:\/\//i.test(url)) {
      rungNotes.push(`BROKER: url "${url}" invalid — skipped.`);
    } else {
      const got = await fetchPublic(url);
      if (!got.ok) {
        rungNotes.push(`BROKER GET ${url}: ${got.error}`);
      } else {
        const ex = extract(got.body, issue_price);
        ex.notes.forEach((n) => rungNotes.push(`BROKER: ${n}`));
        if (ex.listingGainPct != null && ex.currentGainPct != null) {
          result = {
            ipo_id: ipoId,
            state: 'aggregator',
            issue_price,
            listing_open: null,
            listing_high: null,
            listing_low: null,
            listing_close: ex.listingClose,
            current_price: ex.currentPrice,
            listing_gain_pct: ex.listingGainPct,
            current_gain_pct: ex.currentGainPct,
            listing_date,
            source: 'Broker-ref',
          };
          rungNotes.push(
            `BROKER: both sides from ${url} — listing_close=${ex.listingClose ?? 'n/a'} (${ex.listingGainPct}%), current=${ex.currentPrice ?? 'n/a'} (${ex.currentGainPct}%).`,
          );
        } else {
          rungNotes.push(
            `BROKER: incomplete from ${url} (listingGain=${ex.listingGainPct ?? 'null'}, currentGain=${ex.currentGainPct ?? 'null'}) — no row. candidates: ${ex.diag}`,
          );
        }
      }
    }
  }

  // ── Write or HALT ──
  if (!result) {
    console.log('[listed-ipo-perf] HALT — no rung produced BOTH sides. No row written (acceptable pending).');
    rungNotes.forEach((n) => console.log(`  - ${n}`));
    appendStatus([
      `### Gate 2b run — ${ipoId} — ${NOW} (GitHub Actions)`,
      ``,
      `**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).`,
      ``,
      `Issue price ₹${issue_price} · listing_date ${listing_date ?? '—'}.`,
      ``,
      `Ladder notes:`,
      ...rungNotes.map((n) => `- ${n}`),
      ``,
      `Files changed by this script: none (perf snapshot untouched).`,
    ]);
    console.log('PERF_WRITTEN=false');
    return;
  }

  const insert = insertPerfRow(ipoId, serializeBlock(result), result.state);
  if (insert === 'exists') {
    console.log(`[listed-ipo-perf] ${ipoId} already present in perf snapshot — idempotent no-op.`);
    appendStatus([
      `### Gate 2b run — ${ipoId} — ${NOW} (GitHub Actions)`,
      ``,
      `**Outcome:** perf row already present — idempotent no-op (no change). Revert the row to re-run.`,
    ]);
    console.log('PERF_WRITTEN=false');
    return;
  }

  console.log(
    `[listed-ipo-perf] SUCCESS — wrote ${ipoId} perf row: source=${result.source} state=${result.state} ` +
      `listing_gain=${result.listing_gain_pct}% current_gain=${result.current_gain_pct}%`,
  );
  rungNotes.forEach((n) => console.log(`  - ${n}`));

  const statusLines = [
    `### Gate 2b run — ${ipoId} — ${NOW} (GitHub Actions)`,
    ``,
    `**Outcome:** SUCCESS — wrote ONE listing-performance row.`,
    ``,
    `- source: \`${result.source}\` · state: \`${result.state}\``,
    `- issue_price: ₹${result.issue_price}`,
    `- listing_close: ${result.listing_close ?? 'null'} · current_price: ${result.current_price ?? 'null'}`,
    `- listing_gain_pct: ${result.listing_gain_pct} · current_gain_pct: ${result.current_gain_pct}`,
    `- listing_date: ${result.listing_date ?? '—'}`,
  ];
  if (result.source === 'BSE') {
    statusLines.push(
      `- note: BSE StockReachGraph is weekly granularity — listing_close is the listing-week close (listing-day proxy), per the established OnEMI helper.`,
    );
  }
  statusLines.push(
    ``,
    `Ladder notes:`,
    ...rungNotes.map((n) => `- ${n}`),
    ``,
    `Files changed: src/data/snapshots/ipo-listing-performance.json (+1 row; existing rows byte-identical) plus src/data/snapshots/ipo-master.json (+1 listed row via add-listed-ipo).`,
    ``,
    `Confirmation: both gains came from a SINGLE rung (${result.source}); no partial / fake / manual / null-gain / mixed-rung row was written.`,
  );
  appendStatus(statusLines);
  console.log('PERF_WRITTEN=true');
}

main().catch((e) => {
  console.error('[listed-ipo-perf] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
  process.exit(2);
});
