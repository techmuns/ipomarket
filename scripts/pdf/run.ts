#!/usr/bin/env tsx
// Phase 5A — PDF parser feasibility orchestrator.
//
// 1. Read src/data/snapshots/ipo-documents.json
// 2. Filter docs[] by SEBI host (rule §8.1 of phase-5-pdf-intelligence-plan.md):
//      url.host === 'www.sebi.gov.in' AND url.path startsWith '/sebi_data/'.
//      Broker / registrar / merchant-banker URLs are rejected.
// 3. PDF #1 (cover target): hard-pinned to InCred Holdings (validated by P-09).
// 4. PDF #2 (financials feasibility): scan remaining SEBI URLs; for each,
//    download + read page_count; pick first with page_count >= 200. If none
//    qualify, emit `financial_table_candidate_unavailable: true`.
// 5. Per chosen PDF, run the appropriate Python extractor via child_process.
// 6. Write:
//      - phase-0/pdf-extracts/<ipo_id>/cover.json (PDF #1)
//      - phase-0/pdf-extracts/<ipo_id>/financials.json (PDF #2 if any)
//      - phase-0/pdf-extracts/index.json (summary)
//      - src/data/snapshots/ipo-pdf-extraction-audit.json (consumer audit)
//
// Hard guardrails (per §V.7 + §W.5):
//   - PDFs downloaded to a gitignored temp path; NEVER committed.
//   - No full text dumps; only bounded <=240-char raw_snippet rows.
//   - Production snapshots (ipo-financials/narrative/documents/source-audit)
//     are NEVER touched.
//   - Per-PDF expected failures (HTTP 403, %PDF magic missing, parser
//     exception) become audit rows with errors[]; the run still exits 0.
//   - Only true unclassified code bugs propagate and fail the workflow.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { safeWriteJson, readJsonOrNull } from '../ingest/lib/safeWrite.ts';
import { httpGetBinary } from './lib/http.ts';
import {
  log,
  warn,
  type CandidatePoolMeta,
  type CandidateScanEntry,
  type CoverExtraction,
  type FinancialsExtraction,
  type IpoPdfAuditRow,
  type IndexSummary,
  type PdfConfidence,
  type PdfExtractionAudit,
  type PdfSourceState,
} from './lib/types.ts';

const PARSER_VERSION = '5A.1';
const SEBI_HOST = 'www.sebi.gov.in';
const SEBI_PATH_PREFIX = '/sebi_data/';
const FINANCIAL_PAGE_MIN = 200;
const PINNED_PDF_1_IPO = 'incred-holdings';
const TMP_DIR = 'phase-0/pdf-extracts'; // <ipo_id>/source.pdf inside this is gitignored
const EXTRACT_OUT_DIR = 'phase-0/pdf-extracts';
const INDEX_PATH = 'phase-0/pdf-extracts/index.json';
const AUDIT_PATH = 'src/data/snapshots/ipo-pdf-extraction-audit.json';
const DOCS_PATH = 'src/data/snapshots/ipo-documents.json';
const PYTHON = process.env.PYTHON ?? 'python3';

interface IpoDocsFile {
  generated_at_utc: string;
  by_ipo: Record<
    string,
    {
      ipo_id: string;
      docs: Array<{
        kind: string;
        url: string;
        title: string;
        page_count?: number;
        bytes?: number;
      }>;
    }
  >;
}

interface SebiCandidate {
  ipo_id: string;
  doc_kind: string;
  url: string;
  declared_page_count: number | null;
}

function isSebiUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.host !== SEBI_HOST) return false;
    if (!u.pathname.startsWith(SEBI_PATH_PREFIX)) return false;
    return true;
  } catch {
    return false;
  }
}

function collectSebiCandidates(docs: IpoDocsFile): SebiCandidate[] {
  const out: SebiCandidate[] = [];
  for (const [ipoId, entry] of Object.entries(docs.by_ipo)) {
    for (const d of entry.docs ?? []) {
      if (!isSebiUrl(d.url)) continue;
      out.push({
        ipo_id: ipoId,
        doc_kind: d.kind,
        url: d.url,
        declared_page_count: typeof d.page_count === 'number' ? d.page_count : null,
      });
    }
  }
  // Stable order for idempotent output.
  out.sort((a, b) => a.ipo_id.localeCompare(b.ipo_id));
  return out;
}

interface DownloadResult {
  ok: boolean;
  bytes: number;
  sha256: string | null;
  path: string | null;
  status: number;
  error?: string;
}

async function downloadPdf(url: string, ipoId: string): Promise<DownloadResult> {
  const dir = join(TMP_DIR, ipoId);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'source.pdf');
  log('download', `${ipoId} <- ${url}`);
  const res = await httpGetBinary(url, {
    headers: { Accept: 'application/pdf,*/*;q=0.8' },
    timeoutMs: 60_000,
  });
  if (!res.ok || !res.buffer) {
    return {
      ok: false,
      bytes: 0,
      sha256: null,
      path: null,
      status: res.status,
      error: res.error ?? `HTTP ${res.status}`,
    };
  }
  if (res.buffer.length < 100 || res.buffer.subarray(0, 4).toString() !== '%PDF') {
    return {
      ok: false,
      bytes: res.buffer.length,
      sha256: null,
      path: null,
      status: res.status,
      error: '%PDF magic missing or body too short',
    };
  }
  writeFileSync(out, res.buffer);
  const sha = createHash('sha256').update(res.buffer).digest('hex');
  return { ok: true, bytes: res.buffer.length, sha256: sha, path: out, status: res.status };
}

function quickPageCount(pdfPath: string): number | null {
  // Use the existing scripts/probes/lib/pdf-parse.py rhp mode for a fast
  // page_count read — it's the cheapest reuse of an already-tested path.
  const probeOut = join(dirname(pdfPath), 'pagecount.json');
  const proc = spawnSync(
    PYTHON,
    ['scripts/probes/lib/pdf-parse.py', 'rhp', pdfPath, probeOut],
    { encoding: 'utf-8', timeout: 30_000 }
  );
  if (proc.status === null || proc.error) {
    warn('pagecount', `python failed: ${proc.error?.message ?? 'no status'}`);
    return null;
  }
  const meta = readJsonOrNull<{ page_count?: number }>(probeOut);
  if (!meta || typeof meta.page_count !== 'number') return null;
  return meta.page_count;
}

function runPythonExtractor(
  script: string,
  pdfPath: string,
  outJsonPath: string
): { ok: boolean; status: number | null; stderr: string } {
  log('extract', `${script} -> ${outJsonPath}`);
  const proc = spawnSync(PYTHON, [script, pdfPath, outJsonPath], {
    encoding: 'utf-8',
    timeout: 180_000,
  });
  if (proc.error) {
    warn('extract', `spawn error: ${proc.error.message}`);
    return { ok: false, status: null, stderr: proc.error.message };
  }
  return { ok: proc.status === 0, status: proc.status, stderr: proc.stderr ?? '' };
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyAudit(notes: string, state: PdfSourceState): PdfExtractionAudit {
  return {
    generated_at_utc: nowIso(),
    parser_version: PARSER_VERSION,
    candidate_pool: {
      total_ipo_documents_with_sebi_url: 0,
      pdf_1_cover_target: null,
      pdf_2_financial_target: null,
      financial_table_candidate_unavailable: true,
      scanned: [],
    },
    by_ipo: {},
    source_meta: {
      source_state: state,
      last_attempted_utc: nowIso(),
      errors: [],
      notes,
    },
  };
}

async function main(): Promise<number> {
  log('run', `Phase 5A PDF parser feasibility — start (parser_version=${PARSER_VERSION})`);

  const docs = readJsonOrNull<IpoDocsFile>(DOCS_PATH);
  if (!docs) {
    warn('run', `missing ${DOCS_PATH}; cannot select candidates`);
    safeWriteJson(AUDIT_PATH, emptyAudit('ipo-documents.json missing', 'missing'));
    safeWriteJson(INDEX_PATH, emptyIndex('ipo-documents.json missing'));
    return 0;
  }

  const allSebi = collectSebiCandidates(docs);
  log('run', `found ${allSebi.length} SEBI-hosted doc URLs across all IPOs`);

  // PDF #1 — pinned to InCred Holdings.
  const pdf1Candidate = allSebi.find((c) => c.ipo_id === PINNED_PDF_1_IPO) ?? null;

  // PDF #2 — scan remaining SEBI URLs for a >= 200-page PDF.
  const pool: SebiCandidate[] = allSebi.filter((c) => c.ipo_id !== PINNED_PDF_1_IPO);
  const scan: CandidateScanEntry[] = [];
  let pdf2Selected: { candidate: SebiCandidate; pageCount: number; sha256: string; bytes: number } | null = null;

  for (const cand of pool) {
    if (pdf2Selected) {
      scan.push({
        ipo_id: cand.ipo_id,
        url: cand.url,
        page_count: cand.declared_page_count,
        verdict: 'not_evaluated',
      });
      continue;
    }
    const dl = await downloadPdf(cand.url, cand.ipo_id);
    if (!dl.ok || !dl.path) {
      scan.push({
        ipo_id: cand.ipo_id,
        url: cand.url,
        page_count: null,
        verdict: 'fetch_failed',
      });
      log('scan', `[${cand.ipo_id}] fetch_failed (${dl.status} ${dl.error ?? ''})`);
      continue;
    }
    const pc = quickPageCount(dl.path);
    if (pc == null) {
      scan.push({
        ipo_id: cand.ipo_id,
        url: cand.url,
        page_count: null,
        verdict: 'fetch_failed',
      });
      log('scan', `[${cand.ipo_id}] could not read page_count`);
      // Leave the downloaded source.pdf in place — it's gitignored.
      continue;
    }
    if (pc < FINANCIAL_PAGE_MIN) {
      scan.push({ ipo_id: cand.ipo_id, url: cand.url, page_count: pc, verdict: 'too_short' });
      log('scan', `[${cand.ipo_id}] too_short (${pc} pages, need >= ${FINANCIAL_PAGE_MIN})`);
      continue;
    }
    scan.push({ ipo_id: cand.ipo_id, url: cand.url, page_count: pc, verdict: 'selected' });
    pdf2Selected = { candidate: cand, pageCount: pc, sha256: dl.sha256 ?? '', bytes: dl.bytes };
    log('scan', `[${cand.ipo_id}] SELECTED as PDF #2 (${pc} pages, ${dl.bytes} bytes)`);
    break;
  }

  // Build candidate_pool meta.
  const candidatePool: CandidatePoolMeta = {
    total_ipo_documents_with_sebi_url: allSebi.length,
    pdf_1_cover_target: pdf1Candidate
      ? {
          ipo_id: pdf1Candidate.ipo_id,
          url: pdf1Candidate.url,
          reason: 'pinned to InCred Holdings DRHP — validated end-to-end by P-09',
        }
      : null,
    pdf_2_financial_target: pdf2Selected
      ? {
          ipo_id: pdf2Selected.candidate.ipo_id,
          url: pdf2Selected.candidate.url,
          page_count: pdf2Selected.pageCount,
          reason: `first scanned SEBI URL with page_count >= ${FINANCIAL_PAGE_MIN}`,
        }
      : null,
    financial_table_candidate_unavailable: pdf2Selected == null,
    scanned: scan,
  };

  const byIpo: Record<string, IpoPdfAuditRow> = {};
  const errors: string[] = [];
  let anyLive = false;
  let anyFailed = false;

  // ── PDF #1 — cover-page extraction (InCred) ──
  if (pdf1Candidate) {
    const ipoId = pdf1Candidate.ipo_id;
    const dl = await downloadPdf(pdf1Candidate.url, ipoId);
    if (!dl.ok || !dl.path) {
      anyFailed = true;
      const reason = `download failed: ${dl.error ?? 'HTTP ' + dl.status}`;
      byIpo[ipoId] = {
        doc_url: pdf1Candidate.url,
        doc_kind: pdf1Candidate.doc_kind,
        pdf_sha256: null,
        page_count: null,
        parsed_at_utc: nowIso(),
        sections: {
          cover: { attempted: false, reason },
          financials: { attempted: false, reason: 'PDF #1 cover-target only' },
        },
        overall_confidence: null,
        manual_review_required: true,
        errors: [reason],
      };
      errors.push(`pdf-1 ${ipoId}: ${reason}`);
    } else {
      const outJson = join(EXTRACT_OUT_DIR, ipoId, 'cover.json');
      const res = runPythonExtractor('scripts/pdf/lib/pdf-cover.py', dl.path, outJson);
      if (!res.ok) {
        warn('cover', `extractor exit=${res.status} stderr=${res.stderr.slice(0, 200)}`);
      }
      const cover = readJsonOrNull<CoverExtraction & { fields: any }>(outJson);
      if (!cover) {
        anyFailed = true;
        const reason = 'cover extractor produced no JSON';
        byIpo[ipoId] = {
          doc_url: pdf1Candidate.url,
          doc_kind: pdf1Candidate.doc_kind,
          pdf_sha256: dl.sha256,
          page_count: null,
          parsed_at_utc: nowIso(),
          sections: {
            cover: { attempted: false, reason },
            financials: { attempted: false, reason: 'PDF #1 cover-target only' },
          },
          overall_confidence: null,
          manual_review_required: true,
          errors: [reason],
        };
        errors.push(`pdf-1 ${ipoId}: ${reason}`);
      } else {
        // Enrich the cover JSON with provenance + write it back to the side
        // artifact. The Python side doesn't know about IPO id / URL / SHA;
        // spread first so the explicit provenance keys below override any
        // matching keys the Python output carries.
        const enriched = {
          ...cover,
          ipo_id: ipoId,
          doc_url: pdf1Candidate.url,
          doc_kind: pdf1Candidate.doc_kind,
          pdf_sha256: dl.sha256,
          page_count: cover.page_count,
          parsed_at_utc: nowIso(),
          parser_version: PARSER_VERSION,
        };
        safeWriteJson(outJson, enriched);

        anyLive = true;
        const conf = (cover.overall_confidence ?? 'low') as PdfConfidence;
        byIpo[ipoId] = {
          doc_url: pdf1Candidate.url,
          doc_kind: pdf1Candidate.doc_kind,
          pdf_sha256: dl.sha256,
          page_count: cover.page_count,
          parsed_at_utc: nowIso(),
          sections: {
            cover: {
              attempted: true,
              confidence: conf,
              anchors_matched: cover.anchors_matched ?? 0,
              anchors_total: cover.anchors_total ?? 8,
              errors: cover.errors ?? [],
            },
            financials: {
              attempted: false,
              reason: 'PDF #1 is cover-page target only (abridged prospectus, not a full RHP)',
            },
          },
          overall_confidence: conf,
          manual_review_required: conf === 'low',
          errors: cover.errors ?? [],
        };
      }
    }
  }

  // ── PDF #2 — financial-table feasibility ──
  if (pdf2Selected) {
    const ipoId = pdf2Selected.candidate.ipo_id;
    const url = pdf2Selected.candidate.url;
    // The PDF was already downloaded during the scan loop.
    const pdfPath = join(TMP_DIR, ipoId, 'source.pdf');
    if (!existsSync(pdfPath)) {
      anyFailed = true;
      const reason = 'PDF #2 source missing from temp dir after scan';
      byIpo[ipoId] = {
        doc_url: url,
        doc_kind: pdf2Selected.candidate.doc_kind,
        pdf_sha256: pdf2Selected.sha256,
        page_count: pdf2Selected.pageCount,
        parsed_at_utc: nowIso(),
        sections: {
          cover: { attempted: false, reason: 'PDF #2 is financial feasibility target only' },
          financials: { attempted: false, reason },
        },
        overall_confidence: null,
        manual_review_required: true,
        errors: [reason],
      };
      errors.push(`pdf-2 ${ipoId}: ${reason}`);
    } else {
      const outJson = join(EXTRACT_OUT_DIR, ipoId, 'financials.json');
      const res = runPythonExtractor('scripts/pdf/lib/pdf-financials.py', pdfPath, outJson);
      if (!res.ok) {
        warn('financials', `extractor exit=${res.status} stderr=${res.stderr.slice(0, 200)}`);
      }
      const fin = readJsonOrNull<FinancialsExtraction>(outJson);
      if (!fin) {
        anyFailed = true;
        const reason = 'financials extractor produced no JSON';
        byIpo[ipoId] = {
          doc_url: url,
          doc_kind: pdf2Selected.candidate.doc_kind,
          pdf_sha256: pdf2Selected.sha256,
          page_count: pdf2Selected.pageCount,
          parsed_at_utc: nowIso(),
          sections: {
            cover: { attempted: false, reason: 'PDF #2 is financial feasibility target only' },
            financials: { attempted: false, reason },
          },
          overall_confidence: null,
          manual_review_required: true,
          errors: [reason],
        };
        errors.push(`pdf-2 ${ipoId}: ${reason}`);
      } else {
        // Enrich the financials JSON with provenance. Spread first so the
        // explicit provenance keys override matching Python output keys.
        const enriched = {
          ...fin,
          ipo_id: ipoId,
          doc_url: url,
          doc_kind: pdf2Selected.candidate.doc_kind,
          pdf_sha256: pdf2Selected.sha256,
          page_count: pdf2Selected.pageCount,
          parsed_at_utc: nowIso(),
          parser_version: PARSER_VERSION,
        };
        safeWriteJson(outJson, enriched);

        anyLive = true;
        const conf = (fin.overall_confidence ?? 'low') as PdfConfidence;
        byIpo[ipoId] = {
          doc_url: url,
          doc_kind: pdf2Selected.candidate.doc_kind,
          pdf_sha256: pdf2Selected.sha256,
          page_count: pdf2Selected.pageCount,
          parsed_at_utc: nowIso(),
          sections: {
            cover: { attempted: false, reason: 'PDF #2 is financial feasibility target only' },
            financials: {
              attempted: true,
              confidence: conf,
              candidate_pages: (fin.candidate_pages ?? []).length,
              tables_detected: (fin.tables_detected ?? []).length,
              errors: fin.errors ?? [],
            },
          },
          overall_confidence: conf,
          manual_review_required: conf !== 'high',
          errors: fin.errors ?? [],
        };
      }
    }
  } else if (pdf1Candidate) {
    // No PDF #2 selected and we did try (PDF #1 exists). Record this in errors
    // so the audit's source_meta makes the unavailability obvious.
    errors.push('financial table candidate unavailable: no scanned SEBI URL met page_count >= ' + FINANCIAL_PAGE_MIN);
  }

  // Compose source state.
  let sourceState: PdfSourceState = 'empty';
  if (!pdf1Candidate && !pdf2Selected) sourceState = 'missing';
  else if (anyLive && anyFailed) sourceState = 'partial';
  else if (anyLive) sourceState = 'live';
  else if (anyFailed) sourceState = 'failed';

  const audit: PdfExtractionAudit = {
    generated_at_utc: nowIso(),
    parser_version: PARSER_VERSION,
    candidate_pool: candidatePool,
    by_ipo: byIpo,
    source_meta: {
      source_state: sourceState,
      last_attempted_utc: nowIso(),
      errors,
      notes:
        `pdf_1=${candidatePool.pdf_1_cover_target?.ipo_id ?? 'none'}` +
        ` pdf_2=${candidatePool.pdf_2_financial_target?.ipo_id ?? 'unavailable'}` +
        ` source_state=${sourceState}`,
    },
  };
  safeWriteJson(AUDIT_PATH, audit);

  const index: IndexSummary = {
    generated_at_utc: audit.generated_at_utc,
    parser_version: PARSER_VERSION,
    pdf_1: candidatePool.pdf_1_cover_target
      ? {
          ipo_id: candidatePool.pdf_1_cover_target.ipo_id,
          doc_kind: byIpo[candidatePool.pdf_1_cover_target.ipo_id]?.doc_kind ?? 'unknown',
          overall_confidence: byIpo[candidatePool.pdf_1_cover_target.ipo_id]?.overall_confidence ?? null,
        }
      : null,
    pdf_2: candidatePool.pdf_2_financial_target
      ? {
          ipo_id: candidatePool.pdf_2_financial_target.ipo_id,
          doc_kind: byIpo[candidatePool.pdf_2_financial_target.ipo_id]?.doc_kind ?? 'unknown',
          overall_confidence: byIpo[candidatePool.pdf_2_financial_target.ipo_id]?.overall_confidence ?? null,
        }
      : null,
    financial_table_candidate_unavailable: candidatePool.financial_table_candidate_unavailable,
    notes: audit.source_meta.notes,
  };
  safeWriteJson(INDEX_PATH, index);

  // ── Summary ──
  log('run', '============== summary ==============');
  log('run', `pdf_1 = ${candidatePool.pdf_1_cover_target?.ipo_id ?? 'none'}`);
  log('run', `pdf_2 = ${candidatePool.pdf_2_financial_target?.ipo_id ?? 'unavailable'}`);
  log('run', `source_state = ${sourceState}`);
  log('run', `errors = ${errors.length}`);
  log('run', `wrote ${AUDIT_PATH}, ${INDEX_PATH}, and per-IPO side artifacts under ${EXTRACT_OUT_DIR}/`);
  log('run', 'Phase 5A PDF parser feasibility — done.');

  // Always exit 0 if we got here. Classified failures stay green; only true
  // unclassified code bugs propagate to fail the workflow.
  return 0;
}

function emptyIndex(notes: string): IndexSummary {
  return {
    generated_at_utc: nowIso(),
    parser_version: PARSER_VERSION,
    pdf_1: null,
    pdf_2: null,
    financial_table_candidate_unavailable: true,
    notes,
  };
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[pdf:run] UNEXPECTED runtime exception:', e?.stack ?? e?.message ?? String(e));
    process.exit(2);
  });
