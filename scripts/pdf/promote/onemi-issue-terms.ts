#!/usr/bin/env tsx
// Phase 5B.2 — OnEMI issue-term promoter.
//
// Reads the cover-extraction side artifact at
//   phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json
// and splices HIGH/MEDIUM-confidence values into the existing OnEMI rows
// in:
//   - src/data/snapshots/ipo-master.json   (price_band, issue_size_cr, lot_size, face_value)
//   - src/data/snapshots/ipo-documents.json (registrar, brlms; optionally docs[0].bytes + page_count)
//
// Hard guardrails (per phase-5B2-onemi-cover-extraction-plan.md §6–§8):
//   - OnEMI only. Does NOT iterate other ipo_ids.
//   - Reuses the existing string-surgery pattern from scripts/pdf/promote/onemi.ts
//     + onemi-master.ts: the 10 existing IPO rows in both snapshots stay
//     byte-identical; only the OnEMI row's targeted keys are mutated, and
//     only the top-level generated_at_utc is bumped.
//   - Per-field merge: refuses to overwrite any non-null/non-empty production
//     value (explicit idempotency + refusal-to-clobber).
//   - LOW confidence + NONE-match fields stay null in production. Status doc
//     lists them as manual-review candidates with reason.
//   - Atomic writes via .tmp + rename.
//   - No PDF binaries / full-text dumps.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

const PRODUCTION_IPO_ID = 'onemi-technology-solutions';
const AUDIT_IPO_ID = 'curated_onemi-technology-solutions';
const PARSER_VERSION = '5B.2';

const COVER_PATH = `phase-0/pdf-extracts/${AUDIT_IPO_ID}/cover.json`;
const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const DOCS_PATH = 'src/data/snapshots/ipo-documents.json';

// Per-field sanity bounds (§6 of the plan).
const SANITY = {
  issue_size_cr: (v: number) => v > 0 && v < 1_000_000,
  price_band: (v: { low: number; high: number }) => v.low > 0 && v.high > 0 && v.high >= v.low,
  lot_size: (v: number) => v > 0 && Number.isInteger(v),
  face_value: (v: number) => v >= 1 && v <= 100,
  registrar: (v: string) => v.length >= 5 && v.length <= 200,
  brlms: (v: string[]) => v.length >= 1 && v.length <= 5,
};

// ─── Types (duck-typed) ──

type Confidence = 'high' | 'medium' | 'low' | null;
interface CoverField {
  value: unknown;
  page: number | null;
  confidence: Confidence;
}
interface CoverExtraction {
  ipo_id?: string;
  doc_url?: string;
  doc_kind?: string;
  pdf_sha256?: string;
  bytes?: number;
  page_count: number;
  fields: Record<string, CoverField>;
  anchors_matched: number;
  anchors_total: number;
  overall_confidence: 'high' | 'medium' | 'low';
  ok: boolean;
  needs_manual_review?: boolean;
  errors: string[];
}

// ─── Failure helper ──

function fail(msg: string): never {
  console.error(`[promote:onemi-issue-terms] FAIL: ${msg}`);
  process.exit(1);
}
function log(stage: string, msg: string) {
  console.log(`[promote:onemi-issue-terms] [${stage}] ${msg}`);
}

// ─── Per-field acceptance ──

type DecisionTag = 'promoted' | 'skipped-low' | 'skipped-none' | 'skipped-existing' | 'skipped-sanity';
interface FieldDecision {
  field: string;
  tag: DecisionTag;
  value: unknown;
  page: number | null;
  confidence: Confidence;
  reason: string;
}

function decide(
  field: string,
  cover: CoverField | undefined,
  sanity: (v: unknown) => boolean,
  currentlyEmpty: boolean,
): FieldDecision {
  if (!cover) {
    return { field, tag: 'skipped-none', value: null, page: null, confidence: null, reason: 'anchor not in cover output' };
  }
  if (cover.value == null) {
    return { field, tag: 'skipped-none', value: null, page: null, confidence: cover.confidence ?? null, reason: 'cover anchor unmatched' };
  }
  if (cover.confidence !== 'high' && cover.confidence !== 'medium') {
    return { field, tag: 'skipped-low', value: cover.value, page: cover.page, confidence: cover.confidence, reason: 'confidence below medium' };
  }
  if (!sanity(cover.value)) {
    return { field, tag: 'skipped-sanity', value: cover.value, page: cover.page, confidence: cover.confidence, reason: 'failed per-field sanity check' };
  }
  if (!currentlyEmpty) {
    return { field, tag: 'skipped-existing', value: cover.value, page: cover.page, confidence: cover.confidence, reason: 'production value already non-null (refusal to clobber)' };
  }
  return { field, tag: 'promoted', value: cover.value, page: cover.page, confidence: cover.confidence, reason: 'HIGH/MEDIUM + sanity pass + null in production' };
}

// ─── String-surgery splice helpers ──

// Locate the OnEMI row in a snapshot file, then return the start/end byte
// indices of the row's content (the body inside `{ ... }`). The OnEMI row's
// outer braces stay in place — only the body changes.
function locateOnemiRow(
  content: string,
  keyPattern: RegExp,
): { rowStart: number; rowEnd: number; bodyStart: number; bodyEnd: number } {
  const keyMatch = keyPattern.exec(content);
  if (!keyMatch) fail(`could not locate OnEMI key in snapshot`);
  // Move forward to the `{` opening the row body.
  let i = keyMatch.index + keyMatch[0].length;
  while (i < content.length && content[i] !== '{') i++;
  if (content[i] !== '{') fail(`could not locate row opening brace`);
  const bodyStart = i + 1;
  let depth = 1;
  let j = bodyStart;
  while (j < content.length && depth > 0) {
    const c = content[j];
    if (c === '"') {
      j++;
      while (j < content.length && content[j] !== '"') {
        if (content[j] === '\\') j += 2;
        else j++;
      }
      j++;
      continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    j++;
  }
  if (depth !== 0) fail(`unbalanced braces in OnEMI row`);
  return { rowStart: keyMatch.index, rowEnd: j, bodyStart, bodyEnd: j - 1 };
}

// Bump generated_at_utc at file top.
function bumpTimestamp(content: string, newTs: string): string {
  const replaced = content.replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${newTs}"`);
  if (replaced === content) fail(`could not locate generated_at_utc in file`);
  return replaced;
}

// Replace a key's value within a slice of text. Preserves whitespace
// + key order; only the target line's value is mutated. The key MUST
// appear exactly once in the slice (we use a unique-anchored regex).
function replaceKeyValueInRow(rowBody: string, key: string, newValueLiteral: string): string {
  // Match `      "<key>": null,?` or `      "<key>": [],?` with optional trailing comma + whitespace.
  // We intentionally NOT match strings or numbers because every Phase 5B.2 candidate
  // currently sits as `null` (master) or `[]` (documents.brlms) or `null` (documents.registrar).
  // The simple null/empty-array form is sufficient.
  const re = new RegExp(`("${key}"\\s*:\\s*)(null|\\[\\])`, 'g');
  let matchCount = 0;
  const out = rowBody.replace(re, (full, prefix) => {
    matchCount++;
    return `${prefix}${newValueLiteral}`;
  });
  if (matchCount === 0) fail(`replaceKeyValueInRow: ${key} not found in row body`);
  if (matchCount > 1) fail(`replaceKeyValueInRow: ${key} matched ${matchCount} times in row body`);
  return out;
}

// Format a price_band literal at the master-row indent (6-space, matching greendale).
function fmtPriceBand(pb: { low: number; high: number }): string {
  return [
    '{',
    `        "low": ${pb.low},`,
    `        "high": ${pb.high}`,
    '      }',
  ].join('\n');
}

// Format a registrar literal at the documents-row indent (6-space).
function fmtRegistrar(name: string): string {
  return [
    '{',
    `        "name": ${JSON.stringify(name)},`,
    `        "portal_url": null`,
    '      }',
  ].join('\n');
}

// Format a BRLMs array literal at the documents-row indent (6-space).
function fmtBrlms(brlms: string[]): string {
  if (brlms.length === 0) return '[]';
  const lines = ['['];
  for (let i = 0; i < brlms.length; i++) {
    const trailing = i < brlms.length - 1 ? ',' : '';
    lines.push(`        ${JSON.stringify(brlms[i])}${trailing}`);
  }
  lines.push('      ]');
  return lines.join('\n');
}

// ─── Atomic write ──

function atomicWrite(path: string, content: string): void {
  const tmp = path + '.tmp';
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
}

// ─── Document row docs[0] enrichment (mechanical reads, not inferences) ──

function enrichDocsZerothMeta(
  content: string,
  rowBody: { rowStart: number; rowEnd: number; bodyStart: number; bodyEnd: number },
  bytes: number | undefined,
  pageCount: number | undefined,
): { content: string; addedBytes: boolean; addedPageCount: boolean } {
  // We only add bytes / page_count if they're not already present and we
  // have the values. The docs[0] object lives inside the row body; we
  // add the keys right before the closing `}` of docs[0].
  let body = content.slice(rowBody.bodyStart, rowBody.bodyEnd);
  const hasBytes = /"bytes"\s*:/.test(body);
  const hasPageCount = /"page_count"\s*:/.test(body);
  let addedBytes = false;
  let addedPageCount = false;
  if (!hasBytes && typeof bytes === 'number') {
    // Insert before the fetched_at_utc closing brace pattern. The current
    // docs[0] ends with `        }`; we add `bytes` after `fetched_at_utc`.
    body = body.replace(
      /("fetched_at_utc"\s*:\s*"[^"]*")(\s*\n\s*\})/,
      (_full, p1, p2) => `${p1},\n          "bytes": ${bytes}${p2}`,
    );
    addedBytes = true;
  }
  if (!hasPageCount && typeof pageCount === 'number') {
    body = body.replace(
      /("fetched_at_utc"\s*:\s*"[^"]*"(?:,\s*"bytes":\s*\d+)?)(\s*\n\s*\})/,
      (_full, p1, p2) => `${p1},\n          "page_count": ${pageCount}${p2}`,
    );
    addedPageCount = true;
  }
  const newContent = content.slice(0, rowBody.bodyStart) + body + content.slice(rowBody.bodyEnd);
  return { content: newContent, addedBytes, addedPageCount };
}

// ─── Main ──

interface ProductionMasterRow {
  price_band: { low: number; high: number } | null;
  lot_size: number | null;
  issue_size_cr: number | null;
  face_value: number | null;
  [k: string]: unknown;
}
interface ProductionDocsRow {
  registrar: { name: string; portal_url: string | null } | null;
  brlms: string[];
  docs: Array<{ url: string; bytes?: number; page_count?: number; [k: string]: unknown }>;
  [k: string]: unknown;
}

async function main(): Promise<void> {
  // Preflight 1: cover.json
  const cover = readJsonOrNull<CoverExtraction>(COVER_PATH);
  if (!cover) fail(`${COVER_PATH} missing — run scripts/pdf/extract/onemi-cover.ts first`);
  if (cover.needs_manual_review === true) {
    fail(`cover.json has needs_manual_review: true — refusing to promote. Status doc must explain.`);
  }
  log('preflight', `cover.json OK (overall=${cover.overall_confidence}, anchors=${cover.anchors_matched}/${cover.anchors_total})`);

  // Preflight 2: master + documents rows
  const masterFile = readJsonOrNull<{ generated_at_utc: string; ipos: ProductionMasterRow[] }>(MASTER_PATH);
  if (!masterFile) fail(`${MASTER_PATH} missing or malformed`);
  const masterRow = (masterFile.ipos as Array<ProductionMasterRow & { id?: string }>).find((r) => r.id === PRODUCTION_IPO_ID);
  if (!masterRow) fail(`${MASTER_PATH} missing ${PRODUCTION_IPO_ID} row`);

  const docsFile = readJsonOrNull<{ generated_at_utc: string; by_ipo: Record<string, ProductionDocsRow> }>(DOCS_PATH);
  if (!docsFile) fail(`${DOCS_PATH} missing or malformed`);
  const docsRow = docsFile.by_ipo[PRODUCTION_IPO_ID];
  if (!docsRow) fail(`${DOCS_PATH} missing ${PRODUCTION_IPO_ID} row`);

  // Per-field decisions.
  const fields = cover.fields ?? {};
  const decisions: FieldDecision[] = [
    decide('price_band', fields.price_band, (v) => SANITY.price_band(v as { low: number; high: number }), masterRow.price_band == null),
    decide('issue_size_cr', fields.issue_size_cr, (v) => SANITY.issue_size_cr(v as number), masterRow.issue_size_cr == null),
    decide('lot_size', fields.lot_size, (v) => SANITY.lot_size(v as number), masterRow.lot_size == null),
    decide('face_value', fields.face_value, (v) => SANITY.face_value(v as number), masterRow.face_value == null),
    decide('registrar', fields.registrar, (v) => SANITY.registrar(v as string), docsRow.registrar == null),
    decide('brlms', fields.brlms, (v) => SANITY.brlms(v as string[]), docsRow.brlms.length === 0),
  ];

  log('decisions', `promoted=${decisions.filter((d) => d.tag === 'promoted').length}/${decisions.length}`);
  for (const d of decisions) {
    log('decisions', `  ${d.field}: ${d.tag} (conf=${d.confidence ?? '—'}; ${d.reason})`);
  }

  // ─── Master splice ──
  const masterFields = ['price_band', 'issue_size_cr', 'lot_size', 'face_value'] as const;
  const promotedMaster = decisions.filter((d) => d.tag === 'promoted' && (masterFields as readonly string[]).includes(d.field));
  if (promotedMaster.length > 0) {
    let masterContent = readFileSync(MASTER_PATH, 'utf-8');
    const newTs = new Date().toISOString();
    masterContent = bumpTimestamp(masterContent, newTs);

    const masterLoc = locateOnemiRow(masterContent, /"id"\s*:\s*"onemi-technology-solutions"/);
    let body = masterContent.slice(masterLoc.bodyStart, masterLoc.bodyEnd);

    for (const d of promotedMaster) {
      let literal: string;
      if (d.field === 'price_band') literal = fmtPriceBand(d.value as { low: number; high: number });
      else literal = String(d.value);
      body = replaceKeyValueInRow(body, d.field, literal);
    }

    masterContent = masterContent.slice(0, masterLoc.bodyStart) + body + masterContent.slice(masterLoc.bodyEnd);
    atomicWrite(MASTER_PATH, masterContent);
    log('master', `${MASTER_PATH} updated: ${promotedMaster.map((d) => d.field).join(', ')}`);
  } else {
    log('master', `no master-side promotions; ${MASTER_PATH} untouched`);
  }

  // ─── Documents splice ──
  const docsFields = ['registrar', 'brlms'] as const;
  const promotedDocs = decisions.filter((d) => d.tag === 'promoted' && (docsFields as readonly string[]).includes(d.field));

  // Bytes + page_count come from cover.json (mechanical reads — promoted
  // unconditionally if either the cover.json carries them OR the audit
  // row has them; per the plan, these are NOT subject to the confidence
  // gate because they're file-property reads, not inferences).
  const willAddBytes = typeof cover.bytes === 'number' && docsRow.docs[0]?.bytes == null;
  const willAddPageCount = typeof cover.page_count === 'number' && docsRow.docs[0]?.page_count == null;

  if (promotedDocs.length > 0 || willAddBytes || willAddPageCount) {
    let docsContent = readFileSync(DOCS_PATH, 'utf-8');
    const newTs = new Date().toISOString();
    docsContent = bumpTimestamp(docsContent, newTs);

    let docsLoc = locateOnemiRow(docsContent, /"ipo_id"\s*:\s*"onemi-technology-solutions"/);

    // registrar / brlms first.
    if (promotedDocs.length > 0) {
      let body = docsContent.slice(docsLoc.bodyStart, docsLoc.bodyEnd);
      for (const d of promotedDocs) {
        let literal: string;
        if (d.field === 'registrar') literal = fmtRegistrar(d.value as string);
        else if (d.field === 'brlms') literal = fmtBrlms(d.value as string[]);
        else fail(`unexpected docs field ${d.field}`);
        body = replaceKeyValueInRow(body, d.field, literal);
      }
      docsContent = docsContent.slice(0, docsLoc.bodyStart) + body + docsContent.slice(docsLoc.bodyEnd);
      // After splicing registrar/brlms the row's end index has shifted.
      docsLoc = locateOnemiRow(docsContent, /"ipo_id"\s*:\s*"onemi-technology-solutions"/);
    }

    // docs[0] bytes / page_count.
    if (willAddBytes || willAddPageCount) {
      const enr = enrichDocsZerothMeta(docsContent, docsLoc, cover.bytes, cover.page_count);
      docsContent = enr.content;
    }

    atomicWrite(DOCS_PATH, docsContent);
    log(
      'documents',
      `${DOCS_PATH} updated: ${[
        ...promotedDocs.map((d) => d.field),
        ...(willAddBytes ? ['docs[0].bytes'] : []),
        ...(willAddPageCount ? ['docs[0].page_count'] : []),
      ].join(', ')}`,
    );
  } else {
    log('documents', `no documents-side promotions; ${DOCS_PATH} untouched`);
  }

  // ─── Summary ──
  console.log(`\n[promote:onemi-issue-terms] SUCCESS (parser_version=${PARSER_VERSION})`);
  console.log(`  promoted: ${decisions.filter((d) => d.tag === 'promoted').length}/${decisions.length}`);
  for (const d of decisions) {
    const v = JSON.stringify(d.value);
    const vTrunc = v.length > 60 ? v.slice(0, 60) + '…' : v;
    console.log(`    ${d.field.padEnd(15)} ${d.tag.padEnd(20)} conf=${(d.confidence ?? '—').padEnd(7)} ${vTrunc}`);
  }
  console.log(`  bytes added:       ${willAddBytes}`);
  console.log(`  page_count added:  ${willAddPageCount}`);
}

await main();
