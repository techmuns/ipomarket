#!/usr/bin/env tsx
// Phase 2C — Listing Performance ingest.
//
// For each listed IPO with a known BSE scripcode (and optionally NSE symbol),
// fetches:
//   - BSE historical OHLC via api.bseindia.com (proven GREEN via P-15)
//   - NSE current quote via /api/quote-equity (proven GREEN via P-15b)
//
// Writes src/data/snapshots/ipo-listing-performance.json. Merges by ipo_id.
// IPOs without a scripcode mapping are silently skipped (synthetic IPOs).
// Expected upstream failures (HTTP/parse) are caught and reported.

import { join } from 'node:path';
import { httpGet, warmNseCookies, warmNseEquityPage, truncate } from './lib/http.ts';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import { mergeByKey } from './lib/merge.ts';
import { bseScripcodeFor, nseSymbolFor } from './lib/symbol-map.ts';
import type { SliceResult } from './lib/slice.ts';
import { log, warn } from './lib/slice.ts';

const REPO_ROOT = process.cwd();
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const PERF_PATH = join(SNAP_DIR, 'ipo-listing-performance.json');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');

const NOW = new Date().toISOString();

// ---- Shapes ----

interface ListingPerformance {
  ipo_id: string;
  state: 'live' | 'manual';
  issue_price: number | null;
  listing_open: number | null;
  listing_high: number | null;
  listing_low: number | null;
  listing_close: number | null;
  current_price: number | null;
  listing_gain_pct: number | null;
  current_gain_pct: number | null;
  listing_date: string | null;
  source: 'NSE' | 'BSE' | 'manual';
  fetched_at_utc?: string;
}

interface PerfSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, ListingPerformance>;
  source_meta?: { source_state: string; last_attempted_utc: string };
}

interface IpoMasterSnapshot {
  ipos: Array<{ id: string; status: string; listing_date?: string | null; price_band?: { high: number; low: number } | null }>;
  [k: string]: unknown;
}

// ---- BSE historical fetch ----

async function fetchBseHistorical(scripcode: string): Promise<
  | { ok: true; first: any; last: any; high: number; low: number; bytes: number }
  | { ok: false; error: string }
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
    let high = -Infinity;
    let low = Infinity;
    for (const r of data) {
      const h = Number(r?.high ?? r?.High ?? r?.h ?? 0);
      const l = Number(r?.low ?? r?.Low ?? r?.l ?? 0);
      if (isFinite(h)) high = Math.max(high, h);
      if (isFinite(l) && l > 0) low = Math.min(low, l);
    }
    return {
      ok: true,
      first: data[0],
      last: data[data.length - 1],
      high: isFinite(high) ? high : 0,
      low: isFinite(low) ? low : 0,
      bytes: res.body.length,
    };
  } catch (e: any) {
    return { ok: false, error: `BSE parse: ${e?.message ?? e}` };
  }
}

// ---- NSE quote fetch (current price) ----

async function fetchNseQuote(symbol: string): Promise<
  | { ok: true; lastPrice: number | null }
  | { ok: false; error: string }
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
    return { ok: true, lastPrice: isFinite(lp) && lp > 0 ? lp : null };
  } catch (e: any) {
    return { ok: false, error: `NSE parse: ${e?.message ?? e}` };
  }
}

// ---- run() ----

export async function run(): Promise<SliceResult> {
  log('listing', 'start');

  const master = readJsonOrNull<IpoMasterSnapshot>(MASTER_PATH);
  if (!master) {
    log('listing', 'ipo-master.json not readable; skipping.');
    return {
      name: 'listing',
      source_state: 'skipped',
      counts: { added: 0, updated: 0, preserved: 0 },
      errors: ['ipo-master.json not readable'],
      notes: 'no master snapshot; listing performance not updated',
    };
  }

  const listedIpos = master.ipos.filter((i) => i.status === 'listed');
  if (listedIpos.length === 0) {
    log('listing', 'no listed IPOs in master; nothing to fetch.');
    return {
      name: 'listing',
      source_state: 'skipped',
      counts: { added: 0, updated: 0, preserved: 0 },
      errors: [],
      notes: 'no listed IPOs in master',
    };
  }

  // Warm NSE cookies once.
  try {
    await warmNseCookies();
  } catch (e: any) {
    warn('listing', `cookie warmup non-fatal failure: ${e?.message ?? e}`);
  }

  const existing = readJsonOrNull<PerfSnapshot>(PERF_PATH) ?? {
    generated_at_utc: NOW,
    by_ipo: {},
  };

  const incoming: ListingPerformance[] = [];
  const errors: string[] = [];
  let liveFetches = 0;
  let skippedNoMapping = 0;

  for (const ipo of listedIpos) {
    const scripcode = bseScripcodeFor(ipo.id);
    const nseSym = nseSymbolFor(ipo.id);
    if (!scripcode && !nseSym) {
      skippedNoMapping++;
      log('listing', `  ${ipo.id}: no BSE scripcode and no NSE symbol — skip (existing row preserved)`);
      continue;
    }

    let listing_open: number | null = null;
    let listing_high: number | null = null;
    let listing_low: number | null = null;
    let listing_close: number | null = null;
    let current_price: number | null = null;
    let source: 'NSE' | 'BSE' | 'manual' = 'manual';

    if (scripcode) {
      const bse = await fetchBseHistorical(scripcode);
      if (bse.ok) {
        listing_open = Number(bse.first?.open ?? bse.first?.Open ?? bse.first?.o ?? null) || null;
        listing_high = bse.high || null;
        listing_low = bse.low || null;
        listing_close = Number(bse.last?.close ?? bse.last?.Close ?? bse.last?.c ?? null) || null;
        source = 'BSE';
        liveFetches++;
      } else {
        errors.push(`${ipo.id} BSE: ${bse.error}`);
        warn('listing', `  ${ipo.id} BSE: ${bse.error}`);
      }
    }

    if (nseSym) {
      const nse = await fetchNseQuote(nseSym);
      if (nse.ok) {
        current_price = nse.lastPrice;
        if (source === 'manual') source = 'NSE';
        liveFetches++;
      } else {
        errors.push(`${ipo.id} NSE quote: ${nse.error}`);
        warn('listing', `  ${ipo.id} NSE quote: ${nse.error}`);
      }
    }

    // Issue price from master.
    const issue_price = ipo.price_band?.high ?? null;
    const listing_gain_pct =
      issue_price && listing_close ? ((listing_close - issue_price) / issue_price) * 100 : null;
    const current_gain_pct =
      issue_price && current_price ? ((current_price - issue_price) / issue_price) * 100 : null;

    incoming.push({
      ipo_id: ipo.id,
      state: 'live',
      issue_price,
      listing_open,
      listing_high,
      listing_low,
      listing_close,
      current_price,
      listing_gain_pct,
      current_gain_pct,
      listing_date: ipo.listing_date ?? null,
      source,
      fetched_at_utc: NOW,
    });
  }

  // Merge by ipo_id. Rows we didn't touch (no mapping, or fetch failed and
  // we skipped) are preserved automatically.
  const existingRows = Object.values(existing.by_ipo);
  const { merged, stats } = mergeByKey<ListingPerformance>(
    existingRows,
    incoming,
    (r) => r.ipo_id,
    (prior, fresh) => ({
      ...prior,
      ...fresh,
      // If fresh failed to populate a price field, keep prior's.
      issue_price: fresh.issue_price ?? prior.issue_price,
      listing_open: fresh.listing_open ?? prior.listing_open,
      listing_high: fresh.listing_high ?? prior.listing_high,
      listing_low: fresh.listing_low ?? prior.listing_low,
      listing_close: fresh.listing_close ?? prior.listing_close,
      current_price: fresh.current_price ?? prior.current_price,
      listing_gain_pct: fresh.listing_gain_pct ?? prior.listing_gain_pct,
      current_gain_pct: fresh.current_gain_pct ?? prior.current_gain_pct,
    })
  );

  const byIpo: Record<string, ListingPerformance> = {};
  for (const r of merged.sort((a, b) => a.ipo_id.localeCompare(b.ipo_id))) {
    byIpo[r.ipo_id] = r;
  }

  const overall_state: SliceResult['source_state'] =
    liveFetches > 0 ? 'live' : skippedNoMapping === listedIpos.length ? 'skipped' : 'empty';

  safeWriteJson(PERF_PATH, {
    generated_at_utc: NOW,
    by_ipo: byIpo,
    source_meta: { source_state: overall_state, last_attempted_utc: NOW },
  });

  log(
    'listing',
    `ipo-listing-performance.json: +${stats.added} added · ~${stats.updated} updated · =${stats.preserved} preserved · skipped(no-mapping)=${skippedNoMapping} · live-fetches=${liveFetches}`
  );
  log('listing', 'done.');

  return {
    name: 'listing',
    source_state: overall_state,
    counts: stats,
    errors,
    notes:
      `${listedIpos.length} listed IPOs · live-fetches=${liveFetches} · ` +
      `skipped(no-mapping)=${skippedNoMapping} · ` +
      `+${stats.added}/${stats.updated}/${stats.preserved}`,
  };
}

const isDirectInvocation =
  process.argv[1] && process.argv[1].includes('listing-performance');
if (isDirectInvocation) {
  run()
    .then((r) => {
      console.log(`[ingest:listing] result: ${r.source_state}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[ingest:listing] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
      process.exit(2);
    });
}
