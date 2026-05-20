import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// Use a stable, long-listed ticker so the probe is deterministic in CI.
const SYMBOL = 'RELIANCE';

function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = months[d.getMonth()]!;
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${SYMBOL}&series=[%22EQ%22]&from=${fmt(from)}&to=${fmt(to)}`;
  const res = await httpGet(url, {
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
  let rowCount = 0;
  let fieldsFound: string[] = [];
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      responseType = 'JSON';
      const data: any[] = parsed?.data ?? parsed?.CMDataArray ?? (Array.isArray(parsed) ? parsed : []);
      rowCount = data.length;
      fieldsFound = rowCount > 0 ? Object.keys(data[0]!) : [];
      writeSample(ctx.samplesDir, 'sample-historical.json', JSON.stringify(parsed, null, 2));
      notes = `Rows=${rowCount}; fields=${fieldsFound.length}`;
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
    hasRequiredFields: rowCount >= 1,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-15',
    source: 'NSE — Historical OHLC',
    url_or_endpoint: url,
    fetch_method: 'GET (after cookie warm-up)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: fieldsFound,
    fields_missing: rowCount === 0 ? ['OHLC rows'] : [],
    sample_record: parsed ? truncate(JSON.stringify(parsed, null, 2), 800) : truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'EOD daily',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for listing performance + fade.' : 'Fall back to BSE historical.',
    fallback_source: 'P-15b',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
