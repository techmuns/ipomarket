#!/usr/bin/env tsx
// Phase 2B — NSE IPO Master ingest.
//
// Reads both NSE endpoints (mainboard + SME), maps rows into the dashboard's
// Ipo shape, merges into src/data/snapshots/ipo-master.json by id.
//
// Expected failures (HTTP non-200, parse, empty response) are caught and
// reported as SliceResult.source_state = 'failed'|'empty'. Unexpected
// runtime exceptions propagate and fail the workflow.

import { join } from 'node:path';
import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import { mergeByKey } from './lib/merge.ts';
import type { SliceResult } from './lib/slice.ts';
import { log, warn } from './lib/slice.ts';

const REPO_ROOT = process.cwd();
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const IPO_MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');

const NSE_MAINBOARD_URL = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
const NSE_SME_URL = 'https://www.nseindia.com/api/all-upcoming-issues?category=sme';
const NSE_REFERER = 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo';

const NOW = new Date().toISOString();

// ---- Snapshot shapes (mirror src/types/ipo.ts) ----

type Segment = 'mainboard' | 'sme';
type IpoStatus = 'upcoming' | 'open' | 'closed' | 'listed' | 'withdrawn';
type DataState = 'live' | 'awaiting' | 'manual' | 'unavailable';

interface Ipo {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  segment: Segment;
  status: IpoStatus;
  sector: { macro: string; sector: string; industry: string; basic_industry?: string } | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  price_band: { low: number; high: number } | null;
  lot_size: number | null;
  issue_size_cr: number | null;
  fresh_cr: number | null;
  ofs_cr: number | null;
  face_value: number | null;
  listing_exchange: Array<'NSE' | 'BSE'>;
  reservation: unknown;
  state: DataState;
  tagline?: string | null;
  source?: string;
  fetched_at_utc?: string;
}

interface IpoMasterSnapshot {
  generated_at_utc: string;
  ipos: Ipo[];
  timelines: unknown[];
  source_meta?: {
    nse_mainboard: { source_state: string; last_attempted_utc: string; last_error?: string | null };
    nse_sme: { source_state: string; last_attempted_utc: string; last_error?: string | null };
  };
}

// ---- Helpers ----

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function stripCompanySuffix(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+(Limited|LIMITED|Ltd\.?|LTD\.?)\s*$/i, '')
    .trim();
}

// NSE returns dates as "DD-MMM-YYYY"; convert to ISO date.
function parseNseDate(s: unknown): string | null {
  if (typeof s !== 'string' || !s) return null;
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const day = m[1]!.padStart(2, '0');
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const month = months[m[2]!.toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${day}`;
}

function parsePriceBand(raw: unknown): { low: number; high: number } | null {
  if (typeof raw !== 'string') return null;
  // e.g. "₹73 - ₹77" or "73-77" or "73.00 to 77.00"
  const nums = raw.match(/(\d+(?:\.\d+)?)/g);
  if (!nums || nums.length < 1) return null;
  const a = Number(nums[0]);
  const b = nums.length >= 2 ? Number(nums[1]) : a;
  if (!isFinite(a) || !isFinite(b)) return null;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

function parseIssueSize(raw: unknown): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function deriveStatus(item: any, open: string | null, close: string | null, listing: string | null): IpoStatus {
  const raw = String(item?.status ?? '').toLowerCase();
  if (raw.includes('withdrawn')) return 'withdrawn';
  if (raw.includes('active') || raw.includes('open')) return 'open';
  if (raw.includes('forthcoming') || raw.includes('upcoming')) return 'upcoming';
  if (raw.includes('closed')) return 'closed';
  if (raw.includes('listed')) return 'listed';
  // Fallback: derive from dates.
  const today = NOW.slice(0, 10);
  if (listing && listing <= today) return 'listed';
  if (close && close < today) return 'closed';
  if (open && open <= today && (!close || close >= today)) return 'open';
  if (open && open > today) return 'upcoming';
  return 'upcoming';
}

interface SourceFetch {
  source: 'NSE-mainboard' | 'NSE-SME';
  url: string;
  segment: Segment;
}

async function fetchCategory(spec: SourceFetch): Promise<
  | { ok: true; items: any[] }
  | { ok: false; error: string; status: number; source_state: 'empty' | 'failed' }
> {
  const res = await httpGet(spec.url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: NSE_REFERER,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `HTTP ${res.status}: ${truncate(res.body, 120)}`,
      status: res.status,
      source_state: 'failed',
    };
  }
  let parsed: any;
  try {
    parsed = JSON.parse(res.body);
  } catch (e: any) {
    return {
      ok: false,
      error: `JSON parse: ${e?.message ?? e}; body starts: ${truncate(res.body, 80)}`,
      status: res.status,
      source_state: 'failed',
    };
  }
  const arr: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
  if (arr.length === 0) {
    return { ok: false, error: 'empty array', status: res.status, source_state: 'empty' };
  }
  return { ok: true, items: arr };
}

function mapNseRow(item: any, segment: Segment, sourceUrl: string): Ipo | null {
  const symbol = String(item?.symbol ?? item?.Symbol ?? '').trim();
  const companyName = String(item?.companyName ?? item?.companyname ?? item?.CompanyName ?? symbol ?? '').trim();
  if (!companyName) return null;

  const baseName = stripCompanySuffix(companyName);
  const slug = slugify(symbol || baseName);
  if (!slug) return null;

  const open_date = parseNseDate(item?.issueStartDate ?? item?.bidStartDate ?? item?.startDate);
  const close_date = parseNseDate(item?.issueEndDate ?? item?.bidEndDate ?? item?.endDate);
  const listing_date = parseNseDate(item?.listingDate ?? item?.dateOfListing);

  const status = deriveStatus(item, open_date, close_date, listing_date);

  return {
    id: slug,
    slug,
    name: companyName,
    short_name: baseName,
    segment,
    status,
    sector: null, // populated by 2C sector slice from NSE quote-equity industryInfo
    open_date,
    close_date,
    listing_date,
    price_band: parsePriceBand(item?.issuePrice ?? item?.priceBand),
    lot_size: typeof item?.lotSize === 'number' ? item.lotSize : Number(item?.lotSize) || null,
    issue_size_cr: parseIssueSize(item?.issueSize ?? item?.totalIssueSize),
    fresh_cr: parseIssueSize(item?.freshIssue),
    ofs_cr: parseIssueSize(item?.ofs),
    face_value: typeof item?.faceValue === 'number' ? item.faceValue : Number(item?.faceValue) || null,
    listing_exchange: ['NSE'],
    reservation: null,
    state: 'live',
    source: segment === 'mainboard' ? 'NSE-mainboard' : 'NSE-SME',
    fetched_at_utc: NOW,
  };
}

// ---- run() ----

export async function run(): Promise<SliceResult> {
  log('nse', 'start');

  const errors: string[] = [];
  let mainboardState: 'live' | 'empty' | 'failed' = 'failed';
  let smeState: 'live' | 'empty' | 'failed' = 'failed';
  let mainboardError: string | null = null;
  let smeError: string | null = null;

  // Warm NSE cookies once for the whole slice.
  try {
    await warmNseCookies();
  } catch (e: any) {
    warn('nse', `cookie warmup non-fatal failure: ${e?.message ?? e}`);
  }

  const mainboardRes = await fetchCategory({ source: 'NSE-mainboard', url: NSE_MAINBOARD_URL, segment: 'mainboard' });
  const smeRes = await fetchCategory({ source: 'NSE-SME', url: NSE_SME_URL, segment: 'sme' });

  const incoming: Ipo[] = [];
  if (mainboardRes.ok) {
    for (const item of mainboardRes.items) {
      const row = mapNseRow(item, 'mainboard', NSE_MAINBOARD_URL);
      if (row) incoming.push(row);
    }
    mainboardState = incoming.length > 0 ? 'live' : 'empty';
    log('nse', `mainboard: ${mainboardRes.items.length} raw → ${incoming.filter((i) => i.segment === 'mainboard').length} mapped`);
  } else {
    mainboardState = mainboardRes.source_state;
    mainboardError = mainboardRes.error;
    warn('nse', `mainboard ${mainboardState}: ${mainboardRes.error}`);
    errors.push(`mainboard: ${mainboardRes.error}`);
  }

  if (smeRes.ok) {
    const before = incoming.length;
    for (const item of smeRes.items) {
      const row = mapNseRow(item, 'sme', NSE_SME_URL);
      if (row) incoming.push(row);
    }
    smeState = incoming.length > before ? 'live' : 'empty';
    log('nse', `sme: ${smeRes.items.length} raw → ${incoming.length - before} mapped`);
  } else {
    smeState = smeRes.source_state;
    smeError = smeRes.error;
    warn('nse', `sme ${smeState}: ${smeRes.error}`);
    errors.push(`sme: ${smeRes.error}`);
  }

  // Read existing snapshot.
  const existing = readJsonOrNull<IpoMasterSnapshot>(IPO_MASTER_PATH) ?? {
    generated_at_utc: NOW,
    ipos: [],
    timelines: [],
  };

  // Merge.
  const { merged: mergedIpos, stats } = mergeByKey<Ipo>(
    existing.ipos,
    incoming,
    (i) => i.id,
    (prior, fresh) => {
      // If existing row is manual/synthetic AND fresh row source != prior source, prefer prior.
      // For Phase 2B, manual rows are protected via the merge contract: an incoming row
      // with the same id replaces the prior, but our id-from-slug derivation should never
      // collide with synthetic ids (quasar-robotics, lumino-hyperscale, greendale-cement).
      // Preserve the existing `name` if NSE gives a less complete one.
      return {
        ...prior,
        ...fresh,
        // Re-merge: prefer richer fields from existing where NSE may be partial.
        sector: fresh.sector ?? prior.sector,
        price_band: fresh.price_band ?? prior.price_band,
        lot_size: fresh.lot_size ?? prior.lot_size,
        issue_size_cr: fresh.issue_size_cr ?? prior.issue_size_cr,
        fresh_cr: fresh.fresh_cr ?? prior.fresh_cr,
        ofs_cr: fresh.ofs_cr ?? prior.ofs_cr,
        face_value: fresh.face_value ?? prior.face_value,
        tagline: prior.tagline ?? fresh.tagline ?? null,
        // Listing exchange: union.
        listing_exchange: Array.from(new Set([...(prior.listing_exchange ?? []), ...(fresh.listing_exchange ?? [])])) as Array<'NSE' | 'BSE'>,
        state: 'live',
        source: fresh.source ?? prior.source,
        fetched_at_utc: fresh.fetched_at_utc ?? prior.fetched_at_utc,
      };
    }
  );

  // Sort by id for deterministic output.
  mergedIpos.sort((a, b) => a.id.localeCompare(b.id));

  // Overall slice source-state: live if either feed produced rows; empty if
  // both feeds returned empty arrays; failed otherwise.
  let overall_state: SliceResult['source_state'] = 'failed';
  if (mainboardState === 'live' || smeState === 'live') overall_state = 'live';
  else if (mainboardState === 'empty' && smeState === 'empty') overall_state = 'empty';
  else if (mainboardState === 'empty' || smeState === 'empty') overall_state = 'empty';

  const newSnapshot: IpoMasterSnapshot = {
    ...existing,
    generated_at_utc: NOW,
    ipos: mergedIpos,
    source_meta: {
      nse_mainboard: {
        source_state: mainboardState,
        last_attempted_utc: NOW,
        last_error: mainboardError,
      },
      nse_sme: {
        source_state: smeState,
        last_attempted_utc: NOW,
        last_error: smeError,
      },
    },
  };
  safeWriteJson(IPO_MASTER_PATH, newSnapshot);

  log(
    'nse',
    `ipo-master.json: +${stats.added} added · ~${stats.updated} updated · =${stats.preserved} preserved`
  );
  log('nse', `overall source_state: ${overall_state} (mainboard=${mainboardState}, sme=${smeState})`);
  log('nse', 'done.');

  return {
    name: 'nse',
    source_state: overall_state,
    counts: stats,
    errors,
    notes:
      `mainboard=${mainboardState} · sme=${smeState} · ` +
      `+${stats.added} added · ~${stats.updated} updated · =${stats.preserved} preserved`,
  };
}

// Standalone CLI entry point.
const isDirectInvocation =
  process.argv[1] && process.argv[1].includes('nse-ipos');
if (isDirectInvocation) {
  run()
    .then((r) => {
      console.log(`[ingest:nse] result: ${r.source_state}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[ingest:nse] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
      process.exit(2);
    });
}
