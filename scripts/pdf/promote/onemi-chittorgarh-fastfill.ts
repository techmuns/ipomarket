#!/usr/bin/env tsx
// Phase 6A.2 — OnEMI Chittorgarh fast-fill ingestion (artifact-to-snapshot bridge).
//
// Reads the committed, probe-maintained Chittorgarh extraction artifact for
// OnEMI Technology Solutions and gap-fills ONLY the null issue-term fields in:
//   - src/data/snapshots/ipo-master.json      (OnEMI row: price_band,
//       issue_size_cr, lot_size, open_date, close_date, listing_date)
//   - src/data/snapshots/ipo-documents.json   (OnEMI row: registrar)
//   - src/data/snapshots/ipo-source-audit.json (NEW OnEMI entry: per-field
//       Chittorgarh provenance rows + chittorgarh source-mix bucket)
//
// Hard guardrails (per phase-6A-2-chittorgarh-fastfill-plan.md §6, §6.1, §9):
//   - OnEMI only. Does NOT iterate other ipo_ids.
//   - Artifact-to-snapshot bridge: reads committed probe artifacts, NEVER
//     re-fetches Chittorgarh. No network. No JS render.
//   - §6.1 freshness + provenance preflight runs BEFORE any snapshot write;
//     HALT (write nothing) on any failure.
//   - Fills ONLY fields whose current production value is null AND whose
//     extracted confidence is HIGH/MEDIUM AND whose normalization succeeds.
//   - Never overwrites an official or non-null value (conflict → drop + log).
//   - Existing rows in all three snapshots stay byte-identical (string-surgery
//     splice; only the OnEMI row/entry + generated_at_utc change).
//   - Atomic write via .tmp + rename. Idempotent (re-run is a clean no-op once
//     OnEMI is in the source-audit).

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

// ─── Paths ──
const FIELDS_V2_PATH = 'phase-0/broker-pages/chittorgarh-fields-v2.json';
const SUMMARY_V2_PATH = 'phase-0/broker-pages/chittorgarh-extraction-summary-v2.json';
const DETAIL_DIR = 'phase-0/broker-pages';
const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const DOCUMENTS_PATH = 'src/data/snapshots/ipo-documents.json';
const AUDIT_PATH = 'src/data/snapshots/ipo-source-audit.json';

// ─── OnEMI mapping (§6.1 check 3) ──
const PRODUCTION_IPO_ID = 'onemi-technology-solutions';
const CHITTORGARH_SLUG = 'onemi-technology-ipo';
const CHITTORGARH_ID = '2576';
const DETAIL_URL = 'https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/';

// ─── Gates (§6.1 checks 2 + 5) ──
const ALLOWED_ROBOTS = ['allowed-prior-flag-was-over-match', 'allowed-no-applicable-disallow'];
const PRECISION_FULL_GATE = 0.8;
const PRECISION_NARROW_GATE = 0.9;
const MAX_ARTIFACT_AGE_DAYS = 7;
const PROMOTE_CONFIDENCE = new Set(['high', 'medium']);

// ─── Types (duck-typed; self-contained) ──
type Confidence = 'high' | 'medium' | 'low' | null;

interface ArtifactField {
  value: string | string[] | null;
  found: boolean;
  confidence: Confidence;
  method: string;
  why_missing: string | null;
  source_snippet: string | null;
}
interface DetailArtifact {
  detail_index: number;
  source_url: string;
  slug: string;
  fields: Record<string, ArtifactField>;
}
interface PickedDetailUrl {
  index: number;
  url: string;
  slug: string;
}
interface FieldsV2 {
  captured_at_utc?: string;
  robots_posture: { classification: string };
  picked_detail_urls: PickedDetailUrl[];
}
interface SummaryPerDetail {
  slug: string;
  precision_ratio_full: number;
  precision_ratio_narrow: number;
}
interface SummaryV2 {
  generated_at_utc?: string;
  average_precision_ratio_full: number;
  average_precision_ratio_narrow: number;
  per_detail: SummaryPerDetail[];
}

interface MasterRow {
  id: string;
  [k: string]: unknown;
}
interface MasterSnapshot {
  generated_at_utc: string;
  ipos: MasterRow[];
  timelines: unknown[];
  source_meta: unknown;
}
interface DocsRow {
  ipo_id: string;
  registrar: unknown;
  [k: string]: unknown;
}
interface DocsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, DocsRow>;
}
interface AuditSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, unknown>;
}

type Normalized =
  | { kind: 'scalar-string'; value: string }
  | { kind: 'scalar-number'; value: number }
  | { kind: 'price_band'; low: number; high: number }
  | { kind: 'registrar'; name: string };

interface FieldSpec {
  prodField: string;
  target: 'master' | 'documents';
  artifactKey: string;
  normalize: (raw: string) => Normalized | null;
}

interface Promoted {
  prodField: string;
  target: 'master' | 'documents';
  raw: string;
  confidence: string;
  norm: Normalized;
  displayNormalized: string;
}

// ─── Failure helper ──
function fail(msg: string): never {
  console.error(`[6A.2:onemi-chittorgarh] HALT: ${msg}`);
  process.exit(1);
}

// ─── Normalizers (§3 raw → typed) ──
function toNum(s: string): number {
  return Number(s.replace(/,/g, ''));
}
function normPriceBand(raw: string): Normalized | null {
  const m = raw.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(?:to|–|—|-)\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const low = toNum(m[1]);
  const high = toNum(m[2]);
  if (!(low > 0) || !(high >= low)) return null;
  return { kind: 'price_band', low, high };
}
function normIssueSizeCr(raw: string): Normalized | null {
  const m = raw.match(/₹\s*([\d,]+(?:\.\d+)?)\s*Cr\b/i);
  if (!m) return null;
  const v = toNum(m[1]);
  return v > 0 ? { kind: 'scalar-number', value: v } : null;
}
function normLotSize(raw: string): Normalized | null {
  const m = raw.match(/([\d,]+)\s*Shares?\b/i);
  if (!m) return null;
  const v = toNum(m[1]);
  return Number.isInteger(v) && v > 0 ? { kind: 'scalar-number', value: v } : null;
}
function normIsoDate(raw: string): Normalized | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  return Number.isNaN(t) ? null : { kind: 'scalar-string', value: raw };
}
function normRegistrar(raw: string): Normalized | null {
  const s = raw.trim();
  return s.length >= 3 ? { kind: 'registrar', name: s } : null;
}

const FIELD_SPECS: FieldSpec[] = [
  { prodField: 'price_band', target: 'master', artifactKey: 'price_band', normalize: normPriceBand },
  { prodField: 'issue_size_cr', target: 'master', artifactKey: 'issue_size_cr', normalize: normIssueSizeCr },
  { prodField: 'lot_size', target: 'master', artifactKey: 'lot_size', normalize: normLotSize },
  { prodField: 'open_date', target: 'master', artifactKey: 'open_date', normalize: normIsoDate },
  { prodField: 'close_date', target: 'master', artifactKey: 'close_date', normalize: normIsoDate },
  { prodField: 'listing_date', target: 'master', artifactKey: 'listing_date', normalize: normIsoDate },
  { prodField: 'registrar', target: 'documents', artifactKey: 'registrar', normalize: normRegistrar },
];

function displayNorm(n: Normalized): string {
  switch (n.kind) {
    case 'scalar-string':
      return n.value;
    case 'scalar-number':
      return String(n.value);
    case 'price_band':
      return `{low:${n.low},high:${n.high}}`;
    case 'registrar':
      return `{name:"${n.name}",portal_url:null}`;
  }
}

// ─── §6.1 artifact freshness + provenance preflight ──
function preflightArtifacts(): {
  detail: DetailArtifact;
  detailIndex: number;
  fetchedAtUtc: string;
  robots: string;
  precFull: number;
  precNarrow: number;
} {
  const fieldsV2 = readJsonOrNull<FieldsV2>(FIELDS_V2_PATH);
  if (!fieldsV2) fail(`missing/malformed artifact: ${FIELDS_V2_PATH}`);
  const summary = readJsonOrNull<SummaryV2>(SUMMARY_V2_PATH);
  if (!summary) fail(`missing/malformed artifact: ${SUMMARY_V2_PATH}`);

  // Check 1: artifacts exist + resolve OnEMI by slug → detail index.
  const picked = (fieldsV2.picked_detail_urls ?? []).find((p) => p.slug === CHITTORGARH_SLUG);
  if (!picked) {
    fail(`OnEMI slug "${CHITTORGARH_SLUG}" not found in ${FIELDS_V2_PATH} picked_detail_urls`);
  }
  const detailPath = `${DETAIL_DIR}/chittorgarh-detail-${picked.index}-extracted-retuned.json`;
  const detail = readJsonOrNull<DetailArtifact>(detailPath);
  if (!detail) fail(`OnEMI per-detail artifact missing/malformed: ${detailPath}`);

  // Check 2: post-retune / post-robots group=K run.
  const robots = String(fieldsV2.robots_posture?.classification ?? '');
  if (!ALLOWED_ROBOTS.includes(robots)) {
    fail(`robots classification "${robots}" not in allowed set ${JSON.stringify(ALLOWED_ROBOTS)}`);
  }
  const precFull = Number(summary.average_precision_ratio_full);
  const precNarrow = Number(summary.average_precision_ratio_narrow);
  if (!(precFull >= PRECISION_FULL_GATE || precNarrow >= PRECISION_NARROW_GATE)) {
    fail(
      `precision below gate: full=${precFull} (need ≥${PRECISION_FULL_GATE}) ` +
        `OR narrow=${precNarrow} (need ≥${PRECISION_NARROW_GATE})`,
    );
  }
  // Sanity: OnEMI's own per-detail precision is consistent (>0).
  const onemiPer = (summary.per_detail ?? []).find((d) => d.slug === CHITTORGARH_SLUG);
  if (!onemiPer || !(onemiPer.precision_ratio_full > 0)) {
    fail(`OnEMI per_detail precision missing/zero in ${SUMMARY_V2_PATH}`);
  }

  // Check 3: OnEMI mapping matches exactly.
  if (picked.url !== DETAIL_URL) fail(`picked url mismatch: ${picked.url} !== ${DETAIL_URL}`);
  if (detail.source_url !== DETAIL_URL) fail(`detail source_url mismatch: ${detail.source_url} !== ${DETAIL_URL}`);
  if (detail.slug !== CHITTORGARH_SLUG) fail(`detail slug mismatch: ${detail.slug} !== ${CHITTORGARH_SLUG}`);
  if (!DETAIL_URL.includes(`/${CHITTORGARH_ID}/`)) fail(`chittorgarh id ${CHITTORGARH_ID} not in detail URL`);

  // Check 5: freshness guard.
  const ts = summary.generated_at_utc ?? fieldsV2.captured_at_utc ?? null;
  if (!ts) fail(`no artifact timestamp (generated_at_utc / captured_at_utc) — undated, refusing to promote`);
  const ageMs = Date.now() - Date.parse(ts);
  if (Number.isNaN(ageMs)) fail(`artifact timestamp unparseable: ${ts}`);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > MAX_ARTIFACT_AGE_DAYS) {
    fail(
      `Chittorgarh artifacts are stale (age = ${ageDays.toFixed(1)} days > ${MAX_ARTIFACT_AGE_DAYS}); ` +
        `re-run phase-0-probes with group=K before fast-fill.`,
    );
  }

  console.log('[6A.2:onemi-chittorgarh] §6.1 artifact preflight OK');
  console.log(`  detail artifact   : ${detailPath}`);
  console.log(`  robots            : ${robots}`);
  console.log(`  precision         : full=${precFull} narrow=${precNarrow}`);
  console.log(`  artifact timestamp: ${ts} (age ${ageDays.toFixed(1)}d)`);
  return { detail, detailIndex: picked.index, fetchedAtUtc: ts, robots, precFull, precNarrow };
}

// ─── Per-field promotion (§6.1 check 4: usable provenance) ──
function buildPromotedSet(detail: DetailArtifact): { promoted: Promoted[]; skipped: string[] } {
  const promoted: Promoted[] = [];
  const skipped: string[] = [];
  for (const spec of FIELD_SPECS) {
    const f = detail.fields[spec.artifactKey];
    if (!f) {
      skipped.push(`${spec.prodField}: artifact field "${spec.artifactKey}" absent`);
      continue;
    }
    if (!f.found) {
      skipped.push(`${spec.prodField}: found=false (${f.why_missing ?? 'no reason'})`);
      continue;
    }
    const conf = String(f.confidence ?? '').toLowerCase();
    if (!PROMOTE_CONFIDENCE.has(conf)) {
      skipped.push(`${spec.prodField}: confidence=${f.confidence} (need high/medium)`);
      continue;
    }
    if (typeof f.value !== 'string' || f.value.trim() === '') {
      skipped.push(`${spec.prodField}: value not a usable string`);
      continue;
    }
    const norm = spec.normalize(f.value);
    if (!norm) {
      skipped.push(`${spec.prodField}: normalization failed for "${f.value}"`);
      continue;
    }
    promoted.push({
      prodField: spec.prodField,
      target: spec.target,
      raw: f.value,
      confidence: conf,
      norm,
      displayNormalized: displayNorm(norm),
    });
  }
  return { promoted, skipped };
}

// ─── String-surgery: master in-place null-field fill ──
function masterFillLines(p: Promoted): string[] {
  const n = p.norm;
  if (n.kind === 'price_band') {
    return [
      '      "price_band": {',
      `        "low": ${n.low},`,
      `        "high": ${n.high}`,
      '      },',
    ];
  }
  if (n.kind === 'scalar-number') {
    return [`      "${p.prodField}": ${n.value},`];
  }
  if (n.kind === 'scalar-string') {
    return [`      "${p.prodField}": ${JSON.stringify(n.value)},`];
  }
  fail(`unexpected master norm kind for ${p.prodField}`);
}

function spliceMasterRow(content: string, masterPromoted: Promoted[]): string {
  const lines = content.split('\n');
  const idIdx = lines.indexOf(`      "id": "${PRODUCTION_IPO_ID}",`);
  if (idIdx === -1) fail(`OnEMI id line not found in ${MASTER_PATH}`);
  const openIdx = idIdx - 1;
  if (lines[openIdx] !== '    {') fail(`unexpected OnEMI row opener: ${JSON.stringify(lines[openIdx])}`);
  let closeIdx = -1;
  for (let i = idIdx; i < lines.length; i++) {
    if (lines[i] === '    }') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) fail(`OnEMI row closer not found in ${MASTER_PATH}`);

  const fills = new Map<string, string[]>();
  for (const p of masterPromoted) fills.set(`      "${p.prodField}": null,`, masterFillLines(p));

  const before = lines.slice(0, openIdx + 1);
  const body = lines.slice(openIdx + 1, closeIdx);
  const after = lines.slice(closeIdx);
  const newBody: string[] = [];
  let applied = 0;
  for (const line of body) {
    const repl = fills.get(line);
    if (repl) {
      newBody.push(...repl);
      applied++;
    } else {
      newBody.push(line);
    }
  }
  if (applied !== fills.size) {
    fail(`master fill mismatch: expected ${fills.size} null lines in OnEMI row, applied ${applied} (formatting drift?)`);
  }
  return [...before, ...newBody, ...after].join('\n');
}

// ─── String-surgery: documents in-place registrar fill ──
function spliceDocsRow(content: string, registrarName: string): string {
  const lines = content.split('\n');
  const openIdx = lines.indexOf(`    "${PRODUCTION_IPO_ID}": {`);
  if (openIdx === -1) fail(`OnEMI docs opener not found in ${DOCUMENTS_PATH}`);
  let closeIdx = -1;
  for (let i = openIdx + 1; i < lines.length; i++) {
    if (lines[i] === '    }') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) fail(`OnEMI docs closer not found in ${DOCUMENTS_PATH}`);

  const target = '      "registrar": null,';
  const replacement = [
    '      "registrar": {',
    `        "name": ${JSON.stringify(registrarName)},`,
    '        "portal_url": null',
    '      },',
  ];
  const out: string[] = [];
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (i > openIdx && i < closeIdx && lines[i] === target) {
      out.push(...replacement);
      found = true;
    } else {
      out.push(lines[i]);
    }
  }
  if (!found) fail(`OnEMI registrar null line not found inside docs row`);
  return out.join('\n');
}

// ─── String-surgery: audit new-entry splice ──
function buildAuditEntry(promoted: Promoted[], fetchedAtUtc: string): string {
  const fieldBlocks = promoted
    .map((p) =>
      [
        '        {',
        `          "field": ${JSON.stringify(p.prodField)},`,
        '          "source": "Chittorgarh",',
        '          "state": "aggregator",',
        `          "url": ${JSON.stringify(DETAIL_URL)},`,
        `          "fetched_at_utc": ${JSON.stringify(fetchedAtUtc)}`,
        '        }',
      ].join('\n'),
    )
    .join(',\n');
  return [
    `    ${JSON.stringify(PRODUCTION_IPO_ID)}: {`,
    `      "ipo_id": ${JSON.stringify(PRODUCTION_IPO_ID)},`,
    '      "source_mix": {',
    '        "nse": 0,',
    '        "bse": 0,',
    '        "sebi": 0,',
    '        "rhp": 0,',
    '        "manual": 0,',
    '        "derived": 0,',
    '        "broker_ref": 0,',
    '        "chittorgarh": 100',
    '      },',
    '      "fields": [',
    fieldBlocks,
    '      ]',
    '    }',
  ].join('\n');
}

function spliceAuditEntry(content: string, entryText: string): string {
  const lines = content.split('\n');
  let endIdx = lines.length - 1;
  if (lines[endIdx] === '') endIdx--;
  if (lines[endIdx] !== '}') fail(`unexpected last non-empty line in ${AUDIT_PATH}: ${JSON.stringify(lines[endIdx])}`);
  const byIpoCloserIdx = endIdx - 1;
  if (lines[byIpoCloserIdx] !== '  }') fail(`unexpected by_ipo closer in ${AUDIT_PATH}: ${JSON.stringify(lines[byIpoCloserIdx])}`);
  const lastRowCloserIdx = byIpoCloserIdx - 1;
  if (lines[lastRowCloserIdx] !== '    }') {
    fail(`unexpected last audit entry closer in ${AUDIT_PATH}: ${JSON.stringify(lines[lastRowCloserIdx])}`);
  }
  lines[lastRowCloserIdx] = '    },';
  lines.splice(byIpoCloserIdx, 0, entryText);
  return lines.join('\n');
}

// ─── generated_at_utc bump ──
function bumpTimestamp(content: string, filePath: string, ts: string): string {
  const out = content.replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${ts}"`);
  if (out === content) fail(`could not locate generated_at_utc in ${filePath}`);
  return out;
}

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, filePath);
}

// ─── Main ──
function main(): void {
  // §6.1 artifact preflight (HALT on any failure; runs before any snapshot read/write).
  const { detail, fetchedAtUtc } = preflightArtifacts();

  // Per-field promotion (confidence + normalization + provenance).
  const { promoted, skipped } = buildPromotedSet(detail);
  if (promoted.length === 0) {
    fail('no promotable fields after provenance preflight');
  }

  // ── Snapshot preflight (existence, conflict, idempotency) ──
  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master || !Array.isArray(master.ipos)) fail(`${MASTER_PATH} missing/malformed`);
  const masterRow = master.ipos.find((r) => r.id === PRODUCTION_IPO_ID);
  if (!masterRow) fail(`${MASTER_PATH}: OnEMI row not found`);

  const docs = readJsonOrNull<DocsSnapshot>(DOCUMENTS_PATH);
  if (!docs || !docs.by_ipo) fail(`${DOCUMENTS_PATH} missing/malformed`);
  const docsRow = docs.by_ipo[PRODUCTION_IPO_ID];
  if (!docsRow) fail(`${DOCUMENTS_PATH}: OnEMI row not found`);

  const audit = readJsonOrNull<AuditSnapshot>(AUDIT_PATH);
  if (!audit || !audit.by_ipo) fail(`${AUDIT_PATH} missing/malformed`);

  // Idempotency: once OnEMI is in the source-audit, treat re-runs as no-ops.
  if (Object.prototype.hasOwnProperty.call(audit.by_ipo, PRODUCTION_IPO_ID)) {
    console.log('[6A.2:onemi-chittorgarh] OnEMI already present in source-audit — already promoted; no-op.');
    process.exit(0);
  }

  // Conflict guard: never overwrite a non-null production value.
  const finalPromoted: Promoted[] = [];
  const conflicts: string[] = [];
  for (const p of promoted) {
    if (p.target === 'master') {
      const cur = masterRow[p.prodField];
      if (cur !== null && cur !== undefined) {
        conflicts.push(`master.${p.prodField} already = ${JSON.stringify(cur)} (Chittorgarh ${p.displayNormalized} dropped)`);
        continue;
      }
    } else {
      const cur = docsRow[p.prodField];
      if (cur !== null && cur !== undefined) {
        conflicts.push(`documents.${p.prodField} already set (Chittorgarh ${p.displayNormalized} dropped)`);
        continue;
      }
    }
    finalPromoted.push(p);
  }
  if (finalPromoted.length === 0) {
    fail('all candidate fields conflict with existing non-null values — nothing to fill');
  }

  const masterPromoted = finalPromoted.filter((p) => p.target === 'master');
  const docsPromoted = finalPromoted.filter((p) => p.target === 'documents');
  const ts = new Date().toISOString();

  // ── Write master ──
  if (masterPromoted.length > 0) {
    let c = readFileSync(MASTER_PATH, 'utf-8');
    c = spliceMasterRow(c, masterPromoted);
    c = bumpTimestamp(c, MASTER_PATH, ts);
    atomicWrite(MASTER_PATH, c);
  }

  // ── Write documents ──
  if (docsPromoted.length > 0) {
    const reg = docsPromoted.find((p) => p.prodField === 'registrar');
    if (reg && reg.norm.kind === 'registrar') {
      let c = readFileSync(DOCUMENTS_PATH, 'utf-8');
      c = spliceDocsRow(c, reg.norm.name);
      c = bumpTimestamp(c, DOCUMENTS_PATH, ts);
      atomicWrite(DOCUMENTS_PATH, c);
    }
  }

  // ── Write source-audit (new OnEMI entry) ──
  {
    let c = readFileSync(AUDIT_PATH, 'utf-8');
    c = spliceAuditEntry(c, buildAuditEntry(finalPromoted, fetchedAtUtc));
    c = bumpTimestamp(c, AUDIT_PATH, ts);
    atomicWrite(AUDIT_PATH, c);
  }

  // ── Summary ──
  console.log('[6A.2:onemi-chittorgarh] SUCCESS');
  console.log(`  promoted ${finalPromoted.length} field(s):`);
  for (const p of finalPromoted) {
    console.log(`    ${p.target}.${p.prodField} = ${p.displayNormalized}  [${p.confidence}]  raw="${p.raw}"`);
  }
  if (conflicts.length > 0) {
    console.log('  conflicts (dropped, official preserved):');
    for (const c of conflicts) console.log(`    ${c}`);
  }
  if (skipped.length > 0) {
    console.log('  skipped (not promoted):');
    for (const s of skipped) console.log(`    ${s}`);
  }
}

main();
