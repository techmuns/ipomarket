// P-26 — Chittorgarh sample detail field extraction (Phase 5C source characterization).
//
// Reads HTML files written by P-25 from disk and runs node-side regex
// extraction against the Chittorgarh detail-page structure. Does NOT
// re-fetch — that would violate the §Y.4 rule 7 single-request-per-page
// rule. If P-25 hasn't been run yet, P-26 returns RED with a clear note.
//
// Per-field extraction precision is computed against the set of expected
// fields (company / issue size / price band / lot size / open date /
// close date / listing date / registrar / BRLMs / DRHP-RHP PDF link
// list). Writes one `chittorgarh-detail-{N}-extracted.json` per detail
// page, plus an aggregate precision summary.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const HOST_ALLOWLIST = new Set([
  'sebi.gov.in',
  'www.sebi.gov.in',
  'nseindia.com',
  'www.nseindia.com',
  'nsearchives.nseindia.com',
  'bseindia.com',
  'www.bseindia.com',
  'bsesme.com',
  'www.bsesme.com',
]);

const EXPECTED_FIELDS = [
  'company_name',
  'issue_size_cr',
  'price_band',
  'lot_size',
  'open_date',
  'close_date',
  'listing_date',
  'registrar',
  'brlms',
  'official_pdf_links',
] as const;

type FieldKey = (typeof EXPECTED_FIELDS)[number];

interface ExtractedField<T = unknown> {
  value: T | null;
  found: boolean;
  source_snippet: string | null;
}

interface ExtractedDetail {
  detail_index: number;
  source_html_path: string;
  source_url: string | null;
  fields: Record<FieldKey, ExtractedField>;
  found_count: number;
  precision_ratio: number;
  official_pdf_links_on_allowlist: string[];
  official_pdf_links_off_allowlist: string[];
}

function loadFieldsSummary(brokerPagesDir: string): {
  list_url?: string;
  picked_detail_urls?: Array<{ index: number; url: string }>;
} | null {
  const p = join(brokerPagesDir, 'chittorgarh-fields.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ReturnType<typeof loadFieldsSummary>;
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(s: string | null, n = 160): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n) + '…';
}

function extractCompanyName(html: string): ExtractedField<string> {
  // Try <h1>...</h1> first.
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const txt = stripTags(h1[1]!);
    if (txt.length > 0 && txt.length < 200) {
      return { value: txt, found: true, source_snippet: snippet(h1[1]!) };
    }
  }
  // Fall back to <title>.
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) {
    const txt = stripTags(t[1]!).replace(/\s*IPO\s*(GMP|Price|Date|Allotment).*$/i, '').trim();
    if (txt) return { value: txt, found: true, source_snippet: snippet(t[1]!) };
  }
  return { value: null, found: false, source_snippet: null };
}

function extractByLabel(text: string, labels: string[]): ExtractedField<string> {
  for (const label of labels) {
    // Labels like "Issue Size", "Price Band", followed by value (lookahead).
    const re = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-]?\\s*([\\s\\S]{1,200}?)(?:\\n|$|\\s{2,}|\\.\\s)`,
      'i'
    );
    const m = text.match(re);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\s+/g, ' ');
      if (val && val.length < 200) {
        return { value: val, found: true, source_snippet: snippet(val) };
      }
    }
  }
  return { value: null, found: false, source_snippet: null };
}

function extractIssueSizeCr(text: string): ExtractedField<string> {
  // Chittorgarh typically reports "Issue Size ₹ XXX.XX Cr".
  const re = /Issue Size[^A-Za-z0-9₹]*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:Cr|Crore|Cr\.)/i;
  const m = text.match(re);
  if (m) {
    return { value: `₹${m[1]} Cr`, found: true, source_snippet: snippet(m[0]) };
  }
  return extractByLabel(text, ['Issue Size', 'Total Issue Size']);
}

function extractPriceBand(text: string): ExtractedField<string> {
  const re = /Price\s*(?:Band|Range)[^A-Za-z0-9₹]*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:-|to|–|—)\s*₹?\s*([\d,]+(?:\.\d+)?)/i;
  const m = text.match(re);
  if (m) {
    return {
      value: `₹${m[1]} - ₹${m[2]}`,
      found: true,
      source_snippet: snippet(m[0]),
    };
  }
  return extractByLabel(text, ['Price Band', 'Price Range']);
}

function extractLotSize(text: string): ExtractedField<string> {
  const re = /Lot\s*Size[^A-Za-z0-9]*([\d,]+)\s*(?:Shares|shares|\(|$)/i;
  const m = text.match(re);
  if (m) {
    return { value: m[1]!.replace(/,/g, ''), found: true, source_snippet: snippet(m[0]) };
  }
  return extractByLabel(text, ['Lot Size', 'Market Lot']);
}

function extractDate(text: string, kinds: string[]): ExtractedField<string> {
  // Chittorgarh date pattern: "Open Date Nov 18, 2026" or "Mon, Nov 18, 2026"
  for (const kind of kinds) {
    const re = new RegExp(
      `${kind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-]?\\s*((?:[A-Z][a-z]{2,8}\\s*,?\\s*)?[A-Z][a-z]{2,8}\\s+\\d{1,2}\\s*,?\\s+\\d{4})`,
      'i'
    );
    const m = text.match(re);
    if (m) {
      return { value: m[1]!.trim(), found: true, source_snippet: snippet(m[0]) };
    }
  }
  return { value: null, found: false, source_snippet: null };
}

function extractRegistrar(text: string): ExtractedField<string> {
  const re = /Registrar\s*[:\-]?\s*([A-Z][A-Za-z0-9&.,\s'/()-]{5,120}?)(?:\sLimited|\sLtd|\sPrivate|\sPvt|\.|$)/;
  const m = text.match(re);
  if (m) {
    return {
      value: (m[1]!.trim() + (m[0].endsWith('Limited') ? ' Limited' : m[0].endsWith('Ltd') ? ' Ltd' : '')).trim(),
      found: true,
      source_snippet: snippet(m[0]),
    };
  }
  return extractByLabel(text, ['Registrar', 'IPO Registrar']);
}

function extractBrlms(text: string, html: string): ExtractedField<string[]> {
  // Try to find a "Lead Manager" or "Book Running Lead Manager" block.
  // Chittorgarh often lists BRLMs in a table or bulleted list.
  const idx = text.search(/Book\s*Running\s*Lead\s*Manager|Lead\s*Manager\(s\)|BRLM/i);
  if (idx < 0) return { value: null, found: false, source_snippet: null };
  // Take the next ~600 chars and split on common separators.
  const window = text.slice(idx, idx + 600);
  // Pull plausible firm names (lines ending in Limited / Ltd / Private Limited).
  const firmRe = /([A-Z][A-Za-z0-9&.,\s'/()-]{4,80}?(?:Limited|Ltd|Private\s+Limited|Pvt\.?\s+Ltd))/g;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = firmRe.exec(window))) {
    const name = m[1]!.trim().replace(/\s+/g, ' ');
    if (name.length >= 8 && name.length <= 80) names.add(name);
  }
  if (names.size === 0) return { value: null, found: false, source_snippet: snippet(window) };
  return {
    value: Array.from(names).slice(0, 10),
    found: true,
    source_snippet: snippet(window),
  };
}

function extractOfficialPdfLinks(html: string): {
  field: ExtractedField<string[]>;
  on_allowlist: string[];
  off_allowlist: string[];
} {
  const pdfRe = /href\s*=\s*["']([^"']+\.pdf(?:[?#][^"']*)?)["']/gi;
  const on: string[] = [];
  const off: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pdfRe.exec(html))) {
    let url = m[1]!.trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('/')) url = 'https://www.chittorgarh.com' + url;
    if (seen.has(url)) continue;
    seen.add(url);
    let host = '';
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      continue;
    }
    if (HOST_ALLOWLIST.has(host)) on.push(url);
    else off.push(url);
  }
  const field: ExtractedField<string[]> = on.length > 0
    ? { value: on, found: true, source_snippet: snippet(on.join(' | ')) }
    : { value: null, found: false, source_snippet: null };
  return { field, on_allowlist: on, off_allowlist: off };
}

function extractOne(detailIndex: number, htmlPath: string, sourceUrl: string | null): ExtractedDetail | null {
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, 'utf-8');
  const text = stripTags(html);

  const company = extractCompanyName(html);
  const issueSize = extractIssueSizeCr(text);
  const priceBand = extractPriceBand(text);
  const lotSize = extractLotSize(text);
  const openDate = extractDate(text, ['IPO Open Date', 'Open Date', 'Issue Open']);
  const closeDate = extractDate(text, ['IPO Close Date', 'Close Date', 'Issue Close']);
  const listingDate = extractDate(text, ['Listing Date', 'IPO Listing Date']);
  const registrar = extractRegistrar(text);
  const brlms = extractBrlms(text, html);
  const pdfs = extractOfficialPdfLinks(html);

  const fields: Record<FieldKey, ExtractedField> = {
    company_name: company,
    issue_size_cr: issueSize,
    price_band: priceBand,
    lot_size: lotSize,
    open_date: openDate,
    close_date: closeDate,
    listing_date: listingDate,
    registrar,
    brlms,
    official_pdf_links: pdfs.field,
  };

  const found_count = Object.values(fields).filter((f) => f.found).length;
  const precision_ratio = found_count / EXPECTED_FIELDS.length;

  return {
    detail_index: detailIndex,
    source_html_path: htmlPath,
    source_url: sourceUrl,
    fields,
    found_count,
    precision_ratio,
    official_pdf_links_on_allowlist: pdfs.on_allowlist,
    official_pdf_links_off_allowlist: pdfs.off_allowlist,
  };
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const brokerPagesDir = join(ctx.outDir, 'broker-pages');
  ensureDir(brokerPagesDir);

  const summary = loadFieldsSummary(brokerPagesDir);
  const pickedUrls = summary?.picked_detail_urls ?? [];

  const extracted: ExtractedDetail[] = [];
  for (let i = 1; i <= 2; i++) {
    const htmlPath = join(brokerPagesDir, `chittorgarh-detail-${i}-rendered.html`);
    const sourceUrl = pickedUrls.find((p) => p.index === i)?.url ?? null;
    const result = extractOne(i, htmlPath, sourceUrl);
    if (result) {
      writeFileSync(
        join(brokerPagesDir, `chittorgarh-detail-${i}-extracted.json`),
        JSON.stringify(result, null, 2) + '\n'
      );
      extracted.push(result);
    }
  }

  // Aggregate
  const avgPrecision =
    extracted.length > 0
      ? extracted.reduce((s, e) => s + e.precision_ratio, 0) / extracted.length
      : 0;
  const totalOnAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_on_allowlist.length, 0);
  const totalOffAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_off_allowlist.length, 0);

  // Aggregate summary file
  writeFileSync(
    join(brokerPagesDir, 'chittorgarh-extraction-summary.json'),
    JSON.stringify(
      {
        generated_at_utc: ctx.nowIso,
        details_extracted: extracted.length,
        average_precision_ratio: Number(avgPrecision.toFixed(3)),
        per_detail: extracted.map((e) => ({
          index: e.detail_index,
          source_url: e.source_url,
          found_count: e.found_count,
          precision_ratio: Number(e.precision_ratio.toFixed(3)),
          official_pdf_links_on_allowlist: e.official_pdf_links_on_allowlist,
          official_pdf_links_off_allowlist_count: e.official_pdf_links_off_allowlist.length,
        })),
      },
      null,
      2
    ) + '\n'
  );

  // Status classification per §Y.9.1 precondition 3 (≥ 80% precision target,
  // but probe status is GREEN at ≥ 60% as the soft floor; user decision uses
  // the 80% precision-gate threshold from the status report).
  let status: ProbeResult['status'];
  let recommended_action: string;
  let response_type: ProbeResult['response_type'];
  if (extracted.length === 0) {
    status = 'RED';
    response_type = 'EMPTY';
    recommended_action = 'P-25 has not been run yet, or its HTML output is missing. Run P-25 first.';
  } else if (avgPrecision >= 0.8) {
    status = 'GREEN';
    response_type = 'JSON';
    recommended_action = 'Extraction meets the §Y.9.1 precondition-3 threshold (≥ 80%). Continue to user-decision gate.';
  } else if (avgPrecision >= 0.6) {
    status = 'YELLOW';
    response_type = 'JSON';
    recommended_action = 'Extraction below §Y.9.1 threshold. Refine selectors before approving any ingestion slice.';
  } else {
    status = 'RED';
    response_type = 'JSON';
    recommended_action = 'Extraction precision too low. Chittorgarh ingestion slice should be rejected at the §Y.9.1 gate.';
  }

  const fields_found: string[] = [];
  for (const e of extracted) {
    for (const k of EXPECTED_FIELDS) {
      if (e.fields[k].found) fields_found.push(`d${e.detail_index}.${k}`);
    }
  }
  const fields_missing: string[] = [];
  for (const e of extracted) {
    for (const k of EXPECTED_FIELDS) {
      if (!e.fields[k].found) fields_missing.push(`d${e.detail_index}.${k}`);
    }
  }

  const notes = [
    `details_extracted=${extracted.length}`,
    `avg_precision=${avgPrecision.toFixed(3)}`,
    `official_pdf_links_on_allowlist=${totalOnAllowlist}`,
    `official_pdf_links_off_allowlist=${totalOffAllowlist}`,
  ].join(' | ');

  return {
    probe_id: 'P-26',
    source: 'Chittorgarh — detail field extraction (Phase 5C)',
    url_or_endpoint: 'phase-0/broker-pages/chittorgarh-detail-*-rendered.html (on disk)',
    fetch_method: 'disk read (no network) — extracts from P-25 captured HTML',
    headers_or_cookies_required: [],
    status_code: null,
    response_type,
    fields_found,
    fields_missing,
    sample_record: JSON.stringify(
      {
        avg_precision_ratio: Number(avgPrecision.toFixed(3)),
        details: extracted.map((e) => ({
          index: e.detail_index,
          source_url: e.source_url,
          found_count: e.found_count,
          precision_ratio: Number(e.precision_ratio.toFixed(3)),
        })),
      },
      null,
      2
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Medium',
    freshness_or_update_frequency: 'N/A — operates on disk',
    status,
    recommended_action,
    fallback_source: 'P-25 (re-run to refresh HTML)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
