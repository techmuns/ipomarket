// Subset of the SEBI probe artifact shape (kept here so the ingest scripts
// don't depend on the dashboard's `src/types/*` module-resolution graph).

export interface ProbePdf {
  url: string;
  link_text: string;
  source: string;
}

export interface ProbeArtifact {
  captured_at_utc?: string;
  phases?: unknown[];
  detail_urls_found?: number;
  pdfs: ProbePdf[];
}

export interface SourceMeta {
  source_state: 'live' | 'empty' | 'failed' | 'missing';
  last_attempted_utc: string;
  last_error?: string | null;
}
