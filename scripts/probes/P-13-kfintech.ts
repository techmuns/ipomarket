import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const PRIMARY = 'https://ipostatus.kfintech.com/';
const SECONDARY = 'https://ris.kfintech.com/ipostatus/';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const a = await httpGet(PRIMARY, { headers: { Referer: 'https://www.kfintech.com/' } });
  const b = a.ok ? null : await httpGet(SECONDARY, { headers: { Referer: 'https://www.kfintech.com/' } });
  const reachable = a.ok || (b?.ok ?? false);
  const finalUrl = a.ok ? PRIMARY : SECONDARY;
  const html = a.ok ? a.body : (b?.body ?? '');
  if (reachable) writeSample(ctx.samplesDir, 'registrar-kfintech.html', truncate(html, 3000));
  const status = classify({
    ok: reachable,
    hasRequiredFields: reachable,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked: !reachable,
  });
  return {
    probe_id: 'P-13',
    source: 'KFintech — landing',
    url_or_endpoint: finalUrl,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent'],
    status_code: a.status || b?.status || 0,
    response_type: reachable ? 'HTML' : 'BLOCKED',
    fields_found: reachable ? ['landing page reachable'] : [],
    fields_missing: reachable ? [] : ['reachability'],
    sample_record: truncate(html, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Static landing',
    status,
    recommended_action: 'Store URL as link-out only.',
    fallback_source: 'none',
    ran_at_utc: ctx.nowIso,
    latency_ms: a.latency_ms + (b?.latency_ms ?? 0),
    notes: `primary=${a.status}, secondary=${b?.status ?? '(skipped)'}`,
  };
};
