import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT =
  'https://www1.nseindia.com/emerge/live_market/content/live_watch/ipo/sme_ipo.htm';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.nseindia.com/',
    },
  });
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let rowCount = 0;
  let fieldsFound: string[] = [];
  if (res.ok) {
    const html = res.body;
    responseType = html.includes('<table') || html.includes('SME') ? 'HTML' : 'EMPTY';
    rowCount = (html.match(/<tr[\s>]/gi) ?? []).length;
    fieldsFound = ['rowCount(tr)'];
    writeSample(ctx.samplesDir, 'sample-nse-sme.html', truncate(html, 4000));
    notes = `<tr> count: ${rowCount}, total bytes: ${res.bytes}`;
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: rowCount >= 1,
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-05',
    source: 'NSE Emerge — SME IPOs',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (after cookie warm-up)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: fieldsFound,
    fields_missing: rowCount === 0 ? ['issue rows'] : [],
    sample_record: truncate(res.body, 600),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Daily',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for SME segment.' : 'Fall back to BSE SME (P-06b).',
    fallback_source: 'P-06b',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
