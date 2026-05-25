#!/usr/bin/env tsx
// Gate 2b — guarded add of ONE 'listed' master row for Bajaj Housing Finance.
//
// Adds ONE Ipo row to src/data/snapshots/ipo-master.json so the bounded
// listing-performance ladder (scripts/pdf/promote/listed-ipo-performance.ts)
// can attach a real perf row and Recently Listed can show real gains.
//
// Scope: Bajaj Housing Finance only (one IPO). Mirrors onemi-master.ts:
//   - count guard: expects the current 11 ipos[] rows; refuses on an
//     unexpected count (when the target is not yet present)
//   - idempotent: if the id already exists, logs + exits 0 (safe CI re-run),
//     never double-inserts
//   - existing rows stay byte-identical (string-surgery splice; only the
//     previously-last row gains a trailing comma + generated_at_utc bump)
//   - atomic .tmp + rename
//   - touches ONLY ipo-master.json (no other snapshot, type, UI, or workflow)
//
// Verified spec (operator-approved): issue price = price_band.high = 70 (band
// 66–70); listing 2024-09-16; NSE BAJAJHFL / BSE 544252. The official
// identifiers are re-verified at fetch time against the official company name
// by listed-ipo-performance.ts before any price is trusted.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const EXPECTED_EXISTING_IPOS = 11;

const SPEC = {
  id: 'bajaj-housing-finance',
  name: 'Bajaj Housing Finance Limited',
  short_name: 'Bajaj Housing Finance',
  listing_date: '2024-09-16',
  price_band: { low: 66, high: 70 },
  nse_symbol: 'BAJAJHFL',
};

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

function fail(msg: string): never {
  console.error(`[promote:add-listed-ipo] FAIL: ${msg}`);
  process.exit(1);
}

// Match the hand-authored format in ipo-master.json byte-for-byte (4-space row
// wrapper, 6-space keys, multi-line price_band + listing_exchange arrays).
function serializeRow(): string {
  return [
    `    {`,
    `      "id": "${SPEC.id}",`,
    `      "slug": "${SPEC.id}",`,
    `      "name": "${SPEC.name}",`,
    `      "short_name": "${SPEC.short_name}",`,
    `      "segment": "mainboard",`,
    `      "status": "listed",`,
    `      "sector": null,`,
    `      "open_date": null,`,
    `      "close_date": null,`,
    `      "listing_date": "${SPEC.listing_date}",`,
    `      "price_band": {`,
    `        "low": ${SPEC.price_band.low},`,
    `        "high": ${SPEC.price_band.high}`,
    `      },`,
    `      "lot_size": null,`,
    `      "issue_size_cr": null,`,
    `      "fresh_cr": null,`,
    `      "ofs_cr": null,`,
    `      "face_value": null,`,
    `      "listing_exchange": [`,
    `        "NSE",`,
    `        "BSE"`,
    `      ],`,
    `      "reservation": null,`,
    `      "state": "manual",`,
    `      "tagline": null,`,
    `      "nse_symbol": "${SPEC.nse_symbol}"`,
    `    }`,
  ].join('\n');
}

function spliceRow(newTimestamp: string, rowText: string): void {
  let content = readFileSync(MASTER_PATH, 'utf-8');

  const tsReplaced = content.replace(
    /("generated_at_utc"\s*:\s*)"[^"]*"/,
    `$1"${newTimestamp}"`,
  );
  if (tsReplaced === content) fail(`could not locate generated_at_utc in ${MASTER_PATH}`);
  content = tsReplaced;

  const lines = content.split('\n');
  const iposCloserIdx = lines.findIndex((line) => line === '  ],');
  if (iposCloserIdx === -1) fail(`could not locate ipos[] closer ("  ],") in ${MASTER_PATH}`);
  const lastRowCloserIdx = iposCloserIdx - 1;
  if (lines[lastRowCloserIdx] !== '    }') {
    fail(
      `unexpected last ipos[] row closer: ${JSON.stringify(lines[lastRowCloserIdx])} (expected exactly "    }")`,
    );
  }
  lines[lastRowCloserIdx] = '    },';
  lines.splice(iposCloserIdx, 0, rowText);

  const tmp = MASTER_PATH + '.tmp';
  writeFileSync(tmp, lines.join('\n'), 'utf-8');
  renameSync(tmp, MASTER_PATH);
}

function main(): void {
  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master) fail(`${MASTER_PATH} missing or malformed`);
  if (!Array.isArray(master.ipos)) fail(`${MASTER_PATH}: ipos[] is not an array`);

  if (master.ipos.some((r) => r.id === SPEC.id)) {
    console.log(`[promote:add-listed-ipo] ${SPEC.id} already present — idempotent no-op (no double-insert).`);
    return; // exit 0: safe CI re-run
  }
  if (master.ipos.length !== EXPECTED_EXISTING_IPOS) {
    fail(
      `expected exactly ${EXPECTED_EXISTING_IPOS} existing ipos[] entries; ` +
        `found ${master.ipos.length} (${master.ipos.map((r) => r.id).join(', ')})`,
    );
  }
  console.log(`[promote:add-listed-ipo] preflight OK — ${EXPECTED_EXISTING_IPOS} rows, no ${SPEC.id}`);

  spliceRow(new Date().toISOString(), serializeRow());

  console.log('[promote:add-listed-ipo] SUCCESS');
  console.log(`  ${MASTER_PATH}: +1 row (${EXPECTED_EXISTING_IPOS + 1} total ipos[])`);
  console.log(
    `    id=${SPEC.id} status=listed segment=mainboard listing=${SPEC.listing_date} ` +
      `issue=₹${SPEC.price_band.high} (band ${SPEC.price_band.low}-${SPEC.price_band.high}) ` +
      `exch=NSE,BSE nse_symbol=${SPEC.nse_symbol}`,
  );
}

main();
