#!/usr/bin/env tsx
// Phase 2C — Sector map ingest.
//
// For each listed IPO with a known NSE symbol, fetch /api/quote-equity and
// upsert the industryInfo into src/data/snapshots/sector-map.json.
//
// Pre-IPO / synthetic entries (no NSE symbol mapping) are preserved as manual.

import { join } from 'node:path';
import { httpGet, warmNseCookies, warmNseEquityPage, truncate } from './lib/http.ts';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import { mergeByKey } from './lib/merge.ts';
import { nseSymbolFor } from './lib/symbol-map.ts';
import type { SliceResult } from './lib/slice.ts';
import { log, warn } from './lib/slice.ts';

const REPO_ROOT = process.cwd();
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const SECTOR_PATH = join(SNAP_DIR, 'sector-map.json');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');

const NOW = new Date().toISOString();

interface SectorEntry {
  slug: string;
  macro: string;
  sector: string;
  industry: string;
  basic_industry?: string;
  source: 'manual' | 'nse-post-listing' | 'rhp-cover';
  fetched_at_utc?: string;
}

interface SectorSnapshot {
  generated_at_utc: string;
  entries: SectorEntry[];
  source_meta?: { source_state: string; last_attempted_utc: string };
}

interface IpoMasterSnapshot {
  ipos: Array<{ id: string; slug: string; status: string }>;
}

async function fetchIndustryInfo(symbol: string): Promise<
  | { ok: true; macro: string; sector: string; industry: string; basic_industry?: string }
  | { ok: false; error: string }
> {
  await warmNseEquityPage(symbol).catch(() => {});
  const res = await httpGet(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) return { ok: false, error: `NSE HTTP ${res.status}: ${truncate(res.body, 80)}` };
  try {
    const parsed = JSON.parse(res.body);
    const info = parsed?.industryInfo;
    if (!info || typeof info !== 'object') return { ok: false, error: 'no industryInfo in response' };
    const macro = String(info.macro ?? '');
    const sector = String(info.sector ?? '');
    const industry = String(info.industry ?? '');
    const basicIndustry = info.basicIndustry ? String(info.basicIndustry) : undefined;
    if (!macro && !sector && !industry) return { ok: false, error: 'industryInfo all empty' };
    return { ok: true, macro, sector, industry, basic_industry: basicIndustry };
  } catch (e: any) {
    return { ok: false, error: `parse: ${e?.message ?? e}` };
  }
}

export async function run(): Promise<SliceResult> {
  log('sector', 'start');

  const master = readJsonOrNull<IpoMasterSnapshot>(MASTER_PATH);
  if (!master) {
    return {
      name: 'sector',
      source_state: 'skipped',
      counts: { added: 0, updated: 0, preserved: 0 },
      errors: ['ipo-master.json not readable'],
      notes: 'no master',
    };
  }

  const listed = master.ipos.filter((i) => i.status === 'listed');
  const candidates = listed
    .map((i) => ({ ipo: i, symbol: nseSymbolFor(i.id) }))
    .filter((x): x is { ipo: { id: string; slug: string; status: string }; symbol: string } => x.symbol !== null);

  if (candidates.length === 0) {
    log('sector', `no listed IPOs with NSE symbol mapping; preserving manual sector-map.`);
    return {
      name: 'sector',
      source_state: 'skipped',
      counts: { added: 0, updated: 0, preserved: 0 },
      errors: [],
      notes: `0 of ${listed.length} listed IPOs have NSE symbol; sector-map unchanged`,
    };
  }

  try {
    await warmNseCookies();
  } catch (e: any) {
    warn('sector', `cookie warmup non-fatal: ${e?.message ?? e}`);
  }

  const existing = readJsonOrNull<SectorSnapshot>(SECTOR_PATH) ?? { generated_at_utc: NOW, entries: [] };
  const incoming: SectorEntry[] = [];
  const errors: string[] = [];

  for (const c of candidates) {
    const r = await fetchIndustryInfo(c.symbol);
    if (!r.ok) {
      errors.push(`${c.ipo.slug} (${c.symbol}): ${r.error}`);
      warn('sector', `  ${c.ipo.slug}: ${r.error}`);
      continue;
    }
    incoming.push({
      slug: c.ipo.slug,
      macro: r.macro,
      sector: r.sector,
      industry: r.industry,
      basic_industry: r.basic_industry,
      source: 'nse-post-listing',
      fetched_at_utc: NOW,
    });
  }

  const { merged, stats } = mergeByKey<SectorEntry>(
    existing.entries,
    incoming,
    (e) => e.slug,
    // For sector entries: NSE data wins on listed IPOs; manual entries
    // survive for pre-IPO companies (no incoming row → preserved).
    (prior, fresh) => ({ ...prior, ...fresh })
  );

  merged.sort((a, b) => a.slug.localeCompare(b.slug));

  const overall_state: SliceResult['source_state'] = incoming.length > 0 ? 'live' : 'empty';

  safeWriteJson(SECTOR_PATH, {
    generated_at_utc: NOW,
    entries: merged,
    source_meta: { source_state: overall_state, last_attempted_utc: NOW },
  });

  log(
    'sector',
    `sector-map.json: +${stats.added} · ~${stats.updated} · =${stats.preserved} · ${incoming.length} live fetches`
  );
  log('sector', 'done.');

  return {
    name: 'sector',
    source_state: overall_state,
    counts: stats,
    errors,
    notes: `${candidates.length} candidates · ${incoming.length} live · +${stats.added}/${stats.updated}/${stats.preserved}`,
  };
}

const isDirectInvocation =
  process.argv[1] && process.argv[1].includes('sector-map');
if (isDirectInvocation) {
  run()
    .then((r) => {
      console.log(`[ingest:sector] result: ${r.source_state}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[ingest:sector] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
      process.exit(2);
    });
}
