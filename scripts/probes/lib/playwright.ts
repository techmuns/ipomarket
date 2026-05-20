// Playwright/Chromium helpers for browser-driven probes (P-23a, P-23b).
// Bare Playwright: no stealth, no fingerprint spoofing, no captcha solving, no proxy.
// Used only for the Phase 0.1 broker-page benchmark (Zerodha + Upstox).
//
// DOM lib is enabled here because the page.evaluate() callbacks execute inside
// Chromium and need types for document, Element, HTMLAnchorElement, etc.
/// <reference lib="dom" />

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page, Response as PWResponse } from 'playwright';
import { ensureDir } from './reporter.ts';
import type { ProbeContext, ProbeFn, ProbeResult } from './types.ts';

const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const IPO_LABELS = [
  'Open Date',
  'Close Date',
  'Issue Open',
  'Issue Close',
  'Price Band',
  'Lot Size',
  'Issue Size',
  'Issue Type',
  'Registrar',
  'Fresh Issue',
  'Offer for Sale',
  'OFS',
  'Allotment Date',
  'Listing Date',
  'Refund Date',
  'Demat Credit',
  'Face Value',
  'Minimum Investment',
  'Min Investment',
  'BRLM',
  'Book Running Lead Manager',
  'Lead Manager',
  'QIB',
  'NII',
  'Retail',
  'Anchor',
  'EPS',
  'P/E',
  'PE Ratio',
  'RoNW',
  'ROCE',
  'Revenue',
  'PAT',
  'Net Worth',
  'Debt to Equity',
  'Debt-to-Equity',
  'IPO GMP',
  'GMP',
  'Grey Market',
  'Subscription',
  'Subscribed',
];

const CHALLENGE_HINTS = [
  'cf-challenge',
  'Just a moment',
  'Cloudflare',
  'Datadome',
  'cf-mitigated',
  'cf-browser-verification',
  'Attention Required',
];

export interface BrokerPageFields {
  headings: string[];
  tables: Array<{ caption: string; rows: string[][] }>;
  doc_links: Array<{ text: string; href: string }>;
  labels_detected: string[];
}

export interface BrokerPageCapture {
  url: string;
  final_url: string;
  status: number;
  title: string;
  raw_html_length: number;
  rendered_html_length: number;
  rendered_html: string;
  visible_text: string;
  screenshot_png: Buffer;
  challenge_detected: boolean;
  challenge_reasons: string[];
  fields: BrokerPageFields;
  latency_ms: number;
  error?: string;
}

export interface BrokerProbeSpec {
  probe_id: string;
  source: string;
  url: string;
  file_prefix: string;
}

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright');
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

// Use a string-bodied page.evaluate to dodge tsx/esbuild's `__name` emission
// for named function declarations inside the callback (the prior arrow-form
// and function-form attempts both leaked `__name` into the page context,
// breaking the Group H broker-page extractor).
async function extractFields(page: Page): Promise<BrokerPageFields> {
  const labelsLiteral = JSON.stringify(IPO_LABELS);
  const body = `
    (function () {
      var labels = ${labelsLiteral};
      function norm(el) {
        return (el && el.textContent ? el.textContent : '').replace(/\\s+/g, ' ').trim();
      }
      var headings = [];
      var hh = document.querySelectorAll('h1, h2, h3, h4');
      for (var i = 0; i < hh.length; i++) {
        var t = norm(hh[i]);
        if (t.length > 0 && t.length < 300) headings.push(t);
      }
      var tables = [];
      var tt = document.querySelectorAll('table');
      for (var j = 0; j < tt.length; j++) {
        var tbl = tt[j];
        var caption = norm(tbl.querySelector('caption'));
        var rows = [];
        var trs = tbl.querySelectorAll('tr');
        for (var k = 0; k < trs.length; k++) {
          var cells = [];
          var cs = trs[k].querySelectorAll('th, td');
          var any = false;
          for (var c = 0; c < cs.length; c++) {
            var v = norm(cs[c]);
            cells.push(v);
            if (v.length > 0) any = true;
          }
          if (any) rows.push(cells);
        }
        if (rows.length > 0) tables.push({ caption: caption, rows: rows });
      }
      var docLinks = [];
      var aa = document.querySelectorAll('a[href]');
      var docRe = /\\.pdf(\\?|$)/i;
      var textRe = /\\b(DRHP|RHP|Prospectus|Anchor|Allotment|Red Herring|Draft Red Herring)\\b/i;
      var hrefRe = /\\b(DRHP|RHP|prospectus|anchor|allotment)\\b/i;
      for (var n = 0; n < aa.length; n++) {
        var a = aa[n];
        var href = a.href;
        var text = norm(a);
        if (docRe.test(href) || textRe.test(text) || hrefRe.test(href)) {
          docLinks.push({ text: text.slice(0, 200), href: href });
        }
      }
      var bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
      var detected = [];
      for (var p = 0; p < labels.length; p++) {
        var label = labels[p];
        var escaped = label.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
        var re = new RegExp('(^|[^A-Za-z])' + escaped + '([^A-Za-z]|$)', 'i');
        if (re.test(bodyText)) detected.push(label);
      }
      return { headings: headings, tables: tables, doc_links: docLinks, labels_detected: detected };
    })()
  `;
  return page.evaluate(body) as Promise<BrokerPageFields>;
}

function detectChallenge(
  status: number,
  title: string,
  body: string,
  response: PWResponse | null
): { detected: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (status === 403) reasons.push(`http-403`);
  for (const hint of CHALLENGE_HINTS) {
    if (title.includes(hint)) reasons.push(`title:${hint}`);
  }
  for (const hint of CHALLENGE_HINTS) {
    if (body.includes(hint)) {
      reasons.push(`body:${hint}`);
      break;
    }
  }
  if (response) {
    const h = response.headers();
    if (h['cf-mitigated']) reasons.push(`cf-mitigated:${h['cf-mitigated']}`);
    if (h['x-datadome']) reasons.push(`x-datadome:${h['x-datadome']}`);
  }
  return { detected: reasons.length > 0, reasons };
}

async function capturePage(browser: Browser, url: string): Promise<BrokerPageCapture> {
  const started = Date.now();
  const context = await browser.newContext({
    userAgent: DESKTOP_UA,
    locale: 'en-IN',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let status = 0;
  let final_url = url;
  let title = '';
  let raw_html_length = 0;
  let rendered_html = '';
  let visible_text = '';
  let screenshot: Buffer = Buffer.alloc(0);
  let fields: BrokerPageFields = {
    headings: [],
    tables: [],
    doc_links: [],
    labels_detected: [],
  };
  let challenge_detected = false;
  let challenge_reasons: string[] = [];
  let error: string | undefined;
  let response: PWResponse | null = null;

  try {
    response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    status = response?.status() ?? 0;
    final_url = page.url();
    if (response) {
      try {
        const rawBody = await response.text();
        raw_html_length = rawBody.length;
      } catch {
        raw_html_length = 0;
      }
    }
    title = await page.title();
    await page.waitForTimeout(1500);
    rendered_html = await page.content();
    try {
      visible_text = await page.evaluate(() => document.body?.innerText ?? '');
    } catch {
      visible_text = '';
    }
    try {
      screenshot = await page.screenshot({ fullPage: true });
    } catch {
      screenshot = Buffer.alloc(0);
    }

    const ch = detectChallenge(status, title, rendered_html, response);
    challenge_detected = ch.detected;
    challenge_reasons = ch.reasons;

    if (!challenge_detected) {
      try {
        fields = await extractFields(page);
      } catch (e: any) {
        error = `extractFields: ${e?.message ?? e}`;
      }
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
  } finally {
    await context.close();
  }

  return {
    url,
    final_url,
    status,
    title,
    raw_html_length,
    rendered_html_length: rendered_html.length,
    rendered_html,
    visible_text,
    screenshot_png: screenshot,
    challenge_detected,
    challenge_reasons,
    fields,
    latency_ms: Date.now() - started,
    error,
  };
}

function inferRenderMode(raw: number, rendered: number): string {
  if (raw === 0) return 'unknown';
  if (rendered === 0) return 'empty';
  const ratio = rendered / raw;
  if (ratio >= 1.5) return 'JS-rendered';
  if (ratio <= 0.8) return 'server-rendered (truncated by JS)';
  return 'server-rendered';
}

// Generic single-page render helper used by P-08/P-08b (SEBI Kendo-grid SPAs).
// Self-contained: launches its own browser, renders once, closes. No field
// extraction — caller decides what to do with the rendered HTML / text.

export interface RenderedPage {
  url: string;
  final_url: string;
  status: number;
  title: string;
  raw_html_length: number;
  rendered_html: string;
  rendered_html_length: number;
  visible_text: string;
  screenshot_png: Buffer;
  challenge_detected: boolean;
  challenge_reasons: string[];
  latency_ms: number;
  error?: string;
}

export async function renderPage(
  url: string,
  opts: { timeoutMs?: number; waitAfterLoadMs?: number } = {}
): Promise<RenderedPage> {
  const started = Date.now();
  let browser: Browser | null = null;
  let status = 0;
  let final_url = url;
  let title = '';
  let raw_html_length = 0;
  let rendered_html = '';
  let visible_text = '';
  let screenshot: Buffer = Buffer.alloc(0);
  let challenge_detected = false;
  let challenge_reasons: string[] = [];
  let error: string | undefined;

  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      userAgent: DESKTOP_UA,
      locale: 'en-IN',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    let response: PWResponse | null = null;
    try {
      response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: opts.timeoutMs ?? 30_000,
      });
      status = response?.status() ?? 0;
      final_url = page.url();
      if (response) {
        try {
          const rawBody = await response.text();
          raw_html_length = rawBody.length;
        } catch {
          raw_html_length = 0;
        }
      }
      title = await page.title();
      await page.waitForTimeout(opts.waitAfterLoadMs ?? 1500);
      rendered_html = await page.content();
      try {
        visible_text = await page.evaluate(function () {
          return document.body?.innerText ?? '';
        });
      } catch {
        visible_text = '';
      }
      try {
        screenshot = await page.screenshot({ fullPage: true });
      } catch {
        screenshot = Buffer.alloc(0);
      }
      const ch = detectChallenge(status, title, rendered_html, response);
      challenge_detected = ch.detected;
      challenge_reasons = ch.reasons;
    } catch (e: any) {
      error = e?.message ?? String(e);
    } finally {
      await context.close();
    }
  } catch (e: any) {
    error = `launch: ${e?.message ?? e}`;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }

  return {
    url,
    final_url,
    status,
    title,
    raw_html_length,
    rendered_html,
    rendered_html_length: rendered_html.length,
    visible_text,
    screenshot_png: screenshot,
    challenge_detected,
    challenge_reasons,
    latency_ms: Date.now() - started,
    error,
  };
}

export function makeBrokerPageProbe(spec: BrokerProbeSpec): ProbeFn {
  return async (ctx: ProbeContext): Promise<ProbeResult> => {
    const outDir = join(ctx.outDir, 'broker-pages');
    ensureDir(outDir);

    const started = Date.now();
    let browser: Browser | null = null;
    let status: ProbeResult['status'] = 'RED';
    let response_type: ProbeResult['response_type'] = 'ERROR';
    let status_code: number | null = null;
    let notes = '';
    let fields_found: string[] = [];
    let fields_missing: string[] = [];
    let sample_record = '';
    let latency = 0;

    try {
      browser = await launchBrowser();
      const cap = await capturePage(browser, spec.url);
      status_code = cap.status === 0 ? null : cap.status;
      latency = cap.latency_ms;

      writeFileSync(join(outDir, `${spec.file_prefix}-rendered.html`), cap.rendered_html);
      writeFileSync(join(outDir, `${spec.file_prefix}-text.txt`), cap.visible_text);
      if (cap.screenshot_png.length > 0) {
        writeFileSync(join(outDir, `${spec.file_prefix}-screenshot.png`), cap.screenshot_png);
      }
      writeFileSync(
        join(outDir, `${spec.file_prefix}-fields.json`),
        JSON.stringify(
          {
            captured_at_utc: ctx.nowIso,
            url: cap.url,
            final_url: cap.final_url,
            status: cap.status,
            title: cap.title,
            render_mode: inferRenderMode(cap.raw_html_length, cap.rendered_html_length),
            raw_html_length: cap.raw_html_length,
            rendered_html_length: cap.rendered_html_length,
            challenge_detected: cap.challenge_detected,
            challenge_reasons: cap.challenge_reasons,
            headings: cap.fields.headings,
            tables: cap.fields.tables,
            doc_links: cap.fields.doc_links,
            labels_detected: cap.fields.labels_detected,
          },
          null,
          2
        ) + '\n'
      );

      fields_found = cap.fields.labels_detected;
      const renderMode = inferRenderMode(cap.raw_html_length, cap.rendered_html_length);
      const noteParts = [
        `final_url=${cap.final_url}`,
        `title=${cap.title.slice(0, 80)}`,
        `render_mode=${renderMode}`,
        `raw_len=${cap.raw_html_length}`,
        `rendered_len=${cap.rendered_html_length}`,
        `challenge=${cap.challenge_detected}`,
        cap.challenge_reasons.length > 0 ? `reasons=${cap.challenge_reasons.join(',')}` : '',
        `headings=${cap.fields.headings.length}`,
        `tables=${cap.fields.tables.length}`,
        `doc_links=${cap.fields.doc_links.length}`,
        `labels=${cap.fields.labels_detected.length}`,
        cap.error ? `error=${cap.error}` : '',
      ];
      notes = noteParts.filter((s) => s && s.length > 0).join(' | ');

      sample_record = JSON.stringify(
        {
          title: cap.title,
          headings_top10: cap.fields.headings.slice(0, 10),
          tables_count: cap.fields.tables.length,
          labels_detected: cap.fields.labels_detected,
          doc_links_count: cap.fields.doc_links.length,
          first_doc_links: cap.fields.doc_links.slice(0, 5),
        },
        null,
        2
      );

      if (cap.challenge_detected || cap.status === 403) {
        response_type = 'BLOCKED';
        status = 'RED';
        fields_missing = ['(blocked by anti-bot)'];
      } else if (cap.error || cap.status === 0) {
        response_type = 'ERROR';
        status = 'RED';
        fields_missing = ['(navigation error)'];
      } else if (cap.status >= 200 && cap.status < 300) {
        response_type = 'HTML';
        const hasContent =
          cap.fields.labels_detected.length >= 5 ||
          cap.fields.doc_links.length >= 1 ||
          cap.fields.headings.length >= 3;
        if (hasContent) {
          status = 'GREEN';
        } else {
          status = 'YELLOW';
          fields_missing = ['(loaded but skeletal — no IPO labels or doc links)'];
        }
      } else {
        response_type = 'BLOCKED';
        status = 'RED';
        fields_missing = [`(HTTP ${cap.status})`];
      }
    } catch (e: any) {
      notes = `probe threw: ${e?.message ?? e}`;
      response_type = 'ERROR';
      status = 'RED';
      sample_record = String(e?.stack ?? e);
      latency = Date.now() - started;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore
        }
      }
    }

    const recommended_action =
      status === 'GREEN'
        ? 'Use as information-architecture benchmark only. Do NOT scrape for production data.'
        : status === 'YELLOW'
        ? 'Page reachable but skeletal — investigate slug freshness or country gate.'
        : 'Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference.';

    return {
      probe_id: spec.probe_id,
      source: spec.source,
      url_or_endpoint: spec.url,
      fetch_method: 'Playwright/Chromium (headless, no stealth)',
      headers_or_cookies_required: ['User-Agent (desktop Chrome)', 'Locale en-IN'],
      status_code,
      response_type,
      fields_found,
      fields_missing,
      sample_record,
      parsing_difficulty: 'Hard',
      anti_bot_risk: 'High',
      legal_tos_risk: 'Medium',
      freshness_or_update_frequency: 'Per IPO lifecycle (open/close/listing)',
      status,
      recommended_action,
      fallback_source: 'Screenshots / PDF exports of the broker page provided by user',
      ran_at_utc: ctx.nowIso,
      latency_ms: latency || Date.now() - started,
      notes,
    };
  };
}
