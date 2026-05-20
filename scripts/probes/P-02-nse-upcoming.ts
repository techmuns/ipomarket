import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let parsed: any = null;
  let fieldsFound: string[] = [];
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let forthcomingCount = 0;
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      responseType = 'JSON';
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      if (arr.length > 0) fieldsFound = Object.keys(arr[0] ?? {});
      forthcomingCount = arr.filter((r: any) => {
        const s = String(r?.status ?? '').toLowerCase();
        return s.includes('forthcoming') || s.includes('upcoming');
      }).length;
      writeSample(ctx.samplesDir, 'sample-nse-ipo-upcoming.json', JSON.stringify(parsed, null, 2));
      notes = `Forthcoming rows: ${forthcomingCount}`;
    } catch (e: any) {
      responseType = 'EMPTY';
      notes = `JSON parse failed: ${e?.message ?? e}`;
    }
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const expected = ['symbol', 'companyName', 'issueStartDate', 'issueEndDate'];
  const missing = expected.filter((f) => !fieldsFound.map((x) => x.toLowerCase()).includes(f.toLowerCase()));
  const hasRequiredFields = fieldsFound.length > 0;
  const status = classify({
    ok: res.ok,
    hasRequiredFields,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-02',
    source: 'NSE — Upcoming IPOs',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (after cookie warm-up)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: fieldsFound,
    fields_missing: missing,
    sample_record: parsed ? truncate(JSON.stringify(parsed, null, 2), 800) : truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated when issues are announced',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for Pipeline tab.' : 'Pair with SEBI Processing Status (P-08b).',
    fallback_source: 'P-08b',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
