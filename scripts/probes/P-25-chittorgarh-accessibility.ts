// P-25 — Chittorgarh list + detail accessibility (Phase 5C source characterization).
//
// Static GET on https://www.chittorgarh.com/ipo/ first; if body < 10 KB or
// detected as a JS shell, fall back to Playwright `renderPage` (existing
// helper). Then discover up to 2 per-IPO detail URLs from the list page
// (one mainboard, one SME if classifiable) and fetch each via the same
// static-first → Playwright fallback. Writes one rendered-HTML artifact
// per page to phase-0/broker-pages/.
//
// Bounded by §V.7 rules:
//   - one request per page per probe pass
//   - 60s per-host timeout
//   - desktop UA (no stealth, no UA cycling)
//   - no anti-bot circumvention — challenge detected = hard stop
//
// Output for P-26: HTML files on disk; P-26 reads them, runs node-side
// regex extraction, and reports per-field precision.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, truncate } from './lib/http.ts';
import { ensureDir } from './lib/reporter.ts';
import { renderPage } from './lib/playwright.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const MAINBOARD_DASHBOARD_URL = 'https://www.chittorgarh.com/ipo/ipo_dashboard.asp';
const SME_DASHBOARD_URL = 'https://www.chittorgarh.com/ipo/ipo_dashboard.asp?a=sme';
const STATIC_MIN_BYTES = 10_240; // below this, fall back to Playwright
const HOST = 'www.chittorgarh.com';

interface FetchOutcome {
  url: string;
  label: string;
  mode: 'static' | 'playwright' | 'failed';
  status: number;
  bytes: number;
  challenge_detected: boolean;
  challenge_reasons: string[];
  error?: string;
  html: string;
}

async function fetchPage(url: string, label: string): Promise<FetchOutcome> {
  const r1 = await httpGet(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.chittorgarh.com/',
    },
    timeoutMs: 60_000,
  });
  if (r1.status === 403) {
    return {
      url,
      label,
      mode: 'failed',
      status: 403,
      bytes: 0,
      challenge_detected: true,
      challenge_reasons: ['http-403'],
      error: 'static GET returned 403 — hard stop per §Y.4 rule 7',
      html: '',
    };
  }
  if (r1.ok && r1.bytes >= STATIC_MIN_BYTES) {
    return {
      url,
      label,
      mode: 'static',
      status: r1.status,
      bytes: r1.bytes,
      challenge_detected: false,
      challenge_reasons: [],
      html: r1.body,
    };
  }
  // Static was too small or non-200; try Playwright once (no retry).
  const r2 = await renderPage(url, { timeoutMs: 60_000, waitAfterLoadMs: 2500 });
  if (r2.challenge_detected) {
    return {
      url,
      label,
      mode: 'failed',
      status: r2.status,
      bytes: r2.rendered_html_length,
      challenge_detected: true,
      challenge_reasons: r2.challenge_reasons,
      error: `playwright detected challenge: ${r2.challenge_reasons.join(',')}`,
      html: '',
    };
  }
  if (r2.error && r2.rendered_html_length === 0) {
    return {
      url,
      label,
      mode: 'failed',
      status: r2.status,
      bytes: 0,
      challenge_detected: false,
      challenge_reasons: [],
      error: r2.error,
      html: '',
    };
  }
  return {
    url,
    label,
    mode: 'playwright',
    status: r2.status,
    bytes: r2.rendered_html_length,
    challenge_detected: false,
    challenge_reasons: [],
    html: r2.rendered_html,
  };
}

// Extract candidate per-IPO detail URLs from the list page body.
// Chittorgarh's per-IPO detail URLs follow the pattern
// `https://www.chittorgarh.com/ipo/<slug>/<numeric-id>/`. Mainboard vs SME
// is hard to classify from the URL alone — we keep that distinction
// best-effort by inspecting nearby anchor / row text for "(SME)" or
// matching the slug suffix.
function discoverDetailUrls(html: string): Array<{ url: string; segment_guess: 'mainboard' | 'sme' | 'unknown' }> {
  const re = /https?:\/\/(?:www\.)?chittorgarh\.com\/ipo\/([a-z0-9-]+)\/(\d+)\/?/gi;
  const seen = new Set<string>();
  const out: Array<{ url: string; segment_guess: 'mainboard' | 'sme' | 'unknown' }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = `https://www.chittorgarh.com/ipo/${m[1]!}/${m[2]!}/`;
    if (seen.has(url)) continue;
    seen.add(url);
    // Heuristic: slug ending in `-sme-ipo` or containing `sme` → SME.
    const slug = m[1]!.toLowerCase();
    const segment_guess: 'mainboard' | 'sme' | 'unknown' =
      slug.includes('sme') ? 'sme' : 'unknown';
    out.push({ url, segment_guess });
  }
  return out;
}

function pickTwoDetailUrls(
  candidates: Array<{ url: string; segment_guess: 'mainboard' | 'sme' | 'unknown' }>
): Array<{ url: string; segment_guess: 'mainboard' | 'sme' | 'unknown' }> {
  // Prefer one likely-SME and one non-SME for breadth. Fall back to
  // first 2 regardless of guess.
  const sme = candidates.find((c) => c.segment_guess === 'sme');
  const nonSme = candidates.find((c) => c.segment_guess !== 'sme');
  const picks: Array<{ url: string; segment_guess: 'mainboard' | 'sme' | 'unknown' }> = [];
  if (nonSme) picks.push(nonSme);
  if (sme && !picks.some((p) => p.url === sme.url)) picks.push(sme);
  // If we still need a second pick, take the next candidate that isn't already in.
  if (picks.length < 2) {
    for (const c of candidates) {
      if (!picks.some((p) => p.url === c.url)) {
        picks.push(c);
        if (picks.length >= 2) break;
      }
    }
  }
  return picks.slice(0, 2);
}

function detectChallengeInHtml(html: string, title: string): { detected: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (/cf-challenge|Just a moment|Attention Required|cf-mitigated|cf-browser-verification/i.test(html)) {
    reasons.push('body:cloudflare');
  }
  if (/Just a moment|Attention Required|Cloudflare/i.test(title)) {
    reasons.push(`title:cloudflare`);
  }
  if (/datadome/i.test(html)) {
    reasons.push('body:datadome');
  }
  return { detected: reasons.length > 0, reasons };
}

// Extract <title> for a quick challenge check.
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1]!.trim().slice(0, 200) : '';
}

// Capture up to `n` raw hrefs from a body for diagnostics when detail-URL
// discovery returns zero. Bounded to avoid full-page dumps; each href is
// trimmed to ≤ 160 chars.
function extractFirstHrefs(html: string, n = 50): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']{1,400})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < n) {
    out.push(m[1]!.slice(0, 160));
  }
  return out;
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const outDir = join(ctx.outDir, 'broker-pages');
  ensureDir(outDir);

  // Dashboard pages — fetch both. Per §Y.4 rule 7: one request per page,
  // 60s per-host timeout, no retries within the pass. Iterated sequentially
  // (not parallel) to keep the host-impact profile minimal.
  const dashboardSpecs: Array<{ kind: 'mainboard' | 'sme'; url: string; file: string }> = [
    { kind: 'mainboard', url: MAINBOARD_DASHBOARD_URL, file: 'chittorgarh-list-rendered.html' },
    { kind: 'sme', url: SME_DASHBOARD_URL, file: 'chittorgarh-sme-rendered.html' },
  ];
  const dashboards: Array<{
    kind: 'mainboard' | 'sme';
    outcome: FetchOutcome;
    first_hrefs: string[];
  }> = [];
  for (const spec of dashboardSpecs) {
    const outcome = await fetchPage(spec.url, `chittorgarh-${spec.kind}`);
    if (outcome.mode !== 'failed' && outcome.html) {
      const title = extractTitle(outcome.html);
      const ch = detectChallengeInHtml(outcome.html, title);
      if (ch.detected) {
        outcome.challenge_detected = true;
        outcome.challenge_reasons = ch.reasons;
        outcome.error = `${spec.kind} challenge in ${outcome.mode}: ${ch.reasons.join(',')}`;
        outcome.mode = 'failed';
      }
    }
    if (outcome.html) {
      writeFileSync(join(outDir, spec.file), truncate(outcome.html, 51_200));
    }
    dashboards.push({
      kind: spec.kind,
      outcome,
      // Captured eagerly but only emitted to the diagnostics block when
      // detail-URL discovery returns zero (see below).
      first_hrefs: outcome.html ? extractFirstHrefs(outcome.html, 50) : [],
    });
  }

  // Detail URL discovery — run against the union of both dashboard bodies.
  const combinedHtml = dashboards.map((d) => d.outcome.html).join('\n');
  const candidates = combinedHtml ? discoverDetailUrls(combinedHtml) : [];
  const picks = pickTwoDetailUrls(candidates);
  const detailOutcomes: FetchOutcome[] = [];
  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i]!;
    const outcome = await fetchPage(pick.url, `chittorgarh-detail-${i + 1}`);
    if (outcome.html) {
      const title = extractTitle(outcome.html);
      const ch = detectChallengeInHtml(outcome.html, title);
      if (ch.detected) {
        outcome.challenge_detected = true;
        outcome.challenge_reasons = ch.reasons;
        outcome.error = `detail challenge in ${outcome.mode}: ${ch.reasons.join(',')}`;
        outcome.mode = 'failed';
      }
      writeFileSync(
        join(outDir, `chittorgarh-detail-${i + 1}-rendered.html`),
        truncate(outcome.html, 51_200)
      );
    }
    detailOutcomes.push(outcome);
  }

  // Fields summary file consumed by P-26.
  // - `dashboards[]` replaces the previous `list:` singleton — each dashboard
  //   carries kind / url / mode / status / bytes / title / challenge state.
  // - `diagnostics` populated ONLY when no detail URLs were discovered, so the
  //   operator can see what raw hrefs the dashboards exposed (bounded to 50
  //   per dashboard via extractFirstHrefs).
  // - `picked_detail_urls` preserved unchanged — P-26 reads this key.
  const summary = {
    captured_at_utc: ctx.nowIso,
    dashboards: dashboards.map((d) => ({
      kind: d.kind,
      url: d.outcome.url,
      mode: d.outcome.mode,
      status: d.outcome.status,
      bytes: d.outcome.bytes,
      title: d.outcome.html ? extractTitle(d.outcome.html) : '',
      challenge_detected: d.outcome.challenge_detected,
      challenge_reasons: d.outcome.challenge_reasons,
      error: d.outcome.error ?? null,
    })),
    discovered_detail_urls: candidates.slice(0, 20).map((c) => c.url),
    picked_detail_urls: picks.map((p, i) => ({
      index: i + 1,
      url: p.url,
      segment_guess: p.segment_guess,
    })),
    details: detailOutcomes.map((d, i) => ({
      index: i + 1,
      url: d.url,
      mode: d.mode,
      status: d.status,
      bytes: d.bytes,
      title: d.html ? extractTitle(d.html) : '',
      challenge_detected: d.challenge_detected,
      challenge_reasons: d.challenge_reasons,
      error: d.error ?? null,
    })),
    diagnostics:
      candidates.length === 0
        ? {
            reason: 'detail_urls_discovered=0 — emitting first hrefs from each dashboard for inspection',
            per_dashboard: dashboards.map((d) => ({
              kind: d.kind,
              url: d.outcome.url,
              title: d.outcome.html ? extractTitle(d.outcome.html) : '',
              body_length: d.outcome.bytes,
              challenge_detected: d.outcome.challenge_detected,
              first_hrefs: d.first_hrefs,
            })),
          }
        : null,
  };
  writeFileSync(
    join(outDir, 'chittorgarh-fields.json'),
    JSON.stringify(summary, null, 2) + '\n'
  );

  // Status classification — Phase 5C.1: rely on dashboard-level OK rather
  // than single-list OK. `anyDashboardOk` = at least one dashboard fetched
  // cleanly with a non-empty body. `allOk` requires both dashboards OK AND
  // at least 2 detail picks reachable.
  const anyChallenge =
    dashboards.some((d) => d.outcome.challenge_detected) ||
    detailOutcomes.some((d) => d.challenge_detected);
  const anyDashboardOk = dashboards.some((d) => d.outcome.mode !== 'failed' && d.outcome.bytes > 0);
  const allDashboardsOk = dashboards.every((d) => d.outcome.mode !== 'failed' && d.outcome.bytes > 0);
  const detailsOk = detailOutcomes.length >= 1 && detailOutcomes.every((d) => d.mode !== 'failed');
  const allOk = allDashboardsOk && detailsOk && picks.length >= 2;

  let status: ProbeResult['status'];
  let response_type: ProbeResult['response_type'];
  let recommended_action: string;
  if (anyChallenge) {
    status = 'RED';
    response_type = 'BLOCKED';
    recommended_action = 'Anti-bot challenge detected — Phase 5C §9.1 precondition 2 fails. Do not approve ingestion.';
  } else if (allOk) {
    status = 'GREEN';
    response_type = 'HTML';
    recommended_action = 'Run P-26 to evaluate field extraction precision against the captured HTML.';
  } else if (anyDashboardOk && detailOutcomes.some((d) => d.mode !== 'failed')) {
    status = 'YELLOW';
    response_type = 'HTML';
    recommended_action = 'Partial success — review chittorgarh-fields.json and decide whether to retry with manual URLs.';
  } else if (anyDashboardOk && candidates.length === 0) {
    status = 'YELLOW';
    response_type = 'HTML';
    recommended_action = 'Dashboard(s) reachable but no detail URLs discovered — inspect chittorgarh-fields.json diagnostics block (first_hrefs) and refine the regex.';
  } else {
    status = 'RED';
    response_type = 'ERROR';
    recommended_action = 'Dashboard + detail fetches failed. Skip Chittorgarh as ingestion candidate.';
  }

  const fields_found: string[] = [];
  for (const d of dashboards) {
    if (d.outcome.mode !== 'failed' && d.outcome.bytes > 0) {
      fields_found.push(`${d.kind} dashboard reachable`);
    }
  }
  if (candidates.length > 0) fields_found.push(`${candidates.length} detail URL(s) discovered`);
  for (let i = 0; i < detailOutcomes.length; i++) {
    if (detailOutcomes[i]!.mode !== 'failed') fields_found.push(`detail-${i + 1} reachable`);
  }
  const fields_missing: string[] = [];
  for (const d of dashboards) {
    if (d.outcome.mode === 'failed' || d.outcome.bytes === 0) {
      fields_missing.push(`${d.kind} dashboard (${d.outcome.error ?? 'unknown'})`);
    }
  }
  if (candidates.length === 0 && anyDashboardOk) {
    fields_missing.push('detail URL discovery (0 candidates — see diagnostics block)');
  }
  if (picks.length < 2) fields_missing.push('second detail URL');
  for (let i = 0; i < detailOutcomes.length; i++) {
    if (detailOutcomes[i]!.mode === 'failed') {
      fields_missing.push(`detail-${i + 1} (${detailOutcomes[i]!.error ?? 'unknown'})`);
    }
  }

  const notes = [
    ...dashboards.map(
      (d) => `${d.kind}: ${d.outcome.mode} status=${d.outcome.status} bytes=${d.outcome.bytes}`
    ),
    `detail_urls_discovered=${candidates.length}`,
    `detail_urls_picked=${picks.length}`,
    ...detailOutcomes.map(
      (d, i) => `detail-${i + 1}: ${d.mode} status=${d.status} bytes=${d.bytes}` +
        (d.error ? ` err=${d.error}` : '')
    ),
    `challenges_detected=${anyChallenge}`,
  ].join(' | ');

  return {
    probe_id: 'P-25',
    source: 'Chittorgarh — IPO list + detail accessibility (Phase 5C)',
    url_or_endpoint: `${MAINBOARD_DASHBOARD_URL} + ${SME_DASHBOARD_URL}`,
    fetch_method: 'GET static → Playwright fallback (no retry within pass); two dashboards probed per pass',
    headers_or_cookies_required: ['User-Agent (desktop Chrome)', 'Referer'],
    status_code: dashboards[0]?.outcome.status || null,
    response_type,
    fields_found,
    fields_missing,
    sample_record: JSON.stringify(
      {
        dashboard_titles: summary.dashboards.map((d) => ({ kind: d.kind, title: d.title })),
        discovered_detail_count: candidates.length,
        picked_detail_urls: picks.map((p) => p.url),
        detail_titles: summary.details.map((d) => d.title),
        challenges_detected: anyChallenge,
        diagnostics_first_hrefs_per_dashboard: summary.diagnostics
          ? summary.diagnostics.per_dashboard.map((d) => ({
              kind: d.kind,
              first_3_hrefs: d.first_hrefs.slice(0, 3),
            }))
          : null,
      },
      null,
      2
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: anyChallenge ? 'High' : 'Low',
    legal_tos_risk: 'Medium',
    freshness_or_update_frequency: 'Daily (manual editor maintained)',
    status,
    recommended_action,
    fallback_source: 'P-26 (field extraction off captured HTML)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
