import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://www.chittorgarh.com/report/ipo-grey-market-premium-kostak-rates/24/';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const res = await httpGet(URL_ENDPOINT, { headers: { Referer: 'https://www.chittorgarh.com/' } });
  let blocked = false;
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let rowCount = 0;
  let notes = '';
  if (res.ok) {
    responseType = 'HTML';
    rowCount = (res.body.match(/<tr[\s>]/gi) ?? []).length;
    writeSample(ctx.samplesDir, 'sample-gmp-chittorgarh.html', truncate(res.body, 4000));
    notes = `<tr> count: ${rowCount}, bytes=${res.bytes}`;
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. status=${res.status}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: rowCount >= 1,
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Medium',
    antiBotRisk: 'High',
    blocked,
  });
  return {
    probe_id: 'P-20',
    source: 'GMP — Chittorgarh',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: res.status,
    response_type: responseType,
    fields_found: rowCount > 0 ? ['gmp table rows'] : [],
    fields_missing: rowCount === 0 ? ['gmp table'] : [],
    sample_record: truncate(res.body, 500),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'High',
    legal_tos_risk: 'Medium',
    freshness_or_update_frequency: 'Daily',
    status,
    recommended_action: status === 'GREEN' || status === 'YELLOW'
      ? 'Include in Phase 6 GMP averager.'
      : 'Skip; Phase 6 stays off if all GMP probes fail.',
    fallback_source: 'P-21',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
