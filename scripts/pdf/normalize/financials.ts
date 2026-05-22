// Phase 5B — financial normalization (one IPO, staging only).
//
// Reads `phase-0/pdf-extracts/<ipo_id>/financials.json` (which now carries
// the additive `tables_with_cells[]` block from the Phase 5B Python
// extension) and produces a normalized JSON staging snapshot per the
// §4 schema in `phase-5B-financial-normalization-plan.md`.
//
// Strict scope (binding per the plan §7.3):
//   - Reads from disk only. Does NOT re-fetch the source PDF.
//   - Writes ONE staging file at
//     `phase-0/pdf-extracts/<ipo_id>/normalized-financials.json`.
//   - Does NOT mutate `src/data/snapshots/ipo-financials.json`
//     (or any other production snapshot).
//   - Returns a summary the orchestrator stamps into the
//     `normalization` block of `ipo-pdf-extraction-audit.json`.

import { safeWriteJson, readJsonOrNull } from '../../ingest/lib/safeWrite.ts';
import type { FinancialsExtraction } from '../lib/types.ts';
import {
  LINE_ITEM_KEYS,
  type LineItem,
  type LineItemKey,
  type LineItemMissing,
  type NormalizationConfidence,
  type NormalizationRunSummary,
  type NormalizedFinancials,
  type PeriodDetected,
  type RestatedPreference,
  type ScopePreference,
  type TableOriginEntry,
  type UnitDetected,
  type ValueByPeriod,
} from './types.ts';

// ─── Constants ────────────────────────────────────────────────────────

// Per phase-5B §6 rule 7 — labels match by starts-with (case-insensitive,
// whitespace-normalised). Listed terms are checked in order; first match wins.
const LABEL_DICTIONARY: Record<LineItemKey, string[]> = {
  revenue: [
    'revenue from operations',
    'total revenue from operations',
    'total income',
    'total revenue',
    'income from operations',
  ],
  ebitda: [
    'ebitda',
    'earnings before interest, tax, depreciation and amortisation',
    'earnings before interest, tax, depreciation and amortization',
    'earnings before interest, tax and depreciation',
    'operating profit before depreciation and amortisation',
  ],
  pat: [
    'profit for the year',
    'profit/(loss) for the year',
    'profit/(loss) for the period',
    'profit for the period',
    'profit after tax',
    'net profit',
    'profit / (loss) for the year',
    'profit / (loss) for the period',
  ],
  eps_basic: [
    'basic earnings per share',
    'earnings per share — basic',
    'earnings per share - basic',
    'earnings per equity share — basic',
    'earnings per equity share - basic',
    'eps (basic)',
    'eps - basic',
  ],
  total_assets: [
    'total assets',
    'total equity and liabilities',
  ],
  net_worth: [
    'total equity',
    'net worth',
    "shareholders' funds",
    "shareholders' equity",
    'equity attributable to shareholders',
  ],
  total_borrowings: [
    'total borrowings',
    'borrowings (current + non-current)',
    'borrowings - total',
  ],
  cash_and_equivalents: [
    'cash and cash equivalents',
    'cash and bank balances',
  ],
};

// Required line items for the §9.1 acceptance gate.
const REQUIRED_KEYS: ReadonlyArray<LineItemKey> = [
  'revenue',
  'pat',
  'total_assets',
];

// Positive-value sanity (Phase 5B §6 rule 9). PAT may be negative for
// loss-making issues; EBITDA may also be negative.
const POSITIVE_REQUIRED: ReadonlySet<LineItemKey> = new Set([
  'revenue',
  'total_assets',
  'net_worth',
  'cash_and_equivalents',
]);

// Per-share line items — EPS variants. Their raw value is in rupees per
// share, NOT in crore-aggregate units. They MUST be skipped by the crore
// conversion (which assumes the table-wide unit applies to all numeric
// cells, e.g. ₹ in millions → divide by 10). Without this guard an
// "INR millions" table would divide EPS by 10 and produce meaningless
// per-share output.
//
// `eps_diluted` is reserved here so that adding it to LINE_ITEM_KEYS in a
// future selector-tuning pass does not require touching this file again.
// Typed as ReadonlySet<string> so the constant can list future keys that
// aren't yet members of the LineItemKey union.
const PER_SHARE_KEYS: ReadonlySet<string> = new Set(['eps_basic', 'eps_diluted']);

// ─── Public API ───────────────────────────────────────────────────────

export interface NormalizeFinancialsOptions {
  ipoId: string;
  companyName: string;
  sourcePdfUrl: string;
  sourcePdfSha256: string;
  sourceDocKind: string;
  financialsJsonPath: string;
  outPath: string;
  parserVersion: string;
}

export function normalizeFinancialsForIpo(
  opts: NormalizeFinancialsOptions
): NormalizationRunSummary {
  const fin = readJsonOrNull<FinancialsExtraction>(opts.financialsJsonPath);
  if (!fin) {
    return emptySummary(
      opts.ipoId,
      `feasibility JSON missing at ${opts.financialsJsonPath}`
    );
  }
  const tablesWithCells = fin.tables_with_cells ?? [];
  if (tablesWithCells.length === 0) {
    return emptySummary(
      opts.ipoId,
      'tables_with_cells[] is empty — feasibility extractor produced no qualifying tables (high/medium confidence on a candidate page)'
    );
  }

  // Detect unit, scope, restatement preferences across all qualifying tables.
  const unit = detectUnit(tablesWithCells);
  const scopeAvailable = collectScopes(tablesWithCells);
  const scopePreferred: ScopePreference = pickScopePreference(scopeAvailable);
  const restatedAvailable = collectRestatedness(tablesWithCells);
  const restatedPreferred: RestatedPreference = restatedAvailable.hasRestated
    ? 'Restated'
    : 'Non-restated';

  // Walk each table, extract periods + line-item rows.
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  const periodAccumulator = new Map<string, PeriodDetected>();
  const lineItemByKey = new Map<LineItemKey, LineItem>();
  const tableOriginMap: TableOriginEntry[] = [];

  // Sort tables by §6 rule 6: preference = confidence (high > medium > low),
  // tie-break by page (earlier wins). This ensures higher-quality tables
  // populate line items first; duplicate-from-lower-confidence is skipped.
  const sortedTables = [...tablesWithCells].sort((a, b) => {
    const cp = confidencePriority(a.confidence_signal) - confidencePriority(b.confidence_signal);
    if (cp !== 0) return cp;
    return (a.page ?? 0) - (b.page ?? 0);
  });

  for (const t of sortedTables) {
    const tableScope: ScopePreference = (t.scope_hint as ScopePreference) ?? 'unknown';
    // §6 rule 4: if both scopes available, prefer Consolidated; skip rows from
    // the non-preferred scope (the preferred-scope table is processed first
    // when both confidence_signals are equal; tie-break by page).
    if (
      scopePreferred !== 'unknown' &&
      tableScope !== 'unknown' &&
      tableScope !== scopePreferred &&
      scopeAvailable.has(scopePreferred)
    ) {
      allWarnings.push(
        `skipped table_index=${t.table_index} (page=${t.page}) — scope=${tableScope} ` +
          `not preferred (preferred=${scopePreferred})`
      );
      continue;
    }
    // §6 rule 5: prefer Restated when both present.
    const isRestated = (t.form_hint ?? '').toLowerCase().includes('restated');
    if (
      restatedPreferred === 'Restated' &&
      !isRestated &&
      restatedAvailable.hasRestated
    ) {
      allWarnings.push(
        `skipped table_index=${t.table_index} (page=${t.page}) — non-restated form (${t.form_hint ?? 'unknown'}) ` +
          `not preferred (Restated equivalent exists)`
      );
      continue;
    }

    const cells = t.cells ?? [];
    if (cells.length < 2) continue;

    // Header rows → periods. Phase 5B tuning: SEBI restated statements often
    // split a single logical period label across multiple visual rows
    // (e.g. row 0 "As at March", row 1 "31, 2025"). parsePeriodsFromHeader
    // now inspects up to MAX_HEADER_ROWS rows, concatenating per-column
    // text, and returns the row count (`headerRowSpan`) it used. The body
    // loop starts at that span so non-numeric "header continuation" rows
    // are NOT misread as data rows.
    const { periodIndexMap, headerRowSpan } = parsePeriodsFromHeader(
      cells,
      t.page,
      allWarnings
    );
    for (const [, p] of periodIndexMap) {
      const key = p.normalized;
      // §6 rule 2 + 6: prefer higher-confidence period reading. Phase 5B
      // tuning: explicitly compare confidence rather than first-wins, so a
      // later high-confidence column reading overrides an earlier low-
      // confidence one (happens when two header reconstructions normalize
      // to the same FY via different paths).
      const existing = periodAccumulator.get(key);
      if (
        !existing ||
        confidencePriority(p.confidence) < confidencePriority(existing.confidence)
      ) {
        periodAccumulator.set(key, p);
      }
    }

    // Body rows → label → key + numeric values per period.
    const keysSeenInTable = new Set<LineItemKey>();
    for (let rowIdx = headerRowSpan; rowIdx < cells.length; rowIdx++) {
      const row = cells[rowIdx]!;
      if (row.length < 2) continue;
      const rawLabel = (row[0] ?? '').trim();
      if (!rawLabel) continue;
      const key = matchLabelToKey(rawLabel);
      if (!key) continue;

      // Already populated by a higher-confidence table? Skip per §6 rule 3.
      if (lineItemByKey.has(key)) {
        allWarnings.push(
          `duplicate line_item=${key} at table_index=${t.table_index} (page=${t.page}, conf=${t.confidence_signal}) — kept earlier higher-confidence entry`
        );
        continue;
      }

      const valuesByPeriod: Record<string, ValueByPeriod> = {};
      const valueConfidences: NormalizationConfidence[] = [];
      for (const [colIdx, period] of periodIndexMap) {
        if (colIdx >= row.length) continue;
        const raw = (row[colIdx] ?? '').trim();
        const parsed = parseNumeric(raw);
        // Phase 5B fix: per-share line items (EPS basic / diluted) stay in
        // raw rupees per share — they are NOT crore aggregates and must not
        // be divided by the table-wide unit factor.
        const normalized_cr = parsed.value == null
          ? null
          : PER_SHARE_KEYS.has(key)
          ? round2(parsed.value)
          : convertToCrores(parsed.value, unit.value);
        // §6 rule 8: negative values rejected for positive-required keys.
        let cellConf: NormalizationConfidence = parsed.confidence;
        if (
          normalized_cr != null &&
          POSITIVE_REQUIRED.has(key) &&
          normalized_cr < 0
        ) {
          cellConf = 'low';
          allWarnings.push(
            `line_item=${key} (page=${t.page}) period=${period.normalized}: ` +
              `negative value ${normalized_cr} rejected — key requires positive`
          );
        }
        if (parsed.value != null && unit.confidence === 'low') {
          // Unit ambiguity downgrades cell confidence at most one notch.
          cellConf = downgradeOne(cellConf);
        }
        valuesByPeriod[period.normalized] = {
          raw,
          normalized_cr,
          confidence: cellConf,
        };
        valueConfidences.push(cellConf);
      }

      // Determine line-item confidence: worst of (label match quality, value
      // confidences, table confidence).
      const labelConf: NormalizationConfidence = 'high'; // starts-with match → high
      const tableConf = (t.confidence_signal ?? 'low') as NormalizationConfidence;
      const overallConf = minConfidence([labelConf, ...valueConfidences, tableConf]);
      // Phase 5B tuning: an empty values_by_period means the label matched
      // but no period columns produced numeric values (period-header detection
      // shortfall). This is a "shell-only" extraction — must be flagged for
      // manual review rather than counted as a successful match.
      const hasAnyValue = Object.keys(valuesByPeriod).length > 0;
      const manualReview =
        !hasAnyValue ||
        overallConf === 'low' ||
        Object.values(valuesByPeriod).some((v) => v.confidence === 'low');

      const item: LineItem = {
        key,
        raw_label: rawLabel.slice(0, 200),
        normalized_label: humanLabel(key),
        source_page: t.page,
        source_table_index: t.table_index,
        values_by_period: valuesByPeriod,
        manual_review_required: manualReview,
      };
      lineItemByKey.set(key, item);
      keysSeenInTable.add(key);
    }

    if (keysSeenInTable.size > 0) {
      tableOriginMap.push({
        key_present: [...keysSeenInTable],
        source_page: t.page,
        table_index: t.table_index,
        scope: tableScope,
        form: t.form_hint ?? 'unknown',
      });
    }
  }

  // §6 rule 9 sanity checks on accumulated values.
  for (const item of lineItemByKey.values()) {
    if (POSITIVE_REQUIRED.has(item.key)) {
      const anyNonPositive = Object.values(item.values_by_period).some(
        (v) => v.normalized_cr != null && v.normalized_cr <= 0
      );
      if (anyNonPositive) {
        item.manual_review_required = true;
        allWarnings.push(
          `sanity check failed: line_item=${item.key} has a non-positive value across periods`
        );
      }
    }
  }

  // Build missing-list (every LINE_ITEM_KEY not in lineItemByKey).
  const missing: LineItemMissing[] = [];
  for (const k of LINE_ITEM_KEYS) {
    if (!lineItemByKey.has(k)) {
      missing.push({
        key: k,
        reason: missingReasonFor(k, tablesWithCells.length, sortedTables),
      });
    }
  }

  // Order periods newest → oldest. §6 rule 9.
  const periodsOrdered = orderPeriodsNewestFirst([...periodAccumulator.values()]);

  // Roll up §6 rule 11.
  // Phase 5B tuning: a required key counts as "missing" if its shell isn't
  // present OR if its shell exists but values_by_period is empty (period
  // detection failed). The previous version only checked shell existence,
  // which let header-parse failures pass the rollup with empty values.
  const anyRequiredMissing = REQUIRED_KEYS.some((k) => {
    const item = lineItemByKey.get(k);
    if (!item) return true;
    return Object.keys(item.values_by_period).length === 0;
  });
  const anyLowPeriod = periodsOrdered.some((p) => p.confidence === 'low');
  const anyLowItem = [...lineItemByKey.values()].some(
    (i) =>
      i.manual_review_required ||
      Object.values(i.values_by_period).some((v) => v.confidence === 'low')
  );
  const manualReviewRollup =
    unit.confidence === 'low' || anyLowPeriod || anyLowItem || anyRequiredMissing;

  const out: NormalizedFinancials = {
    ipo_id: opts.ipoId,
    company_name: opts.companyName,
    source_pdf_url: opts.sourcePdfUrl,
    source_pdf_sha256: opts.sourcePdfSha256,
    source_doc_kind: opts.sourceDocKind,
    parsed_at_utc: new Date().toISOString(),
    parser_version: opts.parserVersion,
    manual_review_required: manualReviewRollup,
    unit_detected: unit,
    scope_preference: {
      preferred: scopePreferred,
      available: [...scopeAvailable].filter(
        (s): s is 'Standalone' | 'Consolidated' => s === 'Standalone' || s === 'Consolidated'
      ),
      rationale:
        scopePreferred === 'Consolidated'
          ? 'consolidated chosen when both present (covers subsidiary)'
          : scopePreferred === 'Standalone'
          ? 'only Standalone form present in extracted tables'
          : 'scope hint absent from page text windows; defaulted to unknown',
    },
    restated_preference: {
      preferred: restatedPreferred,
      rationale:
        restatedPreferred === 'Restated'
          ? 'SEBI-mandated restated form is the audited baseline'
          : 'no Restated form detected in extracted tables; non-restated kept as fallback',
    },
    periods_detected: periodsOrdered,
    line_items: [...lineItemByKey.values()],
    line_items_missing: missing,
    table_origin_map: tableOriginMap,
    warnings: allWarnings,
    errors: allErrors,
  };

  safeWriteJson(opts.outPath, out);

  const summary: NormalizationRunSummary = {
    ipo_id: opts.ipoId,
    staging_path: opts.outPath,
    written: true,
    line_items_high: [...lineItemByKey.values()]
      .filter((i) => !i.manual_review_required && allValuesHigh(i))
      .map((i) => i.key),
    line_items_medium: [...lineItemByKey.values()]
      .filter((i) => !i.manual_review_required && !allValuesHigh(i) && !anyValueLow(i))
      .map((i) => i.key),
    line_items_low: [...lineItemByKey.values()]
      .filter((i) => i.manual_review_required || anyValueLow(i))
      .map((i) => i.key),
    line_items_missing: missing.map((m) => m.key),
    manual_review_required: manualReviewRollup,
    warnings: allWarnings,
    errors: allErrors,
  };
  return summary;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function emptySummary(ipoId: string, errorMsg: string): NormalizationRunSummary {
  return {
    ipo_id: ipoId,
    staging_path: null,
    written: false,
    line_items_high: [],
    line_items_medium: [],
    line_items_low: [],
    line_items_missing: [...LINE_ITEM_KEYS],
    manual_review_required: true,
    warnings: [],
    errors: [errorMsg],
  };
}

function confidencePriority(c: NormalizationConfidence | string | undefined): number {
  return c === 'high' ? 0 : c === 'medium' ? 1 : 2;
}

function downgradeOne(c: NormalizationConfidence): NormalizationConfidence {
  return c === 'high' ? 'medium' : c === 'medium' ? 'low' : 'low';
}

function minConfidence(cs: NormalizationConfidence[]): NormalizationConfidence {
  if (cs.includes('low')) return 'low';
  if (cs.includes('medium')) return 'medium';
  return 'high';
}

function allValuesHigh(item: LineItem): boolean {
  const vs = Object.values(item.values_by_period);
  return vs.length > 0 && vs.every((v) => v.confidence === 'high');
}

function anyValueLow(item: LineItem): boolean {
  return Object.values(item.values_by_period).some((v) => v.confidence === 'low');
}

function humanLabel(key: LineItemKey): string {
  switch (key) {
    case 'revenue': return 'Revenue from operations';
    case 'ebitda': return 'EBITDA';
    case 'pat': return 'Profit after tax';
    case 'eps_basic': return 'Earnings per share (basic)';
    case 'total_assets': return 'Total assets';
    case 'net_worth': return 'Net worth / total equity';
    case 'total_borrowings': return 'Total borrowings';
    case 'cash_and_equivalents': return 'Cash and cash equivalents';
  }
}

function missingReasonFor(
  key: LineItemKey,
  totalTables: number,
  sortedTables: ReadonlyArray<NonNullable<FinancialsExtraction['tables_with_cells']>[number]>
): string {
  if (totalTables === 0) {
    return 'no qualifying tables (high/medium confidence on candidate pages) emitted by Phase 5B extractor';
  }
  if (key === 'ebitda') {
    return 'EBITDA not directly disclosed by row label; Phase 5B does not derive (PBT + interest + depreciation) — would require an explicit derivation pass';
  }
  return `no row label in extracted tables matched the §6.7 dictionary for "${key}" (searched ${sortedTables.length} table(s))`;
}

// ─── Unit detection ───────────────────────────────────────────────────

function detectUnit(
  tables: NonNullable<FinancialsExtraction['tables_with_cells']>
): NormalizedFinancials['unit_detected'] {
  // Search each page_text_window for explicit unit markers. Confidence high
  // when explicit phrase present; medium when only "in million" / "in crore"
  // appears in the same window; low when no marker found.
  for (const t of tables) {
    const w = (t.page_text_window ?? '').toLowerCase();
    if (/[₹rs.]\s*(?:in\s+)?millions?\b|inr\s+millions?\b/i.test(w)) {
      return {
        value: 'INR millions',
        source: `page-${t.page} text window`,
        confidence: 'high',
      };
    }
    if (/[₹rs.]\s*(?:in\s+)?crores?\b|inr\s+crores?\b/i.test(w)) {
      return {
        value: 'INR crores',
        source: `page-${t.page} text window`,
        confidence: 'high',
      };
    }
    if (/[₹rs.]\s*(?:in\s+)?lakhs?\b|inr\s+lakhs?\b/i.test(w)) {
      return {
        value: 'INR lakhs',
        source: `page-${t.page} text window`,
        confidence: 'high',
      };
    }
  }
  // Softer fall-through: any window saying "in million(s)" / "in crore(s)" / "in lakh(s)".
  for (const t of tables) {
    const w = (t.page_text_window ?? '').toLowerCase();
    if (/\bin\s+millions?\b/.test(w)) {
      return { value: 'INR millions', source: `page-${t.page} (soft match)`, confidence: 'medium' };
    }
    if (/\bin\s+crores?\b/.test(w)) {
      return { value: 'INR crores', source: `page-${t.page} (soft match)`, confidence: 'medium' };
    }
    if (/\bin\s+lakhs?\b/.test(w)) {
      return { value: 'INR lakhs', source: `page-${t.page} (soft match)`, confidence: 'medium' };
    }
  }
  return { value: 'unknown', source: 'no unit marker found in any page text window', confidence: 'low' };
}

function convertToCrores(value: number, unit: UnitDetected): number {
  // 1 crore = 10 million = 100 lakh.
  if (unit === 'INR millions') return round2(value / 10);
  if (unit === 'INR lakhs') return round2(value / 100);
  if (unit === 'INR crores') return round2(value);
  // unknown — return as-is, caller is responsible for flagging
  return round2(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Scope + restatement detection ────────────────────────────────────

function collectScopes(
  tables: NonNullable<FinancialsExtraction['tables_with_cells']>
): Set<ScopePreference> {
  const out = new Set<ScopePreference>();
  for (const t of tables) {
    if (t.scope_hint === 'Standalone' || t.scope_hint === 'Consolidated') {
      out.add(t.scope_hint);
    }
  }
  return out;
}

function pickScopePreference(available: Set<ScopePreference>): ScopePreference {
  if (available.has('Consolidated')) return 'Consolidated';
  if (available.has('Standalone')) return 'Standalone';
  return 'unknown';
}

function collectRestatedness(
  tables: NonNullable<FinancialsExtraction['tables_with_cells']>
): { hasRestated: boolean; hasNonRestated: boolean } {
  let hasRestated = false;
  let hasNonRestated = false;
  for (const t of tables) {
    const form = (t.form_hint ?? '').toLowerCase();
    if (form.includes('restated')) hasRestated = true;
    else if (form.length > 0) hasNonRestated = true;
  }
  return { hasRestated, hasNonRestated };
}

// ─── Label matching ───────────────────────────────────────────────────

function normaliseLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchLabelToKey(rawLabel: string): LineItemKey | null {
  const n = normaliseLabel(rawLabel);
  if (!n) return null;
  for (const k of LINE_ITEM_KEYS) {
    for (const term of LABEL_DICTIONARY[k]) {
      if (n.startsWith(term)) return k;
    }
  }
  return null;
}

// ─── Period parsing ──────────────────────────────────────────────────

const MONTH_BY_NAME: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function indianFyLabelForFiscalYearEnd(yearEnding: number): string {
  // Indian FY ending March YYYY is "FY (YYYY mod 100)".
  return `FY ${String(yearEnding % 100).padStart(2, '0')}`;
}

function periodFromHeaderCell(
  raw: string
): { normalized: string; confidence: NormalizationConfidence } | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // "As at March 31, YYYY" or "for the year ended March 31, YYYY".
  let m = s.match(/march\s*31[, ]+\s*(\d{4})/i);
  if (m) return { normalized: indianFyLabelForFiscalYearEnd(parseInt(m[1]!, 10)), confidence: 'high' };

  // "nine months ended Mon DD, YYYY" → 9M FY (year-of-fiscal-end-after-this-date)
  // Phase 5B tuning: allow one optional word between "months" and "ended"
  // (handles SEBI-restated headers like "nine months period ended Dec 31").
  m = s.match(/nine\s+months?(?:\s+\w+)?\s+ended\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\s*,?\s*(\d{4})/i);
  if (m) {
    const month = MONTH_BY_NAME[m[1]!.toLowerCase()] ?? 0;
    const year = parseInt(m[2]!, 10);
    // If month <= 3, the fiscal year already ends in `year` (rare for 9M);
    // if month >= 4, fiscal year ends in `year + 1`.
    const fyEnd = month >= 4 ? year + 1 : year;
    return { normalized: `9M ${indianFyLabelForFiscalYearEnd(fyEnd)}`, confidence: 'high' };
  }

  // "six months ended Mon DD, YYYY" → H1 FY ... (same optional-word tolerance)
  m = s.match(/six\s+months?(?:\s+\w+)?\s+ended\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\s*,?\s*(\d{4})/i);
  if (m) {
    const month = MONTH_BY_NAME[m[1]!.toLowerCase()] ?? 0;
    const year = parseInt(m[2]!, 10);
    const fyEnd = month >= 4 ? year + 1 : year;
    return { normalized: `H1 ${indianFyLabelForFiscalYearEnd(fyEnd)}`, confidence: 'high' };
  }

  // Direct "FY YY" or "Fiscal YYYY".
  m = s.match(/fy\s*[' ]?(\d{2,4})/i);
  if (m) {
    const yy = parseInt(m[1]!, 10);
    const fyEnd = yy < 100 ? 2000 + yy : yy;
    return { normalized: indianFyLabelForFiscalYearEnd(fyEnd), confidence: 'medium' };
  }
  m = s.match(/fiscal\s+(\d{4})/i);
  if (m) {
    return { normalized: indianFyLabelForFiscalYearEnd(parseInt(m[1]!, 10)), confidence: 'medium' };
  }

  // Bare 4-digit year — low confidence (could be a calendar year).
  m = s.match(/\b(20\d{2}|19\d{2})\b/);
  if (m && /year|ended|march|fy/i.test(lower)) {
    return {
      normalized: indianFyLabelForFiscalYearEnd(parseInt(m[1]!, 10)),
      confidence: 'low',
    };
  }

  return null;
}

// Phase 5B tuning — multi-row header reconstruction.
//
// SEBI restated statements often split a single logical period label across
// multiple visual rows. Example from OnEMI's page-70 Restated P&L (real CI
// extraction):
//
//   row 0: ['Particulars', 'As at and for the nine', 'As at March', 'As at March', 'As at March']
//   row 1: ['',            'months period ended',     '31, 2025',    '31, 2024',    '31, 2023']
//   row 2: ['',            'December 31, 2025',       '',            '',            '']
//   row 3: ['Income',      '',                        '',            '',            '']
//   row 4: ['Revenue from operations', '15,599.00', '13,374.65', '16,744.46', '9,844.57']
//
// A single-row header parse fails: row 0 col 1 = "As at and for the nine"
// has no date pattern. The fix iterates span ∈ {1..MAX_HEADER_ROWS},
// concatenates non-empty cells per column across rows 0..span-1, and applies
// the existing periodFromHeaderCell() regex to each reconstructed label.
// Smallest span that yields the maximum match count wins; body loop starts
// at that span.
const MAX_HEADER_ROWS = 5;

interface HeaderParseResult {
  periodIndexMap: Map<number, PeriodDetected>;
  headerRowSpan: number;
}

function buildPeriodMapForSpan(
  cells: ReadonlyArray<ReadonlyArray<string>>,
  span: number,
  page: number
): Map<number, PeriodDetected> {
  const map = new Map<number, PeriodDetected>();
  const slice = cells.slice(0, span);
  const numCols = Math.max(0, ...slice.map((r) => r.length));
  for (let col = 0; col < numCols; col++) {
    const concatenated = slice
      .map((r) => (r[col] ?? '').trim())
      .filter((s) => s.length > 0)
      .join(' ');
    if (!concatenated) continue;
    const p = periodFromHeaderCell(concatenated);
    if (p) {
      map.set(col, {
        label_raw: concatenated.slice(0, 200),
        normalized: p.normalized,
        source_page: page,
        confidence: p.confidence,
      });
    }
  }
  return map;
}

function parsePeriodsFromHeader(
  cells: ReadonlyArray<ReadonlyArray<string>>,
  page: number,
  warnings: string[]
): HeaderParseResult {
  if (cells.length === 0) {
    return { periodIndexMap: new Map(), headerRowSpan: 1 };
  }
  const maxSpan = Math.min(MAX_HEADER_ROWS, cells.length);
  // Try span = 1 first; only switch to a larger span if it strictly improves
  // the match count. This preserves the original single-row-header behaviour
  // for tables where one row is enough.
  let bestSpan = 1;
  let bestMap = buildPeriodMapForSpan(cells, 1, page);
  for (let span = 2; span <= maxSpan; span++) {
    const map = buildPeriodMapForSpan(cells, span, page);
    if (map.size > bestMap.size) {
      bestMap = map;
      bestSpan = span;
    }
  }
  if (
    bestMap.size === 0 &&
    cells[0]!.some((c) => (c ?? '').trim().length > 0)
  ) {
    warnings.push(
      `page=${page}: tried header spans 1..${maxSpan} but no period pattern matched any reconstructed column header`
    );
  }
  return { periodIndexMap: bestMap, headerRowSpan: bestSpan };
}

function orderPeriodsNewestFirst(periods: PeriodDetected[]): PeriodDetected[] {
  // Period rank: prefix (9M > H1 > FY) ASC, then numeric year DESC.
  // For dashboard convention "newest first" we want most recent fiscal first.
  // 9M FY 26 (current period) > FY 25 > FY 24 etc. Order by FY year DESC,
  // with 9M / H1 of the same FY ranked AHEAD of full-year FY (they're newer
  // partial readings).
  const rank = (p: PeriodDetected): { yy: number; tier: number } => {
    const yy = parseInt((p.normalized.match(/(\d{2})$/)?.[1] ?? '0'), 10);
    const tier = /^9M\b/.test(p.normalized)
      ? 0
      : /^H1\b/.test(p.normalized)
      ? 1
      : 2;
    return { yy, tier };
  };
  return periods.slice().sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra.yy !== rb.yy) return rb.yy - ra.yy; // newest fiscal first
    return ra.tier - rb.tier; // 9M / H1 of same fiscal first
  });
}

// ─── Numeric parsing ──────────────────────────────────────────────────

function parseNumeric(raw: string): { value: number | null; confidence: NormalizationConfidence } {
  const s = (raw ?? '').trim();
  if (!s) return { value: null, confidence: 'high' }; // empty → not present, not an error
  // Map Nil / dash / n.a. → null with high confidence (explicit absence).
  if (/^(nil|n\.?a\.?|—|–|-)$/i.test(s)) {
    return { value: null, confidence: 'high' };
  }
  // Find numeric tokens (handle parens-negative + comma + decimal).
  const tokens = s.match(/-?\(?[\d,]+(?:\.\d+)?\)?%?/g) ?? [];
  if (tokens.length === 0) return { value: null, confidence: 'low' };
  if (tokens.length > 1) {
    // Multiple numbers in one cell — keep first, downgrade.
    const first = numericFromToken(tokens[0]!);
    return { value: first, confidence: 'low' };
  }
  const v = numericFromToken(tokens[0]!);
  if (v == null) return { value: null, confidence: 'low' };
  return { value: v, confidence: 'high' };
}

function numericFromToken(tok: string): number | null {
  let t = tok.trim();
  if (!t) return null;
  // Reject percentage values
  if (t.endsWith('%')) return null;
  let negative = false;
  if (t.startsWith('(') && t.endsWith(')')) {
    negative = true;
    t = t.slice(1, -1);
  }
  t = t.replace(/,/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(t)) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}
