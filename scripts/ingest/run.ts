#!/usr/bin/env tsx
// Consolidated Phase 2 ingest runner.
//
// Runs the slices in order:
//   1. Phase 2A — SEBI bridge
//   2. Phase 2B — NSE IPO master
//   3. Phase 2C — Listing performance
//   4. Phase 2C — Sector map
//   5. Phase 2D — Subscription
//   6. Phase 2E — Source audit + source health (always last)
//
// Failure semantics:
//   - Each slice's run() catches *expected* upstream failures internally and
//     returns a SliceResult with source_state in {empty, failed, missing, skipped}.
//     The runner records these but does NOT halt.
//   - Anything that escapes a slice's try/catch is, by definition, an
//     unclassified programming bug. The runner does NOT catch these; they
//     propagate and the workflow fails (no commit lands).

import { run as runSebi } from './sebi-pipeline.ts';
import { run as runNse } from './nse-ipos.ts';
import { run as runListing } from './listing-performance.ts';
import { run as runSector } from './sector-map.ts';
import { run as runSubscription } from './subscriptions.ts';
import { run as runSourceAudit } from './source-audit.ts';
import type { SliceResult } from './lib/slice.ts';

const SLICES: Array<{ name: string; fn: () => Promise<SliceResult> }> = [
  { name: '2A-sebi', fn: runSebi },
  { name: '2B-nse', fn: runNse },
  { name: '2C-listing', fn: runListing },
  { name: '2C-sector', fn: runSector },
  { name: '2D-subscription', fn: runSubscription },
];

async function main(): Promise<number> {
  console.log('[ingest] Phase 2 consolidated runner — start');
  console.log('[ingest]   ' + SLICES.map((s) => s.name).join(' → ') + ' → 2E-source-audit');
  console.log('');

  const results: SliceResult[] = [];

  for (const slice of SLICES) {
    console.log(`──── ${slice.name} ────`);
    // No catch here. If a slice throws, the workflow MUST fail.
    const r = await slice.fn();
    results.push(r);
    console.log(`[ingest] ${slice.name}: source_state=${r.source_state} · ${r.notes}`);
    if (r.errors.length > 0) {
      for (const e of r.errors) console.log(`[ingest]   ! ${e}`);
    }
    console.log('');
  }

  // 2E runs last and consumes the prior slice results.
  console.log('──── 2E-source-audit ────');
  const auditResult = await runSourceAudit(results);
  results.push({ ...auditResult, name: '2E-source-audit' });
  console.log(`[ingest] 2E-source-audit: source_state=${auditResult.source_state} · ${auditResult.notes}`);
  console.log('');

  // ── Summary ──
  console.log('[ingest] ============== summary ==============');
  for (const r of results) {
    console.log(`[ingest]   ${r.name.padEnd(20)} ${r.source_state.padEnd(8)} +${r.counts.added}/~${r.counts.updated}/=${r.counts.preserved}  ${r.notes}`);
  }
  const liveCount = results.filter((r) => r.source_state === 'live').length;
  const failedCount = results.filter((r) => r.source_state === 'failed').length;
  const emptyCount = results.filter((r) => r.source_state === 'empty').length;
  const skippedCount = results.filter((r) => r.source_state === 'skipped').length;
  const missingCount = results.filter((r) => r.source_state === 'missing').length;
  console.log(
    `[ingest] totals: live=${liveCount} empty=${emptyCount} failed=${failedCount} skipped=${skippedCount} missing=${missingCount}`
  );
  console.log('[ingest] Phase 2 consolidated runner — done.');

  // Always exit 0 if we got here. Expected upstream failures are NOT a
  // workflow failure; the workflow only fails on uncaught code exceptions
  // (which never reach this line) or on typecheck/build downstream.
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[ingest] UNEXPECTED runtime exception:', e?.stack ?? e?.message ?? String(e));
    process.exit(2);
  });
