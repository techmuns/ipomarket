import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=p';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.bseindia.com/publicissue',
    },
  });
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let rowCount = 0;
  if (res.ok) {
    responseType = 'HTML';
    rowCount = (res.body.match(/<tr[\s>]/gi) ?? []).length;
    writeSample(ctx.samplesDir, 'sample-bse-publicissue.html', truncate(res.body, 4000));
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
    probe_id: 'P-06',
    source: 'BSE — Mainboard Public Issues',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: res.status,
    response_type: responseType,
    fields_found: rowCount > 0 ? ['table rows'] : [],
    fields_missing: rowCount === 0 ? ['issue rows'] : [],
    sample_record: truncate(res.body, 600),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated with public issue lifecycle',
    status,
    recommended_action: status === 'GREEN' ? 'Use as mirror/cross-validation of NSE.' : 'Skip; NSE primary covers this.',
    fallback_source: 'P-01',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
