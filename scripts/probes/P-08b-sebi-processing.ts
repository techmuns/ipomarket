// P-08b — SEBI Processing Status.
//
// Same SEBI Kendo-Grid SPA pattern as P-08. The old probe's <tr> regex
// matched SEBI nav rows, not the data table. Fix:
//   - Same static → Playwright fallback chain as P-08.
//   - Count rows inside <tbody> only (not the whole document).
//   - YELLOW = page reachable but tbody empty (legitimate "no filings today").

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, truncate } from './lib/http.ts';
import { ensureDir, writeSample } from './lib/reporter.ts';
import { renderPage } from './lib/playwright.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const URL_ENDPOINT =
  'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=14&smid=8';

interface Attempt {
  attempt: string;
  status: number;
  bytes: number;
  tbody_row_count: number;
  page_reachable: boolean;
  notes: string;
  body_snippet: string;
}

function countTbodyRows(html: string): number {
  let total = 0;
  const tbodyRe = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
  let m: RegExpExecArray | null;
  while ((m = tbodyRe.exec(html))) {
    const inside = m[1] ?? '';
    total += (inside.match(/<tr[\s>]/gi) ?? []).length;
  }
  return total;
}

async function staticAttempt(url: string, label: string): Promise<Attempt> {
  const res = await httpGet(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.sebi.gov.in/',
    },
  });
  if (!res.ok) {
    return {
      attempt: label,
      status: res.status,
      bytes: res.bytes,
      tbody_row_count: 0,
      page_reachable: false,
      notes: `static non-200 (status=${res.status}, err=${res.error ?? ''})`,
      body_snippet: truncate(res.body, 4000),
    };
  }
  const rows = countTbodyRows(res.body);
  return {
    attempt: label,
    status: res.status,
    bytes: res.bytes,
    tbody_row_count: rows,
    page_reachable: true,
    notes: `static ok: tbody_rows=${rows}, bytes=${res.bytes}`,
    body_snippet: truncate(res.body, 6000),
  };
}

async function playwrightAttempt(url: string, label: string): Promise<{ a: Attempt; html: string; png: Buffer }> {
  const r = await renderPage(url, { timeoutMs: 35_000, waitAfterLoadMs: 3000 });
  if (r.error && r.status === 0) {
    return {
      a: {
        attempt: label,
        status: 0,
        bytes: 0,
        tbody_row_count: 0,
        page_reachable: false,
        notes: `playwright failed: ${r.error}`,
        body_snippet: '',
      },
      html: '',
      png: Buffer.alloc(0),
    };
  }
  const rows = countTbodyRows(r.rendered_html);
  return {
    a: {
      attempt: label,
      status: r.status,
      bytes: r.rendered_html_length,
      tbody_row_count: rows,
      page_reachable: r.status >= 200 && r.status < 400,
      notes: `playwright: status=${r.status}, tbody_rows=${rows}, rendered_len=${r.rendered_html_length}${
        r.challenge_detected ? `, challenge=${r.challenge_reasons.join(',')}` : ''
      }${r.error ? `, error=${r.error}` : ''}`,
      body_snippet: truncate(r.rendered_html, 6000),
    },
    html: r.rendered_html,
    png: r.screenshot_png,
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  ensureDir(ctx.samplesDir);

  const attempts: Attempt[] = [];
  attempts.push(await staticAttempt(URL_ENDPOINT, 'static'));

  if (attempts[0]!.tbody_row_count < 1) {
    const pw = await playwrightAttempt(URL_ENDPOINT, 'playwright');
    attempts.push(pw.a);
    if (pw.html.length > 0) {
      writeFileSync(join(ctx.samplesDir, 'sebi-processing-rendered.html'), pw.html);
      if (pw.png.length > 0) {
        writeFileSync(join(ctx.samplesDir, 'sebi-processing-screenshot.png'), pw.png);
      }
    }
  }

  // Winner: highest tbody row count.
  const winner = attempts
    .slice()
    .sort(function (a, b) { return b.tbody_row_count - a.tbody_row_count; })[0]!;

  let status: ProbeResult['status'];
  let response_type: ProbeResult['response_type'];
  if (!winner.page_reachable && winner.status === 0) {
    status = 'RED';
    response_type = 'ERROR';
  } else if (winner.tbody_row_count >= 5) {
    status = 'GREEN';
    response_type = 'HTML';
  } else if (winner.page_reachable) {
    // Reachable but no rows — still useful (we know the endpoint is alive).
    status = 'YELLOW';
    response_type = 'EMPTY';
  } else {
    status = 'RED';
    response_type = 'BLOCKED';
  }

  const sampleSource = winner.body_snippet || attempts[0]?.body_snippet || '';
  if (sampleSource) {
    writeSample(ctx.samplesDir, 'sample-sebi-processing.html', sampleSource);
  }

  const notes = attempts.map(function (a) { return a.notes; }).join(' ; ');

  return {
    probe_id: 'P-08b',
    source: 'SEBI — Processing Status',
    url_or_endpoint: URL_ENDPOINT,
    fetch_method: 'GET → Playwright/Chromium',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'Chromium for JS render'],
    status_code: winner.status,
    response_type,
    fields_found: winner.tbody_row_count > 0 ? ['tbody data rows'] : [],
    fields_missing: winner.tbody_row_count === 0 ? ['tbody data rows'] : [],
    sample_record: JSON.stringify(
      {
        winning_attempt: winner.attempt,
        tbody_row_count: winner.tbody_row_count,
        notes: winner.notes,
      },
      null,
      2
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated on filing/observation status changes',
    status,
    recommended_action:
      status === 'GREEN'
        ? 'Use for DRHP age + observation status in Pipeline tab.'
        : status === 'YELLOW'
        ? 'Endpoint reachable; show "no observations today" in Pipeline tab when empty.'
        : 'Pipeline tab ships without status field; fallback = filing-date-only from P-08.',
    fallback_source: 'P-08',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
