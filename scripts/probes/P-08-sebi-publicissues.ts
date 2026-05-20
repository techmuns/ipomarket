// P-08 — SEBI Public Issues filings (DRHP discovery).
//
// SEBI's listing page is Kendo-Grid-rendered. Even when the alt URL surfaces
// rows in static HTML, the rows often link to detail pages rather than direct
// .pdf URLs. This probe now:
//   1. Static GET primary URL → broad PDF scan.
//   2. Static GET alt URL → broad PDF scan + detail-page URL extraction.
//   3. Static GET first 5 detail pages → broad PDF scan in each.
//   4. Playwright render of the listing page (DOM-level PDF scan).
//   5. Playwright render of the first detail page if still no PDFs.
//
// Output for P-09: phase-0/samples/sebi-publicissues-pdfs.json

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
  source: string;
}

interface Phase {
  phase: string;
  url: string;
  status: number;
  bytes: number;
  tr_count: number;
  pdfs_found: number;
  notes: string;
}

function absolutize(href: string, baseUrl: string): string {
  let h = href.trim();
  if (h.startsWith('//')) return 'https:' + h;
  if (h.startsWith('/')) {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}${h}`;
  }
  if (!/^https?:\/\//i.test(h)) {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}/${h.replace(/^\.?\//, '')}`;
  }
  return h;
}

// Broad PDF scan: finds .pdf URLs anywhere in the body (href, onclick,
// data-* attributes, JSON blobs, JS strings).
function extractAllPdfs(html: string, baseUrl: string, sourceLabel: string): DiscoveredPdf[] {
  const out: DiscoveredPdf[] = [];
  const seen = new Set<string>();

  // 1. Anchor PDFs: <a ... href="...pdf">text</a>
  const anchorRe = /<a\s+[^>]*href\s*=\s*["']([^"']*\.pdf(?:[?#][^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const url = absolutize(m[1]!, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    const text = m[2]!
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    out.push({ url, link_text: text, source: sourceLabel });
  }

  // 2. Any URL ending in .pdf (catches onclick, data attrs, JS).
  const anyPdfRe = /["'\s(=]((?:https?:\/\/|\/)[^"'\s)]+\.pdf(?:[?#][^"'\s)]*)?)["'\s)]/gi;
  while ((m = anyPdfRe.exec(html))) {
    const url = absolutize(m[1]!, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, link_text: '', source: sourceLabel });
  }

  // 3. SEBI attachedfile= pattern (PDF served via internal route).
  const attachedRe = /attachedfile=([^"'&\s]+\.pdf(?:[?#][^"'\s]*)?)/gi;
  while ((m = attachedRe.exec(html))) {
    const url = absolutize(`/sebi_data/attachdocs/${m[1]!}`, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, link_text: '(attachedfile route)', source: sourceLabel });
  }

  return out;
}

function extractDetailLinks(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']*(?:HomeAction\.do|attachedfile=|\/filings\/)[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = absolutize(m[1]!, baseUrl);
    if (seen.has(url)) continue;
    if (url.endsWith('.pdf')) continue;
    if (url === baseUrl) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function countTableRows(html: string): number {
  return (html.match(/<tr[\s>]/gi) ?? []).length;
}

async function staticPhase(url: string, label: string): Promise<{ phase: Phase; html: string }> {
  const res = await httpGet(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.sebi.gov.in/',
    },
  });
  if (!res.ok) {
    return {
      phase: {
        phase: label,
        url,
        status: res.status,
        bytes: res.bytes,
        tr_count: 0,
        pdfs_found: 0,
        notes: `static non-200 (status=${res.status}, err=${res.error ?? ''})`,
      },
      html: '',
    };
  }
  const tr = countTableRows(res.body);
  return {
    phase: {
      phase: label,
      url,
      status: res.status,
      bytes: res.bytes,
      tr_count: tr,
      pdfs_found: 0,
      notes: `static ok: tr=${tr}, bytes=${res.bytes}`,
    },
    html: res.body,
  };
}

async function playwrightPhase(
  url: string,
  label: string
): Promise<{ phase: Phase; html: string; png: Buffer }> {
  const r = await renderPage(url, { timeoutMs: 35_000, waitAfterLoadMs: 3000 });
  if (r.error && r.status === 0) {
    return {
      phase: {
        phase: label,
        url,
        status: 0,
        bytes: 0,
        tr_count: 0,
        pdfs_found: 0,
        notes: `playwright failed: ${r.error}`,
      },
      html: '',
      png: Buffer.alloc(0),
    };
  }
  const tr = countTableRows(r.rendered_html);
  return {
    phase: {
      phase: label,
      url,
      status: r.status,
      bytes: r.rendered_html_length,
      tr_count: tr,
      pdfs_found: 0,
      notes: `playwright: status=${r.status}, tr=${tr}, rendered_len=${r.rendered_html_length}${
        r.challenge_detected ? `, challenge=${r.challenge_reasons.join(',')}` : ''
      }${r.error ? `, error=${r.error}` : ''}`,
    },
    html: r.rendered_html,
    png: r.screenshot_png,
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const samplesDir = ctx.samplesDir;
  ensureDir(samplesDir);

  const phases: Phase[] = [];
  const allPdfs: DiscoveredPdf[] = [];
  const detailUrls = new Set<string>();
  let largestBodyHtml = '';
  let largestBodyLabel = '';

  // Phase 1: static primary.
  const s1 = await staticPhase(PRIMARY_URL, 'static-primary');
  s1.phase.pdfs_found = extractAllPdfs(s1.html, PRIMARY_URL, 'static-primary').length;
  allPdfs.push(...extractAllPdfs(s1.html, PRIMARY_URL, 'static-primary'));
  extractDetailLinks(s1.html, PRIMARY_URL).forEach((u) => detailUrls.add(u));
  if (s1.html.length > largestBodyHtml.length) {
    largestBodyHtml = s1.html;
    largestBodyLabel = 'static-primary';
  }
  phases.push(s1.phase);

  // Phase 2: static alt (only if primary didn't already find PDFs).
  let altHtml = '';
  if (allPdfs.length < 1) {
    const s2 = await staticPhase(ALT_URL, 'static-alt');
    const pdfs2 = extractAllPdfs(s2.html, ALT_URL, 'static-alt');
    s2.phase.pdfs_found = pdfs2.length;
    allPdfs.push(...pdfs2);
    extractDetailLinks(s2.html, ALT_URL).forEach((u) => detailUrls.add(u));
    altHtml = s2.html;
    if (s2.html.length > largestBodyHtml.length) {
      largestBodyHtml = s2.html;
      largestBodyLabel = 'static-alt';
    }
    phases.push(s2.phase);
  }

  // Phase 3: follow up to 5 detail-page URLs from alt body.
  if (allPdfs.length < 1 && detailUrls.size > 0) {
    const detailList = Array.from(detailUrls).slice(0, 5);
    let detailPdfs = 0;
    for (const detailUrl of detailList) {
      const ds = await staticPhase(detailUrl, `static-detail:${detailUrl.slice(-60)}`);
      const pdfs = extractAllPdfs(ds.html, detailUrl, 'detail-page');
      ds.phase.pdfs_found = pdfs.length;
      detailPdfs += pdfs.length;
      allPdfs.push(...pdfs);
      phases.push(ds.phase);
      if (pdfs.length > 0 && detailPdfs >= 3) break; // enough for P-09
    }
  }

  // Phase 4: Playwright on listing page (alt URL, since it had data).
  if (allPdfs.length < 1) {
    const pw1 = await playwrightPhase(ALT_URL, 'playwright-listing');
    const pdfs = extractAllPdfs(pw1.html, ALT_URL, 'playwright-listing');
    pw1.phase.pdfs_found = pdfs.length;
    allPdfs.push(...pdfs);
    extractDetailLinks(pw1.html, ALT_URL).forEach((u) => detailUrls.add(u));
    phases.push(pw1.phase);
    if (pw1.html.length > largestBodyHtml.length) {
      largestBodyHtml = pw1.html;
      largestBodyLabel = 'playwright-listing';
    }
    if (pw1.html.length > 0) {
      writeFileSync(join(samplesDir, 'sebi-publicissues-rendered.html'), pw1.html);
      if (pw1.png.length > 0) {
        writeFileSync(join(samplesDir, 'sebi-publicissues-screenshot.png'), pw1.png);
      }
    }
  }

  // Phase 5: Playwright first detail page if still nothing.
  if (allPdfs.length < 1 && detailUrls.size > 0) {
    const firstDetail = Array.from(detailUrls)[0]!;
    const pw2 = await playwrightPhase(firstDetail, `playwright-detail:${firstDetail.slice(-50)}`);
    const pdfs = extractAllPdfs(pw2.html, firstDetail, 'playwright-detail');
    pw2.phase.pdfs_found = pdfs.length;
    allPdfs.push(...pdfs);
    phases.push(pw2.phase);
    if (pw2.html.length > 0) {
      writeFileSync(join(samplesDir, 'sebi-detail-rendered.html'), pw2.html);
    }
  }

  // Persist discovery output.
  const uniquePdfs = Array.from(
    new Map(allPdfs.map((p) => [p.url, p])).values()
  );
  writeFileSync(
    join(samplesDir, 'sebi-publicissues-pdfs.json'),
    JSON.stringify(
      {
        captured_at_utc: ctx.nowIso,
        phases,
        detail_urls_found: detailUrls.size,
        pdfs: uniquePdfs.slice(0, 200),
      },
      null,
      2
    ) + '\n'
  );

  // Write the largest body as the sample (preserve raw signal for diff/inspection).
  // Use 50 KB budget so the full SEBI alt body is captured.
  if (largestBodyHtml) {
    writeSample(samplesDir, 'sample-sebi-publicissues.html', truncate(largestBodyHtml, 50_000));
  }

  let status: ProbeResult['status'];
  let response_type: ProbeResult['response_type'];
  const reachable = phases.some((p) => p.status >= 200 && p.status < 400);
  const rowsAnywhere = phases.some((p) => p.tr_count > 0);
  if (uniquePdfs.length >= 1) {
    status = 'GREEN';
    response_type = 'HTML';
  } else if (rowsAnywhere) {
    status = 'YELLOW';
    response_type = 'HTML';
  } else if (!reachable) {
    status = 'RED';
    response_type = 'ERROR';
  } else {
    status = 'RED';
    response_type = 'EMPTY';
  }

  const notes = phases.map((p) => `[${p.phase}] ${p.notes} (pdfs=${p.pdfs_found})`).join(' ; ');

  return {
    probe_id: 'P-08',
    source: 'SEBI — Public Issues Filings',
    url_or_endpoint: PRIMARY_URL,
    fetch_method: 'GET (static) → GET (alt) → GET (detail pages) → Playwright',
    headers_or_cookies_required: ['User-Agent', 'Referer', 'Chromium for JS render'],
    status_code: phases.find((p) => p.status > 0)?.status ?? 0,
    response_type,
    fields_found:
      uniquePdfs.length > 0 ? ['pdf urls', 'rows'] : rowsAnywhere ? ['rows'] : [],
    fields_missing: uniquePdfs.length === 0 ? ['pdf urls'] : [],
    sample_record: JSON.stringify(
      {
        phases_summary: phases.map((p) => ({
          phase: p.phase,
          tr_count: p.tr_count,
          pdfs_found: p.pdfs_found,
        })),
        unique_pdf_count: uniquePdfs.length,
        first_3_pdfs: uniquePdfs.slice(0, 3),
        detail_urls_found: detailUrls.size,
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
        ? 'Rows reachable but no PDF URLs harvested — investigate detail-page structure or wire P-10 fallback.'
        : 'All attempts empty; use P-10 (exchange-side DRHP) as primary.',
    fallback_source: 'P-10',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
