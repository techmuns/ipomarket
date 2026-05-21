// Phase 5A — PDF parser shared types.
//
// Mirrors the SliceResult pattern from scripts/ingest/lib/slice.ts:
//   - Each per-PDF attempt returns a PdfSliceResult — never throws for
//     *expected* failures (HTTP non-200, %PDF magic missing, parser empty).
//   - Anything that escapes the orchestrator's try/catch is, by definition,
//     a code bug. The runner does not catch those; the workflow fails.
//
// Reference-only audit shape `IpoPdfAuditRow` is duplicated in
// `src/types/pdf-audit.ts` for the UI-side (see W.6.1). This file is the
// authoritative Node-side definition.

export type PdfSourceState =
  | 'live' // downloaded + parsed + at least one field extracted
  | 'empty' // downloaded + parsed, no signal
  | 'failed' // expected failure: HTTP non-200, %PDF magic missing, parser exception
  | 'skipped' // not eligible (e.g. PDF too short to be financial target)
  | 'partial' // some sections parsed, some failed
  | 'missing'; // upstream artifact missing (e.g. no SEBI URL on `main`)

export type PdfConfidence = 'high' | 'medium' | 'low';

export interface PdfSliceResult {
  ipo_id: string;
  source_state: PdfSourceState;
  errors: string[];
  notes: string;
}

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

export interface CoverField<T = string | number | string[] | null> {
  value: T;
  page: number | null;
  confidence: PdfConfidence | null;
}

export interface CoverExtraction {
  ipo_id: string;
  doc_url: string;
  doc_kind: string;
  pdf_sha256: string;
  page_count: number;
  parsed_at_utc: string;
  parser_version: string;
  fields: {
    company_name: CoverField<string | null>;
    document_type: CoverField<string | null>;
    issue_size_cr: CoverField<number | null>;
    price_band: CoverField<{ low: number; high: number } | null>;
    lot_size: CoverField<number | null>;
    face_value: CoverField<number | null>;
    brlms: CoverField<string[] | null>;
    registrar: CoverField<string | null>;
  };
  anchors_matched: number;
  anchors_total: number;
  raw_snippet: string;
  overall_confidence: PdfConfidence;
  ok: boolean;
  errors: string[];
}

export interface FinancialsCandidatePage {
  page: number;
  heading_match: string;
  raw_snippet: string;
}

export interface FinancialsTableDetected {
  page: number;
  flavor: 'lattice' | 'stream' | 'pdfplumber';
  rows: number;
  cols: number;
  header_row_sample: string[];
  confidence_signal: PdfConfidence;
}

export interface FinancialsExtraction {
  ipo_id: string;
  doc_url: string;
  doc_kind: string;
  pdf_sha256: string;
  page_count: number;
  parsed_at_utc: string;
  parser_version: string;
  candidate_pages: FinancialsCandidatePage[];
  tables_detected: FinancialsTableDetected[];
  overall_confidence: PdfConfidence;
  ok: boolean;
  errors: string[];
}

export interface AuditSectionCover {
  attempted: true;
  confidence: PdfConfidence;
  anchors_matched: number;
  anchors_total: number;
  errors: string[];
}

export interface AuditSectionSkipped {
  attempted: false;
  reason: string;
}

export interface AuditSectionFinancials {
  attempted: true;
  confidence: PdfConfidence;
  candidate_pages: number;
  tables_detected: number;
  errors: string[];
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

export interface IndexSummary {
  generated_at_utc: string;
  parser_version: string;
  pdf_1: { ipo_id: string; doc_kind: string; overall_confidence: PdfConfidence | null } | null;
  pdf_2: { ipo_id: string; doc_kind: string; overall_confidence: PdfConfidence | null } | null;
  financial_table_candidate_unavailable: boolean;
  notes: string;
}

export function log(slice: string, msg: string): void {
  console.log(`[pdf:${slice}] ${msg}`);
}

export function warn(slice: string, msg: string): void {
  console.warn(`[pdf:${slice}] ${msg}`);
}
