// P-15 — NSE Historical OHLC.
//
// Previous probe returned RED because NSE bounced the historical request
// to an HTML error page despite cookie-warmup. Fix:
//   1. Extended warm chain: root → get-quotes/equity?symbol=X → historical API
//   2. Try RELIANCE first, then TCS (cross-symbol sanity check)
//   3. If both RED, fall through to BSE historical (official fallback only —
//      no unofficial sources)

import { httpGet, warmNseCookies, warmNseEquityPage, truncate } from './lib/http.ts';
import { writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const NSE_SYMBOLS = ['RELIANCE', 'TCS'] as const;

// BSE scrip codes for the fallback test symbols.
const BSE_SCRIPCODES: Record<string, string> = {
  RELIANCE: '500325',
  TCS: '532540',
};

function fmtNseDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mm = months[d.getMonth()]!;
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

interface AttemptOutcome {
  source: 'nse' | 'bse';
  symbol: string;
  url: string;
  status: number;
  rows: number;
  field_count: number;
  ok: boolean;
  notes: string;
  parsed_sample: string;
}

async function tryNse(symbol: string): Promise<AttemptOutcome> {
  await warmNseCookies();
  await warmNseEquityPage(symbol);
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${symbol}&series=[%22EQ%22]&from=${fmtNseDate(from)}&to=${fmtNseDate(to)}`;
  const res = await httpGet(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) {
    return {
      source: 'nse',
      symbol,
      url,
      status: res.status,
      rows: 0,
      field_count: 0,
      ok: false,
      notes: `NSE non-200 (status=${res.status}, err=${res.error ?? ''})`,
      parsed_sample: truncate(res.body, 300),
    };
  }
  try {
    const parsed = JSON.parse(res.body);
    const data: any[] = parsed?.data ?? parsed?.CMDataArray ?? (Array.isArray(parsed) ? parsed : []);
    const rows = data.length;
    const fields = rows > 0 ? Object.keys(data[0]!) : [];
    return {
      source: 'nse',
      symbol,
      url,
      status: res.status,
      rows,
      field_count: fields.length,
      ok: rows >= 1,
      notes: `NSE rows=${rows}, fields=${fields.length}`,
      parsed_sample: truncate(JSON.stringify(parsed, null, 2), 800),
    };
  } catch (e: any) {
    return {
      source: 'nse',
      symbol,
      url,
      status: res.status,
      rows: 0,
      field_count: 0,
      ok: false,
      notes: `NSE JSON parse failed: ${e?.message ?? e}; body starts: ${truncate(res.body, 80)}`,
      parsed_sample: truncate(res.body, 300),
    };
  }
}

async function tryBse(symbol: string): Promise<AttemptOutcome> {
  const scripcode = BSE_SCRIPCODES[symbol];
  if (!scripcode) {
    return {
      source: 'bse',
      symbol,
      url: '(no scripcode mapping)',
      status: 0,
      rows: 0,
      field_count: 0,
      ok: false,
      notes: `BSE: no scripcode for ${symbol}`,
      parsed_sample: '',
    };
  }
  const url = `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=${scripcode}&flag=W&fromdate=&todate=&seriesid=`;
  const res = await httpGet(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: `https://www.bseindia.com/stock-share-price/x/x/${scripcode}/`,
      Origin: 'https://www.bseindia.com',
    },
  });
  if (!res.ok) {
    return {
      source: 'bse',
      symbol,
      url,
      status: res.status,
      rows: 0,
      field_count: 0,
      ok: false,
      notes: `BSE non-200 (status=${res.status}, err=${res.error ?? ''})`,
      parsed_sample: truncate(res.body, 300),
    };
  }
  try {
    const parsed = JSON.parse(res.body);
    // BSE returns { Data: [...], Status: ... } commonly.
    const data: any[] = parsed?.Data ?? parsed?.data ?? (Array.isArray(parsed) ? parsed : []);
    const rows = data.length;
    const fields = rows > 0 ? Object.keys(data[0]!) : [];
    return {
      source: 'bse',
      symbol,
      url,
      status: res.status,
      rows,
      field_count: fields.length,
      ok: rows >= 1,
      notes: `BSE rows=${rows}, fields=${fields.length}`,
      parsed_sample: truncate(JSON.stringify(parsed, null, 2), 800),
    };
  } catch (e: any) {
    return {
      source: 'bse',
      symbol,
      url,
      status: res.status,
      rows: 0,
      field_count: 0,
      ok: false,
      notes: `BSE JSON parse failed: ${e?.message ?? e}`,
      parsed_sample: truncate(res.body, 300),
    };
  }
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const attempts: AttemptOutcome[] = [];

  for (const symbol of NSE_SYMBOLS) {
    attempts.push(await tryNse(symbol));
    if (attempts[attempts.length - 1]!.ok) break;
  }

  if (!attempts.some(function (a) { return a.ok; })) {
    for (const symbol of NSE_SYMBOLS) {
      attempts.push(await tryBse(symbol));
      if (attempts[attempts.length - 1]!.ok) break;
    }
  }

  const winner = attempts.find(function (a) { return a.ok; }) ?? attempts[attempts.length - 1]!;

  if (winner.parsed_sample) {
    writeSample(ctx.samplesDir, 'sample-historical.json', winner.parsed_sample);
  }

  let status: ProbeResult['status'];
  let responseType: ProbeResult['response_type'];
  if (winner.ok && winner.rows >= 5) {
    status = 'GREEN';
    responseType = 'JSON';
  } else if (winner.ok && winner.rows >= 1) {
    status = 'YELLOW';
    responseType = 'JSON';
  } else if (winner.status === 0) {
    status = 'RED';
    responseType = 'ERROR';
  } else {
    status = 'RED';
    responseType = winner.status === 200 ? 'EMPTY' : 'BLOCKED';
  }

  const notes = attempts.map(function (a) { return `[${a.source}:${a.symbol}] ${a.notes}`; }).join(' ; ');

  return {
    probe_id: 'P-15',
    source: winner.source === 'nse' ? 'NSE — Historical OHLC' : 'BSE — Historical OHLC (fallback)',
    url_or_endpoint: winner.url,
    fetch_method: winner.source === 'nse'
      ? 'GET (after root + equity-page cookie warmup)'
      : 'GET (BSE official endpoint)',
    headers_or_cookies_required: winner.source === 'nse'
      ? ['User-Agent', 'Referer', 'X-Requested-With', 'warmed root + equity-page cookies']
      : ['User-Agent', 'Referer', 'Origin'],
    status_code: winner.status,
    response_type: responseType,
    fields_found: winner.ok ? Array.from({ length: winner.field_count }, function (_, i) { return `f${i + 1}`; }) : [],
    fields_missing: winner.ok ? [] : ['OHLC rows'],
    sample_record: winner.parsed_sample,
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Medium',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'EOD daily',
    status,
    recommended_action:
      status === 'GREEN' && winner.source === 'nse'
        ? 'Use NSE historical as primary for listing performance + fade.'
        : status === 'GREEN' && winner.source === 'bse'
        ? 'NSE historical still blocked; use BSE historical as primary (official fallback).'
        : status === 'YELLOW'
        ? 'Partial data — degrade gracefully; investigate before relying on for Module 4.'
        : 'All historical attempts failed; Module 4 (Recently Listed) and Best/Worst leaderboards must defer to v1.5.',
    fallback_source: winner.source === 'nse' ? 'P-15b (current quote only) + BSE historical' : 'P-15b (current quote only)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
