// P-08 — SEBI Public Issues filings.
//
// SEBI's listing page is a Kendo-Grid SPA shell: a static HTTP GET returns
// the page chrome only (zero <tr>, zero .pdf). To discover DRHP/RHP links
// we have to render JS. Attempt order:
//   1. Static GET primary URL  (cheap baseline; usually empty)
//   2. Static GET alt URL      (sebiweb HomeAction.do variant)
//   3. Playwright/Chromium render of primary URL
//
// Output for downstream P-09: phase-0/samples/sebi-publicissues-pdfs.json

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, truncate } from './lib/http.ts';
import { ensureDir, writeSample } from './lib/reporter.ts';
import { renderPage } from './lib/playwright.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const PRIMARY_URL = 'https://www.sebi.gov.in/filings/public-issues.html';
const ALT_URL =
  'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10';

interface DiscoveredPdf {
  url: string;
  link_text: string;
  row_context: string;
}

interface AttemptResult {
  attempt: string;
  status: number;
  bytes: number;
  tr_count: number;
  pdf_links: DiscoveredPdf[];
  notes: string;
  body_snippet: string;
}

function extractPdfsFromHtml(html: string, baseUrl: string): DiscoveredPdf[] {
  const out: DiscoveredPdf[] = [];
  const anchorRe = /<a\s+[^>]*href\s*=\s*"([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    let href = m[1]!;
    const inner = m[2]!.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (href.startsWith('//')) href = 'https:' + href;
    else if (href.startsWith('/')) {
      const u = new URL(baseUrl);
      href = `${u.protocol}//${u.host}${href}`;
    } else if (!/^https?:\/\//i.test(href)) {
      const u = new URL(baseUrl);
      href = `${u.protocol}//${u.host}/${href}`;
    }
    out.push({
      url: href,
      link_text: inner.slice(0, 200),
      row_context: '',
    });
  }
  return out;
}

function countTableRows(html: string): number {
  return (html.match(/<tr[\s>]/gi) ?? []).length;
}

async function staticAttempt(url: string, label: string): Promise<AttemptResult> {
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
      tr_count: 0,
      pdf_links: [],
      notes: `static non-200 (status=${res.status}, err=${res.error ?? ''})`,
      body_snippet: truncate(res.body, 4000),
    };
  }
  const tr = countTableRows(res.body);
  const pdfs = extractPdfsFromHtml(res.body, url);
  return {
    attempt: label,
    status: res.status,
    bytes: res.bytes,
    tr_count: tr,
    pdf_links: pdfs,
    notes: `static ok: tr=${tr}, pdfs=${pdfs.length}, bytes=${res.bytes}`,
    body_snippet: truncate(res.body, 6000),
  };
}

async function playwrightAttempt(
  url: string,
  label: string,
  samplesDir: string
): Promise<AttemptResult> {
  const r = await renderPage(url, { timeoutMs: 35_000, waitAfterLoadMs: 3000 });
  if (r.error && r.status === 0) {
    return {
      attempt: label,
      status: 0,
      bytes: 0,
      tr_count: 0,
      pdf_links: [],
      notes: `playwright failed to launch/load: ${r.error}`,
      body_snippet: '',
    };
  }
  // Persist full rendered HTML + screenshot as side artifacts (don't pollute sample_record).
  if (r.rendered_html.length > 0) {
    writeFileSync(join(samplesDir, 'sebi-publicissues-rendered.html'), r.rendered_html);
  }
  if (r.screenshot_png.length > 0) {
    writeFileSync(join(samplesDir, 'sebi-publicissues-screenshot.png'), r.screenshot_png);
  }
  const tr = countTableRows(r.rendered_html);
  const pdfs = extractPdfsFromHtml(r.rendered_html, url);
  return {
    attempt: label,
    status: r.status,
    bytes: r.rendered_html_length,
    tr_count: tr,
    pdf_links: pdfs,
    notes: `playwright ok: status=${r.status}, tr=${tr}, pdfs=${pdfs.length}, rendered_len=${r.rendered_html_length}${
      r.challenge_detected ? `, challenge=${r.challenge_reasons.join(',')}` : ''
    }${r.error ? `, error=${r.error}` : ''}`,
    body_snippet: truncate(r.rendered_html, 6000),
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const samplesDir = ctx.samplesDir;
  ensureDir(samplesDir);

  const attempts: AttemptResult[] = [];
  attempts.push(await staticAttempt(PRIMARY_URL, 'static-primary'));

  // Escalate only if static-primary is empty.
  if (attempts[0]!.pdf_links.length === 0 && attempts[0]!.tr_count < 10) {
    attempts.push(await staticAttempt(ALT_URL, 'static-alt'));
  }
  if (
    attempts.every(function (a) {
      return a.pdf_links.length === 0 && a.tr_count < 10;
    })
  ) {
    attempts.push(await playwrightAttempt(PRIMARY_URL, 'playwright-primary', samplesDir));
  }

  // Pick the winning attempt: most PDFs, then most rows.
  const winner = attempts
    .slice()
    .sort(function (a, b) {
      if (b.pdf_links.length !== a.pdf_links.length) return b.pdf_links.length - a.pdf_links.length;
      return b.tr_count - a.tr_count;
    })[0]!;

  const pdfs = winner.pdf_links;
  const rows = winner.tr_count;

  // Persist discovery output for P-09.
  writeFileSync(
    join(samplesDir, 'sebi-publicissues-pdfs.json'),
    JSON.stringify(
      {
        captured_at_utc: ctx.nowIso,
        winning_attempt: winner.attempt,
        attempts: attempts.map(function (a) {
          return {
            attempt: a.attempt,
            status: a.status,
            bytes: a.bytes,
            tr_count: a.tr_count,
            pdf_count: a.pdf_links.length,
            notes: a.notes,
          };
        }),
        pdfs: pdfs.slice(0, 200),
      },
      null,
      2
    ) + '\n'
  );

  // Sample HTML for parity with previous probe behavior (git-diff signal on
  // SEBI page drift). Prefer the winning attempt's body; fall back to static-primary.
  const sampleSource = winner.body_snippet || attempts[0]?.body_snippet || '';
  if (sampleSource) {
    writeSample(samplesDir, 'sample-sebi-publicissues.html', sampleSource);
  }

  let status: ProbeResult['status'];
  let response_type: ProbeResult['response_type'];
  if (winner.status === 0) {
    status = 'RED';
    response_type = 'ERROR';
  } else if (pdfs.length >= 5 || rows >= 10) {
    status = 'GREEN';
    response_type = 'HTML';
  } else if (pdfs.length >= 1 || rows >= 1) {
    status = 'YELLOW';
    response_type = 'HTML';
  } else {
    status = 'RED';
    response_type = 'EMPTY';
  }

  const notes = attempts.map(function (a) { return a.notes; }).join(' ; ');

  return {
    probe_id: 'P-08',
    source: 'SEBI — Public Issues Filings',
    url_or_endpoint: PRIMARY_URL,
    fetch_method: 'GET → alt GET → Playwright/Chromium',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'Chromium for JS render'],
    status_code: winner.status,
    response_type,
    fields_found: pdfs.length > 0 ? ['pdf urls', 'rows'] : rows > 0 ? ['rows'] : [],
    fields_missing: pdfs.length === 0 ? ['pdf urls'] : [],
    sample_record: JSON.stringify(
      {
        winning_attempt: winner.attempt,
        rows: rows,
        pdf_count: pdfs.length,
        first_5_pdfs: pdfs.slice(0, 5),
      },
      null,
      2
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Updated whenever a DRHP/RHP/observation is filed',
    status,
    recommended_action:
      status === 'GREEN'
        ? 'Use as primary for Pipeline tab + DRHP master.'
        : status === 'YELLOW'
        ? 'Partial discovery — wire P-10 (exchange-side DRHP) as fallback.'
        : 'All attempts empty; use P-10 (exchange-side DRHP) as primary.',
    fallback_source: 'P-10',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
