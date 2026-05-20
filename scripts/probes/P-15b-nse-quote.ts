import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const SYMBOL = 'RELIANCE';
const URL_ENDPOINT = `https://www.nseindia.com/api/quote-equity?symbol=${SYMBOL}`;

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${SYMBOL}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let parsed: any = null;
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let fieldsFound: string[] = [];
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      responseType = 'JSON';
      fieldsFound = Object.keys(parsed ?? {});
      writeSample(ctx.samplesDir, 'sample-equity-quote.json', JSON.stringify(parsed, null, 2));
      notes = `Top-level keys: ${fieldsFound.join(', ')}`;
    } catch (e: any) {
      responseType = 'EMPTY';
      notes = `JSON parse failed: ${e?.message ?? e}`;
    }
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const status = classify({
    ok: res.ok,
    hasRequiredFields: fieldsFound.length > 0,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-15b',
    source: 'NSE — Equity Quote',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (after cookie warm-up)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: fieldsFound,
    fields_missing: fieldsFound.length === 0 ? ['priceInfo'] : [],
    sample_record: parsed ? truncate(JSON.stringify(parsed, null, 2), 800) : truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Near real-time during market hours',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for current price.' : 'Fall back to BSE quote.',
    fallback_source: 'none',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
