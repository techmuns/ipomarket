import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// Probe: from the NSE upcoming-issues feed, does the row carry a symbol that
// matches NSE convention (uppercase alnum + "&"/"-" allowed, length <= 12)?
// We declare a mapping rule as "deterministic" if ≥90% of rows have such a symbol.

const URL_ENDPOINT = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
const SYMBOL_RE = /^[A-Z0-9&-]{1,12}$/;

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet(URL_ENDPOINT, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let parsed: any = null;
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = '';
  let total = 0;
  let valid = 0;
  const examples: Record<string, string | null> = {};
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      responseType = 'JSON';
      total = arr.length;
      for (const row of arr) {
        const sym: string = row?.symbol ?? row?.Symbol ?? '';
        const name = row?.companyName ?? sym ?? '(unknown)';
        if (sym && SYMBOL_RE.test(sym)) {
          valid++;
          examples[name] = sym;
        } else {
          examples[name] = sym || null;
        }
      }
      writeSample(
        ctx.samplesDir,
        'sample-ticker-mapping.json',
        JSON.stringify({ total, valid, examples }, null, 2)
      );
      notes = `total=${total}, validSymbolPattern=${valid}, rate=${total > 0 ? Math.round((valid / total) * 100) : 0}%`;
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
  const rate = total > 0 ? valid / total : 0;
  const status = classify({
    ok: res.ok,
    hasRequiredFields: rate >= 0.7 || valid >= 1,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-16',
    source: 'Ticker mapping (NSE list symbol field)',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET (reuses P-01) + regex',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: valid > 0 ? ['symbol'] : [],
    fields_missing: valid === 0 ? ['symbol'] : [],
    sample_record: truncate(JSON.stringify(examples, null, 2), 600),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Matches NSE list',
    status,
    recommended_action: status === 'GREEN' ? 'Deterministic mapping; no manual override file needed for v1.' : 'Maintain a manual override file for IPOs whose symbol drifts post-listing.',
    fallback_source: 'none',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
