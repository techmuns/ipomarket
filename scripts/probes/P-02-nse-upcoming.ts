import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
const EXPECTED_FIELDS = ['symbol', 'companyName', 'issueStartDate', 'issueEndDate'];

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!res.ok || res.status === 0) {
    return {
      probe_id: 'P-02',
      source: 'NSE — Upcoming IPOs',
      url_or_endpoint: URL_ENDPOINT,
      fetch_method: 'GET (after cookie warm-up)',
      headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
      status_code: res.status === 0 ? null : res.status,
      response_type: res.status === 0 ? 'ERROR' : 'BLOCKED',
      fields_found: [],
      fields_missing: EXPECTED_FIELDS,
      sample_record: truncate(res.body, 500),
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Medium',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Updated when issues are announced',
      status: 'RED',
      recommended_action: 'Endpoint unreachable; fall back to SEBI Processing Status (P-08b).',
      fallback_source: 'P-08b',
      ran_at_utc: ctx.nowIso,
      latency_ms: res.latency_ms,
      notes: res.status === 0 ? `Network error: ${res.error ?? 'unknown'}` : `Non-200: ${res.status}`,
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(res.body);
  } catch (e: any) {
    return {
      probe_id: 'P-02',
      source: 'NSE — Upcoming IPOs',
      url_or_endpoint: URL_ENDPOINT,
      fetch_method: 'GET (after cookie warm-up)',
      headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
      status_code: res.status,
      response_type: 'EMPTY',
      fields_found: [],
      fields_missing: EXPECTED_FIELDS,
      sample_record: truncate(res.body, 500),
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Medium',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Updated when issues are announced',
      status: 'RED',
      recommended_action: 'JSON parse failed; likely anti-bot HTML.',
      fallback_source: 'P-08b',
      ran_at_utc: ctx.nowIso,
      latency_ms: res.latency_ms,
      notes: `JSON parse failed: ${e?.message ?? e}; body starts: ${truncate(res.body, 80)}`,
    };
  }

  const arr: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
  writeSample(ctx.samplesDir, 'sample-nse-ipo-upcoming.json', JSON.stringify(parsed, null, 2));

  if (arr.length === 0) {
    return {
      probe_id: 'P-02',
      source: 'NSE — Upcoming IPOs',
      url_or_endpoint: URL_ENDPOINT,
      fetch_method: 'GET (after cookie warm-up)',
      headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
      status_code: res.status,
      response_type: 'JSON',
      fields_found: [],
      fields_missing: EXPECTED_FIELDS,
      sample_record: truncate(JSON.stringify(parsed, null, 2), 800),
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Medium',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Updated when issues are announced',
      status: 'YELLOW',
      recommended_action:
        'Source reachable but 0 upcoming rows in current snapshot. category=ipo is mainboard-only; SME pipeline lives in P-05.',
      fallback_source: 'P-05 (SME), P-08b',
      ran_at_utc: ctx.nowIso,
      latency_ms: res.latency_ms,
      notes: 'source reachable but no rows in current snapshot.',
    };
  }

  const sample = arr[0] ?? {};
  const fieldsFound = Object.keys(sample);
  const missing = EXPECTED_FIELDS.filter(
    (f) => !fieldsFound.map((x) => x.toLowerCase()).includes(f.toLowerCase())
  );
  const forthcomingCount = arr.filter((r: any) => {
    const s = String(r?.status ?? '').toLowerCase();
    return s.includes('forthcoming') || s.includes('upcoming');
  }).length;
  const hasRequiredFields = fieldsFound.length > 0;

  return {
    probe_id: 'P-02',
    source: 'NSE — Upcoming IPOs',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (after cookie warm-up)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: 'JSON',
    fields_found: fieldsFound,
    fields_missing: missing,
    sample_record: truncate(JSON.stringify(sample, null, 2), 800),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated when issues are announced',
    status: hasRequiredFields ? 'GREEN' : 'YELLOW',
    recommended_action: hasRequiredFields
      ? 'Use as primary for Upcoming/Pipeline tab.'
      : 'Field schema drifted; review fields_missing.',
    fallback_source: 'P-08b',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes: `Total rows: ${arr.length}, Forthcoming/upcoming rows: ${forthcomingCount}`,
  };
};
