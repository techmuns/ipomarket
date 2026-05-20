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

async function extractFields(page: Page): Promise<BrokerPageFields> {
  return page.evaluate((labels: string[]) => {
    const norm = (el: Element | null) =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
      .map((h) => norm(h))
      .filter((s) => s.length > 0 && s.length < 300);

    const tables: Array<{ caption: string; rows: string[][] }> = [];
    document.querySelectorAll('table').forEach((tbl) => {
      const caption = norm(tbl.querySelector('caption'));
      const rows: string[][] = [];
      tbl.querySelectorAll('tr').forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((c) => norm(c));
        if (cells.some((c) => c.length > 0)) rows.push(cells);
      });
      if (rows.length > 0) tables.push({ caption, rows });
    });

    const docLinks: Array<{ text: string; href: string }> = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const text = norm(a);
      const docHit =
        /\.pdf(\?|$)/i.test(href) ||
        /\b(DRHP|RHP|Prospectus|Anchor|Allotment|Red Herring|Draft Red Herring)\b/i.test(
          text
        ) ||
        /\b(DRHP|RHP|prospectus|anchor|allotment)\b/i.test(href);
      if (docHit) {
        docLinks.push({ text: text.slice(0, 200), href });
      }
    });

    const bodyText = document.body?.innerText ?? '';
    const detected: string[] = [];
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i');
      if (re.test(bodyText)) detected.push(label);
    }

    return {
      headings,
      tables,
      doc_links: docLinks,
      labels_detected: detected,
    };
  }, IPO_LABELS);
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
