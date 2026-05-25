#!/usr/bin/env tsx
// Next dashboard polish — OnEMI-only stale-status correction.
//
// Re-derives OnEMI Technology Solutions' status from a stale 'upcoming' (a
// Phase 5B.X conservative default set when its dates were null) to 'listed',
// now that its verified Chittorgarh listing_date (2026-05-08) is in the past.
//
// Hard guardrails (per phase-next-dashboard-polish-plan.md §1, §6):
//   - OnEMI only. Does NOT iterate other ipo_ids. Does NOT build a status engine.
//   - Pre-flight HALT unless OnEMI is present, status === 'upcoming', and
//     listing_date is present AND strictly in the past.
//   - Idempotent: if OnEMI is already 'listed', no-op exit 0.
//   - Only the OnEMI row's status line + the top-level generated_at_utc change;
//     every other ipos[] row + timelines[] + source_meta stay byte-identical
//     (string-surgery on the single status line, not a re-serialise).
//   - Atomic write via .tmp + rename.
//   - Does NOT touch any other snapshot, type, UI, ingest, or workflow file.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const IPO_ID = 'onemi-technology-solutions';

interface MasterRow {
  id: string;
  status?: string;
  listing_date?: string | null;
  [key: string]: unknown;
}
interface MasterSnapshot {
  generated_at_utc: string;
  ipos: MasterRow[];
  [key: string]: unknown;
}

function fail(msg: string): never {
  console.error(`[promote:onemi-status-correct] FAIL: ${msg}`);
  process.exit(1);
}

function main(): void {
  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master) fail(`${MASTER_PATH} missing or malformed`);
  if (!Array.isArray(master.ipos)) fail(`${MASTER_PATH}: ipos[] is not an array`);

  const row = master.ipos.find((r) => r.id === IPO_ID);
  if (!row) fail(`${MASTER_PATH} has no row for ${IPO_ID}`);

  // Idempotency: already corrected → no-op.
  if (row.status === 'listed') {
    console.log(`[promote:onemi-status-correct] no-op: ${IPO_ID} already status='listed'`);
    return;
  }

  // Preflight: only correct a stale 'upcoming' whose listing is genuinely past.
  if (row.status !== 'upcoming') {
    fail(`refusing to correct ${IPO_ID}: status is '${row.status}', expected 'upcoming'`);
  }
  if (!row.listing_date) {
    fail(`refusing to correct ${IPO_ID}: listing_date is null/absent`);
  }
  const listingMs = new Date(row.listing_date).getTime();
  if (Number.isNaN(listingMs)) {
    fail(`refusing to correct ${IPO_ID}: listing_date '${row.listing_date}' is unparseable`);
  }
  if (listingMs >= Date.now()) {
    fail(
      `refusing to correct ${IPO_ID}: listing_date '${row.listing_date}' is not in the past`,
    );
  }
  console.log(
    `[promote:onemi-status-correct] preflight OK — ${IPO_ID} status='upcoming', ` +
      `listing_date='${row.listing_date}' (past)`,
  );

  // ── String-surgery: flip ONLY the OnEMI row's status line. ──
  const content = readFileSync(MASTER_PATH, 'utf-8');
  const lines = content.split('\n');

  const idIdx = lines.findIndex((l) => l.includes(`"id": "${IPO_ID}"`));
  if (idIdx === -1) fail(`could not locate the "${IPO_ID}" id line in ${MASTER_PATH}`);

  // Walk forward from the id line to the OnEMI row closer (`    }`), flipping the
  // first status line found inside that block. Bounding to the row guarantees no
  // other IPO's status is touched.
  let statusIdx = -1;
  for (let i = idIdx + 1; i < lines.length; i++) {
    if (lines[i] === '    }' || lines[i] === '    },') break; // end of OnEMI row
    if (lines[i].trim() === '"status": "upcoming",') {
      statusIdx = i;
      break;
    }
  }
  if (statusIdx === -1) {
    fail(`could not locate OnEMI's "status": "upcoming" line within its row block`);
  }
  lines[statusIdx] = lines[statusIdx].replace('"status": "upcoming"', '"status": "listed"');

  // Bump the top-level generated_at_utc (single occurrence).
  const newTimestamp = new Date().toISOString();
  const tsIdx = lines.findIndex((l) => /"generated_at_utc"\s*:/.test(l));
  if (tsIdx === -1) fail(`could not locate generated_at_utc in ${MASTER_PATH}`);
  lines[tsIdx] = lines[tsIdx].replace(/("generated_at_utc"\s*:\s*)"[^"]*"/, `$1"${newTimestamp}"`);

  const newContent = lines.join('\n');

  // Atomic write.
  const tmpPath = MASTER_PATH + '.tmp';
  writeFileSync(tmpPath, newContent, 'utf-8');
  renameSync(tmpPath, MASTER_PATH);

  // Post-write verification: OnEMI is now 'listed'; row count + ids unchanged.
  const after = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!after) fail('post-write re-read failed');
  if (after.ipos.length !== master.ipos.length) {
    fail(`post-write row count changed: ${master.ipos.length} → ${after.ipos.length}`);
  }
  const afterRow = after.ipos.find((r) => r.id === IPO_ID);
  if (!afterRow || afterRow.status !== 'listed') {
    fail('post-write check: OnEMI status is not "listed"');
  }
  const otherChanged = master.ipos
    .filter((r) => r.id !== IPO_ID)
    .some((before, idx) => {
      const a = after.ipos.filter((r) => r.id !== IPO_ID)[idx];
      return JSON.stringify(before) !== JSON.stringify(a);
    });
  if (otherChanged) fail('post-write check: a non-OnEMI row changed');

  console.log('[promote:onemi-status-correct] SUCCESS');
  console.log(`  ${IPO_ID}: status 'upcoming' → 'listed'`);
  console.log(`  generated_at_utc → ${newTimestamp}`);
  console.log('  All other ipos[] rows + timelines[] + source_meta unchanged.');
}

main();
