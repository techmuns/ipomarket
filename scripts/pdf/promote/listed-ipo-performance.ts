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
import { bseScripcodeFor, nseSymbolFor } from '../../ingest/lib/symbol-map.ts';

const IPO_ID = process.argv[2];
const SNAP_DIR = join(process.cwd(), 'src', 'data', 'snapshots');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');
const PERF_PATH = join(SNAP_DIR, 'ipo-listing-performance.json');
const STATUS_DOC = join(process.cwd(), 'phase-real-listed-ipo-performance-status.md');
const NOW = new Date().toISOString();

// Public fallback URLs per ipo (overridable by env CHITTORGARH_URL / BROKER_URL,
// which the workflow exposes as optional workflow_dispatch inputs).
const FALLBACK_SOURCES: Record<string, { chittorgarh?: string; broker?: string }> = {
  'bajaj-housing-finance': {
    // Chittorgarh detail URL needs the numeric id; supply CHITTORGARH_URL at
    // run time if the official rung is unavailable.
    chittorgarh: '',
    broker: 'https://groww.in/ipo/bajaj-housing-finance',
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

// ── Official fetch helpers (mirror scripts/ingest/listing-performance.ts) ──

async function fetchBseHistorical(scripcode: string): Promise<
  { ok: true; first: any; last: any } | { ok: false; error: string }
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
    const data: any[] = parsed?.Data ?? parsed?.data ?? (Array.isArray(parsed) ? parsed : []);
    if (data.length === 0) return { ok: false, error: 'BSE historical empty' };
    // first = listing week (listing-day proxy at weekly granularity); last = latest close.
    return { ok: true, first: data[0], last: data[data.length - 1] };
  } catch (e: any) {
    return { ok: false, error: `BSE historical parse: ${e?.message ?? e}` };
  }
}

async function fetchBseHeader(scripcode: string): Promise<
  { ok: true; companyName: string | null; ltp: number | null } | { ok: false; error: string }
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
      h?.SecurityName ?? h?.Security_Name ?? h?.ScripName ?? h?.scrip_name ?? p?.SecurityName ?? p?.ScripName ?? null;
    const ltpRaw = p?.CurrRate?.LTP ?? p?.CurrentRate?.LTP ?? p?.LTP ?? h?.LTP ?? null;
    return { ok: true, companyName: nameRaw ? String(nameRaw).trim() : null, ltp: num(ltpRaw) };
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

// ── Conservative labelled extraction for the public fallback rungs ──
// Only clearly-labelled, internally-consistent values are accepted; anything
// ambiguous is rejected (→ fall through). Never guesses unlabelled numbers.

interface Extracted {
  listingGainPct: number | null;
  currentGainPct: number | null;
  listingClose: number | null;
  currentPrice: number | null;
  notes: string[];
}
function firstNum(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m || m[1] == null) return null;
  const n = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
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

  return { listingGainPct, currentGainPct, listingClose, currentPrice: currentPx, notes };
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
        if (nameMatches(header.companyName, tokens)) {
          identityOk = true;
          identitySources.push(`BSE name "${header.companyName}"`);
        } else {
          rungNotes.push(`OFFICIAL/BSE: scripcode ${scripcode} name "${header.companyName ?? '?'}" did not match [${tokens.join(',')}]`);
        }
        if (header.ltp != null) current_price = header.ltp;
      } else {
        rungNotes.push(`OFFICIAL/BSE header: ${header.error}`);
      }

      const hist = await fetchBseHistorical(scripcode);
      if (hist.ok) {
        listing_open = num(hist.first?.open ?? hist.first?.Open ?? hist.first?.o);
        listing_high = num(hist.first?.high ?? hist.first?.High ?? hist.first?.h);
        listing_low = num(hist.first?.low ?? hist.first?.Low ?? hist.first?.l);
        listing_close = num(hist.first?.close ?? hist.first?.Close ?? hist.first?.c);
        if (current_price == null) current_price = num(hist.last?.close ?? hist.last?.Close ?? hist.last?.c);
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
    const url = (process.env.CHITTORGARH_URL || FALLBACK_SOURCES[ipoId]?.chittorgarh || '').trim();
    if (!url) {
      rungNotes.push('CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.');
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
          rungNotes.push(`CHITTORGARH: both sides extracted (listing ${ex.listingGainPct}%, current ${ex.currentGainPct}%) from ${url}.`);
        } else {
          rungNotes.push(`CHITTORGARH: incomplete (listingGain=${ex.listingGainPct ?? 'null'}, currentGain=${ex.currentGainPct ?? 'null'}) — falling through.`);
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
          rungNotes.push(`BROKER: both sides extracted (listing ${ex.listingGainPct}%, current ${ex.currentGainPct}%) from ${url}.`);
        } else {
          rungNotes.push(`BROKER: incomplete (listingGain=${ex.listingGainPct ?? 'null'}, currentGain=${ex.currentGainPct ?? 'null'}) — falling through.`);
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
