#!/usr/bin/env tsx
// Phase 5B.2 — OnEMI cover-page extraction (mini-orchestrator).
//
// Runs the existing scripts/pdf/lib/pdf-cover.py extractor against the
// curated BSE-hosted OnEMI RHP, writes the side artifact to
//   phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json
// and populates the existing audit row's `sections.cover` block at
//   src/data/snapshots/ipo-pdf-extraction-audit.json
//
// Hard guardrails (per phase-5B2-onemi-cover-extraction-plan.md §5–§8):
//   - OnEMI only. Does NOT iterate other ipo_ids.
//   - Curated seed lookup; require allowed_for_parser: true + official
//     source_host allow-list.
//   - PDF integrity gate: %PDF magic + sha256 must match the audit row's
//     pdf_sha256 + page count > 5.
//   - Existing audit row stays byte-identical except the sections.cover
//     block (string-surgery; the existing `sections.financials` block is
//     preserved character-for-character).
//   - Idempotent: if cover.json already exists, skip download + extract
//     and reuse the on-disk artifact.
//   - Atomic write for both cover.json and the audit JSON via .tmp + rename.
//   - source.pdf written to phase-0/pdf-extracts/<ipo>/source.pdf is
//     covered by the existing .gitignore (no PDF binaries committed).
//   - No PDF binaries / full-text dumps committed.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { readJsonOrNull, safeWriteJson } from '../../ingest/lib/safeWrite.ts';
import { httpGetBinary } from '../../probes/lib/http.ts';

const PRODUCTION_IPO_ID = 'onemi-technology-solutions';
const AUDIT_IPO_ID = 'curated_onemi-technology-solutions';
const PARSER_VERSION = '5B.2';

const CURATED_PATH = 'phase-0/curated-official-pdfs.json';
const AUDIT_PATH = 'src/data/snapshots/ipo-pdf-extraction-audit.json';
const DOCS_PATH = 'src/data/snapshots/ipo-documents.json';
const TMP_DIR = 'phase-0/pdf-extracts';
const COVER_OUT = join(TMP_DIR, AUDIT_IPO_ID, 'cover.json');

const PYTHON = process.env.PYTHON ?? 'python3';
const PY_COVER = 'scripts/pdf/lib/pdf-cover.py';
const PY_PAGECOUNT = 'scripts/probes/lib/pdf-parse.py';

const SOURCE_HOST_ALLOW = new Set([
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

// ─── Types (duck-typed; no src/types/ipo.ts dep) ──

type Confidence = 'high' | 'medium' | 'low' | null;

interface CuratedEntry {
  ipo_id: string;
  doc_kind: string;
  doc_url: string;
  source_host: string;
  allowed_for_parser?: boolean;
}
interface CuratedFile {
  entries: CuratedEntry[];
}
interface AuditFile {
  by_ipo: Record<string, AuditRow>;
  [k: string]: unknown;
}
interface AuditRow {
  doc_url: string;
  doc_kind: string;
  pdf_sha256: string | null;
  page_count: number | null;
  sections: {
    cover: { attempted: boolean; [k: string]: unknown };
    financials: { attempted: boolean; [k: string]: unknown };
  };
  [k: string]: unknown;
}
interface DocsFile {
  by_ipo: Record<string, { docs: Array<{ url: string; [k: string]: unknown }> }>;
}
interface CoverField {
  value: unknown;
  page: number | null;
  confidence: Confidence;
}
interface CoverExtraction {
  mode: string;
  parser_version: string;
  page_count: number;
  fields: Record<string, CoverField>;
  anchors_matched: number;
  anchors_total: number;
  raw_snippet: string;
  overall_confidence: 'high' | 'medium' | 'low';
  ok: boolean;
  needs_manual_review?: boolean;
  errors: string[];
}

// ─── Helpers ──

function fail(msg: string): never {
  console.error(`[extract:onemi-cover] FAIL: ${msg}`);
  process.exit(1);
}

function log(stage: string, msg: string) {
  console.log(`[extract:onemi-cover] [${stage}] ${msg}`);
}

function quickPageCount(pdfPath: string): number | null {
  const probeOut = join(dirname(pdfPath), 'pagecount.json');
  const proc = spawnSync(PYTHON, [PY_PAGECOUNT, 'rhp', pdfPath, probeOut], {
    encoding: 'utf-8',
    timeout: 30_000,
  });
  if (proc.status !== 0) return null;
  const meta = readJsonOrNull<{ page_count?: number }>(probeOut);
  return meta && typeof meta.page_count === 'number' ? meta.page_count : null;
}

async function downloadPdf(url: string, expectedSha: string): Promise<{ path: string; sha256: string; bytes: number; pageCount: number }> {
  const dir = join(TMP_DIR, AUDIT_IPO_ID);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'source.pdf');
  log('download', `${PRODUCTION_IPO_ID} <- ${url}`);
  const res = await httpGetBinary(url, {
    headers: { Accept: 'application/pdf,*/*;q=0.8' },
    timeoutMs: 120_000,
  });
  if (!res.ok || !res.buffer) {
    fail(`download failed: HTTP ${res.status} ${res.error ?? ''}`);
  }
  if (res.buffer.length < 100 || res.buffer.subarray(0, 4).toString() !== '%PDF') {
    fail(`%PDF magic missing or body too short (bytes=${res.buffer.length})`);
  }
  const sha = createHash('sha256').update(res.buffer).digest('hex');
  if (sha !== expectedSha) {
    fail(`SHA-256 mismatch — expected ${expectedSha}, got ${sha}`);
  }
  writeFileSync(out, res.buffer);
  const pc = quickPageCount(out);
  if (pc === null) fail(`could not read page_count for downloaded PDF`);
  if (pc <= 5) fail(`page_count=${pc} not > 5 — refusing to parse`);
  log('download', `OK bytes=${res.buffer.length} sha256=${sha.slice(0, 12)}… pages=${pc}`);
  return { path: out, sha256: sha, bytes: res.buffer.length, pageCount: pc };
}

function runCover(pdfPath: string, outPath: string): { ok: boolean; status: number | null; stderr: string } {
  log('extract', `${PY_COVER} -> ${outPath}`);
  const proc = spawnSync(PYTHON, [PY_COVER, pdfPath, outPath], {
    encoding: 'utf-8',
    timeout: 180_000,
  });
  return { ok: proc.status === 0, status: proc.status, stderr: proc.stderr ?? '' };
}

// String-surgery update of sections.cover. Replaces the existing
// `"cover": { ... }` JSON object in the audit file with `newCoverBlock`.
// The rest of the file (including sections.financials and every other
// audit row) is preserved character-for-character. Only the top-level
// `generated_at_utc` is bumped.
function spliceAuditCoverBlock(newCoverJson: string, newTimestamp: string): void {
  let content = readFileSync(AUDIT_PATH, 'utf-8');

  // 1. Bump top-level generated_at_utc.
  const tsReplaced = content.replace(
    /("generated_at_utc"\s*:\s*)"[^"]*"/,
    `$1"${newTimestamp}"`,
  );
  if (tsReplaced === content) fail(`could not locate generated_at_utc in ${AUDIT_PATH}`);
  content = tsReplaced;

  // 2. Locate the by_ipo container, then find OnEMI inside it. The
  //    AUDIT_IPO_ID string also appears in candidate_pool.pdf_2_financial_target
  //    (which has no nested `sections` key) so we MUST anchor to by_ipo's
  //    OnEMI row, not the first occurrence.
  const byIpoIdx = content.indexOf('"by_ipo"');
  if (byIpoIdx === -1) fail(`could not locate by_ipo container in audit JSON`);
  const onemiKeyIdx = content.indexOf(`"${AUDIT_IPO_ID}"`, byIpoIdx);
  if (onemiKeyIdx === -1) fail(`could not locate ${AUDIT_IPO_ID} key inside by_ipo`);

  // 3. Within that row, locate `"sections"` and then `"cover"`.
  const sectionsIdx = content.indexOf('"sections"', onemiKeyIdx);
  if (sectionsIdx === -1) fail(`could not locate sections key for ${AUDIT_IPO_ID}`);
  const coverIdx = content.indexOf('"cover"', sectionsIdx);
  if (coverIdx === -1) fail(`could not locate sections.cover for ${AUDIT_IPO_ID}`);

  // 4. Find the existing cover object: starts at first `{` after the key,
  //    ends at the matching `}` (brace-counted; nothing nested except
  //    primitive values + arrays).
  const openBrace = content.indexOf('{', coverIdx);
  if (openBrace === -1) fail(`could not locate opening brace for cover block`);
  let depth = 1;
  let i = openBrace + 1;
  while (i < content.length && depth > 0) {
    const c = content[i];
    if (c === '"') {
      // skip string content (handle escapes)
      i++;
      while (i < content.length && content[i] !== '"') {
        if (content[i] === '\\') i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  if (depth !== 0) fail(`unbalanced braces in cover block`);
  const closeBrace = i - 1;

  // 5. Splice the new cover block in.
  const newContent = content.slice(0, openBrace) + newCoverJson + content.slice(closeBrace + 1);

  // 6. Atomic write.
  const tmp = AUDIT_PATH + '.tmp';
  writeFileSync(tmp, newContent, 'utf-8');
  renameSync(tmp, AUDIT_PATH);
}

// ─── Main ──

async function main(): Promise<void> {
  // Preflight 1: curated seed.
  const curated = readJsonOrNull<CuratedFile>(CURATED_PATH);
  if (!curated || !Array.isArray(curated.entries)) fail(`${CURATED_PATH} missing or malformed`);
  const seed = curated.entries.find((e) => e.ipo_id === PRODUCTION_IPO_ID);
  if (!seed) fail(`${CURATED_PATH} missing OnEMI entry`);
  if (!seed.allowed_for_parser) fail(`curated seed entry has allowed_for_parser=false`);
  if (!SOURCE_HOST_ALLOW.has(seed.source_host)) {
    fail(`curated seed source_host=${seed.source_host} not in official allow-list`);
  }
  log('preflight', `curated seed OK (${seed.doc_kind} @ ${seed.source_host})`);

  // Preflight 2: audit row + SHA.
  const audit = readJsonOrNull<AuditFile>(AUDIT_PATH);
  if (!audit || !audit.by_ipo) fail(`${AUDIT_PATH} missing or malformed`);
  const auditRow = audit.by_ipo[AUDIT_IPO_ID];
  if (!auditRow) fail(`${AUDIT_PATH} missing ${AUDIT_IPO_ID} row`);
  if (!auditRow.pdf_sha256) fail(`audit row missing pdf_sha256 — Phase 5B did not run?`);
  if (auditRow.doc_url !== seed.doc_url) fail(`audit doc_url mismatch with curated seed`);
  log('preflight', `audit row OK (sha256 ${auditRow.pdf_sha256.slice(0, 12)}…, ${auditRow.page_count} pages)`);

  // Preflight 3: documents row cross-check.
  const docs = readJsonOrNull<DocsFile>(DOCS_PATH);
  if (!docs || !docs.by_ipo) fail(`${DOCS_PATH} missing or malformed`);
  const docRow = docs.by_ipo[PRODUCTION_IPO_ID];
  if (!docRow) fail(`${DOCS_PATH} missing ${PRODUCTION_IPO_ID} row`);
  if (!docRow.docs?.[0] || docRow.docs[0].url !== seed.doc_url) {
    fail(`documents row docs[0].url does not match curated seed`);
  }
  log('preflight', `documents row OK`);

  // Idempotency: reuse existing cover.json if present.
  if (existsSync(COVER_OUT)) {
    log('idempotency', `${COVER_OUT} already exists — skipping download/extract`);
  } else {
    // Download + verify + extract.
    const dl = await downloadPdf(seed.doc_url, auditRow.pdf_sha256);
    const res = runCover(dl.path, COVER_OUT);
    if (!res.ok) {
      fail(`extractor exit=${res.status} stderr=${res.stderr.slice(0, 300)}`);
    }
    // Enrich cover.json with provenance.
    const cover = readJsonOrNull<CoverExtraction>(COVER_OUT);
    if (!cover) fail(`extractor produced no JSON at ${COVER_OUT}`);
    const enriched = {
      ...cover,
      ipo_id: PRODUCTION_IPO_ID,
      audit_ipo_id: AUDIT_IPO_ID,
      doc_url: seed.doc_url,
      doc_kind: seed.doc_kind,
      pdf_sha256: dl.sha256,
      bytes: dl.bytes,
      parsed_at_utc: new Date().toISOString(),
      parser_version: PARSER_VERSION,
    };
    safeWriteJson(COVER_OUT, enriched);
  }

  // Read final cover.json (either freshly written or reused).
  const cover = readJsonOrNull<CoverExtraction & { ipo_id?: string; needs_manual_review?: boolean }>(COVER_OUT);
  if (!cover) fail(`cover.json not readable after extract`);
  log('extract', `anchors=${cover.anchors_matched}/${cover.anchors_total} overall=${cover.overall_confidence} mr=${cover.needs_manual_review ?? false}`);

  // Compose the new sections.cover block.
  const newCoverBlock = {
    attempted: true,
    confidence: cover.overall_confidence,
    anchors_matched: cover.anchors_matched,
    anchors_total: cover.anchors_total,
    fields_populated: Object.entries(cover.fields ?? {})
      .filter(([, v]) => v && v.value != null)
      .map(([k]) => k),
    needs_manual_review: cover.needs_manual_review ?? false,
    errors: cover.errors ?? [],
  };
  // 2-space indent matching the rest of the file; the splice helper
  // preserves surrounding whitespace so the result is uniformly indented.
  const newCoverJson = JSON.stringify(newCoverBlock, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '      ' + line)) // align with sections.cover nesting
    .join('\n');

  const newTimestamp = new Date().toISOString();
  spliceAuditCoverBlock(newCoverJson, newTimestamp);
  log('audit', `sections.cover updated at ${AUDIT_PATH}`);

  // Summary.
  console.log('[extract:onemi-cover] SUCCESS');
  console.log(`  cover.json:        ${COVER_OUT}`);
  console.log(`  audit row:         ${AUDIT_PATH} -> by_ipo['${AUDIT_IPO_ID}'].sections.cover`);
  console.log(`  anchors:           ${cover.anchors_matched}/${cover.anchors_total}`);
  console.log(`  overall confidence: ${cover.overall_confidence}`);
  console.log(`  needs manual review: ${cover.needs_manual_review ?? false}`);
  console.log(`  populated fields:`);
  for (const [key, val] of Object.entries(cover.fields ?? {})) {
    if (val && val.value != null) {
      const v = JSON.stringify(val.value);
      console.log(`    - ${key} = ${v.length > 60 ? v.slice(0, 60) + '…' : v}  (p${val.page}, ${val.confidence})`);
    }
  }
}

await main();
