import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://maashitla.com/allotment-status/public-issues';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const res = await httpGet(URL_ENDPOINT, { headers: { Referer: 'https://maashitla.com/' } });
  if (res.ok) writeSample(ctx.samplesDir, 'registrar-maashitla.html', truncate(res.body, 3000));
  const status = classify({
    ok: res.ok,
    hasRequiredFields: res.ok,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked: !res.ok,
  });
  return {
    probe_id: 'P-14b',
    source: 'Maashitla — landing',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent'],
    status_code: res.status,
    response_type: res.ok ? 'HTML' : 'BLOCKED',
    fields_found: res.ok ? ['landing page reachable'] : [],
    fields_missing: res.ok ? [] : ['reachability'],
    sample_record: truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Static landing',
    status,
    recommended_action: 'Store URL as link-out only.',
    fallback_source: 'none',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes: `status=${res.status}`,
  };
};
