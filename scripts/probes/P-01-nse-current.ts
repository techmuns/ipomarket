import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT =
  'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  const fieldsExpected = [
    'symbol',
    'companyName',
    'issueStartDate',
    'issueEndDate',
    'issuePrice',
    'issueSize',
    'status',
  ];
  let parsed: any = null;
  let activeRows = 0;
  let fieldsFound: string[] = [];
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      responseType = 'JSON';
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];
      if (arr.length > 0) {
        const sample = arr[0] ?? {};
        fieldsFound = Object.keys(sample);
        activeRows = arr.filter((r: any) =>
          String(r?.status ?? '').toLowerCase().includes('active')
        ).length;
      }
      writeSample(ctx.samplesDir, 'sample-nse-ipo-current.json', JSON.stringify(parsed, null, 2));
      notes = `Total rows: ${arr.length}, Active rows: ${activeRows}`;
    } catch (e: any) {
      responseType = 'EMPTY';
      notes = `JSON parse failed: ${e?.message ?? e}`;
    }
  } else if (res.status === 0) {
    responseType = 'ERROR';
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200 (likely anti-bot or session). First bytes: ${truncate(res.body, 200)}`;
  }
  const missing = fieldsExpected.filter(
    (f) => !fieldsFound.map((x) => x.toLowerCase()).includes(f.toLowerCase())
  );
  const hasRequiredFields = fieldsFound.length > 0 && missing.length < fieldsExpected.length * 0.6;
  const status = classify({
    ok: res.ok,
    hasRequiredFields,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-01',
    source: 'NSE — Current/Open IPOs',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (after cookie warm-up of https://www.nseindia.com/)',
    headers_or_cookies_required: ['User-Agent (browser-like)', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: fieldsFound,
    fields_missing: missing,
    sample_record: parsed
      ? truncate(JSON.stringify(Array.isArray(parsed) ? parsed[0] : parsed?.data?.[0] ?? parsed, null, 2), 800)
      : truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated when an IPO opens/closes; intra-day stable',
    status,
    recommended_action: status === 'GREEN'
      ? 'Use as primary source for Live & Upcoming tab.'
      : status === 'YELLOW'
        ? 'Use with retries + cookie warm-up; pair with BSE mirror (P-06) as fallback.'
        : 'Fall back to BSE (P-06). If both red, project blocked — escalate.',
    fallback_source: 'P-06',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
