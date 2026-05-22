// Phase 5A.2 — shared Playwright driver used by BSE SME and BSE mainboard
// DRHP/RHP discovery. Both pages are JS-rendered ASP.NET shells that
// require the same browser-launch pattern; only the URL and the candidate
// label differ.
//
// Failure handling mirrors sebi-playwright.ts: a missing `playwright`
// module or missing Chromium binary returns a soft "skipped" result so
// the orchestrator can still write a clean candidates file.

import { extractAllPdfs } from '../../probes/lib/sebi-pdf-extract.ts';
import type { BseCandidate, DocType } from '../lib/types.ts';

const PLAYWRIGHT_TIMEOUT_MS = 60_000;
const WAIT_AFTER_LOAD_MS = 3_000;

export interface BsePlaywrightResult {
  attempted: boolean;
  count: number;
  error: string | null;
  note: string;
  latency_ms: number;
  candidates: BseCandidate[];
}

function classify(linkText: string): DocType {
  const t = (linkText || '').toLowerCase();
  if (t.includes('final offer')) return 'Final Offer Document';
  if (t.includes('draft red herring')) return 'Draft Red Herring Prospectus';
  if (t.includes('red herring')) return 'Red Herring Prospectus';
  if (t.includes('draft abridged') || t.includes('abridged prospectus')) {
    return 'Draft Abridged Prospectus';
  }
  if (t.includes('prospectus')) return 'Prospectus';
  return 'unknown';
}

export async function renderBseWithPlaywright(opts: {
  url: string;
  source: 'bse-sme' | 'bse-mainboard';
  capturedAtUtc: string;
}): Promise<BsePlaywrightResult> {
  const started = Date.now();
  let chromium: typeof import('playwright').chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      attempted: false,
      count: 0,
      error: null,
      note: `playwright module unavailable: ${msg}`,
      latency_ms: Date.now() - started,
      candidates: [],
    };
  }

  let browser: import('playwright').Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      attempted: false,
      count: 0,
      error: null,
      note: `chromium launch failed (binary missing?): ${msg}`,
      latency_ms: Date.now() - started,
      candidates: [],
    };
  }

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'en-IN',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    let renderedHtml = '';
    let renderError: string | null = null;
    try {
      await page.goto(opts.url, { waitUntil: 'networkidle', timeout: PLAYWRIGHT_TIMEOUT_MS });
      await page.waitForTimeout(WAIT_AFTER_LOAD_MS);
      renderedHtml = await page.content();
    } catch (e) {
      renderError = e instanceof Error ? e.message : String(e);
    } finally {
      await context.close();
    }

    if (renderError) {
      return {
        attempted: true,
        count: 0,
        error: renderError,
        note: `playwright navigation failed`,
        latency_ms: Date.now() - started,
        candidates: [],
      };
    }

    const found = extractAllPdfs(renderedHtml, opts.url, `playwright-${opts.source}`);
    const candidates: BseCandidate[] = found.map((d) => ({
      url: d.url,
      link_text: d.link_text,
      doc_type: classify(d.link_text),
      source: opts.source,
      captured_at_utc: opts.capturedAtUtc,
      fetch_mode: 'playwright',
    }));
    const note =
      candidates.length === 0
        ? renderedHtml.length > 5_000
          ? `page rendered (${renderedHtml.length} bytes) but contained no PDF anchors — likely genuinely empty for ${opts.source}`
          : `page rendered with very small body (${renderedHtml.length} bytes) — JS render may not have completed`
        : `playwright harvested ${candidates.length} PDF anchor(s)`;

    return {
      attempted: true,
      count: candidates.length,
      error: null,
      note,
      latency_ms: Date.now() - started,
      candidates,
    };
  } finally {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }
}
