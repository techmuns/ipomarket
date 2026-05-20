import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT = 'https://www.sebi.gov.in/filings/public-issues.html';

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
  let pdfLinkCount = 0;
  let rowCount = 0;
  if (res.ok) {
    responseType = 'HTML';
    pdfLinkCount = (res.body.match(/\.pdf/gi) ?? []).length;
    rowCount = (res.body.match(/<tr[\s>]/gi) ?? []).length;
    writeSample(ctx.samplesDir, 'sample-sebi-publicissues.html', truncate(res.body, 6000));
    notes = `<tr> count: ${rowCount}, .pdf occurrences: ${pdfLinkCount}, bytes: ${res.bytes}`;
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: rowCount >= 10 || pdfLinkCount >= 5,
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked,
  });
  return {
    probe_id: 'P-08',
    source: 'SEBI — Public Issues Filings',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: res.status,
    response_type: responseType,
    fields_found: rowCount > 0 ? ['rows', 'pdf links'] : [],
    fields_missing: rowCount === 0 ? ['rows', 'pdf links'] : [],
    sample_record: truncate(res.body, 800),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated whenever a DRHP/RHP/observation is filed',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for Pipeline tab + DRHP master.' : 'Block — use NSE/BSE DRHP archives (P-10) as fallback.',
    fallback_source: 'P-10',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
