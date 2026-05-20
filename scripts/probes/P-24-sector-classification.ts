// P-24 — Sector / industry classification.
//
// Combined-benchmark §O6.4 asks: does NSE/BSE expose industry/sector per
// IPO and per listed equity, or do we need a manual sector map?
//
// Three tests:
//   1. NSE equity quote for a listed stock (RELIANCE) — known to expose
//      `industryInfo.{macro, sector, industry, basicIndustry}`.
//   2. NSE IPO endpoint — check if any field per-IPO carries sector.
//   3. BSE IPO endpoint — same.
//
// Output: phase-0/samples/sector-probe.json (structured findings).

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { ensureDir } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const NSE_EQUITY_QUOTE = 'https://www.nseindia.com/api/quote-equity?symbol=RELIANCE';
const NSE_IPO_LIST = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
const BSE_IPO_LIST = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=p';

const SECTOR_FIELD_HINTS = [
  'industry',
  'sector',
  'macro',
  'basicIndustry',
  'category',
  'industryInfo',
];

interface FieldCheckResult {
  source: string;
  url: string;
  ok: boolean;
  status: number;
  sample_keys: string[];
  sector_fields_found: string[];
  sector_field_values: Record<string, any>;
  notes: string;
}

function findSectorFieldsRecursive(
  obj: any,
  prefix: string,
  out: Record<string, any>,
  depth: number
): void {
  if (depth > 4 || obj == null || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const lowered = k.toLowerCase();
    const v = obj[k];
    const hit = SECTOR_FIELD_HINTS.some(function (h) { return lowered.includes(h.toLowerCase()); });
    if (hit && (typeof v === 'string' || typeof v === 'number' || (v && typeof v === 'object'))) {
      out[`${prefix}${k}`] = typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
    if (v && typeof v === 'object') {
      findSectorFieldsRecursive(v, `${prefix}${k}.`, out, depth + 1);
    }
  }
}

async function testNseEquityQuote(): Promise<FieldCheckResult> {
  await warmNseCookies();
  const res = await httpGet(NSE_EQUITY_QUOTE, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) {
    return {
      source: 'NSE equity quote',
      url: NSE_EQUITY_QUOTE,
      ok: false,
      status: res.status,
      sample_keys: [],
      sector_fields_found: [],
      sector_field_values: {},
      notes: `NSE non-200 (status=${res.status}, err=${res.error ?? ''}); body starts: ${truncate(res.body, 80)}`,
    };
  }
  try {
    const parsed = JSON.parse(res.body);
    const found: Record<string, any> = {};
    findSectorFieldsRecursive(parsed, '', found, 0);
    const keys = Object.keys(parsed ?? {});
    return {
      source: 'NSE equity quote',
      url: NSE_EQUITY_QUOTE,
      ok: Object.keys(found).length > 0,
      status: res.status,
      sample_keys: keys,
      sector_fields_found: Object.keys(found),
      sector_field_values: found,
      notes: `top-level keys: ${keys.join(', ')}; sector fields: ${Object.keys(found).join(', ') || '(none)'}`,
    };
  } catch (e: any) {
    return {
      source: 'NSE equity quote',
      url: NSE_EQUITY_QUOTE,
      ok: false,
      status: res.status,
      sample_keys: [],
      sector_fields_found: [],
      sector_field_values: {},
      notes: `NSE JSON parse failed: ${e?.message ?? e}`,
    };
  }
}

async function testNseIpoList(): Promise<FieldCheckResult> {
  await warmNseCookies();
  const res = await httpGet(NSE_IPO_LIST, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) {
    return {
      source: 'NSE IPO list',
      url: NSE_IPO_LIST,
      ok: false,
      status: res.status,
      sample_keys: [],
      sector_fields_found: [],
      sector_field_values: {},
      notes: `NSE non-200 (status=${res.status}, err=${res.error ?? ''}); body starts: ${truncate(res.body, 80)}`,
    };
  }
  try {
    const parsed = JSON.parse(res.body);
    const items: any[] = parsed?.data ?? (Array.isArray(parsed) ? parsed : []);
    if (items.length === 0) {
      return {
        source: 'NSE IPO list',
        url: NSE_IPO_LIST,
        ok: false,
        status: res.status,
        sample_keys: Object.keys(parsed ?? {}),
        sector_fields_found: [],
        sector_field_values: {},
        notes: `NSE IPO list returned 0 items`,
      };
    }
    const first = items[0]!;
    const found: Record<string, any> = {};
    findSectorFieldsRecursive(first, '', found, 0);
    return {
      source: 'NSE IPO list',
      url: NSE_IPO_LIST,
      ok: Object.keys(found).length > 0,
      status: res.status,
      sample_keys: Object.keys(first),
      sector_fields_found: Object.keys(found),
      sector_field_values: found,
      notes: `${items.length} IPOs; per-row keys: ${Object.keys(first).join(', ')}; sector fields: ${Object.keys(found).join(', ') || '(none)'}`,
    };
  } catch (e: any) {
    return {
      source: 'NSE IPO list',
      url: NSE_IPO_LIST,
      ok: false,
      status: res.status,
      sample_keys: [],
      sector_fields_found: [],
      sector_field_values: {},
      notes: `NSE JSON parse failed: ${e?.message ?? e}`,
    };
  }
}

async function testBseIpoList(): Promise<FieldCheckResult> {
  const res = await httpGet(BSE_IPO_LIST, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.bseindia.com/markets/PublicIssues/IPO_New.aspx',
    },
  });
  if (!res.ok) {
    return {
      source: 'BSE IPO list',
      url: BSE_IPO_LIST,
      ok: false,
      status: res.status,
      sample_keys: [],
      sector_fields_found: [],
      sector_field_values: {},
      notes: `BSE non-200 (status=${res.status}, err=${res.error ?? ''})`,
    };
  }
  // BSE list is HTML. Look for sector-related text patterns.
  const body = res.body;
  const hits: string[] = [];
  for (const hint of SECTOR_FIELD_HINTS) {
    const re = new RegExp(`\\b${hint}\\b`, 'i');
    if (re.test(body)) hits.push(hint);
  }
  return {
    source: 'BSE IPO list',
    url: BSE_IPO_LIST,
    ok: hits.length > 0,
    status: res.status,
    sample_keys: [],
    sector_fields_found: hits,
    sector_field_values: {},
    notes: `BSE HTML; sector-related words found: ${hits.join(', ') || '(none)'}; bytes=${res.bytes}`,
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  ensureDir(ctx.samplesDir);

  const nseEquity = await testNseEquityQuote();
  const nseIpo = await testNseIpoList();
  const bseIpo = await testBseIpoList();

  const tests = [nseEquity, nseIpo, bseIpo];
  const sectorReachable = {
    listed_equity: nseEquity.ok,
    pre_ipo: nseIpo.ok || bseIpo.ok,
  };
  const manualMapNeeded = !sectorReachable.pre_ipo;

  writeFileSync(
    join(ctx.samplesDir, 'sector-probe.json'),
    JSON.stringify(
      {
        captured_at_utc: ctx.nowIso,
        sector_reachable: sectorReachable,
        manual_map_needed: manualMapNeeded,
        tests: tests.map(function (t) {
          return {
            source: t.source,
            url: t.url,
            ok: t.ok,
            status: t.status,
            sample_keys: t.sample_keys,
            sector_fields_found: t.sector_fields_found,
            sector_field_values: t.sector_field_values,
            notes: t.notes,
          };
        }),
      },
      null,
      2
    ) + '\n'
  );

  let status: ProbeResult['status'];
  let action: string;
  if (sectorReachable.listed_equity && sectorReachable.pre_ipo) {
    status = 'GREEN';
    action = 'Sector reachable for both listed equities and live IPOs; no manual map needed.';
  } else if (sectorReachable.listed_equity) {
    status = 'YELLOW';
    action =
      'Sector reachable for listed equities via NSE equity quote, but not exposed per-IPO before listing. ' +
      'Use the equity-quote sector once an IPO lists; create a small manual sector-map.json for pre-listing IPOs.';
  } else {
    status = 'RED';
    action = 'Sector unreachable from probed endpoints; manual sector-map.json required for v1.';
  }

  return {
    probe_id: 'P-24',
    source: 'Sector / industry classification (NSE + BSE)',
    url_or_endpoint: `${NSE_EQUITY_QUOTE} ; ${NSE_IPO_LIST} ; ${BSE_IPO_LIST}`,
    fetch_method: 'GET (3 endpoints)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With (NSE)'],
    status_code: nseEquity.status,
    response_type: nseEquity.ok || nseIpo.ok ? 'JSON' : 'EMPTY',
    fields_found: Array.from(
      new Set([
        ...nseEquity.sector_fields_found.map(function (f) { return `nse-equity:${f}`; }),
        ...nseIpo.sector_fields_found.map(function (f) { return `nse-ipo:${f}`; }),
        ...bseIpo.sector_fields_found.map(function (f) { return `bse-ipo:${f}`; }),
      ])
    ),
    fields_missing: manualMapNeeded ? ['pre-IPO sector / industry per-IPO'] : [],
    sample_record: truncate(
      JSON.stringify(
        {
          sector_reachable: sectorReachable,
          manual_map_needed: manualMapNeeded,
          nse_equity_sector_fields: nseEquity.sector_fields_found,
          nse_ipo_sector_fields: nseIpo.sector_fields_found,
          bse_ipo_sector_fields: bseIpo.sector_fields_found,
        },
        null,
        2
      ),
      1200
    ),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Slow-changing (industry codes rarely change per company)',
    status,
    recommended_action: action,
    fallback_source: 'phase-0/samples/sector-manual-map.json (curated)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes: tests.map(function (t) { return `[${t.source}] ${t.notes}`; }).join(' ; '),
  };
};
