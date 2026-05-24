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

// Phase 6A.1.2 — robots.txt posture check with CORRECT robots
// prefix-matching semantics. Fetches https://www.chittorgarh.com/robots.txt
// once (60s, no retry) and evaluates whether a representative
// `/ipo/<slug>/<id>/` detail path is Disallow'd for `User-agent: *`.
//
// Phase 6A.1.1 used a loose `p.startsWith('/ipo')` test that could
// over-match an unrelated rule like `Disallow: /ipo_dashboard.asp`. This
// version implements the de-facto robots matching algorithm (Google spec):
//   - a rule path matches a URL path when the URL path starts with the
//     rule path (with `*` = any-sequence and trailing `$` = end-anchor)
//   - the longest matching rule wins; an Allow ties-break over a Disallow
//     of equal specificity
// and records the exact matching directive line for audit. Posture note
// only — never gates the probe status.
const ROBOTS_TEST_PATHS = [
  '/ipo/onemi-technology-ipo/2576/',   // real OnEMI detail path (IPO #1)
  '/ipo/bagmane-reit/3090/',           // Bagmane (IPO #2)
  '/ipo/m-r-maniveni-ipo/2627/',       // M R Maniveni (IPO #3, auto-selected)
];

interface RobotsRule { type: 'allow' | 'disallow'; path: string; raw: string; }
interface RobotsGroup { agents: string[]; rules: RobotsRule[]; crawlDelay: number | null; }
interface RobotsMatch {
  tested_path: string;
  decision: 'allowed' | 'disallowed';
  matched_rule: { user_agent_block: string[]; directive: 'allow' | 'disallow'; path: string; raw: string } | null;
}
interface RobotsPosture {
  fetched: boolean;
  status: number;
  // True iff the CORRECT matcher disallows the OnEMI detail path for `*`.
  ipo_path_disallowed_for_star: boolean | null;
  crawl_delay_seconds: number | null;
  // Phase 6A.1.2 audit fields:
  star_group_disallow_rules: string[];      // the `*` group's raw Disallow lines (bounded)
  per_path: RobotsMatch[];                   // correct-matcher result per tested detail path
  prior_loose_flag: boolean | null;          // what the old p.startsWith('/ipo') test would have said
  classification:
    | 'genuine-ipo-detail-disallow'          // a Disallow truly covers /ipo/<slug>/<id>/
    | 'allowed-no-applicable-disallow'        // no Disallow matches; prior flag (if any) was an over-match
    | 'allowed-prior-flag-was-over-match'     // prior loose flag = true but correct matcher = allowed
    | 'unknown';
  note: string;
}

// Robots path pattern → regex test (supports * and trailing $).
function robotsPathMatches(pattern: string, urlPath: string): boolean {
  if (pattern === '') return false; // empty Disallow ⇒ no restriction
  let pat = pattern;
  let anchored = false;
  if (pat.endsWith('$')) { anchored = true; pat = pat.slice(0, -1); }
  const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + (anchored ? '$' : '')).test(urlPath);
}
// Specificity = literal length of the pattern (wildcards count as their
// literal chars; adequate for tie-breaking per the de-facto spec).
function ruleSpecificity(path: string): number {
  return path.replace(/\$$/, '').length;
}
function parseRobots(body: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let cur: RobotsGroup | null = null;
  let lastWasRule = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim(); // strip inline comments
    if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === 'user-agent') {
      if (!cur || lastWasRule) {
        cur = { agents: [], rules: [], crawlDelay: null };
        groups.push(cur);
        lastWasRule = false;
      }
      cur.agents.push(value);
    } else if (field === 'disallow' || field === 'allow') {
      if (!cur) { cur = { agents: ['*'], rules: [], crawlDelay: null }; groups.push(cur); }
      cur.rules.push({ type: field === 'allow' ? 'allow' : 'disallow', path: value, raw: line });
      lastWasRule = true;
    } else if (field === 'crawl-delay') {
      if (cur) cur.crawlDelay = Number(value);
      lastWasRule = true;
    }
  }
  return groups;
}
function evaluatePath(group: RobotsGroup, urlPath: string): RobotsMatch {
  let bestDisallow: RobotsRule | null = null;
  let bestAllow: RobotsRule | null = null;
  for (const rule of group.rules) {
    if (rule.path === '') continue;
    if (!robotsPathMatches(rule.path, urlPath)) continue;
    if (rule.type === 'disallow') {
      if (!bestDisallow || ruleSpecificity(rule.path) > ruleSpecificity(bestDisallow.path)) bestDisallow = rule;
    } else {
      if (!bestAllow || ruleSpecificity(rule.path) > ruleSpecificity(bestAllow.path)) bestAllow = rule;
    }
  }
  const toMatch = (r: RobotsRule | null): RobotsMatch['matched_rule'] =>
    r ? { user_agent_block: group.agents, directive: r.type, path: r.path, raw: r.raw } : null;
  if (!bestDisallow) return { tested_path: urlPath, decision: 'allowed', matched_rule: toMatch(bestAllow) };
  // Allow wins ties (Google spec: equal specificity → least-restrictive).
  if (bestAllow && ruleSpecificity(bestAllow.path) >= ruleSpecificity(bestDisallow.path)) {
    return { tested_path: urlPath, decision: 'allowed', matched_rule: toMatch(bestAllow) };
  }
  return { tested_path: urlPath, decision: 'disallowed', matched_rule: toMatch(bestDisallow) };
}

async function checkRobots(): Promise<RobotsPosture> {
  const base: Omit<RobotsPosture, 'note'> = {
    fetched: false,
    status: 0,
    ipo_path_disallowed_for_star: null,
    crawl_delay_seconds: null,
    star_group_disallow_rules: [],
    per_path: [],
    prior_loose_flag: null,
    classification: 'unknown',
  };
  try {
    const r = await httpGet('https://www.chittorgarh.com/robots.txt', {
      headers: { Accept: 'text/plain,*/*;q=0.8' },
      timeoutMs: 60_000,
    });
    if (!r.ok || !r.body) {
      return { ...base, status: r.status, note: `robots.txt not fetched (status ${r.status}); posture unknown — default to conservative single-request-per-page polling` };
    }
    const groups = parseRobots(r.body);
    const starGroup = groups.find((g) => g.agents.some((a) => a.trim() === '*'))
      ?? { agents: ['*'], rules: [], crawlDelay: null };
    const starDisallows = starGroup.rules.filter((x) => x.type === 'disallow').map((x) => x.path);

    // Correct-matcher evaluation across the real detail paths.
    const perPath = ROBOTS_TEST_PATHS.map((p) => evaluatePath(starGroup, p));
    const anyDisallowed = perPath.some((m) => m.decision === 'disallowed');

    // Reproduce the OLD loose flag to confirm whether it was an over-match.
    const priorLoose = starDisallows.some(
      (p) => p !== '' && ('/ipo/'.startsWith(p) || p === '/' || p.startsWith('/ipo')),
    );

    let classification: RobotsPosture['classification'];
    if (anyDisallowed) classification = 'genuine-ipo-detail-disallow';
    else if (priorLoose) classification = 'allowed-prior-flag-was-over-match';
    else classification = 'allowed-no-applicable-disallow';

    const matchedNote = perPath
      .map((m) => `${m.tested_path}→${m.decision}${m.matched_rule ? ` (${m.matched_rule.directive}: ${m.matched_rule.path})` : ' (no matching rule)'}`)
      .join('; ');

    return {
      fetched: true,
      status: r.status,
      ipo_path_disallowed_for_star: anyDisallowed,
      crawl_delay_seconds: starGroup.crawlDelay,
      star_group_disallow_rules: starDisallows.slice(0, 50),
      per_path: perPath,
      prior_loose_flag: priorLoose,
      classification,
      note:
        classification === 'genuine-ipo-detail-disallow'
          ? `robots.txt: /ipo/<slug>/<id/> GENUINELY Disallow'd for * — ${matchedNote}. Chittorgarh production polling would violate robots; keep reference/manual-only.`
          : classification === 'allowed-prior-flag-was-over-match'
          ? `robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). ${matchedNote}`
          : `robots.txt: detail paths ALLOWED for * (no applicable Disallow). ${matchedNote}`,
    };
  } catch (e) {
    return { ...base, note: `robots.txt fetch errored: ${(e as Error).message ?? String(e)}; posture unknown` };
  }
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

  // 2b. Phase 6A.1.1 — lightweight robots.txt posture check. One GET, 60s
  //     timeout, no retry. Records whether the /ipo/ path appears
  //     Disallow'd for `*` and any Crawl-delay directive. This is a
  //     posture note only — it does NOT gate the probe status.
  const robots = await checkRobots();

  // 3. Write the summary file consumed by P-26b.
  const summary = {
    captured_at_utc: ctx.nowIso,
    robots_posture: robots,
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
    `robots_classification=${robots.classification}`,
    `robots_ipo_disallowed=${robots.ipo_path_disallowed_for_star}`,
    `robots: ${robots.note}`,
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
