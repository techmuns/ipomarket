#!/usr/bin/env tsx
// Phase 5B.X — OnEMI Technology Solutions master/detail linkage.
//
// Adds ONE sparse Ipo row for 'onemi-technology-solutions' to
//   src/data/snapshots/ipo-master.json (under ipos[])
// so the dashboard can surface the IPO that Phase 5B.1 already wrote into
// ipo-financials.json + ipo-documents.json.
//
// Hard guardrails (per phase-5BX-onemi-master-linkage-plan.md §6, §7, §8):
//   - OnEMI only. Does NOT iterate other ipo_ids.
//   - Pre-flight HALT if ipos[] does not have exactly 10 existing entries OR
//     OnEMI is already present (idempotency / refuse double-insert).
//   - Existing 10 IPO rows in ipos[] stay byte-identical (preserved via
//     string-surgery splice rather than reflowed re-serialisation; the only
//     change to an existing row is a trailing comma on the previously-last
//     row's closing brace, which is a whitespace-level change with
//     identical json.dumps(sort_keys=True) output per §7 item 3).
//   - timelines[] + source_meta blocks left untouched (no schema mutation
//     beyond ipos[] tail-insert + generated_at_utc bump).
//   - Atomic write via .tmp + rename.
//   - Does NOT mutate ipo-financials.json, ipo-documents.json,
//     ipo-narrative.json, ipo-source-audit.json, src/types/*,
//     scripts/ingest/*, UI, or workflows.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

const MASTER_PATH = 'src/data/snapshots/ipo-master.json';
const FINANCIALS_PATH = 'src/data/snapshots/ipo-financials.json';
const DOCUMENTS_PATH = 'src/data/snapshots/ipo-documents.json';
const PRODUCTION_IPO_ID = 'onemi-technology-solutions';
const EXPECTED_EXISTING_IPOS = 10;

// ─── Types (duck-typed; promoter is self-contained, no src/types/ipo.ts dep) ──

interface MasterRow {
  id: string;
  [key: string]: unknown;
}
interface MasterSnapshot {
  generated_at_utc: string;
  ipos: MasterRow[];
  timelines: unknown[];
  source_meta: unknown;
}
interface FinDocEnvelope {
  generated_at_utc: string;
  by_ipo: Record<string, unknown>;
}

// ─── Failure helper ──

function fail(msg: string): never {
  console.error(`[promote:onemi-master] FAIL: ${msg}`);
  process.exit(1);
}

// ─── Custom serializer ──
//
// JSON.stringify with the standard `null, 2` indent would reflow every IPO
// row, breaking the §7 acceptance-gate requirement that the 10 existing
// rows stay byte-identical. This serializer produces text matching the
// established hand-authored format in ipo-master.json: 4-space-indented
// row wrapper, 6-space-indented keys, multi-line `listing_exchange` array.

function serializeMasterRow(): string {
  return [
    `    {`,
    `      "id": "${PRODUCTION_IPO_ID}",`,
    `      "slug": "${PRODUCTION_IPO_ID}",`,
    `      "name": "OnEMI Technology Solutions",`,
    `      "segment": "mainboard",`,
    `      "status": "upcoming",`,
    `      "sector": null,`,
    `      "open_date": null,`,
    `      "close_date": null,`,
    `      "listing_date": null,`,
    `      "price_band": null,`,
    `      "lot_size": null,`,
    `      "issue_size_cr": null,`,
    `      "fresh_cr": null,`,
    `      "ofs_cr": null,`,
    `      "face_value": null,`,
    `      "listing_exchange": [`,
    `        "BSE"`,
    `      ],`,
    `      "reservation": null,`,
    `      "state": "manual",`,
    `      "tagline": null,`,
    `      "nse_symbol": null`,
    `    }`,
  ].join('\n');
}

// ─── String-surgery splice ──

function spliceRowIntoMaster(filePath: string, newTimestamp: string, rowText: string): void {
  let content = readFileSync(filePath, 'utf-8');

  // Atomically update the top-level generated_at_utc (the first occurrence
  // — there is only one in this file).
  const tsReplaced = content.replace(
    /("generated_at_utc"\s*:\s*)"[^"]*"/,
    `$1"${newTimestamp}"`,
  );
  if (tsReplaced === content) {
    fail(`could not locate generated_at_utc in ${filePath}`);
  }
  content = tsReplaced;

  // Locate the ipos[] closer. The structure is:
  //   ...
  //       "tagline": "..."           (line N-1, inside last row)
  //     }                            (line N,   last row closer)
  //   ],                             (line N+1, ipos[] closer)
  //   "timelines": [                 (line N+2, next top-level key)
  //   ...
  // We look for the FIRST line that is exactly `  ],` (2-space indent +
  // `],`) — that's the ipos[] closer. The next array (`timelines[]`) closes
  // with `  ],` too but lives further down. Splitting on lines and
  // searching from the top gives us ipos[] first.
  const lines = content.split('\n');
  const iposCloserIdx = lines.findIndex((line) => line === '  ],');
  if (iposCloserIdx === -1) {
    fail(`could not locate ipos[] closer (  ],) in ${filePath}`);
  }
  const lastRowCloserIdx = iposCloserIdx - 1;
  if (lines[lastRowCloserIdx] !== '    }') {
    fail(
      `unexpected last ipos[] row closer in ${filePath}: ` +
        JSON.stringify(lines[lastRowCloserIdx]) +
        ` (expected exactly "    }")`,
    );
  }

  // Comma the previously-last row, then splice OnEMI in before the ipos[]
  // closer. The 10 existing rows above keep byte-identical JSON content
  // (only the previously-last row's closing-brace line gains a trailing
  // comma, which is whitespace-equivalent under json.dumps(sort_keys=True)
  // per §7 item 3).
  lines[lastRowCloserIdx] = '    },';
  lines.splice(iposCloserIdx, 0, rowText);

  const newContent = lines.join('\n');

  // Atomic write via .tmp + rename.
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, newContent, 'utf-8');
  renameSync(tmpPath, filePath);
}

// ─── Main ──

function main(): void {
  // Preflight 1: confirm OnEMI exists in financials + documents (Phase 5B.1
  // landed it; this script would be premature without those rows).
  const financials = readJsonOrNull<FinDocEnvelope>(FINANCIALS_PATH);
  if (!financials) fail(`${FINANCIALS_PATH} missing or malformed`);
  if (!Object.prototype.hasOwnProperty.call(financials.by_ipo, PRODUCTION_IPO_ID)) {
    fail(
      `${FINANCIALS_PATH} missing required row for ${PRODUCTION_IPO_ID} — ` +
        `Phase 5B.1 must run first.`,
    );
  }
  const documents = readJsonOrNull<FinDocEnvelope>(DOCUMENTS_PATH);
  if (!documents) fail(`${DOCUMENTS_PATH} missing or malformed`);
  if (!Object.prototype.hasOwnProperty.call(documents.by_ipo, PRODUCTION_IPO_ID)) {
    fail(
      `${DOCUMENTS_PATH} missing required row for ${PRODUCTION_IPO_ID} — ` +
        `Phase 5B.1 must run first.`,
    );
  }
  console.log('[promote:onemi-master] preflight (financials + documents) OK');

  // Preflight 2: confirm ipo-master.json structure + idempotency.
  const master = readJsonOrNull<MasterSnapshot>(MASTER_PATH);
  if (!master) fail(`${MASTER_PATH} missing or malformed`);
  if (!Array.isArray(master.ipos)) fail(`${MASTER_PATH}: ipos[] is not an array`);
  if (master.ipos.length !== EXPECTED_EXISTING_IPOS) {
    fail(
      `${MASTER_PATH}: expected exactly ${EXPECTED_EXISTING_IPOS} existing ipos[] entries; ` +
        `found ${master.ipos.length} (${master.ipos.map((r) => r.id).join(', ')})`,
    );
  }
  if (master.ipos.some((r) => r.id === PRODUCTION_IPO_ID)) {
    fail(
      `${MASTER_PATH} already contains ${PRODUCTION_IPO_ID} — refusing to ` +
        `double-insert. Revert manually if you want to re-link.`,
    );
  }
  console.log('[promote:onemi-master] preflight (ipo-master.json: 10 rows, no OnEMI) OK');

  // Splice in. Only mutations to the file:
  //   1. generated_at_utc updated
  //   2. previously-last row's closing brace gains a trailing comma
  //   3. OnEMI row inserted before the ipos[] closer
  // timelines[] + source_meta + the 10 existing rows' JSON content are
  // byte-identical.
  const rowText = serializeMasterRow();
  const newTimestamp = new Date().toISOString();
  spliceRowIntoMaster(MASTER_PATH, newTimestamp, rowText);

  // Summary for the status doc / operator review.
  console.log('[promote:onemi-master] SUCCESS');
  console.log(`  ${MASTER_PATH}: +1 row (${EXPECTED_EXISTING_IPOS + 1} total ipos[])`);
  console.log('  Populated fields:');
  console.log('    id, slug      = onemi-technology-solutions  (verified)');
  console.log('    name          = OnEMI Technology Solutions  (verified)');
  console.log('    segment       = mainboard                   (inferred — financial scale + BSE URL)');
  console.log('    listing_exchange = ["BSE"]                  (inferred — source PDF host)');
  console.log('    status        = upcoming                    (conservative default — no dates yet)');
  console.log('    state         = manual                      (conservative default — no ingest pipeline)');
  console.log('  Null fields (13):');
  console.log('    sector, open_date, close_date, listing_date, price_band, lot_size,');
  console.log('    issue_size_cr, fresh_cr, ofs_cr, face_value, reservation, tagline,');
  console.log('    nse_symbol');
}

main();
