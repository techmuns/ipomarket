import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const KNOWN_REGISTRARS = [
  'link intime', 'linkintime', 'mufg', 'kfintech', 'kfin tech', 'karvy',
  'bigshare', 'maashitla', 'skyline', 'cameo',
];

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const res = await httpGet('https://www.nseindia.com/api/all-upcoming-issues?category=ipo', {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let blocked = false;
  let notes = '';
  let totalIssues = 0;
  let resolved = 0;
  const examples: Record<string, string | null> = {};
  let responseType: ProbeResult['response_type'] = 'ERROR';
  if (res.ok) {
    try {
      const parsed = JSON.parse(res.body);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      responseType = 'JSON';
      totalIssues = arr.length;
      for (const row of arr) {
        const blob = JSON.stringify(row).toLowerCase();
        const name = row?.companyName ?? row?.symbol ?? '(unknown)';
        const hit = KNOWN_REGISTRARS.find((r) => blob.includes(r));
        if (hit) {
          resolved++;
          examples[name] = hit;
        } else {
          examples[name] = null;
        }
      }
      writeSample(
        ctx.samplesDir,
        'sample-registrar-resolution.json',
        JSON.stringify({ totalIssues, resolved, examples }, null, 2)
      );
      notes = `Issues=${totalIssues}, registrars resolved by name match=${resolved}`;
    } catch (e: any) {
      notes = `Parse failed: ${e?.message ?? e}`;
      responseType = 'EMPTY';
    }
  } else if (res.status === 0) {
    notes = `Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes = `Non-200 from NSE list. First bytes: ${truncate(res.body, 200)}`;
  }
  const resolveRate = totalIssues > 0 ? resolved / totalIssues : 0;
  const status = classify({
    ok: res.ok,
    hasRequiredFields: resolveRate >= 0.5 || (totalIssues > 0 && resolved > 0),
    parsingDifficulty: 'Medium',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-11',
    source: 'Registrar resolution (from NSE list)',
    url_or_endpoint: 'derived from P-01 endpoint',
    fetch_method: 'GET (reuses P-01 data) + name-substring match',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: resolved > 0 ? ['registrar (matched by substring)'] : [],
    fields_missing: resolved === 0 ? ['registrar field'] : [],
    sample_record: truncate(JSON.stringify(examples, null, 2), 600),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Matches NSE list cadence',
    status,
    recommended_action: status === 'GREEN' || status === 'YELLOW'
      ? 'Use as link-out resolver (paired with static URL map).'
      : 'Fall back to per-issue page scrape or manual seed.',
    fallback_source: 'P-12',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
