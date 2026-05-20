import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const PRIMARY = 'https://www.bseindia.com/markets/PublicIssues/DRHP.aspx';
const SECONDARY = 'https://www.bsesme.com/PublicIssues/SMEIPODRHP.aspx';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const a = await httpGet(PRIMARY, { headers: { Referer: 'https://www.bseindia.com/' } });
  const b = await httpGet(SECONDARY, { headers: { Referer: 'https://www.bsesme.com/' } });
  const okEither = a.ok || b.ok;
  const html = a.ok ? a.body : b.body;
  const rowCount = (html.match(/<tr[\s>]/gi) ?? []).length;
  const pdfCount = (html.match(/\.pdf/gi) ?? []).length;
  if (okEither) {
    writeSample(ctx.samplesDir, 'sample-exchange-drhp.html', truncate(html, 6000));
  }
  let responseType: ProbeResult['response_type'] = okEither ? 'HTML' : 'BLOCKED';
  if (a.status === 0 && b.status === 0) responseType = 'ERROR';
  const status = classify({
    ok: okEither,
    hasRequiredFields: rowCount >= 5 || pdfCount >= 3,
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked: !okEither,
  });
  return {
    probe_id: 'P-10',
    source: 'NSE/BSE — DRHP Archive',
    url_or_endpoint: a.ok ? PRIMARY : SECONDARY,
    fetch_method: 'GET (primary, then secondary)',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: a.ok ? a.status : b.status,
    response_type: responseType,
    fields_found: rowCount > 0 ? ['rows', 'pdf links'] : [],
    fields_missing: rowCount === 0 && pdfCount === 0 ? ['rows', 'pdf links'] : [],
    sample_record: truncate(html, 800),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated with DRHP filings',
    status,
    recommended_action: status === 'GREEN' ? 'Use as DRHP redundancy with SEBI.' : 'Skip if SEBI (P-08) is GREEN.',
    fallback_source: 'P-08',
    ran_at_utc: ctx.nowIso,
    latency_ms: a.latency_ms + b.latency_ms,
    notes: `primary status=${a.status}; secondary status=${b.status}; rows=${rowCount}; pdf-refs=${pdfCount}`,
  };
};
