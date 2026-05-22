// P-25b — Chittorgarh detail-page accessibility retune (Phase 6A.1).
//
// Like P-25, but the 3 IPO targets are fixed-pair + auto-third:
//   1. OnEMI Technology Solutions      — fixed (Phase 6A primary target)
//   2. Bagmane REIT                    — fixed (P-26 baseline)
//   3. AUTO-SELECTED from cached
//      phase-0/broker-pages/chittorgarh-list-rendered.html +
//      chittorgarh-sme-rendered.html.
//      Logic: parse row date ranges. Pick the first IPO whose date range
//      includes today (current-open). If none current-open, fall back to
//      the IPO with the largest end_date <= today (most-recently-listed).
//      Skip OnEMI + Bagmane slugs.
//
// Writes:
//   phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html
//   phase-0/broker-pages/chittorgarh-fields-v2.json
//
// Strict per Phase 5C closure §Y.4 rule 7 + Phase 6A planning §5.3:
//   - one request per page per pass
//   - 60s per-host timeout
//   - desktop UA only (no stealth, no UA cycling)
//   - no captcha / login / proxy / fingerprint-spoof bypass
//   - challenge detected = hard stop for that fetch

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, truncate } from './lib/http.ts';
import { ensureDir } from './lib/reporter.ts';
import { renderPage } from './lib/playwright.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// ─── Fixed IPO #1 + #2 ──────────────────────────────────────────────────
const ONEMI_URL = 'https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/';
const BAGMANE_URL = 'https://www.chittorgarh.com/ipo/bagmane-reit/3090/';
const FIXED_SKIP_SLUGS = new Set(['onemi-technology-ipo', 'bagmane-reit']);

// ─── Caps + thresholds ──────────────────────────────────────────────────
const STATIC_MIN_BYTES = 10_240;
const DETAIL_ARTIFACT_CAP = 409_600;

// ─── Cached list paths (READ ONLY; never re-fetched in 6A.1) ────────────
const LIST_MAINBOARD = 'phase-0/broker-pages/chittorgarh-list-rendered.html';
const LIST_SME = 'phase-0/broker-pages/chittorgarh-sme-rendered.html';

// ─── Types ──────────────────────────────────────────────────────────────
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
interface ListRow {
  slug: string;
  id: string;
  url: string;
  dateText: string;
  range: { start: Date; end: Date } | null;
  source_list: 'mainboard' | 'sme';
}
interface ThirdIpoPick {
  url: string;
  slug: string;
  status: 'current' | 'fallback' | 'none';
  reason: string;
  dateText: string | null;
  source_list: 'mainboard' | 'sme' | null;
}

// ─── Date range parser ──────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
function monthIdx(s: string): number | null {
  const v = MONTHS[s.toLowerCase().slice(0, 4)] ?? MONTHS[s.toLowerCase().slice(0, 3)];
  return v ?? null;
}
function parseDateRange(s: string, defaultYear: number): { start: Date; end: Date } | null {
  const txt = s.replace(/\s+/g, ' ').trim();
  // Pattern A: "DD MMM - DD MMM" (cross-month, e.g. "30 Apr - 05 May")
  let m = txt.match(/^(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+)$/);
  if (m) {
    const m1 = monthIdx(m[2]!);
    const m2 = monthIdx(m[4]!);
    if (m1 !== null && m2 !== null) {
      let sy = defaultYear;
      let ey = defaultYear;
      // If start month > end month, start is in the previous year
      // (e.g. "30 Dec - 03 Jan" — but rare in IPO data).
      if (m1 > m2) sy = defaultYear - 1;
      return {
        start: new Date(Date.UTC(sy, m1, +m[1]!)),
        end: new Date(Date.UTC(ey, m2, +m[3]!)),
      };
    }
  }
  // Pattern B: "DD - DD MMM" (same month, e.g. "22 - 26 May")
  m = txt.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]+)$/);
  if (m) {
    const mi = monthIdx(m[3]!);
    if (mi !== null) {
      return {
        start: new Date(Date.UTC(defaultYear, mi, +m[1]!)),
        end: new Date(Date.UTC(defaultYear, mi, +m[2]!)),
      };
    }
  }
  return null;
}

// ─── List parser ────────────────────────────────────────────────────────
function parseListRows(html: string, listName: 'mainboard' | 'sme', defaultYear: number): ListRow[] {
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const out: ListRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const slugM = m[1]!.match(/\/ipo\/([a-z0-9-]+)\/(\d+)\//i);
    const dateM = m[1]!.match(/<span\b[^>]*float-end[^>]*>([^<]{4,30})<\/span>/i);
    if (!slugM || !dateM) continue;
    const slug = slugM[1]!;
    const id = slugM[2]!;
    const dateText = dateM[1]!.trim();
    out.push({
      slug,
      id,
      url: `https://www.chittorgarh.com/ipo/${slug}/${id}/`,
      dateText,
      range: parseDateRange(dateText, defaultYear),
      source_list: listName,
    });
  }
  return out;
}

// ─── Third-IPO selection (auto, no operator input) ──────────────────────
function pickThirdIpo(today: Date): ThirdIpoPick {
  const allRows: ListRow[] = [];
  const year = today.getUTCFullYear();
  if (existsSync(LIST_MAINBOARD)) {
    allRows.push(...parseListRows(readFileSync(LIST_MAINBOARD, 'utf-8'), 'mainboard', year));
  }
  if (existsSync(LIST_SME)) {
    allRows.push(...parseListRows(readFileSync(LIST_SME, 'utf-8'), 'sme', year));
  }
  if (allRows.length === 0) {
    return {
      url: '',
      slug: '',
      status: 'none',
      reason: 'cached chittorgarh list HTML missing — run P-25 to refresh',
      dateText: null,
      source_list: null,
    };
  }
  const tToday = today.getTime();
  const eligible = allRows.filter((r) => !FIXED_SKIP_SLUGS.has(r.slug) && r.range !== null);

  // Step 1: first row whose date range covers today.
  for (const r of eligible) {
    if (r.range!.start.getTime() <= tToday && tToday <= r.range!.end.getTime()) {
      return {
        url: r.url,
        slug: r.slug,
        status: 'current',
        reason: `current-open: list "${r.source_list}" row date range "${r.dateText}" covers today`,
        dateText: r.dateText,
        source_list: r.source_list,
      };
    }
  }

  // Step 2: fallback — IPO with max end_date ≤ today (most-recently-listed).
  let best: ListRow | null = null;
  for (const r of eligible) {
    if (r.range!.end.getTime() > tToday) continue;
    if (!best || r.range!.end.getTime() > best.range!.end.getTime()) best = r;
  }
  if (best) {
    return {
      url: best.url,
      slug: best.slug,
      status: 'fallback',
      reason: `fallback (no current-open found): most-recently-listed end date "${best.dateText}" from list "${best.source_list}"`,
      dateText: best.dateText,
      source_list: best.source_list,
    };
  }
  return {
    url: '',
    slug: '',
    status: 'none',
    reason: 'no eligible IPO found in cached lists (after skipping OnEMI + Bagmane and rows with unparseable date ranges)',
    dateText: null,
    source_list: null,
  };
}

// ─── Per-page fetch (static → Playwright fallback; no retry) ────────────
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
      url, label, mode: 'failed', status: 403, bytes: 0,
      challenge_detected: true,
      challenge_reasons: ['http-403'],
      error: 'static GET returned 403 — hard stop per §Y.4 rule 7',
      html: '',
    };
  }
  if (r1.ok && r1.bytes >= STATIC_MIN_BYTES) {
    return {
      url, label, mode: 'static', status: r1.status, bytes: r1.bytes,
      challenge_detected: false, challenge_reasons: [], html: r1.body,
    };
  }
  // Static was too small / non-200 — try Playwright once, no retry.
  const r2 = await renderPage(url, { timeoutMs: 60_000, waitAfterLoadMs: 2500 });
  if (r2.challenge_detected) {
    return {
      url, label, mode: 'failed', status: r2.status,
      bytes: r2.rendered_html_length,
      challenge_detected: true,
      challenge_reasons: r2.challenge_reasons,
      error: `playwright detected challenge: ${r2.challenge_reasons.join(',')}`,
      html: '',
    };
  }
  if (r2.error && r2.rendered_html_length === 0) {
    return {
      url, label, mode: 'failed', status: r2.status, bytes: 0,
      challenge_detected: false, challenge_reasons: [],
      error: r2.error, html: '',
    };
  }
  return {
    url, label, mode: 'playwright', status: r2.status, bytes: r2.rendered_html_length,
    challenge_detected: false, challenge_reasons: [], html: r2.rendered_html,
  };
}

function detectChallengeInHtml(html: string, title: string): { detected: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (/cf-challenge|Just a moment|Attention Required|cf-mitigated|cf-browser-verification/i.test(html)) reasons.push('body:cloudflare');
  if (/Just a moment|Attention Required|Cloudflare/i.test(title)) reasons.push(`title:cloudflare`);
  if (/datadome/i.test(html)) reasons.push('body:datadome');
  return { detected: reasons.length > 0, reasons };
}
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1]!.trim().slice(0, 200) : '';
}

// ─── Probe entrypoint ───────────────────────────────────────────────────
export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const outDir = join(ctx.outDir, 'broker-pages');
  ensureDir(outDir);

  // 1. Auto-pick IPO #3 from cached list HTML — no network on this step.
  const today = new Date(ctx.nowIso);
  const third = pickThirdIpo(today);

  // 2. Build the 3-IPO target list. IPO #3 may be empty if cached lists
  //    are missing — in that case, status reflects "third IPO unresolved"
  //    and we still probe the two fixed IPOs.
  const specs: Array<{ index: number; url: string; label: string }> = [
    { index: 1, url: ONEMI_URL, label: 'chittorgarh-detail-1-v2' },
    { index: 2, url: BAGMANE_URL, label: 'chittorgarh-detail-2-v2' },
  ];
  if (third.url) {
    specs.push({ index: 3, url: third.url, label: 'chittorgarh-detail-3-v2' });
  }

  const details: Array<{ index: number; outcome: FetchOutcome }> = [];
  for (const s of specs) {
    const outcome = await fetchPage(s.url, s.label);
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
        join(outDir, `chittorgarh-detail-${s.index}-rendered-v2.html`),
        truncate(outcome.html, DETAIL_ARTIFACT_CAP),
      );
    }
    details.push({ index: s.index, outcome });
  }

  // 3. Write the summary file consumed by P-26b.
  const summary = {
    captured_at_utc: ctx.nowIso,
    third_ipo_selection: {
      slug: third.slug,
      url: third.url,
      status: third.status,
      reason: third.reason,
      date_text: third.dateText,
      source_list: third.source_list,
    },
    picked_detail_urls: details.map((d) => ({
      index: d.index,
      url: d.outcome.url,
      // Allow P-26b to know which IPO each file corresponds to:
      slug: d.outcome.url.match(/\/ipo\/([a-z0-9-]+)\//i)?.[1] ?? null,
    })),
    details: details.map((d) => ({
      index: d.index,
      url: d.outcome.url,
      mode: d.outcome.mode,
      status: d.outcome.status,
      bytes: d.outcome.bytes,
      title: d.outcome.html ? extractTitle(d.outcome.html) : '',
      challenge_detected: d.outcome.challenge_detected,
      challenge_reasons: d.outcome.challenge_reasons,
      error: d.outcome.error ?? null,
    })),
  };
  writeFileSync(
    join(outDir, 'chittorgarh-fields-v2.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );

  // 4. Status classification.
  const anyChallenge = details.some((d) => d.outcome.challenge_detected);
  const allOk = details.length >= 2 && details.every((d) => d.outcome.mode !== 'failed');
  const partialOk = details.some((d) => d.outcome.mode !== 'failed');

  let status: ProbeResult['status'];
  let response_type: ProbeResult['response_type'];
  let recommended_action: string;
  if (anyChallenge) {
    status = 'RED';
    response_type = 'BLOCKED';
    recommended_action = 'Anti-bot challenge detected on at least one fetch — hard stop per §5.3.';
  } else if (allOk && details.length === 3) {
    status = 'GREEN';
    response_type = 'HTML';
    recommended_action = 'All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.';
  } else if (allOk && details.length === 2) {
    status = 'YELLOW';
    response_type = 'HTML';
    recommended_action = '2 fixed IPOs captured; IPO #3 selection failed (likely cached lists missing — run P-25 first to refresh).';
  } else if (partialOk) {
    status = 'YELLOW';
    response_type = 'HTML';
    recommended_action = 'Partial success — review chittorgarh-fields-v2.json before approving any next-slice work.';
  } else {
    status = 'RED';
    response_type = 'ERROR';
    recommended_action = 'All detail fetches failed. Skip Chittorgarh fast-fill ingestion for now.';
  }

  const fields_found: string[] = [];
  const fields_missing: string[] = [];
  for (const d of details) {
    if (d.outcome.mode !== 'failed') fields_found.push(`detail-${d.index} reachable (${d.outcome.mode})`);
    else fields_missing.push(`detail-${d.index} (${d.outcome.error ?? 'unknown'})`);
  }
  if (third.status === 'none') {
    fields_missing.push(`third IPO selection: ${third.reason}`);
  } else {
    fields_found.push(`third IPO selection: ${third.status} (${third.slug})`);
  }

  const notes = [
    `third_ipo_status=${third.status}`,
    `third_ipo_slug=${third.slug || '—'}`,
    `third_ipo_reason="${third.reason}"`,
    ...details.map((d) => `detail-${d.index}: ${d.outcome.mode} status=${d.outcome.status} bytes=${d.outcome.bytes}` + (d.outcome.error ? ` err=${d.outcome.error}` : '')),
    `challenges_detected=${anyChallenge}`,
  ].join(' | ');

  return {
    probe_id: 'P-25b',
    source: 'Chittorgarh — detail-page accessibility retune (Phase 6A.1)',
    url_or_endpoint: `${ONEMI_URL} + ${BAGMANE_URL} + auto-selected third IPO`,
    fetch_method: 'GET static → Playwright fallback (no retry within pass); 3 IPOs probed per pass (2 fixed + 1 auto)',
    headers_or_cookies_required: ['User-Agent (desktop Chrome)', 'Referer'],
    status_code: details[0]?.outcome.status ?? null,
    response_type,
    fields_found,
    fields_missing,
    sample_record: JSON.stringify(
      {
        third_ipo: summary.third_ipo_selection,
        detail_titles: summary.details.map((d) => ({ index: d.index, title: d.title })),
        challenges_detected: anyChallenge,
      },
      null,
      2,
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: anyChallenge ? 'High' : 'Low',
    legal_tos_risk: 'Medium',
    freshness_or_update_frequency: 'Daily (manual editor maintained)',
    status,
    recommended_action,
    fallback_source: 'P-26b (field extraction off captured HTML)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
