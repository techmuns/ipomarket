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

// Phase 5A.1 — doc-type taxonomy. Derived from SEBI listing link_text.
export type DocType =
  | 'Draft Red Herring Prospectus'
  | 'Red Herring Prospectus'
  | 'Final Offer Document'
  | 'Prospectus'
  | 'Draft Abridged Prospectus'
  | 'unknown';

export interface SebiCandidate {
  url: string;
  link_text: string;
  doc_type: DocType;
  source_smid: 10 | 11 | 12;
  captured_at_utc: string;
}

export interface SebiDiscoverySmidResult {
  count: number;
  ok: boolean;
  error: string | null;
  source?: string;
}

export interface SebiDiscoveryFile {
  generated_at_utc: string;
  parser_version: string;
  by_smid: {
    '10': SebiDiscoverySmidResult;
    '11': SebiDiscoverySmidResult;
    '12': SebiDiscoverySmidResult;
  };
  candidates: SebiCandidate[];
}

export interface CandidateScanEntry {
  ipo_id: string;
  url: string;
  page_count: number | null;
  verdict:
    | 'selected'
    | 'too_short'
    | 'not_evaluated'
    | 'fetch_failed'
    | 'doc_type_rejected'; // Phase 5A.1 — DAP rejected before download
  doc_type?: DocType; // Phase 5A.1 — annotated when known
  source_smid?: 10 | 11 | 12; // Phase 5A.1 — when sourced from discovery
}

export interface CandidatePoolMeta {
  total_ipo_documents_with_sebi_url: number;
  // Phase 5A.1 — count of additional candidates merged from sebi-candidates.json
  // (i.e. URLs harvested from smid=11/12 that weren't already in ipo-documents.json).
  total_discovery_candidates_merged?: number;
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
    doc_type?: DocType; // Phase 5A.1
  } | null;
  // Legacy key — kept as an alias for one parser version. Future Phase 5C
  // UI work should consume `full_document_candidate_unavailable` instead.
  // Both flip together; the legacy name conflates "candidate" with "table"
  // and was misleading.
  financial_table_candidate_unavailable: boolean;
  // Phase 5A.1 — the canonical signal. True when no full DRHP/RHP/Final-
  // Offer/Prospectus candidate (page_count >= 200) is available after
  // merging ipo-documents.json + sebi-candidates.json and applying the
  // doc-type filter.
  full_document_candidate_unavailable: boolean;
  // Phase 5A.1 — human-readable reason when unavailable. One of:
  //   'no smid=11/12 PDFs found'
  //   'all candidates were DAPs'
  //   'all candidates < 200 pages'
  //   'all candidates fetch_failed'
  //   'mixed: see scanned[]'
  full_document_unavailable_reason?: string;
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
  pdf_2: {
    ipo_id: string;
    doc_kind: string;
    overall_confidence: PdfConfidence | null;
    doc_type?: DocType; // Phase 5A.1
  } | null;
  // Legacy alias (see CandidatePoolMeta) — kept for one parser version.
  financial_table_candidate_unavailable: boolean;
  // Phase 5A.1 — canonical signal.
  full_document_candidate_unavailable: boolean;
  // Phase 5A.1 — per-smid discovery summary mirror for at-a-glance reading.
  discovery_smid_counts?: { '10': number; '11': number; '12': number };
  notes: string;
}

export function log(slice: string, msg: string): void {
  console.log(`[pdf:${slice}] ${msg}`);
}

export function warn(slice: string, msg: string): void {
  console.warn(`[pdf:${slice}] ${msg}`);
}
