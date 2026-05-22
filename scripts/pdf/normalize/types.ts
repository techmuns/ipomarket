// Phase 5B — financial normalization types.
//
// Authoritative TypeScript types for the Node normalizer
// (scripts/pdf/normalize/financials.ts) and for the audit-side
// `normalization` block mirrored into scripts/pdf/lib/types.ts.
//
// Per phase-5B-financial-normalization-plan.md §7 + §8: these are
// staging-snapshot types — NOT production financial-snapshot types.
// They are intentionally separate from src/types/snapshot.ts /
// src/types/ipo.ts so the staging schema can evolve without UI impact.

export type NormalizationConfidence = 'high' | 'medium' | 'low';

export const LINE_ITEM_KEYS = [
  'revenue',
  'ebitda',
  'pat',
  'eps_basic',
  'total_assets',
  'net_worth',
  'total_borrowings',
  'cash_and_equivalents',
] as const;
export type LineItemKey = (typeof LINE_ITEM_KEYS)[number];

export type ScopePreference = 'Standalone' | 'Consolidated' | 'unknown';
export type RestatedPreference = 'Restated' | 'Non-restated';
export type UnitDetected = 'INR millions' | 'INR crores' | 'INR lakhs' | 'unknown';

export interface PeriodDetected {
  label_raw: string;
  normalized: string;
  source_page: number;
  confidence: NormalizationConfidence;
}

export interface ValueByPeriod {
  raw: string;
  normalized_cr: number | null;
  confidence: NormalizationConfidence;
}

export interface LineItem {
  key: LineItemKey;
  raw_label: string;
  normalized_label: string;
  source_page: number;
  source_table_index: number;
  values_by_period: Record<string, ValueByPeriod>;
  manual_review_required: boolean;
}

export interface LineItemMissing {
  key: LineItemKey;
  reason: string;
}

export interface TableOriginEntry {
  key_present: LineItemKey[];
  source_page: number;
  table_index: number;
  scope: ScopePreference;
  form: string;
}

export interface NormalizedFinancials {
  ipo_id: string;
  company_name: string;
  source_pdf_url: string;
  source_pdf_sha256: string;
  source_doc_kind: string;
  parsed_at_utc: string;
  parser_version: string;
  manual_review_required: boolean;

  unit_detected: {
    value: UnitDetected;
    source: string;
    confidence: NormalizationConfidence | null;
  };
  scope_preference: {
    preferred: ScopePreference;
    available: Array<'Standalone' | 'Consolidated'>;
    rationale: string;
  };
  restated_preference: {
    preferred: RestatedPreference;
    rationale: string;
  };

  periods_detected: PeriodDetected[];
  line_items: LineItem[];
  line_items_missing: LineItemMissing[];
  table_origin_map: TableOriginEntry[];

  warnings: string[];
  errors: string[];
}

/**
 * Audit-side summary written into src/data/snapshots/ipo-pdf-extraction-audit.json
 * as a NEW additive top-level `normalization` block. Phase 5B's only
 * permitted production-adjacent snapshot mutation. Mirror in
 * src/types/pdf-audit.ts (reference-only per §W.6.1).
 */
export interface NormalizationAuditBlock {
  attempted_for: string[]; // ipo_id list (Phase 5B: always a single entry)
  staging_path: string | null;
  line_items_extracted_high_confidence: LineItemKey[];
  line_items_extracted_medium_confidence: LineItemKey[];
  line_items_rejected_low_confidence: LineItemKey[];
  line_items_missing: LineItemKey[];
  manual_review_required: boolean;
  /**
   * Always false in Phase 5B. Production promotion to
   * src/data/snapshots/ipo-financials.json is a separate Phase 5B.1 gate.
   */
  production_snapshot_mutated: false;
  warnings: string[];
}

/**
 * In-memory shape returned by the normalizer to the orchestrator. Drives the
 * audit `normalization` block above and the status report.
 */
export interface NormalizationRunSummary {
  ipo_id: string;
  staging_path: string | null;
  written: boolean;
  line_items_high: LineItemKey[];
  line_items_medium: LineItemKey[];
  line_items_low: LineItemKey[];
  line_items_missing: LineItemKey[];
  manual_review_required: boolean;
  warnings: string[];
  errors: string[];
}
