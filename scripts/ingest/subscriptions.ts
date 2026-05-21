#!/usr/bin/env tsx
// Phase 2D — Subscription snapshot ingest.
//
// For each Ipo where status === 'open', hit
//   https://www.nseindia.com/api/ipo-current-issue?symbol=<SYMBOL>
// Update ipo-subscriptions.json with the latest QIB/NII/Retail/Total rows.
// Preserve NFP/Vegorama broker-derived seeded rows unless a matching NSE
// response replaces them.

import { join } from 'node:path';
import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import type { SliceResult } from './lib/slice.ts';
import { log, warn } from './lib/slice.ts';

const REPO_ROOT = process.cwd();
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const SUBS_PATH = join(SNAP_DIR, 'ipo-subscriptions.json');
const MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

interface IpoMasterRow {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  status: string;
  // We hint at a potential nse symbol — Phase 2B writes `source: 'NSE-mainboard'|'NSE-SME'`.
  // For the subscription fetch we still need a real NSE symbol. We try a few:
  //   1. id (which is slugified symbol if Phase 2B was the source)
  //   2. uppercase of id
}

interface IpoMasterSnapshot {
  ipos: IpoMasterRow[];
}

interface SubscriptionRow {
  category: 'QIB' | 'NII' | 'Retail' | 'Employee' | 'Anchor' | 'Total';
  times: number;
  reserved_shares_lakhs?: number | null;
  applied_shares_lakhs?: number | null;
}

interface IpoSubscription {
  ipo_id: string;
  as_of_utc: string;
  state: 'live' | 'awaiting' | 'manual' | 'unavailable';
  rows: SubscriptionRow[];
  daily: Array<{ date: string; qib: number; nii: number; retail: number; total: number }>;
  source?: string;
  fetched_at_utc?: string;
}

interface SubscriptionsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoSubscription>;
  source_meta?: { source_state: string; last_attempted_utc: string };
}

function deriveSymbolFromId(id: string): string {
  // Phase 2B writes ids derived from NSE `symbol`. Try uppercased id with
  // hyphens removed as the most likely real NSE ticker.
  return id.replace(/-/g, '').toUpperCase();
}

async function fetchSubscription(symbol: string): Promise<
  | { ok: true; parsed: any }
  | { ok: false; error: string }
> {
  const res = await httpGet(
    `https://www.nseindia.com/api/ipo-current-issue?symbol=${encodeURIComponent(symbol)}`,
    {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: `https://www.nseindia.com/market-data/issue-information?symbol=${encodeURIComponent(symbol)}`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );
  if (!res.ok) return { ok: false, error: `NSE HTTP ${res.status}: ${truncate(res.body, 80)}` };
  try {
    return { ok: true, parsed: JSON.parse(res.body) };
  } catch (e: any) {
    return { ok: false, error: `parse: ${e?.message ?? e}` };
  }
}

function mapNseSubscription(parsed: any, ipo_id: string): IpoSubscription | null {
  // NSE schema is messy and varies; defensive mapping.
  const sub = parsed?.subscription ?? parsed?.activeBids ?? parsed?.dataList ?? parsed;
  if (!sub) return null;

  // Try to extract per-category times.
  function pickTimes(node: any, ...keys: string[]): number | null {
    for (const k of keys) {
      if (node && node[k] != null) {
        const v = Number(node[k]);
        if (isFinite(v)) return v;
      }
    }
    return null;
  }

  const qib = pickTimes(sub, 'qib', 'QIB', 'qibSubscribed', 'qibTimes');
  const nii = pickTimes(sub, 'nii', 'NII', 'niiSubscribed', 'niiTimes', 'hni');
  const retail = pickTimes(sub, 'retail', 'Retail', 'retailSubscribed', 'retailTimes', 'rii');
  const total = pickTimes(sub, 'total', 'Total', 'totalTimes', 'subscribedTimes');

  if (qib == null && nii == null && retail == null && total == null) return null;

  const rows: SubscriptionRow[] = [];
  if (qib != null) rows.push({ category: 'QIB', times: qib });
  if (nii != null) rows.push({ category: 'NII', times: nii });
  if (retail != null) rows.push({ category: 'Retail', times: retail });
  if (total != null) rows.push({ category: 'Total', times: total });

  return {
    ipo_id,
    as_of_utc: NOW,
    state: 'live',
    rows,
    daily: [
      {
        date: TODAY,
        qib: qib ?? 0,
        nii: nii ?? 0,
        retail: retail ?? 0,
        total: total ?? 0,
      },
    ],
    source: 'NSE',
    fetched_at_utc: NOW,
  };
}

function mergeDaily(prior: IpoSubscription['daily'], fresh: IpoSubscription['daily']): IpoSubscription['daily'] {
  const byDate = new Map<string, IpoSubscription['daily'][number]>();
  for (const d of prior) byDate.set(d.date, d);
  for (const d of fresh) byDate.set(d.date, d);
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function run(): Promise<SliceResult> {
  log('subscription', 'start');

  const master = readJsonOrNull<IpoMasterSnapshot>(MASTER_PATH);
  if (!master) {
    return {
      name: 'subscription',
      source_state: 'skipped',
      counts: { added: 0, updated: 0, preserved: 0 },
      errors: ['ipo-master.json not readable'],
      notes: 'no master snapshot',
    };
  }

  const openIpos = master.ipos.filter((i) => i.status === 'open');
  if (openIpos.length === 0) {
    log('subscription', 'no open IPOs in master; source-empty.');
    const existing = readJsonOrNull<SubscriptionsSnapshot>(SUBS_PATH);
    if (existing) {
      existing.generated_at_utc = NOW;
      existing.source_meta = { source_state: 'empty', last_attempted_utc: NOW };
      safeWriteJson(SUBS_PATH, existing);
    }
    return {
      name: 'subscription',
      source_state: 'empty',
      counts: { added: 0, updated: 0, preserved: Object.keys(existing?.by_ipo ?? {}).length },
      errors: [],
      notes: 'no open IPOs; existing rows preserved',
    };
  }

  try {
    await warmNseCookies();
  } catch (e: any) {
    warn('subscription', `cookie warmup non-fatal: ${e?.message ?? e}`);
  }

  const existing = readJsonOrNull<SubscriptionsSnapshot>(SUBS_PATH) ?? {
    generated_at_utc: NOW,
    by_ipo: {},
  };

  const errors: string[] = [];
  let liveFetches = 0;
  let added = 0;
  let updated = 0;

  for (const ipo of openIpos) {
    const symbol = deriveSymbolFromId(ipo.id);
    const r = await fetchSubscription(symbol);
    if (!r.ok) {
      errors.push(`${ipo.id} (${symbol}): ${r.error}`);
      warn('subscription', `  ${ipo.id} (${symbol}): ${r.error} — existing row preserved`);
      continue;
    }
    const fresh = mapNseSubscription(r.parsed, ipo.id);
    if (!fresh) {
      errors.push(`${ipo.id}: no recognisable subscription fields in NSE response`);
      warn('subscription', `  ${ipo.id}: NSE response had no subscription fields — existing row preserved`);
      continue;
    }
    liveFetches++;

    const prior = existing.by_ipo[ipo.id];
    if (prior) {
      existing.by_ipo[ipo.id] = {
        ...prior,
        ...fresh,
        // Merge daily history.
        daily: mergeDaily(prior.daily ?? [], fresh.daily ?? []),
      };
      updated++;
    } else {
      existing.by_ipo[ipo.id] = fresh;
      added++;
    }
  }

  const preserved = Object.keys(existing.by_ipo).length - added - updated;
  const overall_state: SliceResult['source_state'] = liveFetches > 0 ? 'live' : 'failed';

  existing.generated_at_utc = NOW;
  existing.source_meta = { source_state: overall_state, last_attempted_utc: NOW };
  safeWriteJson(SUBS_PATH, existing);

  log(
    'subscription',
    `ipo-subscriptions.json: +${added} · ~${updated} · =${preserved} · live-fetches=${liveFetches}/${openIpos.length}`
  );
  log('subscription', 'done.');

  return {
    name: 'subscription',
    source_state: overall_state,
    counts: { added, updated, preserved },
    errors,
    notes: `${openIpos.length} open IPOs · live=${liveFetches} · +${added}/${updated}/${preserved}`,
  };
}

const isDirectInvocation =
  process.argv[1] && process.argv[1].includes('subscriptions');
if (isDirectInvocation) {
  run()
    .then((r) => {
      console.log(`[ingest:subscription] result: ${r.source_state}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[ingest:subscription] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
      process.exit(2);
    });
}
