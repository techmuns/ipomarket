// P-26 — Chittorgarh sample detail field extraction (Phase 5C.3 calibration).
//
// Reads HTML files written by P-25 from disk and runs node-side table-aware
// extraction against the Chittorgarh detail-page structure. Does NOT
// re-fetch — that would violate the §Y.4 rule 7 single-request-per-page
// rule. If P-25 hasn't been run yet, P-26 returns RED with a clear note.
//
// Phase 5C.3 changes vs the prior body-wide regex approach:
//   1. Strip sidebar / nav / footer / aside / script / style noise blocks
//      before extraction so SEO chrome can't pollute matches.
//   2. Prefer <main>...</main> content when present; otherwise operate on
//      the noise-stripped body.
//   3. Parse <table>/<tr>/<td|th> into label→value rows. Per-field
//      extraction looks ONLY at table rows whose label cell exactly /
//      narrowly matches the expected label patterns. This eliminates the
//      previous false-positive class (sidebar headings matching "Issue
//      Size" / "Registrar" body-wide).
//   4. Each field records: value, found, confidence (high/medium/low),
//      method (which extractor strategy fired), why_missing (when found is
//      false), source_snippet.
//   5. Suspicious values (e.g. company_name containing SEO suffix keywords,
//      issue_size containing "Subscription/Year-wise/% Gain") are marked
//      found=false / confidence=low rather than counted as extracted.
//   6. precision_ratio counts only fields with `found: true` AND
//      `confidence != 'low'`.
//
// Per-field extraction precision is computed against the 10 expected
// fields. Writes one `chittorgarh-detail-{N}-extracted.json` per detail
// page, plus an aggregate precision summary.
//
// Status thresholds (unchanged from prior version):
//   avg precision ≥ 0.80 → GREEN
//   avg precision ≥ 0.60 → YELLOW
//   else → RED

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
type Confidence = 'high' | 'medium' | 'low';

interface ExtractedField<T = unknown> {
  value: T | null;
  found: boolean;
  confidence: Confidence | null;
  method: string | null;
  why_missing: string | null;
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
  // Phase 5C.3 — diagnostics for the calibration pass.
  noise_stripped_bytes: number;
  main_content_bytes: number;
  tables_parsed: number;
  table_rows_parsed: number;
}

// ─── Loaders ───────────────────────────────────────────────────────────

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

// ─── Generic HTML helpers ──────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&[a-z]+;/g, ' ');
}

function stripTags(s: string): string {
  return decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip site chrome — sidebars, nav, footer, header, scripts, styles. The
// remaining HTML represents the page's main content area + any in-flow
// content. Conservative: removes well-known semantic chrome elements; does
// NOT try to remove ad blocks (those would need site-specific class
// matchers).
function stripNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    // Common sidebar class names — strip the whole div if matched.
    .replace(/<div\b[^>]*\bclass\s*=\s*["'][^"']*\b(?:sidebar|side-bar|side_nav|side_menu|advertisement|ads-container)\b[^"']*["'][\s\S]*?<\/div>/gi, ' ');
}

// Prefer <main>...</main>. Fall back to noise-stripped body.
function extractMainContent(html: string): string {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (m && m[1]!.length > 1024) return m[1]!;
  return stripNoise(html);
}

function snippet(s: string | null, n = 200): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n) + '…';
}

// ─── Table parser ─────────────────────────────────────────────────────

interface ParsedRow {
  cells: string[]; // already stripTags'd + normalised
}
interface ParsedTable {
  rows: ParsedRow[];
}

function parseTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html))) {
    const tableHtml = tm[1]!;
    const rows: ParsedRow[] = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(tableHtml))) {
      const rowHtml = rm[1]!;
      const cells: string[] = [];
      const cellRe = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rowHtml))) {
        cells.push(stripTags(cm[1]!));
      }
      if (cells.length > 0) rows.push({ cells });
    }
    if (rows.length > 0) tables.push({ rows });
  }
  return tables;
}

function countTableRows(tables: ParsedTable[]): number {
  return tables.reduce((s, t) => s + t.rows.length, 0);
}

// Find the first row whose first cell (label) matches one of the supplied
// patterns. Returns the value (joined from cells[1..]) plus diagnostic
// locator. Empty labels are skipped.
function findLabelValue(
  tables: ParsedTable[],
  labelPatterns: RegExp[]
): { value: string; table_index: number; row_index: number; matched_label: string } | null {
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]!;
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r]!;
      if (row.cells.length < 2) continue;
      const label = (row.cells[0] ?? '').replace(/\s+/g, ' ').trim();
      if (!label) continue;
      for (const pat of labelPatterns) {
        if (pat.test(label)) {
          const value = row.cells
            .slice(1)
            .map((c) => (c ?? '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join(' | ');
          if (value) {
            return { value, table_index: t, row_index: r, matched_label: label };
          }
        }
      }
    }
  }
  return null;
}

// ─── Field extractors ─────────────────────────────────────────────────

// company_name — h1-cleaned with SEO-suffix stripping. Marked low when the
// cleaned text still smells of SEO content.
function extractCompanyName(html: string): ExtractedField<string> {
  const cleanSeo = (raw: string): string => {
    let t = stripTags(raw);
    // Aggressive: anything from " IPO Date" / " IPO Price" / " IPO GMP" /
    // " IPO Review" / " IPO Analysis" onward is SEO suffix.
    t = t.replace(/\s+IPO\s+(?:Date|Price|GMP|Review|Analysis|Detail|Allotment|Subscription|Open|Close|Listing)[\s\S]*$/i, ' IPO');
    // Anything after " IPO" if the suffix is purely SEO-marker comma list:
    //   "X IPO Date, Price, GMP, Review, Analysis & Details"
    //   "X Date, Price, GMP, Review, Analysis & Details"
    t = t.replace(/\s+Date\s*,\s*Price[\s\S]*$/i, '');
    t = t.replace(/\s+(?:Review|Analysis|Allotment|Subscription)[\s\S]*$/i, '');
    // Trailing " IPO" is OK to keep; Chittorgarh slugs often end -ipo.
    return t.replace(/\s+/g, ' ').trim();
  };
  const isSuspicious = (t: string): boolean => {
    return /\b(?:Date|Price|GMP|Review|Analysis|Allotment|Subscription)\b/i.test(t)
      || t.length < 3
      || t.length > 100;
  };

  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const cleaned = cleanSeo(h1[1]!);
    if (cleaned && !isSuspicious(cleaned)) {
      return {
        value: cleaned,
        found: true,
        confidence: 'high',
        method: 'h1-cleaned',
        why_missing: null,
        source_snippet: snippet(cleaned),
      };
    }
    if (cleaned) {
      return {
        value: cleaned,
        found: false,
        confidence: 'low',
        method: 'h1-cleaned-rejected',
        why_missing: `h1 text still contained SEO keywords or out-of-range length after cleaning: "${cleaned.slice(0, 80)}"`,
        source_snippet: snippet(cleaned),
      };
    }
  }
  const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (t) {
    const cleaned = cleanSeo(t[1]!);
    if (cleaned && !isSuspicious(cleaned)) {
      return {
        value: cleaned,
        found: true,
        confidence: 'medium',
        method: 'title-fallback-cleaned',
        why_missing: null,
        source_snippet: snippet(cleaned),
      };
    }
  }
  return {
    value: null,
    found: false,
    confidence: null,
    method: null,
    why_missing: '<h1> absent or post-cleaning still SEO-noisy; <title> fallback also unusable',
    source_snippet: null,
  };
}

// Money / numeric / date validators

function looksLikeMoneyCr(v: string): boolean {
  return /[\d,.]+\s*(?:Cr|Crore|crores?|Rs\.?|₹)/i.test(v) && !/%|Subscription|Year-wise|Gain\s+on\s+Listing|Performance/i.test(v);
}
function looksLikePriceBand(v: string): boolean {
  return /[\d,.]+\s*[-–to]\s*[\d,.]+|\₹\s*[\d,.]+\s*(?:to|-)\s*\₹?\s*[\d,.]+/i.test(v)
    && !/Year-wise|Subscription|%/i.test(v);
}
function looksLikeLotSize(v: string): boolean {
  // Either pure digits, or digits followed by "Shares"
  return /^\d{1,7}(?:\s*Shares)?$/i.test(v.trim().replace(/,/g, ''))
    || /\b\d{2,7}\s*Shares?\b/i.test(v);
}
function looksLikeDate(v: string): boolean {
  return /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i.test(v)
    || /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/i.test(v)
    || /\b\d{4}-\d{2}-\d{2}\b/.test(v);
}
function looksLikeCompanyName(v: string): boolean {
  // Heuristic: has Capitalized words, length 6-150, doesn't have nav/sidebar trigger words,
  // optionally ends in suffix like Limited/Ltd/Pvt etc.
  if (v.length < 6 || v.length > 150) return false;
  if (/\b(?:List\s+of\s+Issues|Lead\s+Manager|Performance|Allotment|Calculator|Comparison|Calendar|Discussions?)\b/i.test(v)) return false;
  return /[A-Z]/.test(v);
}

function extractIssueSize(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:Total\s+)?Issue\s+Size\s*\(?\s*₹?\s*Cr(?:ore)?\.?\)?\s*$/i,
    /^\s*(?:Total\s+)?Issue\s+Size\s*$/i,
    /^\s*Issue\s+Size\s+(?:in\s+)?(?:Cr|Crore)/i,
    /^\s*IPO\s+Size\s*$/i,
  ]);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: 'no table row whose label matches "(Total) Issue Size" / "IPO Size"',
      source_snippet: null,
    };
  }
  if (looksLikeMoneyCr(lv.value) && lv.value.length < 80) {
    return {
      value: lv.value,
      found: true,
      confidence: 'high',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: lv.value.slice(0, 100),
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `value '${lv.value.slice(0, 60)}' failed Cr-money validation (likely sidebar/performance text)`,
    source_snippet: snippet(lv.value),
  };
}

function extractPriceBand(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Price\s+Band\s*$/i,
    /^\s*Price\s+Range\s*$/i,
    /^\s*Price\s*$/i,
  ]);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: 'no table row whose label matches "Price Band" / "Price Range" / "Price"',
      source_snippet: null,
    };
  }
  if (looksLikePriceBand(lv.value) && lv.value.length < 80) {
    return {
      value: lv.value,
      found: true,
      confidence: 'high',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: lv.value.slice(0, 100),
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `value '${lv.value.slice(0, 60)}' failed price-band validation (expect "₹X - ₹Y" form)`,
    source_snippet: snippet(lv.value),
  };
}

function extractLotSize(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Lot\s+Size\s*$/i,
    /^\s*Market\s+Lot\s*$/i,
    /^\s*Minimum\s+Order\s+Quantity\s*$/i,
  ]);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: 'no table row whose label matches "Lot Size" / "Market Lot" / "Minimum Order Quantity"',
      source_snippet: null,
    };
  }
  if (looksLikeLotSize(lv.value)) {
    return {
      value: lv.value,
      found: true,
      confidence: 'high',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: lv.value.slice(0, 80),
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `value '${lv.value.slice(0, 60)}' failed lot-size validation (expect digits like "2000" or "2000 Shares")`,
    source_snippet: snippet(lv.value),
  };
}

function extractDate(tables: ParsedTable[], labelPatterns: RegExp[], kindLabel: string): ExtractedField<string> {
  const lv = findLabelValue(tables, labelPatterns);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: `no table row whose label matches ${kindLabel}`,
      source_snippet: null,
    };
  }
  if (looksLikeDate(lv.value)) {
    return {
      value: lv.value,
      found: true,
      confidence: 'high',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: lv.value.slice(0, 100),
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `value '${lv.value.slice(0, 60)}' failed date validation (expected "Mon DD, YYYY" or similar)`,
    source_snippet: snippet(lv.value),
  };
}

function extractRegistrar(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Registrar\s*$/i,
    /^\s*Registrar\s+to\s+(?:the\s+)?Issue\s*$/i,
  ]);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: 'no table row whose label matches "Registrar" / "Registrar to the Issue"',
      source_snippet: null,
    };
  }
  if (looksLikeCompanyName(lv.value)) {
    return {
      value: lv.value,
      found: true,
      confidence: 'high',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: lv.value.slice(0, 120),
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `value '${lv.value.slice(0, 60)}' failed company-name validation (likely sidebar nav text)`,
    source_snippet: snippet(lv.value),
  };
}

function extractBrlms(tables: ParsedTable[]): ExtractedField<string[]> {
  const lv = findLabelValue(tables, [
    /^\s*(?:Book\s+Running\s+)?Lead\s+Manager(?:\(s\))?\s*$/i,
    /^\s*BRLM\s*$/i,
    /^\s*IPO\s+Lead\s+Manager(?:s|\(s\))?\s*$/i,
    /^\s*Merchant\s+Banker(?:s|\(s\))?\s*$/i,
  ]);
  if (!lv) {
    return {
      value: null, found: false, confidence: null, method: null,
      why_missing: 'no table row whose label matches "Lead Manager(s)" / "BRLM" / "Merchant Banker(s)"',
      source_snippet: null,
    };
  }
  // Split the value cell on common separators (comma, pipe, " and ").
  // Each chunk should look like a company name.
  const candidates = lv.value
    .split(/\s*(?:\||,|\s+and\s+|;)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6 && s.length <= 120);
  const accepted = candidates.filter(looksLikeCompanyName);
  if (accepted.length > 0) {
    return {
      value: accepted.slice(0, 10),
      found: true,
      confidence: accepted.length === candidates.length ? 'high' : 'medium',
      method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}" split-on-separator`,
      why_missing: null,
      source_snippet: snippet(lv.value),
    };
  }
  return {
    value: null,
    found: false,
    confidence: 'low',
    method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`,
    why_missing: `${candidates.length} candidate chunk(s) found but none passed company-name validation`,
    source_snippet: snippet(lv.value),
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
  if (on.length > 0) {
    return {
      field: {
        value: on,
        found: true,
        confidence: 'high',
        method: `href[*.pdf] scan; ${on.length} on-allowlist, ${off.length} off-allowlist`,
        why_missing: null,
        source_snippet: snippet(on.join(' | ')),
      },
      on_allowlist: on,
      off_allowlist: off,
    };
  }
  return {
    field: {
      value: null,
      found: false,
      confidence: off.length > 0 ? 'low' : null,
      method: off.length > 0 ? `href[*.pdf] scan; ${off.length} found but all off-allowlist` : null,
      why_missing:
        off.length > 0
          ? `${off.length} PDF link(s) found but none on the official allow-list (sebi/nse/bse/bsesme)`
          : 'no .pdf href found in the captured HTML',
      source_snippet: off.length > 0 ? snippet(off.slice(0, 3).join(' | ')) : null,
    },
    on_allowlist: on,
    off_allowlist: off,
  };
}

// ─── Per-detail orchestration ─────────────────────────────────────────

function extractOne(detailIndex: number, htmlPath: string, sourceUrl: string | null): ExtractedDetail | null {
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, 'utf-8');

  // Pipeline: noise-strip → take <main> if present → parse tables.
  const stripped = stripNoise(html);
  const main = extractMainContent(html);
  const tables = parseTables(main);
  const tableRows = countTableRows(tables);

  const company = extractCompanyName(html); // company_name is allowed to read raw <h1>/<title>
  const issueSize = extractIssueSize(tables);
  const priceBand = extractPriceBand(tables);
  const lotSize = extractLotSize(tables);
  const openDate = extractDate(tables, [
    /^\s*(?:IPO\s+)?(?:Issue\s+)?Open\s+Date\s*$/i,
    /^\s*(?:IPO\s+)?Open\s+Date\s*$/i,
    /^\s*Bid\/Offer\s+Open\s*$/i,
    /^\s*Issue\s+Open\s*$/i,
  ], '"Open Date" / "Issue Open Date"');
  const closeDate = extractDate(tables, [
    /^\s*(?:IPO\s+)?(?:Issue\s+)?Close\s+Date\s*$/i,
    /^\s*(?:IPO\s+)?Close\s+Date\s*$/i,
    /^\s*Bid\/Offer\s+Close\s*$/i,
    /^\s*Issue\s+Close\s*$/i,
  ], '"Close Date" / "Issue Close Date"');
  const listingDate = extractDate(tables, [
    /^\s*(?:IPO\s+)?Listing\s+Date\s*$/i,
    /^\s*Tentative\s+Listing\s+Date\s*$/i,
  ], '"Listing Date"');
  const registrar = extractRegistrar(tables);
  const brlms = extractBrlms(tables);
  const pdfs = extractOfficialPdfLinks(main); // scan main content only to avoid sidebar PDFs

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

  // Phase 5C.3 — strict found_count: a field counts as extracted only when
  // `found: true` AND `confidence != 'low'`. Suspicious / rejected values
  // are not counted, regardless of whether they appear in `value`.
  const found_count = Object.values(fields).filter(
    (f) => f.found && f.confidence !== 'low' && f.confidence !== null
  ).length;
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
    noise_stripped_bytes: stripped.length,
    main_content_bytes: main.length,
    tables_parsed: tables.length,
    table_rows_parsed: tableRows,
  };
}

// ─── Probe entrypoint ─────────────────────────────────────────────────

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

  const avgPrecision =
    extracted.length > 0
      ? extracted.reduce((s, e) => s + e.precision_ratio, 0) / extracted.length
      : 0;
  const totalOnAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_on_allowlist.length, 0);
  const totalOffAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_off_allowlist.length, 0);

  // Aggregate summary file (consumed by phase-5C-status.md authoring).
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
          main_content_bytes: e.main_content_bytes,
          tables_parsed: e.tables_parsed,
          table_rows_parsed: e.table_rows_parsed,
          fields_high_confidence: Object.entries(e.fields)
            .filter(([, v]) => v.found && v.confidence === 'high')
            .map(([k]) => k),
          fields_medium_confidence: Object.entries(e.fields)
            .filter(([, v]) => v.found && v.confidence === 'medium')
            .map(([k]) => k),
          fields_rejected_low_confidence: Object.entries(e.fields)
            .filter(([, v]) => v.confidence === 'low')
            .map(([k]) => k),
          fields_missing: Object.entries(e.fields)
            .filter(([, v]) => !v.found && v.confidence !== 'low')
            .map(([k]) => k),
          official_pdf_links_on_allowlist: e.official_pdf_links_on_allowlist,
          official_pdf_links_off_allowlist_count: e.official_pdf_links_off_allowlist.length,
        })),
      },
      null,
      2
    ) + '\n'
  );

  // Status classification per §Y.9.1 precondition 3.
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
    recommended_action = 'Extraction meets the §Y.9.1 precondition-3 threshold (≥ 80%). Continue to ingestion-slice decision gate.';
  } else if (avgPrecision >= 0.6) {
    status = 'YELLOW';
    response_type = 'JSON';
    recommended_action = 'Extraction below §Y.9.1 threshold. Refine selectors before approving any ingestion slice.';
  } else {
    status = 'RED';
    response_type = 'JSON';
    recommended_action = 'Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.';
  }

  const fields_found: string[] = [];
  for (const e of extracted) {
    for (const k of EXPECTED_FIELDS) {
      const f = e.fields[k];
      if (f.found && f.confidence !== 'low') fields_found.push(`d${e.detail_index}.${k}[${f.confidence}]`);
    }
  }
  const fields_missing: string[] = [];
  for (const e of extracted) {
    for (const k of EXPECTED_FIELDS) {
      const f = e.fields[k];
      if (!f.found || f.confidence === 'low') {
        const tag = f.confidence === 'low' ? '[rejected-low]' : '[missing]';
        fields_missing.push(`d${e.detail_index}.${k}${tag}`);
      }
    }
  }

  const notes = [
    `details_extracted=${extracted.length}`,
    `avg_precision=${avgPrecision.toFixed(3)}`,
    `official_pdf_links_on_allowlist=${totalOnAllowlist}`,
    `official_pdf_links_off_allowlist=${totalOffAllowlist}`,
    ...extracted.map(
      (e) =>
        `d${e.detail_index}: main=${e.main_content_bytes}b tables=${e.tables_parsed} rows=${e.table_rows_parsed}`
    ),
  ].join(' | ');

  return {
    probe_id: 'P-26',
    source: 'Chittorgarh — detail field extraction (Phase 5C.3 calibration)',
    url_or_endpoint: 'phase-0/broker-pages/chittorgarh-detail-*-rendered.html (on disk)',
    fetch_method: 'disk read (no network) — extracts from P-25 captured HTML via table-aware parser',
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
          tables_parsed: e.tables_parsed,
          table_rows_parsed: e.table_rows_parsed,
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
