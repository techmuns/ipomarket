import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const PRIMARY = 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html';
const LEGACY = 'https://linkintime.co.in/MIPO/Ipoallotment.html';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const a = await httpGet(PRIMARY, { headers: { Referer: 'https://in.mpms.mufg.com/' } });
  const b = a.ok ? null : await httpGet(LEGACY, { headers: { Referer: 'https://linkintime.co.in/' } });
  const reachable = a.ok || (b?.ok ?? false);
  const finalUrl = a.ok ? PRIMARY : LEGACY;
  const html = a.ok ? a.body : (b?.body ?? '');
  if (reachable) {
    writeSample(ctx.samplesDir, 'registrar-mufg-intime.html', truncate(html, 3000));
  }
  const status = classify({
    ok: reachable,
    hasRequiredFields: reachable,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked: !reachable,
  });
  return {
    probe_id: 'P-12',
    source: 'MUFG Intime (Link Intime) — landing',
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
    freshness_or_update_frequency: 'Static landing; per-issue lookup is form-based (do not scrape)',
    status,
    recommended_action: 'Store URL as link-out; do not scrape per-PAN.',
    fallback_source: 'none',
    ran_at_utc: ctx.nowIso,
    latency_ms: a.latency_ms + (b?.latency_ms ?? 0),
    notes: `primary=${a.status}, legacy=${b?.status ?? '(skipped)'}`,
  };
};
