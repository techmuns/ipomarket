// Reference-only type. Audit JSON shape — not consumed by the UI in Phase 5A.
// UI wiring is a Phase 5C concern.
//
// Constraints (per master plan §W.6.1, binding):
//   1. Not imported by any UI file. No entry in src/lib/loadSnapshots.ts.
//   2. Not exported from a barrel.
//   3. Reference-only. Mirrors scripts/pdf/lib/types.ts (Node-side) so
//      `tsc --noEmit` stays green even though the file lives under src/.

export type PdfConfidence = 'high' | 'medium' | 'low';

export type PdfSourceState =
  | 'live'
  | 'empty'
  | 'failed'
  | 'skipped'
  | 'partial'
  | 'missing';

// Phase 5A.1 — doc-type taxonomy mirrored from scripts/pdf/lib/types.ts.
export type DocType =
  | 'Draft Red Herring Prospectus'
  | 'Red Herring Prospectus'
  | 'Final Offer Document'
  | 'Prospectus'
  | 'Draft Abridged Prospectus'
  | 'unknown';

export interface CandidateScanEntry {
  ipo_id: string;
  url: string;
  page_count: number | null;
  verdict:
    | 'selected'
    | 'too_short'
    | 'not_evaluated'
    | 'fetch_failed'
    | 'doc_type_rejected';
  doc_type?: DocType;
  source_smid?: 10 | 11 | 12;
  // Phase 5A.2 — which discovery source contributed this row.
  origin?:
    | 'ipo-documents'
    | 'sebi-discovery'
    | 'bse-sme-discovery'
    | 'bse-mainboard-discovery'
    | 'curated-seed';
}

export interface CandidatePoolMeta {
  total_ipo_documents_with_sebi_url: number;
  total_discovery_candidates_merged?: number;
  // Phase 5A.2 — per-source merged counts mirror.
  merged_counts?: {
    sebi_discovery: number;
    bse_sme_discovery: number;
    bse_mainboard_discovery: number;
    curated_seed: number;
  };
  pdf_1_cover_target: {
    ipo_id: string;
    url: string;
    reason: string;
  } | null;
  pdf_2_financial_target: {
    ipo_id: string;
    url: string;
    page_count: number;
    reason: string;
    doc_type?: DocType;
  } | null;
  // Legacy alias — kept for one parser version. Phase 5C UI should consume
  // `full_document_candidate_unavailable` instead.
  financial_table_candidate_unavailable: boolean;
  full_document_candidate_unavailable: boolean;
  full_document_unavailable_reason?: string;
  scanned: CandidateScanEntry[];
}

export interface AuditSectionCover {
  attempted: true;
  confidence: PdfConfidence;
  anchors_matched: number;
  anchors_total: number;
  errors: string[];
}

export interface AuditSectionFinancials {
  attempted: true;
  confidence: PdfConfidence;
  candidate_pages: number;
  tables_detected: number;
  errors: string[];
}

export interface AuditSectionSkipped {
  attempted: false;
  reason: string;
}

export interface IpoPdfAuditRow {
  doc_url: string;
  doc_kind: string;
  pdf_sha256: string | null;
  page_count: number | null;
  parsed_at_utc: string;
  sections: {
    cover: AuditSectionCover | AuditSectionSkipped;
    financials: AuditSectionFinancials | AuditSectionSkipped;
  };
  overall_confidence: PdfConfidence | null;
  manual_review_required: boolean;
  errors: string[];
}

// Phase 5B — additive mirror of the normalization audit block. Reference-only
// per §W.6.1; not consumed by UI in this phase. Matches
// `PdfNormalizationAuditBlock` in scripts/pdf/lib/types.ts.
export interface PdfNormalizationAuditBlock {
  attempted_for: string[];
  staging_path: string | null;
  line_items_extracted_high_confidence: string[];
  line_items_extracted_medium_confidence: string[];
  line_items_rejected_low_confidence: string[];
  line_items_missing: string[];
  manual_review_required: boolean;
  production_snapshot_mutated: false;
  warnings: string[];
}

export interface PdfExtractionAudit {
  generated_at_utc: string;
  parser_version: string;
  candidate_pool: CandidatePoolMeta;
  by_ipo: Record<string, IpoPdfAuditRow>;
  source_meta: {
    source_state: PdfSourceState;
    last_attempted_utc: string;
    errors: string[];
    notes: string;
  };
  normalization?: PdfNormalizationAuditBlock;
}
