// Phase 1 Visual QA capture script — hardened.
//
// Guarantees:
//   - phase-1-screens/ directory always exists when this script returns.
//   - phase-1-visual-qa.md is written before any operation that could throw,
//     and re-written after every route + at exit.
//   - Preview-server reachability is checked here (independent of the workflow's
//     curl check) so the failure mode lands in the markdown.
//   - Per-route: networkidle is tried first, with a domcontentloaded fallback
//     on timeout. Each route always produces a summary row regardless of outcome.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const REACHABILITY_TIMEOUT_S = 60;
const NAV_TIMEOUT_NETWORKIDLE_MS = 25_000;
const NAV_TIMEOUT_DOMCONTENTLOADED_MS = 15_000;
const CHART_SETTLE_MS = 1800;

const ROUTES = [
  { path: '/',                              name: '01-market-pulse' },
  { path: '/open',                          name: '02-open-upcoming' },
  { path: '/listing-soon',                  name: '03-listing-soon' },
  { path: '/recently-listed',               name: '04-recently-listed' },
  { path: '/screener',                      name: '05-screener' },
  { path: '/subscription',                  name: '06-subscription-heatmap' },
  { path: '/pipeline',                      name: '07-pipeline' },
  { path: '/gmp',                           name: '08-gmp-monitor' },
  { path: '/source-health',                 name: '09-source-health' },
  { path: '/ipo/nfp-sampoorna-foods',       name: '10-ipo-nfp-sampoorna' },
  { path: '/ipo/vegorama-punjabi-angithi',  name: '11-ipo-vegorama' },
];

// Always create the output dir first.
mkdirSync('phase-1-screens', { recursive: true });

const results = ROUTES.map((r) => ({
  path: r.path,
  name: r.name,
  status: 'pending',         // pending | running | ok | failed
  wait_used: null,           // 'networkidle' | 'domcontentloaded (fallback)' | null
  http_status: null,
  doc_height: null,
  screenshot_bytes: 0,
  console_errors: [],
  page_errors: [],
  error: null,
  duration_ms: null,
}));

const diagnostics = {
  base_url: BASE_URL,
  node_version: process.version,
  started_at: new Date().toISOString(),
  reachability_attempts: 0,
  reachability_ok: null,
  reachability_last_error: null,
  reachability_last_status: null,
  chromium_launch_ok: null,
  chromium_launch_error: null,
  script_error: null,
};

function writeSummary() {
  const ok = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const pending = results.filter((r) => r.status === 'pending' || r.status === 'running').length;

  let md = `# Phase 1 Visual QA — Auto-generated\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Base URL: \`${diagnostics.base_url}\`\n`;
  md += `> Node: ${diagnostics.node_version}\n`;
  md += `> Started: ${diagnostics.started_at}\n`;
  md += `> Captured: **${ok} / ${results.length}** routes succeeded · ${failed} failed · ${pending} pending\n`;
  md += `> Preview reachable: **${diagnostics.reachability_ok === null ? 'unknown' : diagnostics.reachability_ok ? 'YES' : 'NO'}**`;
  if (diagnostics.reachability_attempts > 0) {
    md += ` (${diagnostics.reachability_attempts} attempt(s))`;
  }
  md += `\n`;
  if (diagnostics.reachability_last_status != null) {
    md += `> Last HTTP status from preview: ${diagnostics.reachability_last_status}\n`;
  }
  if (!diagnostics.reachability_ok && diagnostics.reachability_last_error) {
    md += `> Last reachability error: \`${diagnostics.reachability_last_error}\`\n`;
  }
  if (diagnostics.chromium_launch_ok != null) {
    md += `> Chromium launch: ${diagnostics.chromium_launch_ok ? 'OK' : `FAILED — ${diagnostics.chromium_launch_error}`}\n`;
  }
  if (diagnostics.script_error) {
    md += `> Script error: \`${diagnostics.script_error}\`\n`;
  }
  md += `\n`;

  md += `## Per-route status\n\n`;
  md += `| # | Route | Status | Wait | HTTP | Doc h (px) | PNG bytes | Console errs | Page errs | Duration | Notes |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    const n = r.name.split('-')[0];
    const statusEmoji = r.status === 'ok' ? '✅' : r.status === 'failed' ? '❌' : '⏳';
    md += `| ${n} | \`${r.path}\` | ${statusEmoji} ${r.status} | ${r.wait_used ?? '—'} | ${r.http_status ?? '—'} | ${r.doc_height ?? '—'} | ${r.screenshot_bytes} | ${r.console_errors.length} | ${r.page_errors.length} | ${r.duration_ms != null ? r.duration_ms + 'ms' : '—'} | ${(r.error ?? '').replace(/\|/g, '\\|').slice(0, 80)} |\n`;
  }

  const withErrs = results.filter((r) => r.console_errors.length || r.page_errors.length || r.error);
  if (withErrs.length === 0 && results.every((r) => r.status === 'ok')) {
    md += `\n## Errors\n\nNo console / page errors detected on any route, and every route captured successfully.\n`;
  } else if (withErrs.length === 0) {
    md += `\n## Errors\n\nNo console / page errors detected, but some routes did not complete.\n`;
  } else {
    md += `\n## Per-route errors\n\n`;
    for (const r of withErrs) {
      md += `### \`${r.path}\` (${r.name})\n\n`;
      if (r.error) md += `- **navigation/screenshot error**: \`${r.error}\`\n`;
      for (const err of r.page_errors) md += `- **pageerror**: \`${err}\`\n`;
      for (const err of r.console_errors) md += `- **console.error**: \`${err}\`\n`;
      md += `\n`;
    }
  }

  md += `\n## Diagnostics\n\n`;
  md += '```json\n' + JSON.stringify(diagnostics, null, 2) + '\n```\n';

  writeFileSync('phase-1-visual-qa.md', md);
}

// Write an initial summary so even an immediate crash leaves something on disk.
writeSummary();

// === Reachability check ===
async function checkReachable() {
  for (let i = 0; i < REACHABILITY_TIMEOUT_S; i++) {
    diagnostics.reachability_attempts = i + 1;
    try {
      const res = await fetch(BASE_URL + '/', { signal: AbortSignal.timeout(3000) });
      diagnostics.reachability_last_status = res.status;
      if (res.ok) {
        diagnostics.reachability_ok = true;
        return true;
      }
      diagnostics.reachability_last_error = `HTTP ${res.status}`;
    } catch (e) {
      diagnostics.reachability_last_error = e?.message ?? String(e);
    }
    if ((i + 1) % 5 === 0) writeSummary();
    await new Promise((r) => setTimeout(r, 1000));
  }
  diagnostics.reachability_ok = false;
  return false;
}

console.log(`[visual-qa] checking preview at ${BASE_URL} (up to ${REACHABILITY_TIMEOUT_S}s)`);
const reachable = await checkReachable();
writeSummary();

if (!reachable) {
  console.error(`[visual-qa] preview NOT reachable after ${REACHABILITY_TIMEOUT_S}s`);
  diagnostics.script_error = `Preview server at ${BASE_URL} not reachable.`;
  writeSummary();
  process.exit(1);
}
console.log(`[visual-qa] preview reachable (status ${diagnostics.reachability_last_status})`);

// === Launch Chromium ===
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  diagnostics.chromium_launch_ok = true;
} catch (e) {
  diagnostics.chromium_launch_ok = false;
  diagnostics.chromium_launch_error = e?.message ?? String(e);
  diagnostics.script_error = `Chromium launch failed.`;
  writeSummary();
  console.error('[visual-qa] chromium launch failed:', e?.message ?? e);
  process.exit(1);
}
writeSummary();

let ctx, page;
try {
  ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  page = await ctx.newPage();
} catch (e) {
  diagnostics.script_error = `Browser context/page failed: ${e?.message ?? e}`;
  writeSummary();
  await browser.close().catch(() => {});
  process.exit(1);
}

// === Per-route capture loop ===
for (const r of results) {
  r.status = 'running';
  const consoleErrors = [];
  const pageErrors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  const start = Date.now();
  let firstWaitError = null;

  try {
    let response = null;
    try {
      response = await page.goto(BASE_URL + r.path, {
        waitUntil: 'networkidle',
        timeout: NAV_TIMEOUT_NETWORKIDLE_MS,
      });
      r.wait_used = 'networkidle';
    } catch (e1) {
      firstWaitError = e1?.message ?? String(e1);
      console.log(`[visual-qa] ${r.path} networkidle timed out, falling back to domcontentloaded`);
      response = await page.goto(BASE_URL + r.path, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_DOMCONTENTLOADED_MS,
      });
      r.wait_used = `domcontentloaded (fallback)`;
    }
    r.http_status = response?.status() ?? null;

    // Let charts render.
    await page.waitForTimeout(CHART_SETTLE_MS);

    try {
      const dims = await page.evaluate(() => ({
        docHeight: document.documentElement.scrollHeight,
        docWidth: document.documentElement.scrollWidth,
      }));
      r.doc_height = dims.docHeight;
    } catch (e) {
      // Ignore — we still want the screenshot.
    }

    const buf = await page.screenshot({
      path: `phase-1-screens/${r.name}.png`,
      fullPage: true,
    });
    r.screenshot_bytes = buf.length;
    r.status = 'ok';
    console.log(`[visual-qa] OK   ${r.path}  (${buf.length} bytes, ${consoleErrors.length} cerr, ${pageErrors.length} perr)`);
  } catch (e) {
    const msg = e?.message ?? String(e);
    r.error = firstWaitError ? `nav fallback: ${msg} (initial networkidle: ${firstWaitError.slice(0, 80)})` : msg;
    r.status = 'failed';
    console.log(`[visual-qa] FAIL ${r.path}  ${r.error}`);
  }

  r.console_errors = consoleErrors;
  r.page_errors = pageErrors;
  r.duration_ms = Date.now() - start;

  // Persist after every route so a mid-loop crash still leaves partial data.
  writeSummary();
}

await browser.close().catch(() => {});
writeSummary();

const failed = results.filter((r) => r.status === 'failed').length;
console.log(`\n[visual-qa] done. ${results.length - failed} ok, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
