#!/usr/bin/env tsx
// OnEMI-only listing-performance fill — official BSE/NSE data only.
//
// Attempts to add ONE row for 'onemi-technology-solutions' to
//   src/data/snapshots/ipo-listing-performance.json
// so Recently Listed can show real listing/current gains instead of
// "listing data pending". Writes ONLY if an official exchange mapping is
// verified AND official prices yield BOTH a non-null listing_gain_pct (from
// the listing-day close) and a non-null current_gain_pct. Otherwise HALTs and
// leaves OnEMI pending. No manual/fake/partial row is ever written.
//
// Hard guardrails (per phase-onemi-listing-performance-plan.md §1-§9):
//   - OnEMI only. Official BSE/NSE only. No Chittorgarh / broker / GMP / manual price.
//   - Verified mapping required (scripts/ingest/lib/symbol-map.ts). The RHP
//     download-id 378749 is NOT a scripcode and must not be used.
//   - Write iff listing-day close AND current price are both official + real.
//   - Non-OnEMI rows stay byte-identical (string-surgery insert).
//   - Does NOT touch ipo-source-audit.json, ipo-master.json, other snapshots,
//     workflows, or the source-audit schema.
//
// Self-contained on purpose: it does NOT import scripts/ingest/listing-performance.ts,
// because that module auto-runs its full ingest slice whenever process.argv[1]
// merely *includes* "listing-performance" (true for THIS file's path). The two
// official fetch helpers below mirror that slice's proven endpoints.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';
import { httpGet, warmNseCookies, warmNseEquityPage, truncate } from '../../ingest/lib/http.ts';
import { bseScripcodeFor, nseSymbolFor } from '../../ingest/lib/symbol-map.ts';

const IPO_ID = 'onemi-technology-solutions';
const SNAP_DIR = join(process.cwd(), 'src', 'data', 'snapshots');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');
const PERF_PATH = join(SNAP_DIR, 'ipo-listing-performance.json');
const NOW = new Date().toISOString();

const EXPECTED = {
  listing_exchange: 'BSE',
  listing_date: '2026-05-08',
  issue_price: 171,
};

interface MasterRow {
  id: string;
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
  console.error(`[promote:onemi-listing-perf] FAIL: ${msg}`);
  process.exit(1);
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  if (!res.ok) return { ok: false, error: `BSE HTTP ${res.status}` };
  try {
    const parsed = JSON.parse(res.body);
    const data: any[] = parsed?.Data ?? parsed?.data ?? (Array.isArray(parsed) ? parsed : []);
    if (data.length === 0) return { ok: false, error: 'BSE empty' };
    // first element = listing week (listing-day proxy at weekly granularity);
    // last element = latest close (current). Do NOT conflate the two.
    return { ok: true, first: data[0], last: data[data.length - 1] };
  } catch (e: any) {
    return { ok: false, error: `BSE parse: ${e?.message ?? e}` };
  }
}

async function fetchNseQuote(symbol: string): Promise<
  { ok: true; lastPrice: number | null } | { ok: false; error: string }
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
    const parsed = JSON.parse(res.body);
    const lp = Number(parsed?.priceInfo?.lastPrice ?? parsed?.lastPrice ?? 0);
    return { ok: true, lastPrice: Number.isFinite(lp) && lp > 0 ? lp : null };
  } catch (e: any) {
    return { ok: false, error: `NSE parse: ${e?.message ?? e}` };
  }
}

// ── Byte-identity-preserving insert of the OnEMI row into by_ipo ──

interface PerfRow {
  issue_price: number;
  listing_open: number | null;
  listing_high: number | null;
  listing_low: number | null;
  listing_close: number;
  current_price: number;
  listing_gain_pct: number;
  current_gain_pct: number;
  source: 'BSE' | 'NSE';
}

function serializeOnemiBlock(r: PerfRow): string {
  const f = (v: number | null) => (v == null ? 'null' : String(v));
  return [
    `    "${IPO_ID}": {`,
    `      "ipo_id": "${IPO_ID}",`,
    `      "state": "live",`,
    `      "issue_price": ${r.issue_price},`,
    `      "listing_open": ${f(r.listing_open)},`,
    `      "listing_high": ${f(r.listing_high)},`,
    `      "listing_low": ${f(r.listing_low)},`,
    `      "listing_close": ${r.listing_close},`,
    `      "current_price": ${r.current_price},`,
    `      "listing_gain_pct": ${r.listing_gain_pct},`,
    `      "current_gain_pct": ${r.current_gain_pct},`,
    `      "listing_date": "${EXPECTED.listing_date}",`,
    `      "source": "${r.source}",`,
    `      "fetched_at_utc": "${NOW}"`,
    `    }`,
  ].join('\n');
}

function insertOnemiRow(block: string): void {
  let content = readFileSync(PERF_PATH, 'utf-8');
  if (content.includes(`"${IPO_ID}"`)) {
    fail(`${IPO_ID} already present in ${PERF_PATH} — refusing to double-insert (revert manually to re-run)`);
  }

  const tsReplaced = content.replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${NOW}"`);
  if (tsReplaced === content) fail('could not bump generated_at_utc');
  content = tsReplaced
    .replace(/("source_state"\s*:\s*)"[^"]*"/, `$1"live"`)
    .replace(/("last_attempted_utc"\s*:\s*)"[^"]*"/, `$1"${NOW}"`);

  const lines = content.split('\n');
  const closerIdx = lines.findIndex((l) => l === '  },'); // by_ipo closer
  if (closerIdx === -1) fail('could not locate by_ipo closer ("  },")');
  const lastEntryCloserIdx = closerIdx - 1;
  if (lines[lastEntryCloserIdx] !== '    }') {
    fail(`unexpected last by_ipo entry closer: ${JSON.stringify(lines[lastEntryCloserIdx])} (expected "    }")`);
  }
  lines[lastEntryCloserIdx] = '    },';
  lines.splice(closerIdx, 0, block);

  const tmp = PERF_PATH + '.tmp';
  writeFileSync(tmp, lines.join('\n'), 'utf-8');
  renameSync(tmp, PERF_PATH);
}

// ── main ──

async function main(): Promise<void> {
  // Preflight: OnEMI master invariants.
  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master || !Array.isArray(master.ipos)) fail(`${MASTER_PATH} missing or malformed`);
  const row = master.ipos.find((r) => r.id === IPO_ID);
  if (!row) fail(`${IPO_ID} not found in ${MASTER_PATH}`);
  if (row.status !== 'listed') fail(`status is '${row.status}', expected 'listed'`);
  if (!Array.isArray(row.listing_exchange) || !row.listing_exchange.includes(EXPECTED.listing_exchange)) {
    fail(`listing_exchange ${JSON.stringify(row.listing_exchange)} does not include '${EXPECTED.listing_exchange}'`);
  }
  if (row.listing_date !== EXPECTED.listing_date) {
    fail(`listing_date '${row.listing_date}' != '${EXPECTED.listing_date}'`);
  }
  const issue_price = row.price_band?.high ?? null;
  if (issue_price !== EXPECTED.issue_price) {
    fail(`issue_price (price_band.high) '${issue_price}' != ${EXPECTED.issue_price}`);
  }
  console.log(`[promote:onemi-listing-perf] preflight OK — ${IPO_ID} listed, BSE, ${EXPECTED.listing_date}, issue ₹${issue_price}`);

  // Mapping gate (verification). OnEMI is synthetic, so this is expected to HALT.
  const scripcode = bseScripcodeFor(IPO_ID);
  const symbol = nseSymbolFor(IPO_ID);
  if (!scripcode && !symbol) {
    console.log('[promote:onemi-listing-perf] HALT: no verified official mapping for OnEMI.');
    console.log('  → Add a VERIFIED BSE scripcode and/or NSE symbol to scripts/ingest/lib/symbol-map.ts,');
    console.log('    confirmed from an official BSE/NSE source (NOT the RHP download-id 378749).');
    console.log('  OnEMI listing performance stays PENDING. No row written.');
    return;
  }

  await warmNseCookies().catch(() => {});

  let listing_open: number | null = null;
  let listing_high: number | null = null;
  let listing_low: number | null = null;
  let listing_close: number | null = null;
  let current_price: number | null = null;
  let source: 'BSE' | 'NSE' = scripcode ? 'BSE' : 'NSE';
  const notes: string[] = [];

  if (scripcode) {
    const bse = await fetchBseHistorical(scripcode);
    if (bse.ok) {
      listing_open = num(bse.first?.open ?? bse.first?.Open ?? bse.first?.o);
      listing_high = num(bse.first?.high ?? bse.first?.High ?? bse.first?.h);
      listing_low = num(bse.first?.low ?? bse.first?.Low ?? bse.first?.l);
      listing_close = num(bse.first?.close ?? bse.first?.Close ?? bse.first?.c); // listing-day close
      current_price = num(bse.last?.close ?? bse.last?.Close ?? bse.last?.c); // latest close
      source = 'BSE';
    } else {
      notes.push(`BSE: ${bse.error}`);
    }
  }
  if (symbol && current_price == null) {
    const nse = await fetchNseQuote(symbol);
    if (nse.ok) {
      current_price = nse.lastPrice;
      if (!scripcode) source = 'NSE';
    } else {
      notes.push(`NSE: ${nse.error}`);
    }
  }

  const listing_gain_pct = listing_close != null ? round2(((listing_close - EXPECTED.issue_price) / EXPECTED.issue_price) * 100) : null;
  const current_gain_pct = current_price != null ? round2(((current_price - EXPECTED.issue_price) / EXPECTED.issue_price) * 100) : null;

  // Tightened write gate: BOTH gains must be real + non-null.
  if (listing_close == null || listing_gain_pct == null) {
    console.log('[promote:onemi-listing-perf] HALT: no official LISTING-DAY price obtained — listing stays pending.');
    if (notes.length) console.log(`  fetch notes: ${notes.join(' | ')}`);
    return;
  }
  if (current_price == null || current_gain_pct == null) {
    console.log('[promote:onemi-listing-perf] HALT: listing-day price obtained but no official CURRENT price — refusing partial row; listing stays pending.');
    if (notes.length) console.log(`  fetch notes: ${notes.join(' | ')}`);
    return;
  }

  insertOnemiRow(
    serializeOnemiBlock({
      issue_price: EXPECTED.issue_price,
      listing_open,
      listing_high,
      listing_low,
      listing_close,
      current_price,
      listing_gain_pct,
      current_gain_pct,
      source,
    }),
  );

  console.log('[promote:onemi-listing-perf] SUCCESS — wrote OnEMI listing-performance row:');
  console.log(`  source=${source} · issue=₹${EXPECTED.issue_price} · listing_close=${listing_close} (gain ${listing_gain_pct}%) · current=${current_price} (gain ${current_gain_pct}%)`);
}

main().catch((e) => {
  console.error('[promote:onemi-listing-perf] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
  process.exit(2);
});
