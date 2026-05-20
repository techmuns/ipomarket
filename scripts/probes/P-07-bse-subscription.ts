import { httpGet, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// BSE bidding URL is per-issue and discoverable from the IPO detail page.
// In Phase 0 we only probe reachability of the public-issues landing page where
// "Cumulative Bid Details" links live; per-issue scraping is a Phase 2 concern.
const URL_ENDPOINT = 'https://www.bseindia.com/publicissue';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.bseindia.com/',
    },
  });
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let bidLinkCount = 0;
  if (res.ok) {
    responseType = 'HTML';
    bidLinkCount = (res.body.match(/Cumulative Bid Details|BidDetails|publicissue.aspx\?expandable/gi) ?? []).length;
    writeSample(ctx.samplesDir, 'sample-bse-subscription.html', truncate(res.body, 4000));
    notes = `Bid-link markers found: ${bidLinkCount}, bytes: ${res.bytes}`;
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: bidLinkCount >= 1,
    parsingDifficulty: 'Hard',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-07',
    source: 'BSE — Subscription / Cumulative Bid Details',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET landing; per-issue bid URL requires drill-down',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: res.status,
    response_type: responseType,
    fields_found: bidLinkCount > 0 ? ['bid-detail markers'] : [],
    fields_missing: bidLinkCount === 0 ? ['bid-detail markers'] : [],
    sample_record: truncate(res.body, 600),
    parsing_difficulty: 'Hard',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Intra-day during bidding window',
    status,
    recommended_action: status === 'YELLOW' || status === 'GREEN' ? 'Use as mirror to NSE bidding (P-04).' : 'Rely on NSE only (P-04).',
    fallback_source: 'P-04',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
