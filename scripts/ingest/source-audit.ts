#!/usr/bin/env tsx
// Phase 2E — Source Audit + Source Health rebuild.
//
// Runs LAST in the runner. Two outputs:
//
// 1. src/data/snapshots/ipo-source-audit.json
//    Recompute `source_mix.{nse,bse,sebi,rhp,manual,derived,broker_ref}`
//    per IPO from the current `fields[]` array. Pure post-processor — no
//    upstream fetch.
//
// 2. src/data/snapshots/source-health.json
//    Rebuild from phase-0/source-probe-results.json (kept fresh by the
//    probe workflow) AND from per-slice SliceResults passed in.

import { join } from 'node:path';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import type { SliceResult } from './lib/slice.ts';
import { log } from './lib/slice.ts';

const REPO_ROOT = process.cwd();
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const AUDIT_PATH = join(SNAP_DIR, 'ipo-source-audit.json');
const HEALTH_PATH = join(SNAP_DIR, 'source-health.json');
const PROBE_RESULTS_PATH = join(REPO_ROOT, 'phase-0', 'source-probe-results.json');

const NOW = new Date().toISOString();

// ---- Shapes ----

interface AuditField {
  field: string;
  source: string;
  state: string;
  url: string | null;
  fetched_at_utc: string | null;
}

interface AuditPerIpo {
  ipo_id: string;
  source_mix: { nse: number; bse: number; sebi: number; rhp: number; manual: number; derived: number; broker_ref: number };
  fields: AuditField[];
}

interface AuditSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, AuditPerIpo>;
}

interface ProbeRecord {
  probe_id: string;
  source: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  status_code: number | null;
  response_type: string;
  notes: string;
  ran_at_utc: string;
  latency_ms: number;
  recommended_action: string;
  fallback_source: string;
}

interface HealthSnapshot {
  generated_at_utc: string;
  totals: { green: number; yellow: number; red: number };
  probes: ProbeRecord[];
  ingest_slices?: SliceResult[];
}

// ---- Source-mix recompute ----

const MIX_KEYS = ['nse', 'bse', 'sebi', 'rhp', 'manual', 'derived', 'broker_ref'] as const;

function recomputeSourceMix(fields: AuditField[]): AuditPerIpo['source_mix'] {
  const mix: AuditPerIpo['source_mix'] = { nse: 0, bse: 0, sebi: 0, rhp: 0, manual: 0, derived: 0, broker_ref: 0 };
  if (fields.length === 0) {
    // No fields → call it 100% manual to preserve the visual semantic from
    // Phase 1 (synthetic IPOs render as 100% manual).
    mix.manual = 100;
    return mix;
  }
  const counts: Record<string, number> = { nse: 0, bse: 0, sebi: 0, rhp: 0, manual: 0, derived: 0, broker_ref: 0 };
  for (const f of fields) {
    const s = String(f.source ?? '').toLowerCase();
    if (s === 'nse' || s.includes('nse')) counts.nse++;
    else if (s === 'bse' || s.includes('bse')) counts.bse++;
    else if (s === 'sebi') counts.sebi++;
    else if (s === 'rhp') counts.rhp++;
    else if (s === 'manual') counts.manual++;
    else if (s === 'derived') counts.derived++;
    else if (s === 'broker-ref' || s.includes('broker')) counts.broker_ref++;
    else counts.manual++; // unknown → manual fallback
  }
  const total = fields.length || 1;
  for (const k of MIX_KEYS) {
    mix[k] = Math.round((counts[k] / total) * 100);
  }
  // Normalize to 100 (Math.round drift can leave us off by 1–2).
  let sum = 0;
  for (const k of MIX_KEYS) sum += mix[k];
  if (sum !== 100 && total > 0) {
    const drift = 100 - sum;
    // Apply drift to the largest bucket.
    let largest: typeof MIX_KEYS[number] = MIX_KEYS[0];
    for (const k of MIX_KEYS) if (mix[k] > mix[largest]) largest = k;
    mix[largest] = Math.max(0, mix[largest] + drift);
  }
  return mix;
}

// ---- run() ----

export async function run(sliceResults: SliceResult[] = []): Promise<SliceResult> {
  log('source-audit', 'start');

  // === Part 1: recompute ipo-source-audit.json mix ===
  const audit = readJsonOrNull<AuditSnapshot>(AUDIT_PATH);
  let auditUpdated = 0;
  if (audit) {
    for (const ipoId of Object.keys(audit.by_ipo)) {
      const before = audit.by_ipo[ipoId]!.source_mix;
      const after = recomputeSourceMix(audit.by_ipo[ipoId]!.fields);
      audit.by_ipo[ipoId]!.source_mix = after;
      if (JSON.stringify(before) !== JSON.stringify(after)) auditUpdated++;
    }
    audit.generated_at_utc = NOW;
    safeWriteJson(AUDIT_PATH, audit);
    log('source-audit', `ipo-source-audit.json: recomputed source_mix for ${Object.keys(audit.by_ipo).length} IPOs (${auditUpdated} changed)`);
  } else {
    log('source-audit', 'ipo-source-audit.json not readable; skipping mix recompute.');
  }

  // === Part 2: rebuild source-health.json ===
  const probes = readJsonOrNull<ProbeRecord[]>(PROBE_RESULTS_PATH);
  if (!probes || !Array.isArray(probes)) {
    log('source-audit', 'phase-0/source-probe-results.json not readable; preserving existing source-health.');
    return {
      name: 'source-audit',
      source_state: 'live',
      counts: { added: 0, updated: auditUpdated, preserved: 0 },
      errors: ['probe results not readable'],
      notes: `audit mix recomputed (${auditUpdated} changed); source-health preserved`,
    };
  }

  const totals = { green: 0, yellow: 0, red: 0 };
  for (const p of probes) {
    const s = p.status.toLowerCase();
    if (s === 'green') totals.green++;
    else if (s === 'yellow') totals.yellow++;
    else totals.red++;
  }

  const trimmed: ProbeRecord[] = probes.map((p) => ({
    probe_id: p.probe_id,
    source: p.source,
    status: p.status,
    status_code: p.status_code,
    response_type: p.response_type,
    notes: String(p.notes ?? '').replace(/\n/g, ' ').slice(0, 280),
    ran_at_utc: p.ran_at_utc,
    latency_ms: p.latency_ms,
    recommended_action: String(p.recommended_action ?? '').slice(0, 240),
    fallback_source: p.fallback_source,
  }));

  const newHealth: HealthSnapshot = {
    generated_at_utc: NOW,
    totals,
    probes: trimmed,
    ingest_slices: sliceResults,
  };
  safeWriteJson(HEALTH_PATH, newHealth);

  log('source-audit', `source-health.json: ${totals.green}G / ${totals.yellow}Y / ${totals.red}R · ${sliceResults.length} ingest slices`);
  log('source-audit', 'done.');

  return {
    name: 'source-audit',
    source_state: 'live',
    counts: { added: 0, updated: auditUpdated, preserved: probes.length },
    errors: [],
    notes: `audit mix recomputed (${auditUpdated} changed); health: ${totals.green}G/${totals.yellow}Y/${totals.red}R; ${sliceResults.length} slice results captured`,
  };
}

const isDirectInvocation =
  process.argv[1] && process.argv[1].includes('source-audit');
if (isDirectInvocation) {
  run([])
    .then((r) => {
      console.log(`[ingest:source-audit] result: ${r.source_state}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[ingest:source-audit] UNEXPECTED:', e?.stack ?? e?.message ?? String(e));
      process.exit(2);
    });
}
