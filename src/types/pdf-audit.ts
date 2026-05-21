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

export interface CandidateScanEntry {
  ipo_id: string;
  url: string;
  page_count: number | null;
  verdict: 'selected' | 'too_short' | 'not_evaluated' | 'fetch_failed';
}

export interface CandidatePoolMeta {
  total_ipo_documents_with_sebi_url: number;
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
  } | null;
  financial_table_candidate_unavailable: boolean;
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
}
