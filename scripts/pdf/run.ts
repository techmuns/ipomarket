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
import { discoverSebiCandidates, classifyDocType } from './discover.ts';
import { discoverBseSme } from './discover/bse-sme.ts';
import { discoverBseMainboard } from './discover/bse-mainboard.ts';
import { loadCuratedSeed } from './discover/curated-seed.ts';
import {
  log,
  warn,
  type BseDiscoveryFile,
  type CandidatePoolMeta,
  type CandidateScanEntry,
  type CoverExtraction,
  type CuratedOfficialPdfFile,
  type DocType,
  type FinancialsExtraction,
  type IpoPdfAuditRow,
  type IndexSummary,
  type PdfConfidence,
  type PdfExtractionAudit,
  type PdfSourceState,
  type SebiDiscoveryFile,
} from './lib/types.ts';

const PARSER_VERSION = '5A.2';
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

// Entry sourced from src/data/snapshots/ipo-documents.json. Carries an
// IPO id (the snapshot's primary key) — distinguished from the discovery
// helper's SebiCandidate, which carries no IPO id (just a SEBI listing
// row).
interface IpoDocSebiEntry {
  ipo_id: string;
  doc_kind: string;
  doc_title: string;
  url: string;
  declared_page_count: number | null;
  doc_type: DocType;
}

// Unified candidate seen by PDF #2 selection. Discovery-sourced rows carry
// a synthetic ipo_id since exchange listing rows don't correspond 1:1 to
// ipo-documents.json rows.
interface UnifiedCandidate {
  ipo_id: string; // real IPO id OR synthetic 'discovery_*_<slug>' / 'curated_<slug>'
  doc_kind: string;
  url: string;
  doc_type: DocType;
  source: 'ipo-documents' | 'discovery' | 'curated';
  // Maps to CandidateScanEntry.origin and CandidatePoolMeta.merged_counts.
  origin:
    | 'ipo-documents'
    | 'sebi-discovery'
    | 'bse-sme-discovery'
    | 'bse-mainboard-discovery'
    | 'curated-seed';
  source_smid?: 10 | 11 | 12;
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

function collectIpoDocSebiEntries(docs: IpoDocsFile): IpoDocSebiEntry[] {
  const out: IpoDocSebiEntry[] = [];
  for (const [ipoId, entry] of Object.entries(docs.by_ipo)) {
    for (const d of entry.docs ?? []) {
      if (!isSebiUrl(d.url)) continue;
      // doc_type derived from the document title + URL using the same
      // classifier as discover.ts. The `kind` field in ipo-documents.json
      // is coarser ("DRHP" / "RHP" / "Prospectus") and doesn't tell us
      // abridged-vs-full; the title does.
      const doc_type = classifyDocType(`${d.title} ${d.url}`);
      out.push({
        ipo_id: ipoId,
        doc_kind: d.kind,
        doc_title: d.title,
        url: d.url,
        declared_page_count: typeof d.page_count === 'number' ? d.page_count : null,
        doc_type,
      });
    }
  }
  out.sort((a, b) => a.ipo_id.localeCompare(b.ipo_id));
  return out;
}

// Doc-type preference for PDF #2 selection. Lower index = higher preference.
// 'Draft Abridged Prospectus' is excluded entirely (rejected pre-download).
const DOC_TYPE_PREFERENCE: ReadonlyArray<DocType> = [
  'Draft Red Herring Prospectus',
  'Red Herring Prospectus',
  'Final Offer Document',
  'Prospectus',
  'unknown',
];

function docTypePreferenceIndex(t: DocType): number {
  const i = DOC_TYPE_PREFERENCE.indexOf(t);
  return i < 0 ? Number.POSITIVE_INFINITY : i;
}

function slugifyUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').pop() ?? '').toLowerCase();
    return last.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'discovery';
  } catch {
    return 'discovery';
  }
}

// Phase 5A.2 — host allow-list for BSE / curated rows entering the pool.
// SEBI is already filtered by isSebiUrl(). BSE candidates may live on
// bseindia.com, bsesme.com, or nsearchives.nseindia.com (cross-linked
// PDFs are common); curated entries are already host-checked at load.
const BSE_DOWNLOAD_HOSTS: ReadonlyArray<string> = [
  'www.bseindia.com',
  'bseindia.com',
  'www.bsesme.com',
  'bsesme.com',
  'www.nseindia.com',
  'nseindia.com',
  'nsearchives.nseindia.com',
  'www.sebi.gov.in',
  'sebi.gov.in',
];

function isAllowedDiscoveryHost(rawUrl: string): boolean {
  try {
    return BSE_DOWNLOAD_HOSTS.includes(new URL(rawUrl).host.toLowerCase());
  } catch {
    return false;
  }
}

// Build the unified pool: ipo-documents.json SEBI rows ∪ SEBI smid discovery
// ∪ BSE SME discovery ∪ BSE mainboard discovery ∪ curated seed. Deduped by
// URL. Excludes PDF #1 (pinned). Sort order:
//   1. source = 'curated' first (highest operator trust)
//   2. then doc_type preference (lower index first; DAPs excluded upstream)
//   3. then source preference (ipo-documents → discovery)
//   4. then URL string (stable, idempotent)
function buildUnifiedPdf2Pool(opts: {
  ipoDocEntries: IpoDocSebiEntry[];
  sebiDiscovery: SebiDiscoveryFile | null;
  bseSme: BseDiscoveryFile | null;
  bseMainboard: BseDiscoveryFile | null;
  curated: CuratedOfficialPdfFile | null;
  pinnedIpoId: string;
}): {
  pool: UnifiedCandidate[];
  mergedCounts: NonNullable<CandidatePoolMeta['merged_counts']>;
  rejectedDap: UnifiedCandidate[];
} {
  const seenUrls = new Set<string>();
  const rejectedDap: UnifiedCandidate[] = [];
  const pool: UnifiedCandidate[] = [];
  const mergedCounts = {
    sebi_discovery: 0,
    bse_sme_discovery: 0,
    bse_mainboard_discovery: 0,
    curated_seed: 0,
  };

  for (const e of opts.ipoDocEntries) {
    if (e.ipo_id === opts.pinnedIpoId) continue; // PDF #1 is pinned to InCred; skip here
    if (seenUrls.has(e.url)) continue;
    seenUrls.add(e.url);
    const candidate: UnifiedCandidate = {
      ipo_id: e.ipo_id,
      doc_kind: e.doc_kind,
      url: e.url,
      doc_type: e.doc_type,
      source: 'ipo-documents',
      origin: 'ipo-documents',
      declared_page_count: e.declared_page_count,
    };
    if (e.doc_type === 'Draft Abridged Prospectus') {
      rejectedDap.push(candidate);
      continue;
    }
    pool.push(candidate);
  }

  if (opts.sebiDiscovery) {
    for (const d of opts.sebiDiscovery.candidates) {
      if (!isSebiUrl(d.url)) continue; // host filter: real SEBI only
      if (seenUrls.has(d.url)) continue;
      seenUrls.add(d.url);
      mergedCounts.sebi_discovery++;
      const candidate: UnifiedCandidate = {
        // Underscore (not colon) separators — keeps the value usable as a
        // filesystem directory under phase-0/pdf-extracts/<ipo_id>/ on every
        // OS we run on (Linux CI is permissive; macOS/Windows dev box less so).
        ipo_id: `discovery_smid${d.source_smid}_${slugifyUrl(d.url)}`,
        doc_kind: d.doc_type, // best-available label for discovery rows
        url: d.url,
        doc_type: d.doc_type,
        source: 'discovery',
        origin: 'sebi-discovery',
        source_smid: d.source_smid,
        declared_page_count: null,
      };
      if (d.doc_type === 'Draft Abridged Prospectus') {
        rejectedDap.push(candidate);
        continue;
      }
      pool.push(candidate);
    }
  }

  for (const bseFile of [opts.bseSme, opts.bseMainboard]) {
    if (!bseFile) continue;
    for (const c of bseFile.candidates) {
      if (!isAllowedDiscoveryHost(c.url)) continue;
      if (seenUrls.has(c.url)) continue;
      seenUrls.add(c.url);
      if (bseFile.source === 'bse-sme') mergedCounts.bse_sme_discovery++;
      else mergedCounts.bse_mainboard_discovery++;
      const candidate: UnifiedCandidate = {
        ipo_id: `discovery_${bseFile.source.replace(/-/g, '_')}_${slugifyUrl(c.url)}`,
        doc_kind: c.doc_type,
        url: c.url,
        doc_type: c.doc_type,
        source: 'discovery',
        origin: bseFile.source === 'bse-sme' ? 'bse-sme-discovery' : 'bse-mainboard-discovery',
        declared_page_count: null,
      };
      if (c.doc_type === 'Draft Abridged Prospectus') {
        rejectedDap.push(candidate);
        continue;
      }
      pool.push(candidate);
    }
  }

  if (opts.curated) {
    for (const e of opts.curated.entries) {
      if (seenUrls.has(e.doc_url)) continue;
      seenUrls.add(e.doc_url);
      mergedCounts.curated_seed++;
      const dt: DocType =
        e.doc_kind === 'DRHP'
          ? 'Draft Red Herring Prospectus'
          : e.doc_kind === 'RHP'
          ? 'Red Herring Prospectus'
          : e.doc_kind === 'Final Offer Document'
          ? 'Final Offer Document'
          : 'Prospectus';
      // Curated entries are operator-vetted: the slug uses the IPO id
      // verbatim so the side-artifact directory is predictable.
      pool.push({
        ipo_id: `curated_${e.ipo_id}`,
        doc_kind: e.doc_kind,
        url: e.doc_url,
        doc_type: dt,
        source: 'curated',
        origin: 'curated-seed',
        declared_page_count: null,
      });
    }
  }

  pool.sort((a, b) => {
    // Curated wins ties — operator-curated URLs should be downloaded first.
    if (a.source !== b.source) {
      if (a.source === 'curated' && b.source !== 'curated') return -1;
      if (b.source === 'curated' && a.source !== 'curated') return 1;
    }
    const pa = docTypePreferenceIndex(a.doc_type);
    const pb = docTypePreferenceIndex(b.doc_type);
    if (pa !== pb) return pa - pb;
    if (a.source !== b.source) {
      // Within doc-type, prefer ipo-documents (operator-curated production
      // snapshot) over raw discovery rows.
      if (a.source === 'ipo-documents') return -1;
      if (b.source === 'ipo-documents') return 1;
    }
    return a.url.localeCompare(b.url);
  });

  return { pool, mergedCounts, rejectedDap };
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
      total_discovery_candidates_merged: 0,
      pdf_1_cover_target: null,
      pdf_2_financial_target: null,
      financial_table_candidate_unavailable: true,
      full_document_candidate_unavailable: true,
      full_document_unavailable_reason: notes,
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

  const ipoDocEntries = collectIpoDocSebiEntries(docs);
  log('run', `found ${ipoDocEntries.length} SEBI-hosted doc URLs across all IPOs`);

  // Phase 5A.1 — run SEBI multi-subsection discovery (smid=10 cache,
  // smid=11/12 static + Playwright fallback). Writes
  // phase-0/pdf-extracts/sebi-candidates.json regardless of fetch outcome.
  // Phase 5A.2 — also run BSE SME, BSE mainboard, and curated-seed loaders.
  // All four are independent: a failure in one MUST NOT block the others.
  // Per §X.1 hard rule, none of them mutate ipo-documents.json.
  let sebiDiscovery: SebiDiscoveryFile | null = null;
  try {
    sebiDiscovery = await discoverSebiCandidates();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    warn('run', `SEBI discovery failed unexpectedly: ${msg} (continuing without it)`);
  }
  let bseSme: BseDiscoveryFile | null = null;
  try {
    bseSme = await discoverBseSme();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    warn('run', `BSE SME discovery failed unexpectedly: ${msg} (continuing without it)`);
  }
  let bseMainboard: BseDiscoveryFile | null = null;
  try {
    bseMainboard = await discoverBseMainboard();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    warn('run', `BSE mainboard discovery failed unexpectedly: ${msg} (continuing without it)`);
  }
  let curated: CuratedOfficialPdfFile | null = null;
  try {
    curated = loadCuratedSeed();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    warn('run', `curated seed load failed unexpectedly: ${msg} (continuing without it)`);
  }

  // PDF #1 — pinned to InCred Holdings (still from ipo-documents.json).
  const pdf1Candidate = ipoDocEntries.find((c) => c.ipo_id === PINNED_PDF_1_IPO) ?? null;

  // PDF #2 — build unified pool from all five sources, dedup by URL, reject
  // DAPs up-front, sort with curated entries first.
  const { pool: unifiedPool, mergedCounts, rejectedDap } = buildUnifiedPdf2Pool({
    ipoDocEntries,
    sebiDiscovery,
    bseSme,
    bseMainboard,
    curated,
    pinnedIpoId: PINNED_PDF_1_IPO,
  });
  const mergedFromDiscovery =
    mergedCounts.sebi_discovery +
    mergedCounts.bse_sme_discovery +
    mergedCounts.bse_mainboard_discovery +
    mergedCounts.curated_seed;
  log(
    'run',
    `unified PDF #2 pool: ${unifiedPool.length} candidate(s) ` +
      `(${mergedFromDiscovery} merged from discovery+curated, ${rejectedDap.length} DAPs rejected up-front)`
  );
  log(
    'run',
    `merged_counts: sebi=${mergedCounts.sebi_discovery} ` +
      `bse_sme=${mergedCounts.bse_sme_discovery} ` +
      `bse_mainboard=${mergedCounts.bse_mainboard_discovery} ` +
      `curated=${mergedCounts.curated_seed}`
  );

  const scan: CandidateScanEntry[] = [];

  // Record DAP rejections first (no download, no scan; just verdict).
  for (const c of rejectedDap) {
    scan.push({
      ipo_id: c.ipo_id,
      url: c.url,
      page_count: c.declared_page_count,
      verdict: 'doc_type_rejected',
      doc_type: c.doc_type,
      source_smid: c.source_smid,
      origin: c.origin,
    });
    log('scan', `[${c.ipo_id}] doc_type_rejected (Draft Abridged Prospectus)`);
  }

  let pdf2Selected:
    | { candidate: UnifiedCandidate; pageCount: number; sha256: string; bytes: number }
    | null = null;

  for (const cand of unifiedPool) {
    if (pdf2Selected) {
      scan.push({
        ipo_id: cand.ipo_id,
        url: cand.url,
        page_count: cand.declared_page_count,
        verdict: 'not_evaluated',
        doc_type: cand.doc_type,
        source_smid: cand.source_smid,
        origin: cand.origin,
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
        doc_type: cand.doc_type,
        source_smid: cand.source_smid,
        origin: cand.origin,
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
        doc_type: cand.doc_type,
        source_smid: cand.source_smid,
        origin: cand.origin,
      });
      log('scan', `[${cand.ipo_id}] could not read page_count`);
      continue;
    }
    if (pc < FINANCIAL_PAGE_MIN) {
      scan.push({
        ipo_id: cand.ipo_id,
        url: cand.url,
        page_count: pc,
        verdict: 'too_short',
        doc_type: cand.doc_type,
        source_smid: cand.source_smid,
        origin: cand.origin,
      });
      log('scan', `[${cand.ipo_id}] too_short (${pc} pages, need >= ${FINANCIAL_PAGE_MIN})`);
      continue;
    }
    scan.push({
      ipo_id: cand.ipo_id,
      url: cand.url,
      page_count: pc,
      verdict: 'selected',
      doc_type: cand.doc_type,
      source_smid: cand.source_smid,
      origin: cand.origin,
    });
    pdf2Selected = { candidate: cand, pageCount: pc, sha256: dl.sha256 ?? '', bytes: dl.bytes };
    log(
      'scan',
      `[${cand.ipo_id}] SELECTED as PDF #2 (${pc} pages, ${dl.bytes} bytes, doc_type=${cand.doc_type})`
    );
    break;
  }

  // Compose unavailable-reason string based on what the scan trail actually contains.
  const fullDocUnavailable = pdf2Selected == null;
  let fullDocUnavailableReason: string | undefined;
  if (fullDocUnavailable) {
    const scannedExcludingDap = scan.filter((s) => s.verdict !== 'doc_type_rejected');
    if (scannedExcludingDap.length === 0 && rejectedDap.length > 0) {
      fullDocUnavailableReason = 'all candidates were DAPs';
    } else if (
      scannedExcludingDap.length > 0 &&
      scannedExcludingDap.every((s) => s.verdict === 'fetch_failed')
    ) {
      fullDocUnavailableReason = 'all candidates fetch_failed';
    } else if (
      scannedExcludingDap.length > 0 &&
      scannedExcludingDap.every((s) => s.verdict === 'too_short' || s.verdict === 'fetch_failed')
    ) {
      fullDocUnavailableReason = 'all candidates < 200 pages';
    } else if (unifiedPool.length === 0 && rejectedDap.length === 0) {
      fullDocUnavailableReason = 'no smid=11/12 PDFs found AND no non-DAP rows in ipo-documents.json';
    } else {
      fullDocUnavailableReason = 'mixed: see scanned[]';
    }
  }

  // Build candidate_pool meta.
  const candidatePool: CandidatePoolMeta = {
    total_ipo_documents_with_sebi_url: ipoDocEntries.length,
    total_discovery_candidates_merged: mergedFromDiscovery,
    merged_counts: mergedCounts,
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
          reason:
            `first ${pdf2Selected.candidate.doc_type} candidate ` +
            `(origin=${pdf2Selected.candidate.origin}` +
            (pdf2Selected.candidate.source_smid != null
              ? `, smid=${pdf2Selected.candidate.source_smid}`
              : '') +
            `) with page_count >= ${FINANCIAL_PAGE_MIN}`,
          doc_type: pdf2Selected.candidate.doc_type,
        }
      : null,
    // Both flags flip together; legacy alias kept for one parser version.
    financial_table_candidate_unavailable: fullDocUnavailable,
    full_document_candidate_unavailable: fullDocUnavailable,
    full_document_unavailable_reason: fullDocUnavailableReason,
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
        // Phase 5A.1 — OR the Python-side needs_manual_review flag (set when
        // anchors matched but registrar/BRLM extraction was blocklist-rejected)
        // with the existing low-confidence path.
        const needsManualReviewFromPython =
          (cover as unknown as { needs_manual_review?: boolean }).needs_manual_review === true;
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
          manual_review_required: conf === 'low' || needsManualReviewFromPython,
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
    // so the audit's source_meta makes the unavailability obvious. Phase 5A.1
    // adds the explicit reason string sourced from candidate_pool.
    errors.push(
      `full document candidate unavailable (${fullDocUnavailableReason ?? 'unknown reason'}): ` +
        `no candidate met page_count >= ${FINANCIAL_PAGE_MIN} after doc-type filter`
    );
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
          overall_confidence:
            byIpo[candidatePool.pdf_2_financial_target.ipo_id]?.overall_confidence ?? null,
          doc_type: candidatePool.pdf_2_financial_target.doc_type,
        }
      : null,
    financial_table_candidate_unavailable: candidatePool.financial_table_candidate_unavailable,
    full_document_candidate_unavailable: candidatePool.full_document_candidate_unavailable,
    discovery_smid_counts: sebiDiscovery
      ? {
          '10': sebiDiscovery.by_smid['10'].count,
          '11': sebiDiscovery.by_smid['11'].count,
          '12': sebiDiscovery.by_smid['12'].count,
        }
      : undefined,
    merged_counts: mergedCounts,
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
    full_document_candidate_unavailable: true,
    notes,
  };
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[pdf:run] UNEXPECTED runtime exception:', e?.stack ?? e?.message ?? String(e));
    process.exit(2);
  });
