import { httpGet, warmNseCookies, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// Discover an Active symbol from the IPO list, then hit the bidding endpoint.
const LIST_URL = 'https://www.nseindia.com/api/all-upcoming-issues?category=ipo';
const BIDDING_URL_TEMPLATE = 'https://www.nseindia.com/api/ipo-current-issue?symbol=';

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  await warmNseCookies();
  const listRes = await httpGet(LIST_URL, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let symbol: string | null = null;
  let listNotes = '';
  if (listRes.ok) {
    try {
      const parsed = JSON.parse(listRes.body);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      const active = arr.find((r: any) =>
        String(r?.status ?? '').toLowerCase().includes('active')
      );
      symbol = active?.symbol ?? active?.Symbol ?? null;
      listNotes = `Active candidate symbol: ${symbol ?? '(none currently open)'}`;
    } catch (e: any) {
      listNotes = `IPO list parse failed: ${e?.message ?? e}`;
    }
  } else {
    listNotes = `IPO list fetch failed: status ${listRes.status}`;
  }

  if (!symbol) {
    return {
      probe_id: 'P-04',
      source: 'NSE — Live Subscription',
      url_or_endpoint: BIDDING_URL_TEMPLATE + '<no-active-ipo>',
      fetch_method: 'GET (after cookie warm-up + active-symbol discovery)',
      headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
      status_code: null,
      response_type: 'EMPTY',
      fields_found: [],
      fields_missing: ['qib', 'nii_big', 'nii_small', 'retail', 'employee', 'anchor'],
      sample_record: '',
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Medium',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Updates every ~10 minutes during bidding window',
      status: 'YELLOW',
      recommended_action: 'No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run.',
      fallback_source: 'P-07',
      ran_at_utc: ctx.nowIso,
      latency_ms: listRes.latency_ms,
      notes: listNotes,
    };
  }

  const bidUrl = BIDDING_URL_TEMPLATE + encodeURIComponent(symbol);
  const res = await httpGet(bidUrl, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.nseindia.com/market-data/issue-information?symbol=${symbol}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  let parsed: any = null;
  let fieldsFound: string[] = [];
  let responseType: ProbeResult['response_type'] = 'ERROR';
  let blocked = false;
  let notes = listNotes;
  if (res.ok) {
    try {
      parsed = JSON.parse(res.body);
      responseType = 'JSON';
      fieldsFound = Object.keys(parsed ?? {});
      writeSample(ctx.samplesDir, 'sample-nse-subscription.json', JSON.stringify(parsed, null, 2));
      notes += ` · Top-level keys: ${fieldsFound.join(', ')}`;
    } catch (e: any) {
      responseType = 'EMPTY';
      notes += ` · JSON parse failed: ${e?.message ?? e}`;
    }
  } else if (res.status === 0) {
    notes += ` · Network error: ${res.error ?? 'unknown'}`;
  } else {
    responseType = 'BLOCKED';
    blocked = true;
    notes += ` · Non-200. First bytes: ${truncate(res.body, 200)}`;
  }
  const expected = ['qib', 'nii', 'retail', 'employee', 'anchor', 'subscription'];
  const flat = JSON.stringify(parsed ?? {}).toLowerCase();
  const present = expected.filter((f) => flat.includes(f));
  const missing = expected.filter((f) => !flat.includes(f));
  const hasRequiredFields = present.length >= 3;
  const status = classify({
    ok: res.ok,
    hasRequiredFields,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Medium',
    blocked,
  });
  return {
    probe_id: 'P-04',
    source: 'NSE — Live Subscription',
    url_or_endpoint: bidUrl,
    fetch_method: 'GET (after cookie warm-up + active-symbol discovery from P-01 endpoint)',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'X-Requested-With', 'warmed cookies'],
    status_code: res.status,
    response_type: responseType,
    fields_found: present,
    fields_missing: missing,
    sample_record: parsed ? truncate(JSON.stringify(parsed, null, 2), 800) : truncate(res.body, 500),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updates every ~10 minutes during bidding window',
    status,
    recommended_action: status === 'GREEN' ? 'Use as primary for Subscription Heatmap.' : 'Fall back to BSE bidding (P-07).',
    fallback_source: 'P-07',
    ran_at_utc: ctx.nowIso,
    latency_ms: res.latency_ms,
    notes,
  };
};
