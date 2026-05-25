#!/usr/bin/env tsx
// Phase 6A.2.1 — Chittorgarh fast-fill (map-driven, multi-IPO, per-field idempotent).
//
// Supersedes the OnEMI-only onemi-chittorgarh-fastfill.ts. Reads the explicit
// map at scripts/pdf/promote/chittorgarh-map.json and, for each row with
// status='active', gap-fills the production snapshots from the committed
// Chittorgarh extraction artifacts — official values win, only null fields are
// filled, HIGH/MEDIUM only, never overwrite, no fake.
//
// Hard guardrails (per phase-6A-2-1-chittorgarh-scale-plan.md §4-§9):
//   - Explicit map only (no fuzzy matching). Only status='active' rows.
//   - NEVER creates a new IPO in ipo-master.json — a map row whose
//     production_ipo_id is absent from master is skipped (logged), not inserted.
//   - Per-field incremental idempotency: a field is filled only when it is
//     null/[] in production AND not already in that IPO's source-audit fields[].
//     Already-filled fields are skipped → re-runs are no-ops; a partly-filled
//     IPO (e.g. OnEMI's 7 6A.2 fields) can gain a new field later (face_value)
//     without disturbing the existing ones.
//   - §5.1 face_value guard: face_value is filled ONLY when the per-detail
//     artifact carries a `fields.face_value` entry at HIGH/MEDIUM. A pre-change
//     artifact has no such key, so it is structurally unpromotable.
//   - §6 per-IPO preflight (artifact exists + mapping match + robots + precision
//     + freshness). HALT that row on failure; never promote stale/undated.
//   - Conflict-safe; atomic .tmp+rename; existing rows byte-identical.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

// ─── Paths ──
const MAP_PATH = 'scripts/pdf/promote/chittorgarh-map.json';
const FIELDS_V2_PATH = 'phase-0/broker-pages/chittorgarh-fields-v2.json';
const SUMMARY_V2_PATH = 'phase-0/broker-pages/chittorgarh-extraction-summary-v2.json';
const DETAIL_DIR = 'phase-0/broker-pages';
const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const DOCUMENTS_PATH = 'src/data/snapshots/ipo-documents.json';
const AUDIT_PATH = 'src/data/snapshots/ipo-source-audit.json';

// ─── Gates (§6) ──
const ALLOWED_ROBOTS = ['allowed-prior-flag-was-over-match', 'allowed-no-applicable-disallow'];
const PRECISION_FULL_GATE = 0.8;
const PRECISION_NARROW_GATE = 0.9;
const MAX_ARTIFACT_AGE_DAYS = 7;
const PROMOTE_CONFIDENCE = new Set(['high', 'medium']);

// ─── Types ──
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
  source_url: string;
  slug: string;
  fields: Record<string, ArtifactField>;
}
interface FieldsV2 {
  captured_at_utc?: string;
  robots_posture: { classification: string };
  picked_detail_urls: Array<{ index: number; url: string; slug: string }>;
}
interface SummaryV2 {
  generated_at_utc?: string;
  average_precision_ratio_full: number;
  average_precision_ratio_narrow: number;
  per_detail: Array<{ slug: string; precision_ratio_full: number; precision_ratio_narrow: number }>;
}
interface MapRow {
  production_ipo_id: string;
  production_slug: string;
  chittorgarh_slug: string;
  chittorgarh_id: string;
  chittorgarh_detail_url: string;
  allowed_fields: string[];
  status: 'active' | 'paused' | 'manual_review';
  notes?: string;
}
interface ChittorgarhMap {
  version: string;
  rows: MapRow[];
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
interface AuditFieldRow {
  field: string;
  source: string;
  state: string;
  url: string | null;
  fetched_at_utc: string | null;
}
interface AuditEntry {
  ipo_id: string;
  source_mix: Record<string, number>;
  fields: AuditFieldRow[];
}
interface AuditSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, AuditEntry>;
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
  display: string;
}

// ─── Failure helper ──
function fail(msg: string): never {
  console.error(`[6A.2.1:chittorgarh-fastfill] HALT: ${msg}`);
  process.exit(1);
}

// ─── Normalizers ──
function toNum(s: string): number {
  return Number(s.replace(/,/g, ''));
}
function normPriceBand(raw: string): Normalized | null {
  const m = raw.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(?:to|–|—|-)\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const low = toNum(m[1]!);
  const high = toNum(m[2]!);
  if (!(low > 0) || !(high >= low)) return null;
  return { kind: 'price_band', low, high };
}
function normIssueSizeCr(raw: string): Normalized | null {
  const m = raw.match(/₹\s*([\d,]+(?:\.\d+)?)\s*Cr\b/i);
  if (!m) return null;
  const v = toNum(m[1]!);
  return v > 0 ? { kind: 'scalar-number', value: v } : null;
}
function normLotSize(raw: string): Normalized | null {
  const m = raw.match(/([\d,]+)\s*Shares?\b/i);
  if (!m) return null;
  const v = toNum(m[1]!);
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
// Phase 6A.2.1 — face value: "₹ 1 per share" → 1.
function normFaceValue(raw: string): Normalized | null {
  if (/\b(?:Cr|Crore)\b|%/i.test(raw)) return null;
  const m = raw.match(/(?:₹\s*)?([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const v = toNum(m[1]!);
  return v > 0 && v <= 1000 ? { kind: 'scalar-number', value: v } : null;
}

const FIELD_SPECS: FieldSpec[] = [
  { prodField: 'price_band', target: 'master', artifactKey: 'price_band', normalize: normPriceBand },
  { prodField: 'issue_size_cr', target: 'master', artifactKey: 'issue_size_cr', normalize: normIssueSizeCr },
  { prodField: 'lot_size', target: 'master', artifactKey: 'lot_size', normalize: normLotSize },
  { prodField: 'open_date', target: 'master', artifactKey: 'open_date', normalize: normIsoDate },
  { prodField: 'close_date', target: 'master', artifactKey: 'close_date', normalize: normIsoDate },
  { prodField: 'listing_date', target: 'master', artifactKey: 'listing_date', normalize: normIsoDate },
  { prodField: 'face_value', target: 'master', artifactKey: 'face_value', normalize: normFaceValue },
  { prodField: 'registrar', target: 'documents', artifactKey: 'registrar', normalize: normRegistrar },
];

function display(n: Normalized): string {
  switch (n.kind) {
    case 'scalar-string': return n.value;
    case 'scalar-number': return String(n.value);
    case 'price_band': return `{low:${n.low},high:${n.high}}`;
    case 'registrar': return `{name:"${n.name}",portal_url:null}`;
  }
}

// ─── §6 + §6.1 global + per-IPO preflight ──
interface GlobalPreflight {
  fieldsV2: FieldsV2;
  summary: SummaryV2;
  fetchedAtUtc: string;
}
function preflightGlobal(): GlobalPreflight {
  const fieldsV2 = readJsonOrNull<FieldsV2>(FIELDS_V2_PATH);
  if (!fieldsV2) fail(`missing/malformed artifact: ${FIELDS_V2_PATH}`);
  const summary = readJsonOrNull<SummaryV2>(SUMMARY_V2_PATH);
  if (!summary) fail(`missing/malformed artifact: ${SUMMARY_V2_PATH}`);

  const robots = String(fieldsV2.robots_posture?.classification ?? '');
  if (!ALLOWED_ROBOTS.includes(robots)) fail(`robots classification "${robots}" not allowed`);

  const precFull = Number(summary.average_precision_ratio_full);
  const precNarrow = Number(summary.average_precision_ratio_narrow);
  if (!(precFull >= PRECISION_FULL_GATE || precNarrow >= PRECISION_NARROW_GATE)) {
    fail(`precision below gate: full=${precFull} narrow=${precNarrow}`);
  }

  const ts = summary.generated_at_utc ?? fieldsV2.captured_at_utc ?? null;
  if (!ts) fail('no artifact timestamp — undated, refusing to promote');
  const ageDays = (Date.now() - Date.parse(ts)) / 86_400_000;
  if (Number.isNaN(ageDays)) fail(`artifact timestamp unparseable: ${ts}`);
  if (ageDays > MAX_ARTIFACT_AGE_DAYS) {
    fail(`artifacts stale (age ${ageDays.toFixed(1)}d > ${MAX_ARTIFACT_AGE_DAYS}); re-run phase-0-probes group=K`);
  }
  console.log(`[6A.2.1:chittorgarh-fastfill] global preflight OK — robots=${robots} full=${precFull} narrow=${precNarrow} ts=${ts} (age ${ageDays.toFixed(1)}d)`);
  return { fieldsV2, summary, fetchedAtUtc: ts };
}

// Resolve + validate a single map row's artifact. Returns null (with a logged
// reason) if the row should be skipped without halting the whole run.
function preflightRow(g: GlobalPreflight, row: MapRow): DetailArtifact | null {
  const picked = g.fieldsV2.picked_detail_urls.find((p) => p.slug === row.chittorgarh_slug);
  if (!picked) {
    console.log(`  skip ${row.production_ipo_id}: chittorgarh_slug "${row.chittorgarh_slug}" not in picked_detail_urls`);
    return null;
  }
  if (picked.url !== row.chittorgarh_detail_url) {
    console.log(`  skip ${row.production_ipo_id}: picked url ${picked.url} != map ${row.chittorgarh_detail_url}`);
    return null;
  }
  if (!row.chittorgarh_detail_url.includes(`/${row.chittorgarh_id}/`)) {
    console.log(`  skip ${row.production_ipo_id}: chittorgarh_id ${row.chittorgarh_id} not in detail URL`);
    return null;
  }
  const detailPath = `${DETAIL_DIR}/chittorgarh-detail-${picked.index}-extracted-retuned.json`;
  const detail = readJsonOrNull<DetailArtifact>(detailPath);
  if (!detail) {
    console.log(`  skip ${row.production_ipo_id}: per-detail artifact missing ${detailPath}`);
    return null;
  }
  if (detail.source_url !== row.chittorgarh_detail_url || detail.slug !== row.chittorgarh_slug) {
    console.log(`  skip ${row.production_ipo_id}: per-detail artifact mapping mismatch`);
    return null;
  }
  // OnEMI's own precision sanity (consistency vs the summary).
  const per = g.summary.per_detail.find((d) => d.slug === row.chittorgarh_slug);
  if (!per || !(per.precision_ratio_full > 0)) {
    console.log(`  skip ${row.production_ipo_id}: per_detail precision missing/zero`);
    return null;
  }
  return detail;
}

// ─── Audit recompute (mirror scripts/ingest/source-audit.ts) ──
const MIX_KEYS = ['nse', 'bse', 'sebi', 'rhp', 'manual', 'derived', 'broker_ref', 'chittorgarh'] as const;
function recomputeMix(fields: AuditFieldRow[]): Record<string, number> {
  const mix: Record<string, number> = { nse: 0, bse: 0, sebi: 0, rhp: 0, manual: 0, derived: 0, broker_ref: 0, chittorgarh: 0 };
  if (fields.length === 0) { mix.manual = 100; return mix; }
  const counts: Record<string, number> = { ...mix };
  for (const f of fields) {
    const s = String(f.source ?? '').toLowerCase();
    if (s === 'nse' || s.includes('nse')) counts.nse++;
    else if (s === 'bse' || s.includes('bse')) counts.bse++;
    else if (s === 'sebi') counts.sebi++;
    else if (s === 'rhp') counts.rhp++;
    else if (s === 'manual') counts.manual++;
    else if (s === 'derived') counts.derived++;
    else if (s === 'broker-ref' || s.includes('broker')) counts.broker_ref++;
    else if (s === 'chittorgarh' || s.includes('chittorgarh')) counts.chittorgarh++;
    else counts.manual++;
  }
  const total = fields.length;
  for (const k of MIX_KEYS) mix[k] = Math.round((counts[k]! / total) * 100);
  let sum = 0;
  for (const k of MIX_KEYS) sum += mix[k]!;
  if (sum !== 100) {
    let largest: string = MIX_KEYS[0];
    for (const k of MIX_KEYS) if (mix[k]! > mix[largest]!) largest = k;
    mix[largest] = Math.max(0, mix[largest]! + (100 - sum));
  }
  return mix;
}

// ─── Serializers (match the existing hand/promoter format byte-for-byte) ──
function serializeAuditEntry(ipoId: string, fields: AuditFieldRow[], mix: Record<string, number>): string {
  const fieldBlocks = fields
    .map((f) =>
      [
        '        {',
        `          "field": ${JSON.stringify(f.field)},`,
        `          "source": ${JSON.stringify(f.source)},`,
        `          "state": ${JSON.stringify(f.state)},`,
        `          "url": ${JSON.stringify(f.url)},`,
        `          "fetched_at_utc": ${JSON.stringify(f.fetched_at_utc)}`,
        '        }',
      ].join('\n'),
    )
    .join(',\n');
  return [
    `    ${JSON.stringify(ipoId)}: {`,
    `      "ipo_id": ${JSON.stringify(ipoId)},`,
    '      "source_mix": {',
    ...MIX_KEYS.map((k, i) => `        ${JSON.stringify(k)}: ${mix[k] ?? 0}${i < MIX_KEYS.length - 1 ? ',' : ''}`),
    '      },',
    '      "fields": [',
    fieldBlocks,
    '      ]',
    '    }',
  ].join('\n');
}

// ─── Master in-place fill ──
function masterFillLines(p: Promoted): string[] {
  const n = p.norm;
  if (n.kind === 'price_band') {
    return ['      "price_band": {', `        "low": ${n.low},`, `        "high": ${n.high}`, '      },'];
  }
  if (n.kind === 'scalar-number') return [`      "${p.prodField}": ${n.value},`];
  if (n.kind === 'scalar-string') return [`      "${p.prodField}": ${JSON.stringify(n.value)},`];
  fail(`unexpected master norm for ${p.prodField}`);
}
function spliceMasterRow(content: string, ipoId: string, fills: Promoted[]): string {
  const lines = content.split('\n');
  const idIdx = lines.indexOf(`      "id": ${JSON.stringify(ipoId)},`);
  if (idIdx === -1) fail(`${MASTER_PATH}: id line for ${ipoId} not found`);
  const openIdx = idIdx - 1;
  if (lines[openIdx] !== '    {') fail(`${MASTER_PATH}: unexpected row opener for ${ipoId}`);
  let closeIdx = -1;
  for (let i = idIdx; i < lines.length; i++) {
    if (lines[i] === '    }' || lines[i] === '    },') { closeIdx = i; break; }
  }
  if (closeIdx === -1) fail(`${MASTER_PATH}: row closer for ${ipoId} not found`);
  const fillMap = new Map<string, string[]>();
  for (const p of fills) fillMap.set(`      "${p.prodField}": null,`, masterFillLines(p));
  const before = lines.slice(0, openIdx + 1);
  const body = lines.slice(openIdx + 1, closeIdx);
  const after = lines.slice(closeIdx);
  const newBody: string[] = [];
  let applied = 0;
  for (const line of body) {
    const repl = fillMap.get(line);
    if (repl) { newBody.push(...repl); applied++; } else newBody.push(line);
  }
  if (applied !== fillMap.size) fail(`${MASTER_PATH}: ${ipoId} fill mismatch (expected ${fillMap.size}, applied ${applied})`);
  return [...before, ...newBody, ...after].join('\n');
}

// ─── Documents in-place registrar fill ──
function spliceDocsRegistrar(content: string, ipoId: string, name: string): string {
  const lines = content.split('\n');
  const openIdx = lines.indexOf(`    ${JSON.stringify(ipoId)}: {`);
  if (openIdx === -1) fail(`${DOCUMENTS_PATH}: row opener for ${ipoId} not found`);
  let closeIdx = -1;
  for (let i = openIdx + 1; i < lines.length; i++) {
    if (lines[i] === '    }' || lines[i] === '    },') { closeIdx = i; break; }
  }
  if (closeIdx === -1) fail(`${DOCUMENTS_PATH}: row closer for ${ipoId} not found`);
  const target = '      "registrar": null,';
  const replacement = ['      "registrar": {', `        "name": ${JSON.stringify(name)},`, '        "portal_url": null', '      },'];
  const out: string[] = [];
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (i > openIdx && i < closeIdx && lines[i] === target) { out.push(...replacement); found = true; }
    else out.push(lines[i]!);
  }
  if (!found) fail(`${DOCUMENTS_PATH}: ${ipoId} registrar null line not found`);
  return out.join('\n');
}

// ─── Audit: create new entry OR append fields to an existing entry ──
function applyAudit(content: string, audit: AuditSnapshot, ipoId: string, newRows: AuditFieldRow[]): string {
  const existing = audit.by_ipo[ipoId];
  const lines = content.split('\n');
  if (existing) {
    // Replace the IPO's entry block in place (existing fields re-serialized
    // byte-identically + the new rows appended; mix recomputed).
    const openIdx = lines.indexOf(`    ${JSON.stringify(ipoId)}: {`);
    if (openIdx === -1) fail(`${AUDIT_PATH}: entry opener for ${ipoId} not found`);
    let closeIdx = -1;
    for (let i = openIdx + 1; i < lines.length; i++) {
      if (lines[i] === '    }' || lines[i] === '    },') { closeIdx = i; break; }
    }
    if (closeIdx === -1) fail(`${AUDIT_PATH}: entry closer for ${ipoId} not found`);
    const hadComma = lines[closeIdx] === '    },';
    const allFields = [...existing.fields, ...newRows];
    let block = serializeAuditEntry(ipoId, allFields, recomputeMix(allFields));
    if (hadComma) block += ',';
    return [...lines.slice(0, openIdx), block, ...lines.slice(closeIdx + 1)].join('\n');
  }
  // New entry: comma the previously-last entry, splice before the by_ipo closer.
  let endIdx = lines.length - 1;
  if (lines[endIdx] === '') endIdx--;
  if (lines[endIdx] !== '}') fail(`${AUDIT_PATH}: unexpected last line`);
  const byIpoCloserIdx = endIdx - 1;
  if (lines[byIpoCloserIdx] !== '  }') fail(`${AUDIT_PATH}: unexpected by_ipo closer`);
  const lastRowCloserIdx = byIpoCloserIdx - 1;
  if (lines[lastRowCloserIdx] !== '    }') fail(`${AUDIT_PATH}: unexpected last entry closer`);
  lines[lastRowCloserIdx] = '    },';
  const block = serializeAuditEntry(ipoId, newRows, recomputeMix(newRows));
  lines.splice(byIpoCloserIdx, 0, block);
  return lines.join('\n');
}

function bumpTimestamp(content: string, file: string, ts: string): string {
  const out = content.replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${ts}"`);
  if (out === content) fail(`could not locate generated_at_utc in ${file}`);
  return out;
}
function atomicWrite(file: string, content: string): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, file);
}

// ─── Main ──
function main(): void {
  const map = readJsonOrNull<ChittorgarhMap>(MAP_PATH);
  if (!map || !Array.isArray(map.rows)) fail(`${MAP_PATH} missing/malformed`);
  const activeRows = map.rows.filter((r) => r.status === 'active');
  console.log(`[6A.2.1:chittorgarh-fastfill] map version ${map.version}: ${map.rows.length} row(s), ${activeRows.length} active`);
  for (const r of map.rows) {
    if (r.status !== 'active') console.log(`  (skip ${r.production_ipo_id}: status=${r.status})`);
  }
  if (activeRows.length === 0) { console.log('no active rows; nothing to do.'); return; }

  const g = preflightGlobal();

  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master || !Array.isArray(master.ipos)) fail(`${MASTER_PATH} missing/malformed`);
  const docs = readJsonOrNull<DocsSnapshot>(DOCUMENTS_PATH);
  if (!docs || !docs.by_ipo) fail(`${DOCUMENTS_PATH} missing/malformed`);
  const audit = readJsonOrNull<AuditSnapshot>(AUDIT_PATH);
  if (!audit || !audit.by_ipo) fail(`${AUDIT_PATH} missing/malformed`);

  const ts = new Date().toISOString();
  let totalPromoted = 0;

  for (const row of activeRows) {
    console.log(`\n[row] ${row.production_ipo_id}`);
    const detail = preflightRow(g, row);
    if (!detail) continue;

    const masterRow = master.ipos.find((m) => m.id === row.production_ipo_id);
    if (!masterRow) {
      console.log(`  skip: ${row.production_ipo_id} absent from ipo-master.json — NOT creating (no IPO creation from Chittorgarh)`);
      continue;
    }
    const docsRow = docs.by_ipo[row.production_ipo_id];
    const auditFieldNames = new Set((audit.by_ipo[row.production_ipo_id]?.fields ?? []).map((f) => f.field));

    const promoted: Promoted[] = [];
    for (const spec of FIELD_SPECS) {
      if (!row.allowed_fields.includes(spec.prodField)) continue;
      if (auditFieldNames.has(spec.prodField)) { console.log(`  - ${spec.prodField}: already in source-audit (skip, idempotent)`); continue; }
      // current production value
      let cur: unknown;
      if (spec.target === 'master') cur = masterRow[spec.prodField];
      else { if (!docsRow) { console.log(`  - ${spec.prodField}: no documents row for ${row.production_ipo_id} (skip)`); continue; } cur = docsRow[spec.prodField]; }
      const isEmpty = cur === null || cur === undefined || (Array.isArray(cur) && cur.length === 0);
      if (!isEmpty) { console.log(`  - ${spec.prodField}: production value already set (official/non-null) — conflict, not overwriting`); continue; }
      const f = detail.fields[spec.artifactKey];
      if (!f) { console.log(`  - ${spec.prodField}: artifact has no "${spec.artifactKey}" key (pre-change/absent) — left null`); continue; }
      if (!f.found) { console.log(`  - ${spec.prodField}: found=false (${f.why_missing ?? 'no reason'}) — left null`); continue; }
      const conf = String(f.confidence ?? '').toLowerCase();
      if (!PROMOTE_CONFIDENCE.has(conf)) { console.log(`  - ${spec.prodField}: confidence=${f.confidence} (need high/medium) — left null`); continue; }
      if (typeof f.value !== 'string' || f.value.trim() === '') { console.log(`  - ${spec.prodField}: value not a usable string — left null`); continue; }
      const norm = spec.normalize(f.value);
      if (!norm) { console.log(`  - ${spec.prodField}: normalization failed for "${f.value}" — left null`); continue; }
      promoted.push({ prodField: spec.prodField, target: spec.target, raw: f.value, confidence: conf, norm, display: display(norm) });
    }

    if (promoted.length === 0) { console.log('  → 0 new fields to promote (no-op for this row).'); continue; }

    const masterPromoted = promoted.filter((p) => p.target === 'master');
    const docsPromoted = promoted.filter((p) => p.target === 'documents');

    if (masterPromoted.length > 0) {
      let c = readFileSync(MASTER_PATH, 'utf-8');
      c = bumpTimestamp(spliceMasterRow(c, row.production_ipo_id, masterPromoted), MASTER_PATH, ts);
      atomicWrite(MASTER_PATH, c);
    }
    const reg = docsPromoted.find((p) => p.prodField === 'registrar');
    if (reg && reg.norm.kind === 'registrar') {
      let c = readFileSync(DOCUMENTS_PATH, 'utf-8');
      c = bumpTimestamp(spliceDocsRegistrar(c, row.production_ipo_id, reg.norm.name), DOCUMENTS_PATH, ts);
      atomicWrite(DOCUMENTS_PATH, c);
    }
    // Audit rows for every promoted field.
    const newRows: AuditFieldRow[] = promoted.map((p) => ({
      field: p.prodField,
      source: 'Chittorgarh',
      state: 'aggregator',
      url: row.chittorgarh_detail_url,
      fetched_at_utc: g.fetchedAtUtc,
    }));
    {
      let c = readFileSync(AUDIT_PATH, 'utf-8');
      c = bumpTimestamp(applyAudit(c, audit, row.production_ipo_id, newRows), AUDIT_PATH, ts);
      atomicWrite(AUDIT_PATH, c);
    }

    totalPromoted += promoted.length;
    console.log(`  → promoted ${promoted.length} field(s):`);
    for (const p of promoted) console.log(`      ${p.target}.${p.prodField} = ${p.display} [${p.confidence}] raw="${p.raw}"`);
  }

  console.log(`\n[6A.2.1:chittorgarh-fastfill] done. total fields promoted: ${totalPromoted}.`);
}

main();
