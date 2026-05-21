// Phase 1 Visual QA capture script.
// Run AFTER `vite preview` is up on http://127.0.0.1:4173.
// Captures full-page screenshots for every route + writes phase-1-visual-qa.md.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';

const ROUTES = [
  { path: '/',                                  name: '01-market-pulse' },
  { path: '/open',                              name: '02-open-upcoming' },
  { path: '/listing-soon',                      name: '03-listing-soon' },
  { path: '/recently-listed',                   name: '04-recently-listed' },
  { path: '/screener',                          name: '05-screener' },
  { path: '/subscription',                      name: '06-subscription-heatmap' },
  { path: '/pipeline',                          name: '07-pipeline' },
  { path: '/gmp',                               name: '08-gmp-monitor' },
  { path: '/source-health',                     name: '09-source-health' },
  { path: '/ipo/nfp-sampoorna-foods',           name: '10-ipo-nfp-sampoorna' },
  { path: '/ipo/vegorama-punjabi-angithi',      name: '11-ipo-vegorama' },
];

mkdirSync('phase-1-screens', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const results = [];

for (const r of ROUTES) {
  const consoleErrors = [];
  const pageErrors = [];
  // Reset listeners per route so we only collect that route's errors.
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  let success = true;
  let nav_error = null;
  let bytes = 0;
  let dimensions = null;
  try {
    await page.goto(BASE_URL + r.path, { waitUntil: 'networkidle', timeout: 30_000 });
    // Charts (ECharts, Recharts) often render on the next tick after networkidle.
    await page.waitForTimeout(1800);
    const buf = await page.screenshot({ path: `phase-1-screens/${r.name}.png`, fullPage: true });
    bytes = buf.length;
    dimensions = await page.evaluate(() => ({
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
    }));
  } catch (e) {
    success = false;
    nav_error = e?.message ?? String(e);
  }

  const r_result = {
    path: r.path,
    file: `phase-1-screens/${r.name}.png`,
    success,
    nav_error,
    bytes,
    dimensions,
    console_errors: consoleErrors,
    page_errors: pageErrors,
  };
  results.push(r_result);
  console.log(`${success ? 'OK  ' : 'FAIL'} ${r.path}  (${bytes} bytes, ${consoleErrors.length} console errs, ${pageErrors.length} page errs)`);
}

await browser.close();

// Auto-generated summary markdown.
const ok = results.filter((r) => r.success).length;
const totalConsoleErrs = results.reduce((s, r) => s + r.console_errors.length, 0);
const totalPageErrs = results.reduce((s, r) => s + r.page_errors.length, 0);

let md = `# Phase 1 Visual QA — Auto-generated\n\n`;
md += `> Generated: ${new Date().toISOString()}\n`;
md += `> Base URL: ${BASE_URL}\n`;
md += `> Routes captured: **${ok} / ${results.length}**\n`;
md += `> Console errors: **${totalConsoleErrs}**\n`;
md += `> Page errors: **${totalPageErrs}**\n\n`;

md += `## Per-route capture\n\n`;
md += `| # | Route | Status | File | Doc height (px) | Bytes | Console errs | Page errs |\n`;
md += `|---|---|---|---|---|---|---|---|\n`;
for (const r of results) {
  const n = r.file.split('/').pop().split('-')[0];
  md += `| ${n} | \`${r.path}\` | ${r.success ? '✅' : '❌'} | \`${r.file}\` | ${r.dimensions?.docHeight ?? '—'} | ${r.bytes ?? 0} | ${r.console_errors.length} | ${r.page_errors.length} |\n`;
}

const withErrs = results.filter((r) => r.console_errors.length > 0 || r.page_errors.length > 0 || !r.success);
if (withErrs.length === 0) {
  md += `\n## Errors\n\nNo console / page errors detected on any route.\n`;
} else {
  md += `\n## Per-route errors\n\n`;
  for (const r of withErrs) {
    md += `### \`${r.path}\`\n\n`;
    if (r.nav_error) md += `- **Navigation failed**: ${r.nav_error}\n`;
    for (const err of r.page_errors) md += `- **pageerror**: \`${err}\`\n`;
    for (const err of r.console_errors) md += `- **console.error**: \`${err}\`\n`;
    md += `\n`;
  }
}

writeFileSync('phase-1-visual-qa.md', md);
console.log(`\nSummary written to phase-1-visual-qa.md`);
process.exit(withErrs.filter((r) => !r.success).length > 0 ? 1 : 0);
