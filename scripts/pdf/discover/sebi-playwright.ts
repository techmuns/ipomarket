// Phase 5A.2 — SEBI smid=11/12 Playwright fallback.
//
// Phase 5A.1 found smid=11 (Red Herring Documents filed with ROC) and
// smid=12 (Final Offer Documents filed with ROC) returned HTTP 200 + empty
// body via static GET. This module re-attempts each smid with a real
// browser so we can distinguish:
//   (a) "page is genuinely empty right now" — no filings to render
//   (b) "page is Kendo-Grid JS-rendered" — same shape as smid=10 alt URL
//
// Either outcome is recorded truthfully in sebi-candidates.json's
// per-smid playwright{} block. The orchestrator merges any PDFs found
// here into the candidate pool with origin='sebi-discovery' +
// fetch_mode='playwright'.
//
// Playwright is loaded lazily so the module can be imported in
// environments where Chromium isn't installed (local dev runs without
// `npx playwright install chromium`).

import { extractAllPdfs } from '../../probes/lib/sebi-pdf-extract.ts';
import type { SebiCandidate } from '../lib/types.ts';

const PLAYWRIGHT_TIMEOUT_MS = 60_000;
const WAIT_AFTER_LOAD_MS = 3_000;

export interface SebiPlaywrightResult {
  attempted: true;
  count: number;
  error: string | null;
  note: string;
  candidates: SebiCandidate[];
}

export interface SebiPlaywrightSkipped {
  attempted: false;
  count: 0;
  error: null;
  note: string;
  candidates: never[];
}

function classify(linkText: string): SebiCandidate['doc_type'] {
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

export async function renderSebiSmidWithPlaywright(
  smid: 11 | 12,
  url: string,
  capturedAtUtc: string
): Promise<SebiPlaywrightResult | SebiPlaywrightSkipped> {
  // Lazy import — `playwright` is in devDependencies but Chromium binaries
  // require an explicit install step. If either is missing we return a
  // skipped marker instead of throwing.
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
      await page.goto(url, { waitUntil: 'networkidle', timeout: PLAYWRIGHT_TIMEOUT_MS });
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
        candidates: [],
      };
    }

    const found = extractAllPdfs(renderedHtml, url, `playwright-smid-${smid}`);
    const candidates: SebiCandidate[] = found.map((d) => ({
      url: d.url,
      link_text: d.link_text,
      doc_type: classify(d.link_text),
      source_smid: smid,
      captured_at_utc: capturedAtUtc,
      fetch_mode: 'playwright',
    }));
    // Treat "rendered fine but no PDFs found" as the genuine-empty signal.
    // The body-length heuristic lets us label the result more usefully than
    // just "count: 0".
    const note =
      candidates.length === 0
        ? renderedHtml.length > 5_000
          ? `page rendered (${renderedHtml.length} bytes) but contained no PDF anchors — likely genuinely empty for smid=${smid}`
          : `page rendered with very small body (${renderedHtml.length} bytes) — JS render may not have completed`
        : `playwright harvested ${candidates.length} PDF anchor(s)`;
    return {
      attempted: true,
      count: candidates.length,
      error: null,
      note,
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
