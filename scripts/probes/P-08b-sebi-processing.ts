import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT =
  'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=14&smid=8';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.sebi.gov.in/',
    },
  });
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let rowCount = 0;
  if (res.ok) {
    responseType = 'HTML';
    rowCount = (res.body.match(/<tr[\s>]/gi) ?? []).length;
    writeSample(ctx.samplesDir, 'sample-sebi-processing.html', truncate(res.body, 6000));
    notes = `<tr> count: ${rowCount}, bytes: ${res.bytes}`;
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: rowCount >= 5,
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked,
  });
  return {
    probe_id: 'P-08b',
    source: 'SEBI — Processing Status',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: res.status,
    response_type: responseType,
    fields_found: rowCount > 0 ? ['status rows'] : [],
    fields_missing: rowCount === 0 ? ['status rows'] : [],
    sample_record: truncate(res.body, 800),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated on filing/observation status changes',
    status,
    recommended_action: status === 'GREEN' || status === 'YELLOW'
      ? 'Use for DRHP age + observation status in Pipeline tab.'
      : 'Pipeline tab ships without status field.',
    fallback_source: 'P-08',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
