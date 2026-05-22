// P-26b — Chittorgarh detail field extraction retune (Phase 6A.1).
//
// Reads chittorgarh-detail-{1,2,3}-rendered-v2.html from disk (written by
// P-25b) and runs a refined per-field extraction pass. ADDS the §10.3
// label patterns (open_date / close_date / listing_date / registrar /
// brlms) on top of the original P-26 table-aware selectors, plus a
// few Chittorgarh-specific helpers (registrar via class="registrar-name",
// dates parsed from combined "IPO Date" range cells).
//
// Computes TWO precision metrics per the §10.2 acceptance gate:
//   - full-10 precision (per Phase 5C P-26 baseline)
//   - narrow-5 precision over the gap-fill set:
//       open_date / close_date / listing_date / price_band / lot_size
//
// Status thresholds (§10.2 item 5):
//   - GREEN  if full-10 >= 0.80 OR narrow-5 >= 0.90
//   - YELLOW if full-10 >= 0.60 OR narrow-5 >= 0.80
//   - RED    otherwise
//
// Disk-read only. No network. No production-snapshot mutation. No type
// changes.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

// ─── Official-host allow-list (used by official_pdf_links extractor) ────
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

// Narrow-5 set per the §10.2 / §5 / §10.3 plan — fields most valuable
// for fast-fill of currently-null OnEMI master rows.
const NARROW_FIELDS: ReadonlyArray<FieldKey> = [
  'open_date', 'close_date', 'listing_date', 'price_band', 'lot_size',
];

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
  slug: string | null;
  fields: Record<FieldKey, ExtractedField>;
  found_count_full: number;
  found_count_narrow: number;
  precision_ratio_full: number;
  precision_ratio_narrow: number;
  official_pdf_links_on_allowlist: string[];
  official_pdf_links_off_allowlist: string[];
  noise_stripped_bytes: number;
  main_content_bytes: number;
  tables_parsed: number;
  table_rows_parsed: number;
}

// ─── HTML helpers ──────────────────────────────────────────────────────
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
    s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
     .replace(/<style[\s\S]*?<\/style>/gi, ' ')
     .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}
function stripNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<div\b[^>]*\bclass\s*=\s*["'][^"']*\b(?:sidebar|side-bar|side_nav|side_menu|advertisement|ads-container)\b[^"']*["'][\s\S]*?<\/div>/gi, ' ');
}
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

// ─── Table parser ──────────────────────────────────────────────────────
interface ParsedRow { cells: string[]; }
interface ParsedTable { rows: ParsedRow[]; }
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
      while ((cm = cellRe.exec(rowHtml))) cells.push(stripTags(cm[1]!));
      if (cells.length > 0) rows.push({ cells });
    }
    if (rows.length > 0) tables.push({ rows });
  }
  return tables;
}
function countTableRows(tables: ParsedTable[]): number {
  return tables.reduce((s, t) => s + t.rows.length, 0);
}
function findLabelValue(
  tables: ParsedTable[],
  labelPatterns: RegExp[],
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
          if (value) return { value, table_index: t, row_index: r, matched_label: label };
        }
      }
    }
  }
  return null;
}

// ─── Validators ────────────────────────────────────────────────────────
function looksLikeMoneyCr(v: string): boolean {
  return /[\d,.]+\s*(?:Cr|Crore|crores?|Rs\.?|₹)/i.test(v)
    && !/%|Subscription|Year-wise|Gain\s+on\s+Listing|Performance/i.test(v);
}
function looksLikePriceBand(v: string): boolean {
  return /[\d,.]+\s*[-–to]\s*[\d,.]+|\₹\s*[\d,.]+\s*(?:to|-)\s*\₹?\s*[\d,.]+/i.test(v)
    && !/Year-wise|Subscription|%/i.test(v);
}
function looksLikeLotSize(v: string): boolean {
  return /^\d{1,7}(?:\s*Shares)?$/i.test(v.trim().replace(/,/g, ''))
    || /\b\d{2,7}\s*Shares?\b/i.test(v);
}
const DATE_RE_FULL_MONTH = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i;
const DATE_RE_DAY_FIRST = /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/i;
const DATE_RE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
function looksLikeDate(v: string): boolean {
  return DATE_RE_FULL_MONTH.test(v) || DATE_RE_DAY_FIRST.test(v) || DATE_RE_ISO.test(v);
}
function looksLikeCompanyName(v: string): boolean {
  if (v.length < 6 || v.length > 150) return false;
  if (/\b(?:List\s+of\s+Issues|Lead\s+Manager|Performance|Allotment|Calculator|Comparison|Calendar|Discussions?)\b/i.test(v)) return false;
  return /[A-Z]/.test(v);
}

// ─── Field extractors ──────────────────────────────────────────────────
function extractCompanyName(html: string): ExtractedField<string> {
  const cleanSeo = (raw: string): string => {
    let t = stripTags(raw);
    t = t.replace(/\s+IPO\s+(?:Date|Price|GMP|Review|Analysis|Detail|Allotment|Subscription|Open|Close|Listing)[\s\S]*$/i, ' IPO');
    t = t.replace(/\s+Date\s*,\s*Price[\s\S]*$/i, '');
    t = t.replace(/\s+(?:Review|Analysis|Allotment|Subscription)[\s\S]*$/i, '');
    return t.replace(/\s+/g, ' ').trim();
  };
  const isSuspicious = (t: string): boolean =>
    /\b(?:Date|Price|GMP|Review|Analysis|Allotment|Subscription)\b/i.test(t) || t.length < 3 || t.length > 100;
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const cleaned = cleanSeo(h1[1]!);
    if (cleaned && !isSuspicious(cleaned)) {
      return { value: cleaned, found: true, confidence: 'high', method: 'h1-cleaned', why_missing: null, source_snippet: snippet(cleaned) };
    }
    if (cleaned) {
      return { value: cleaned, found: false, confidence: 'low', method: 'h1-cleaned-rejected', why_missing: `h1 text still SEO-noisy or out-of-range after cleaning: "${cleaned.slice(0, 80)}"`, source_snippet: snippet(cleaned) };
    }
  }
  const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (t) {
    const cleaned = cleanSeo(t[1]!);
    if (cleaned && !isSuspicious(cleaned)) {
      return { value: cleaned, found: true, confidence: 'medium', method: 'title-fallback-cleaned', why_missing: null, source_snippet: snippet(cleaned) };
    }
  }
  return { value: null, found: false, confidence: null, method: null, why_missing: '<h1> absent or post-cleaning still SEO-noisy; <title> fallback also unusable', source_snippet: null };
}

function extractIssueSize(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:Total\s+)?Issue\s+Size\s*\(?\s*₹?\s*Cr(?:ore)?\.?\)?\s*$/i,
    /^\s*(?:Total\s+)?Issue\s+Size\s*$/i,
    /^\s*Issue\s+Size\s+(?:in\s+)?(?:Cr|Crore)/i,
    /^\s*IPO\s+Size\s*$/i,
  ]);
  if (!lv) return { value: null, found: false, confidence: null, method: null, why_missing: 'no table row whose label matches "(Total) Issue Size" / "IPO Size"', source_snippet: null };
  if (looksLikeMoneyCr(lv.value) && lv.value.length < 80) {
    return { value: lv.value, found: true, confidence: 'high', method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`, why_missing: null, source_snippet: snippet(lv.value) };
  }
  return { value: lv.value.slice(0, 100), found: false, confidence: 'low', method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`, why_missing: `value '${lv.value.slice(0, 60)}' failed Cr-money validation`, source_snippet: snippet(lv.value) };
}

function extractPriceBand(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Price\s+Band\s*$/i,
    /^\s*Price\s+Range\s*$/i,
    /^\s*Price\s*$/i,
  ]);
  if (!lv) return { value: null, found: false, confidence: null, method: null, why_missing: 'no table row whose label matches "Price Band" / "Price Range" / "Price"', source_snippet: null };
  if (looksLikePriceBand(lv.value) && lv.value.length < 80) {
    return { value: lv.value, found: true, confidence: 'high', method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`, why_missing: null, source_snippet: snippet(lv.value) };
  }
  return { value: lv.value.slice(0, 100), found: false, confidence: 'low', method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`, why_missing: `value '${lv.value.slice(0, 60)}' failed price-band validation`, source_snippet: snippet(lv.value) };
}

function extractLotSize(tables: ParsedTable[]): ExtractedField<string> {
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Lot\s+Size\s*$/i,
    /^\s*Market\s+Lot\s*$/i,
    /^\s*Minimum\s+Order\s+Quantity\s*$/i,
  ]);
  if (!lv) return { value: null, found: false, confidence: null, method: null, why_missing: 'no table row whose label matches "Lot Size" / "Market Lot" / "Minimum Order Quantity"', source_snippet: null };
  if (looksLikeLotSize(lv.value)) {
    return { value: lv.value, found: true, confidence: 'high', method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`, why_missing: null, source_snippet: snippet(lv.value) };
  }
  return { value: lv.value.slice(0, 80), found: false, confidence: 'low', method: `table[${lv.table_index}].row[${lv.row_index}]-rejected`, why_missing: `value '${lv.value.slice(0, 60)}' failed lot-size validation`, source_snippet: snippet(lv.value) };
}

// Dates — §10.3 patterns + Chittorgarh "IPO Date" / "Bid Date" range fallback.
function extractDate(
  tables: ParsedTable[],
  labelPatterns: RegExp[],
  kindLabel: string,
  rangePart: 'start' | 'end' | null,
): ExtractedField<string> {
  // 1) Direct label match per §10.3 prompt.
  const lv = findLabelValue(tables, labelPatterns);
  if (lv && looksLikeDate(lv.value)) {
    return { value: lv.value, found: true, confidence: 'high', method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`, why_missing: null, source_snippet: snippet(lv.value) };
  }
  // 2) Chittorgarh-specific fallback: parse the "IPO Date" / "Bid Date" cell
  //    which often carries a combined range like "30 Apr, 2026 to 05 May, 2026"
  //    OR "Wed, Apr 29, 2026" (single day). When `rangePart` is set, we try
  //    to split a "X to Y" range and return the requested side.
  if (rangePart) {
    const range = findLabelValue(tables, [/^\s*(?:IPO|Bid|Issue)\s+Date\s*$/i]);
    if (range) {
      const splitRe = /(.+?)(?:\s+to\s+|\s*[-–]\s*)(.+)/i;
      const m = range.value.match(splitRe);
      if (m && looksLikeDate(m[1]!) && looksLikeDate(m[2]!)) {
        const v = rangePart === 'start' ? m[1]!.trim() : m[2]!.trim();
        return {
          value: v,
          found: true,
          confidence: 'medium',
          method: `table[${range.table_index}].row[${range.row_index}] label="${range.matched_label}" (range-split, ${rangePart})`,
          why_missing: null,
          source_snippet: snippet(range.value),
        };
      }
    }
  }
  return {
    value: lv?.value ? lv.value.slice(0, 100) : null,
    found: false,
    confidence: lv ? 'low' : null,
    method: lv ? `table[${lv.table_index}].row[${lv.row_index}]-rejected` : null,
    why_missing: lv
      ? `value '${lv.value.slice(0, 60)}' failed date validation`
      : `no table row whose label matches ${kindLabel}; "IPO Date"/"Bid Date" range fallback also missed`,
    source_snippet: lv ? snippet(lv.value) : null,
  };
}

// Registrar — §10.3 label patterns + Chittorgarh-specific class="registrar-name" fallback.
function extractRegistrar(tables: ParsedTable[], html: string): ExtractedField<string> {
  // 1) Direct label match in tables (§10.3 patterns).
  const lv = findLabelValue(tables, [
    /^\s*(?:IPO\s+)?Registrar\s*$/i,
    /^\s*Registrar\s+to\s+(?:the\s+)?Issue\s*$/i,
  ]);
  if (lv && looksLikeCompanyName(lv.value)) {
    return { value: lv.value, found: true, confidence: 'high', method: `table[${lv.table_index}].row[${lv.row_index}] label="${lv.matched_label}"`, why_missing: null, source_snippet: snippet(lv.value) };
  }
  // 2) Chittorgarh-specific: look for class="registrar-name" anchor or near.
  //    Captured text up to the next opening tag — strip + sanity-check.
  const classMatch = html.match(/class\s*=\s*["'][^"']*\bregistrar-name\b[^"']*["'][^>]*>([\s\S]{0,300})/i);
  if (classMatch) {
    // Take the first ~120 chars and strip everything after first contact-info pattern.
    let candidate = stripTags(classMatch[1]!);
    // Trim trailing contact info ("Tel:", "Email:", phone numbers, "(IPO Registrar...")
    candidate = candidate.split(/\s+(?:Tel\.?:|Phone:|Email:|E-mail:|\d{8,}|<a |IPO\s+Registrar)/i)[0]!.trim();
    candidate = candidate.replace(/\s+/g, ' ').trim();
    // Drop trailing comma / period
    candidate = candidate.replace(/[,;.\s]+$/, '');
    if (looksLikeCompanyName(candidate)) {
      return {
        value: candidate.slice(0, 120),
        found: true,
        confidence: 'medium',
        method: 'class="registrar-name" anchor (Chittorgarh-specific)',
        why_missing: null,
        source_snippet: snippet(candidate),
      };
    }
  }
  return {
    value: lv?.value ? lv.value.slice(0, 120) : null,
    found: false,
    confidence: lv ? 'low' : null,
    method: lv ? `table[${lv.table_index}].row[${lv.row_index}]-rejected` : null,
    why_missing: lv
      ? `value '${lv.value.slice(0, 60)}' failed company-name validation`
      : 'no "Registrar" / "Registrar to the Issue" table label; class="registrar-name" fallback also missed or unparseable',
    source_snippet: lv ? snippet(lv.value) : null,
  };
}

// BRLMs — §10.3 label patterns. Chittorgarh's lead-manager section is
// often JS-rendered; if it shows up in the cached HTML, the table label
// match catches it.
function extractBrlms(tables: ParsedTable[]): ExtractedField<string[]> {
  const lv = findLabelValue(tables, [
    /^\s*(?:Book\s+Running\s+)?Lead\s+Manager(?:\(s\))?\s*$/i,
    /^\s*BRLM\s*$/i,
    /^\s*IPO\s+Lead\s+Manager(?:s|\(s\))?\s*$/i,
    /^\s*Merchant\s+Banker(?:s|\(s\))?\s*$/i,
  ]);
  if (!lv) return { value: null, found: false, confidence: null, method: null, why_missing: 'no table row whose label matches "Lead Manager(s)" / "BRLM" / "Merchant Banker(s)"', source_snippet: null };
  const candidates = lv.value.split(/\s*(?:\||,|\s+and\s+|;)\s*/i).map((s) => s.trim()).filter((s) => s.length >= 6 && s.length <= 120);
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
    try { host = new URL(url).host.toLowerCase(); } catch { continue; }
    if (HOST_ALLOWLIST.has(host)) on.push(url); else off.push(url);
  }
  if (on.length > 0) {
    return {
      field: { value: on, found: true, confidence: 'high', method: `href[*.pdf] scan; ${on.length} on-allowlist, ${off.length} off-allowlist`, why_missing: null, source_snippet: snippet(on.join(' | ')) },
      on_allowlist: on, off_allowlist: off,
    };
  }
  return {
    field: { value: null, found: false, confidence: off.length > 0 ? 'low' : null, method: off.length > 0 ? `href[*.pdf] scan; ${off.length} found but all off-allowlist` : null, why_missing: off.length > 0 ? `${off.length} PDF link(s) found but none on the official allow-list` : 'no .pdf href found in the captured HTML', source_snippet: off.length > 0 ? snippet(off.slice(0, 3).join(' | ')) : null },
    on_allowlist: on, off_allowlist: off,
  };
}

// ─── Per-detail orchestration ──────────────────────────────────────────
function extractOne(detailIndex: number, htmlPath: string, sourceUrl: string | null, slug: string | null): ExtractedDetail | null {
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, 'utf-8');
  const stripped = stripNoise(html);
  const main = extractMainContent(html);
  const tables = parseTables(main);
  const tableRows = countTableRows(tables);

  const company = extractCompanyName(html);
  const issueSize = extractIssueSize(tables);
  const priceBand = extractPriceBand(tables);
  const lotSize = extractLotSize(tables);
  // §10.3 prompt patterns + Chittorgarh-specific range fallback.
  const openDate = extractDate(
    tables,
    [
      /^\s*(?:IPO\s+)?(?:Issue\s+)?Open\s+Date\s*$/i,
      /^\s*Opening\s+Date\s*$/i,
      /^\s*Bid\s*\/?\s*Offer\s+Open\s*$/i,
      /^\s*Bid\s+Open\s*$/i,
      /^\s*Issue\s+Open\s*$/i,
    ],
    '"IPO Open Date" / "Opening Date" / "Bid Open"',
    'start',
  );
  const closeDate = extractDate(
    tables,
    [
      /^\s*(?:IPO\s+)?(?:Issue\s+)?Close\s+Date\s*$/i,
      /^\s*Closing\s+Date\s*$/i,
      /^\s*Bid\s*\/?\s*Offer\s+Close\s*$/i,
      /^\s*Bid\s+Close\s*$/i,
      /^\s*Issue\s+Close\s*$/i,
    ],
    '"IPO Close Date" / "Closing Date" / "Bid Close"',
    'end',
  );
  const listingDate = extractDate(
    tables,
    [
      /^\s*(?:IPO\s+)?Listing\s+Date\s*$/i,
      /^\s*Tentative\s+Listing(?:\s+Date)?\s*$/i,
    ],
    '"Listing Date" / "Tentative Listing"',
    null, // no range fallback for listing_date
  );
  const registrar = extractRegistrar(tables, html);
  const brlms = extractBrlms(tables);
  const pdfs = extractOfficialPdfLinks(main);

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

  // Phase 5C.3 found-count rule: confidence != 'low' AND found.
  const foundFull = Object.values(fields).filter((f) => f.found && f.confidence !== 'low' && f.confidence !== null).length;
  const foundNarrow = NARROW_FIELDS.filter((k) => {
    const f = fields[k];
    return f.found && f.confidence !== 'low' && f.confidence !== null;
  }).length;

  return {
    detail_index: detailIndex,
    source_html_path: htmlPath,
    source_url: sourceUrl,
    slug,
    fields,
    found_count_full: foundFull,
    found_count_narrow: foundNarrow,
    precision_ratio_full: foundFull / EXPECTED_FIELDS.length,
    precision_ratio_narrow: foundNarrow / NARROW_FIELDS.length,
    official_pdf_links_on_allowlist: pdfs.on_allowlist,
    official_pdf_links_off_allowlist: pdfs.off_allowlist,
    noise_stripped_bytes: stripped.length,
    main_content_bytes: main.length,
    tables_parsed: tables.length,
    table_rows_parsed: tableRows,
  };
}

// ─── Probe entrypoint ──────────────────────────────────────────────────
export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  const brokerPagesDir = join(ctx.outDir, 'broker-pages');
  ensureDir(brokerPagesDir);

  // Read the P-25b summary (picked URLs + slugs + selection rationale).
  const fieldsV2Path = join(brokerPagesDir, 'chittorgarh-fields-v2.json');
  type FieldsV2 = {
    picked_detail_urls?: Array<{ index: number; url: string; slug: string | null }>;
    third_ipo_selection?: { slug: string; url: string; status: string; reason: string };
  };
  let pickedUrls: Array<{ index: number; url: string; slug: string | null }> = [];
  let thirdSelection: FieldsV2['third_ipo_selection'] | undefined;
  if (existsSync(fieldsV2Path)) {
    try {
      const j = JSON.parse(readFileSync(fieldsV2Path, 'utf-8')) as FieldsV2;
      pickedUrls = j.picked_detail_urls ?? [];
      thirdSelection = j.third_ipo_selection;
    } catch {
      // Empty / unparseable — fall through; extractOne() will mark per-IPO absent.
    }
  }

  // Extract from up to 3 detail files.
  const extracted: ExtractedDetail[] = [];
  for (let i = 1; i <= 3; i++) {
    const htmlPath = join(brokerPagesDir, `chittorgarh-detail-${i}-rendered-v2.html`);
    const meta = pickedUrls.find((p) => p.index === i);
    const sourceUrl = meta?.url ?? null;
    const slug = meta?.slug ?? null;
    const result = extractOne(i, htmlPath, sourceUrl, slug);
    if (result) {
      writeFileSync(
        join(brokerPagesDir, `chittorgarh-detail-${i}-extracted-retuned.json`),
        JSON.stringify(result, null, 2) + '\n',
      );
      extracted.push(result);
    }
  }

  // Aggregate precision metrics.
  const avgFull = extracted.length > 0
    ? extracted.reduce((s, e) => s + e.precision_ratio_full, 0) / extracted.length : 0;
  const avgNarrow = extracted.length > 0
    ? extracted.reduce((s, e) => s + e.precision_ratio_narrow, 0) / extracted.length : 0;
  const totalOnAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_on_allowlist.length, 0);
  const totalOffAllowlist = extracted.reduce((s, e) => s + e.official_pdf_links_off_allowlist.length, 0);

  // Per-IPO per-field summary for the status doc.
  const summary = {
    generated_at_utc: ctx.nowIso,
    details_extracted: extracted.length,
    average_precision_ratio_full: Number(avgFull.toFixed(3)),
    average_precision_ratio_narrow: Number(avgNarrow.toFixed(3)),
    third_ipo_selection: thirdSelection ?? null,
    per_detail: extracted.map((e) => ({
      index: e.detail_index,
      slug: e.slug,
      source_url: e.source_url,
      found_count_full: e.found_count_full,
      found_count_narrow: e.found_count_narrow,
      precision_ratio_full: Number(e.precision_ratio_full.toFixed(3)),
      precision_ratio_narrow: Number(e.precision_ratio_narrow.toFixed(3)),
      main_content_bytes: e.main_content_bytes,
      tables_parsed: e.tables_parsed,
      table_rows_parsed: e.table_rows_parsed,
      fields_high_confidence: Object.entries(e.fields).filter(([, v]) => v.found && v.confidence === 'high').map(([k]) => k),
      fields_medium_confidence: Object.entries(e.fields).filter(([, v]) => v.found && v.confidence === 'medium').map(([k]) => k),
      fields_rejected_low_confidence: Object.entries(e.fields).filter(([, v]) => v.confidence === 'low').map(([k]) => k),
      fields_missing: Object.entries(e.fields).filter(([, v]) => !v.found && v.confidence !== 'low').map(([k]) => k),
      official_pdf_links_on_allowlist: e.official_pdf_links_on_allowlist,
      official_pdf_links_off_allowlist_count: e.official_pdf_links_off_allowlist.length,
    })),
  };
  writeFileSync(
    join(brokerPagesDir, 'chittorgarh-extraction-summary-v2.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );

  // Status classification per §10.2 item 5.
  let status: ProbeResult['status'];
  let recommended_action: string;
  let response_type: ProbeResult['response_type'];
  if (extracted.length === 0) {
    status = 'RED';
    response_type = 'EMPTY';
    recommended_action = 'No P-25b output HTML found. Run P-25b first (npm run probe -- --probe P-25b).';
  } else if (avgFull >= 0.80 || avgNarrow >= 0.90) {
    status = 'GREEN';
    response_type = 'JSON';
    recommended_action = `Precision met (full=${avgFull.toFixed(2)} narrow=${avgNarrow.toFixed(2)}). Ready for Phase 6A.2 planning approval.`;
  } else if (avgFull >= 0.60 || avgNarrow >= 0.80) {
    status = 'YELLOW';
    response_type = 'JSON';
    recommended_action = `Precision close but below GREEN gate (full=${avgFull.toFixed(2)} narrow=${avgNarrow.toFixed(2)}). RETUNE selectors or accept gap-fill-only narrow set.`;
  } else {
    status = 'RED';
    response_type = 'JSON';
    recommended_action = `Precision below thresholds (full=${avgFull.toFixed(2)} narrow=${avgNarrow.toFixed(2)}). HOLD Phase 6A; reconsider strategy.`;
  }

  const fields_found: string[] = [];
  const fields_missing: string[] = [];
  for (const e of extracted) {
    for (const k of EXPECTED_FIELDS) {
      const f = e.fields[k];
      if (f.found && f.confidence !== 'low') fields_found.push(`d${e.detail_index}.${k}[${f.confidence}]`);
      else fields_missing.push(`d${e.detail_index}.${k}${f.confidence === 'low' ? '[low]' : '[missing]'}`);
    }
  }

  const notes = [
    `details_extracted=${extracted.length}`,
    `avg_full=${avgFull.toFixed(3)}`,
    `avg_narrow=${avgNarrow.toFixed(3)}`,
    `pdf_on_allowlist=${totalOnAllowlist}`,
    `pdf_off_allowlist=${totalOffAllowlist}`,
    `third_ipo=${thirdSelection?.slug ?? '—'}(${thirdSelection?.status ?? 'unknown'})`,
    ...extracted.map((e) => `d${e.detail_index}:${e.slug ?? '—'} full=${e.precision_ratio_full.toFixed(2)} narrow=${e.precision_ratio_narrow.toFixed(2)}`),
  ].join(' | ');

  return {
    probe_id: 'P-26b',
    source: 'Chittorgarh — detail field extraction retune (Phase 6A.1)',
    url_or_endpoint: 'phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html (on disk)',
    fetch_method: 'disk read (no network) — extracts from P-25b captured HTML via table-aware parser + §10.3 patterns + Chittorgarh-specific helpers',
    headers_or_cookies_required: [],
    status_code: null,
    response_type,
    fields_found,
    fields_missing,
    sample_record: JSON.stringify(
      {
        avg_full: Number(avgFull.toFixed(3)),
        avg_narrow: Number(avgNarrow.toFixed(3)),
        third_ipo_selection: thirdSelection ?? null,
        per_detail: summary.per_detail.map((d) => ({
          index: d.index, slug: d.slug, found_full: d.found_count_full, found_narrow: d.found_count_narrow,
          high: d.fields_high_confidence, medium: d.fields_medium_confidence, low: d.fields_rejected_low_confidence,
        })),
      },
      null,
      2,
    ),
    parsing_difficulty: 'Medium',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Medium',
    freshness_or_update_frequency: 'N/A — operates on disk',
    status,
    recommended_action,
    fallback_source: 'P-25b (re-run to refresh HTML)',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes,
  };
};
