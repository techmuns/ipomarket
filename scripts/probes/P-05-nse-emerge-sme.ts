// P-05 — NSE Emerge SME IPOs.
//
// The legacy www1.nseindia.com URL appears to have been retired (returns
// "fetch failed" from CI). Try multiple official NSE endpoints in order:
//   1. modern NSE API: all-upcoming-issues?category=sme
//   2. modern NSE API: all-upcoming-issues?category=sme-ipo
//   3. legacy www1 URL (preserved for completeness)
// All are official/public NSE. No third-party sources.

import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

interface Candidate {
  label: string;
  url: string;
  type: 'json' | 'html';
  referer: string;
}

const CANDIDATES: Candidate[] = [
  {
    label: 'nse-api-category-sme',
    url: 'https://www.nseindia.com/api/all-upcoming-issues?category=sme',
    type: 'json',
    referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
  },
  {
    label: 'nse-api-category-sme-ipo',
    url: 'https://www.nseindia.com/api/all-upcoming-issues?category=sme-ipo',
    type: 'json',
    referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
  },
  {
    label: 'nse-www1-legacy',
    url: 'https://www1.nseindia.com/emerge/live_market/content/live_watch/ipo/sme_ipo.htm',
    type: 'html',
    referer: 'https://www.nseindia.com/',
  },
];

interface Attempt {
  label: string;
  url: string;
  status: number;
  ok: boolean;
  row_count: number;
  field_names: string[];
  notes: string;
  body_sample: string;
}

async function tryCandidate(c: Candidate): Promise<Attempt> {
  const res = await httpGet(c.url, {
    headers: {
      Accept:
        c.type === 'json'
          ? 'application/json, text/plain, */*'
          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: c.referer,
      ...(c.type === 'json' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
    },
  });
  if (!res.ok) {
    return {
      label: c.label,
      url: c.url,
      status: res.status,
      ok: false,
      row_count: 0,
      field_names: [],
      notes: `non-ok: status=${res.status}, err=${res.error ?? ''}`,
      body_sample: truncate(res.body, 400),
    };
  }
  if (c.type === 'json') {
    try {
      const parsed = JSON.parse(res.body);
      const arr: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      return {
        label: c.label,
        url: c.url,
        status: res.status,
        ok: true,
        row_count: arr.length,
        field_names: arr.length > 0 ? Object.keys(arr[0] ?? {}) : [],
        notes: `JSON ok: rows=${arr.length}`,
        body_sample: truncate(JSON.stringify(parsed, null, 2), 800),
      };
    } catch (e: any) {
      return {
        label: c.label,
        url: c.url,
        status: res.status,
        ok: false,
        row_count: 0,
        field_names: [],
        notes: `JSON parse failed: ${e?.message ?? e}; body starts: ${truncate(res.body, 80)}`,
        body_sample: truncate(res.body, 400),
      };
    }
  }
  // HTML fallback path.
  const rowCount = (res.body.match(/<tr[\s>]/gi) ?? []).length;
  return {
    label: c.label,
    url: c.url,
    status: res.status,
    ok: rowCount >= 1,
    row_count: rowCount,
    field_names: [],
    notes: `HTML rows=${rowCount}, bytes=${res.bytes}`,
    body_sample: truncate(res.body, 800),
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  await warmNseCookies();
  const attempts: Attempt[] = [];
  for (const c of CANDIDATES) {
    attempts.push(await tryCandidate(c));
    if (attempts[attempts.length - 1]!.row_count > 0) break;
  }

  // Pick winner: highest row count among ok=true; else first ok=true; else first.
  const ok = attempts.filter(function (a) { return a.ok; });
  const winner =
    ok.sort(function (a, b) { return b.row_count - a.row_count; })[0] ?? attempts[0]!;

  if (winner.body_sample) {
    writeSample(
      ctx.samplesDir,
      winner.label.includes('legacy') ? 'sample-nse-sme.html' : 'sample-nse-sme.json',
      winner.body_sample
    );
  }

  let status: ProbeResult['status'];
  let responseType: ProbeResult['response_type'];
  if (winner.ok && winner.row_count >= 1) {
    status = 'GREEN';
    responseType = winner.label.includes('legacy') ? 'HTML' : 'JSON';
  } else if (winner.ok) {
    status = 'YELLOW';
    responseType = winner.label.includes('legacy') ? 'HTML' : 'JSON';
  } else if (winner.status === 0) {
    status = 'RED';
    responseType = 'ERROR';
  } else {
    status = 'RED';
    responseType = winner.status >= 200 && winner.status < 300 ? 'EMPTY' : 'BLOCKED';
  }

  const notes = attempts.map(function (a) { return `[${a.label}] ${a.notes}`; }).join(' ; ');

  return {
    probe_id: 'P-05',
    source: 'NSE Emerge — SME IPOs',
    url_or_endpoint: winner.url,
    fetch_method: 'GET (after cookie warm-up) — multi-candidate',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'warmed cookies', 'X-Requested-With (for JSON endpoints)'],
    status_code: winner.status,
    response_type: responseType,
    fields_found: winner.field_names,
    fields_missing: winner.ok && winner.row_count === 0 ? ['(empty array)'] : winner.ok ? [] : ['endpoint unusable'],
    sample_record: truncate(winner.body_sample, 800),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Daily',
    status,
    recommended_action:
      status === 'GREEN'
        ? 'Use as primary for SME segment (satisfies IPO-list-source gate on SME-only days).'
        : status === 'YELLOW'
        ? 'Source reachable; 0 SME rows in current snapshot.'
        : 'All NSE Emerge candidates failed; fall back to BSE SME (P-06b).',
    fallback_source: 'P-06b',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
