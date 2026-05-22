#!/usr/bin/env tsx
// Phase 5B.1 — OnEMI Technology Solutions production promotion.
//
// Reads the accepted staging snapshot at
//   phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json
// and inserts ONE new row into each of:
//   - src/data/snapshots/ipo-financials.json   (financial periods row, state=live)
//   - src/data/snapshots/ipo-documents.json    (minimal RHP linkage, state=live)
//
// Hard guardrails (per phase-5B1-production-promotion-plan.md §7, §8):
//   - OnEMI only. Does NOT iterate other ipo_ids.
//   - Pre-flight HALT if staging file fails any required confidence check.
//   - Existing rows in both snapshots stay byte-identical (preserved via
//     string-surgery splice rather than reflowed re-serialisation).
//   - Atomic write via .tmp + rename.
//   - Idempotent: running twice produces identical bytes (the second run
//     splices into a file that already has the OnEMI row at the same
//     position, but the pre-flight existing-row-count check detects this
//     and HALTs to avoid double-insert).
//   - Does NOT mutate ipo-narrative.json, ipo-source-audit.json,
//     ipo-master.json, scripts/ingest/*, UI, workflows, or src/types/*.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readJsonOrNull } from '../../ingest/lib/safeWrite.ts';

const STAGING_PATH =
  'phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json';
const FINANCIALS_PATH = 'src/data/snapshots/ipo-financials.json';
const DOCUMENTS_PATH = 'src/data/snapshots/ipo-documents.json';
const PRODUCTION_IPO_ID = 'onemi-technology-solutions';
const REQUIRED_KEYS = ['revenue', 'pat', 'total_assets'] as const;
const REQUIRED_PERIODS_COUNT = 4;
const EXPECTED_EXISTING_FINANCIALS_KEYS = 5;
const EXPECTED_EXISTING_DOCUMENTS_KEYS = 10;
const PRODUCTION_PERIODS: ReadonlyArray<string> = ['9M FY 26', 'FY 25', 'FY 24', 'FY 23'];

// ─── Types (duck-typed; promoter is self-contained, no src/types/ipo.ts dep) ──

type Confidence = 'high' | 'medium' | 'low';

interface StagingValueByPeriod {
  raw: string;
  normalized_cr: number | null;
  confidence: Confidence;
}
interface StagingLineItem {
  key: string;
  raw_label: string;
  source_page: number;
  source_table_index: number;
  values_by_period: Record<string, StagingValueByPeriod>;
  manual_review_required: boolean;
}
interface StagingPeriodDetected {
  normalized: string;
  confidence: Confidence;
}
interface StagingNormalizedFinancials {
  ipo_id: string;
  company_name: string;
  source_pdf_url: string;
  source_pdf_sha256: string;
  source_doc_kind: string;
  parsed_at_utc: string;
  parser_version: string;
  manual_review_required: boolean;
  unit_detected: { value: string; confidence: Confidence | null };
  periods_detected: StagingPeriodDetected[];
  line_items: StagingLineItem[];
}

interface ProductionFinancialPeriod {
  period: string;
  revenue_cr: number | null;
  ebitda_cr: number | null;
  pat_cr: number | null;
  assets_cr: number | null;
  net_worth_cr: number | null;
  debt_cr: number | null;
  eps: number | null;
}
interface ProductionFinancialsRow {
  ipo_id: string;
  state: 'live';
  periods: ProductionFinancialPeriod[];
}
interface ProductionDocumentsRow {
  ipo_id: string;
  state: 'live';
  docs: Array<{
    kind: string;
    url: string;
    title: string;
    fetched_at_utc: string;
  }>;
}
interface SnapshotEnvelope {
  generated_at_utc: string;
  by_ipo: Record<string, unknown>;
}

// ─── Failure helper ──

function fail(msg: string): never {
  console.error(`[promote:onemi] FAIL: ${msg}`);
  process.exit(1);
}

// ─── Pre-flight (binding per §7 rule 10) ──

function preflight(staging: StagingNormalizedFinancials): void {
  if (staging.manual_review_required) {
    fail(`staging manual_review_required is true — refusing to promote`);
  }
  const unitConf = staging.unit_detected.confidence;
  if (unitConf === 'low' || unitConf == null) {
    fail(`staging unit_detected.confidence is ${unitConf} — required: high/medium`);
  }
  const highPeriods = staging.periods_detected.filter((p) => p.confidence === 'high');
  if (highPeriods.length < REQUIRED_PERIODS_COUNT) {
    fail(
      `staging has ${highPeriods.length} HIGH-confidence periods; required ${REQUIRED_PERIODS_COUNT} ` +
        `(got: ${staging.periods_detected.map((p) => p.normalized + '/' + p.confidence).join(', ')})`
    );
  }
  const periodNames = new Set(staging.periods_detected.map((p) => p.normalized));
  for (const required of PRODUCTION_PERIODS) {
    if (!periodNames.has(required)) {
      fail(`staging is missing required period ${required}; got: ${[...periodNames].join(', ')}`);
    }
  }
  for (const requiredKey of REQUIRED_KEYS) {
    const item = staging.line_items.find((li) => li.key === requiredKey);
    if (!item) fail(`staging missing required line_item ${requiredKey}`);
    if (item.manual_review_required) {
      fail(`staging line_item ${requiredKey} has manual_review_required=true`);
    }
    const vals = Object.values(item.values_by_period);
    if (vals.length === 0) {
      fail(`staging line_item ${requiredKey} has empty values_by_period`);
    }
    for (const v of vals) {
      if (v.confidence !== 'high' && v.confidence !== 'medium') {
        fail(
          `staging line_item ${requiredKey} has a value with confidence=${v.confidence} (required: high/medium)`
        );
      }
    }
  }
}

// ─── Staging → production value lookups ──

function valueFor(staging: StagingNormalizedFinancials, key: string, period: string): number | null {
  const item = staging.line_items.find((li) => li.key === key);
  if (!item) return null;
  const v = item.values_by_period[period];
  return v ? v.normalized_cr : null;
}

function buildFinancialsRow(staging: StagingNormalizedFinancials): ProductionFinancialsRow {
  const periods = PRODUCTION_PERIODS.map<ProductionFinancialPeriod>((period) => ({
    period,
    revenue_cr: valueFor(staging, 'revenue', period),
    // ebitda_cr null: not directly disclosed in OnEMI's restated P&L (Phase 5B does not derive).
    ebitda_cr: null,
    pat_cr: valueFor(staging, 'pat', period),
    // assets_cr from staging key 'total_assets' (production drops the "total_" prefix).
    assets_cr: valueFor(staging, 'total_assets', period),
    net_worth_cr: valueFor(staging, 'net_worth', period),
    // debt_cr null: staging 'total_borrowings' missing for OnEMI (label dictionary mismatch).
    debt_cr: null,
    // eps null: staging 'eps_basic' missing for OnEMI (label dictionary mismatch).
    eps: null,
  }));
  return {
    ipo_id: PRODUCTION_IPO_ID,
    state: 'live',
    periods,
  };
}

function buildDocumentsRow(staging: StagingNormalizedFinancials): ProductionDocumentsRow {
  // fetched_at_utc records WHEN the BSE-hosted RHP was last verified live; we
  // use the staging parsed_at_utc (the timestamp of Phase 5B's CI download +
  // parse), stripped of fractional seconds to match the existing rows'
  // "2026-05-20T19:05:00Z" format.
  const fetchedAtUtc = staging.parsed_at_utc.replace(/\.\d+Z$/, 'Z');
  return {
    ipo_id: PRODUCTION_IPO_ID,
    state: 'live',
    docs: [
      {
        kind: 'RHP',
        url: staging.source_pdf_url,
        title: `${staging.company_name} — Red Herring Prospectus`,
        fetched_at_utc: fetchedAtUtc,
      },
    ],
  };
}

// ─── Custom serializers ──
//
// JSON.stringify with the standard `null, 2` indent would reflow every IPO
// row, breaking the §9 acceptance-gate requirement that existing rows stay
// byte-identical. These serializers produce text matching the established
// hand-authored format: pretty-printed scaffolding with inline-single-line
// `FinancialPeriod` objects in `ipo-financials.json`.

function serializePeriod(p: ProductionFinancialPeriod): string {
  const parts = [
    `"period": ${JSON.stringify(p.period)}`,
    `"revenue_cr": ${JSON.stringify(p.revenue_cr)}`,
    `"ebitda_cr": ${JSON.stringify(p.ebitda_cr)}`,
    `"pat_cr": ${JSON.stringify(p.pat_cr)}`,
    `"assets_cr": ${JSON.stringify(p.assets_cr)}`,
    `"net_worth_cr": ${JSON.stringify(p.net_worth_cr)}`,
    `"debt_cr": ${JSON.stringify(p.debt_cr)}`,
    `"eps": ${JSON.stringify(p.eps)}`,
  ];
  return `{ ${parts.join(', ')} }`;
}

function serializeFinancialsRow(row: ProductionFinancialsRow): string {
  const periodLines = row.periods.map((p) => `        ${serializePeriod(p)}`).join(',\n');
  return [
    `    ${JSON.stringify(row.ipo_id)}: {`,
    `      "ipo_id": ${JSON.stringify(row.ipo_id)},`,
    `      "state": ${JSON.stringify(row.state)},`,
    `      "periods": [`,
    periodLines,
    `      ],`,
    `      "derived": {`,
    `        "revenue_3y_cagr_pct": null,`,
    `        "pat_3y_cagr_pct": null,`,
    `        "d_to_e": null,`,
    `        "market_cap_cr": null,`,
    `        "pe_at_upper_band": null`,
    `      }`,
    `    }`,
  ].join('\n');
}

function serializeDocumentsRow(row: ProductionDocumentsRow): string {
  // Each doc rendered multi-line (matches existing format in ipo-documents.json).
  const docLines = row.docs
    .map((d) =>
      [
        `        {`,
        `          "kind": ${JSON.stringify(d.kind)},`,
        `          "url": ${JSON.stringify(d.url)},`,
        `          "title": ${JSON.stringify(d.title)},`,
        `          "fetched_at_utc": ${JSON.stringify(d.fetched_at_utc)}`,
        `        }`,
      ].join('\n')
    )
    .join(',\n');
  return [
    `    ${JSON.stringify(row.ipo_id)}: {`,
    `      "ipo_id": ${JSON.stringify(row.ipo_id)},`,
    `      "state": ${JSON.stringify(row.state)},`,
    `      "docs": [`,
    docLines,
    `      ],`,
    `      "registrar": null,`,
    `      "brlms": []`,
    `    }`,
  ].join('\n');
}

// ─── String-surgery splice ──

function spliceRowIntoSnapshot(filePath: string, newTimestamp: string, rowText: string): void {
  let content = readFileSync(filePath, 'utf-8');
  // Atomically update the top-level generated_at_utc.
  const tsReplaced = content.replace(
    /("generated_at_utc"\s*:\s*)"[^"]*"/,
    `$1"${newTimestamp}"`
  );
  if (tsReplaced === content) {
    fail(`could not locate generated_at_utc in ${filePath}`);
  }
  content = tsReplaced;
  // Split into lines for index-based splicing.
  const lines = content.split('\n');
  // Allow an optional trailing empty line (file may or may not end with newline).
  let endIdx = lines.length - 1;
  if (lines[endIdx] === '') endIdx--;
  if (lines[endIdx] !== '}') {
    fail(`unexpected last non-empty line in ${filePath}: ${JSON.stringify(lines[endIdx])}`);
  }
  const byIpoCloserIdx = endIdx - 1;
  if (lines[byIpoCloserIdx] !== '  }') {
    fail(`unexpected by_ipo closer in ${filePath}: ${JSON.stringify(lines[byIpoCloserIdx])}`);
  }
  const lastRowCloserIdx = byIpoCloserIdx - 1;
  if (lines[lastRowCloserIdx] !== '    }') {
    fail(`unexpected last IPO row closer in ${filePath}: ${JSON.stringify(lines[lastRowCloserIdx])}`);
  }
  // Comma the previous-last row, then splice in OnEMI.
  lines[lastRowCloserIdx] = '    },';
  lines.splice(byIpoCloserIdx, 0, rowText);
  const newContent = lines.join('\n');
  // Atomic write.
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, newContent, 'utf-8');
  renameSync(tmpPath, filePath);
}

// ─── Main ──

function main(): void {
  const staging = readJsonOrNull<StagingNormalizedFinancials>(STAGING_PATH);
  if (!staging) fail(`staging JSON missing or malformed at ${STAGING_PATH}`);
  preflight(staging);
  console.log('[promote:onemi] preflight OK');

  const financials = readJsonOrNull<SnapshotEnvelope>(FINANCIALS_PATH);
  if (!financials) fail(`${FINANCIALS_PATH} missing or malformed`);
  const documents = readJsonOrNull<SnapshotEnvelope>(DOCUMENTS_PATH);
  if (!documents) fail(`${DOCUMENTS_PATH} missing or malformed`);

  // Existing-row count guard — also rejects double-insert (idempotency).
  const existingFinKeys = Object.keys(financials.by_ipo);
  if (existingFinKeys.includes(PRODUCTION_IPO_ID)) {
    fail(
      `${FINANCIALS_PATH} already contains ${PRODUCTION_IPO_ID} — refusing to double-insert. ` +
        `Revert manually if you want to re-promote.`
    );
  }
  if (existingFinKeys.length !== EXPECTED_EXISTING_FINANCIALS_KEYS) {
    fail(
      `${FINANCIALS_PATH}: expected ${EXPECTED_EXISTING_FINANCIALS_KEYS} existing IPO keys; ` +
        `found ${existingFinKeys.length}: ${existingFinKeys.join(', ')}`
    );
  }
  const existingDocKeys = Object.keys(documents.by_ipo);
  if (existingDocKeys.includes(PRODUCTION_IPO_ID)) {
    fail(`${DOCUMENTS_PATH} already contains ${PRODUCTION_IPO_ID} — refusing to double-insert.`);
  }
  if (existingDocKeys.length !== EXPECTED_EXISTING_DOCUMENTS_KEYS) {
    fail(
      `${DOCUMENTS_PATH}: expected ${EXPECTED_EXISTING_DOCUMENTS_KEYS} existing IPO keys; ` +
        `found ${existingDocKeys.length}`
    );
  }

  // Build production rows.
  const finRow = buildFinancialsRow(staging);
  const docRow = buildDocumentsRow(staging);
  const finRowText = serializeFinancialsRow(finRow);
  const docRowText = serializeDocumentsRow(docRow);
  const newTimestamp = new Date().toISOString();

  // Splice in. Existing rows stay byte-identical (only the last existing row
  // gets a trailing comma and the top-level generated_at_utc changes).
  spliceRowIntoSnapshot(FINANCIALS_PATH, newTimestamp, finRowText);
  spliceRowIntoSnapshot(DOCUMENTS_PATH, newTimestamp, docRowText);

  // Print summary for the status doc / operator review.
  console.log('[promote:onemi] SUCCESS');
  console.log(`  ${FINANCIALS_PATH}: +1 row (${existingFinKeys.length + 1} total)`);
  console.log(`  ${DOCUMENTS_PATH}: +1 row (${existingDocKeys.length + 1} total)`);
  for (const p of finRow.periods) {
    console.log(
      `  ${p.period}: revenue_cr=${p.revenue_cr} pat_cr=${p.pat_cr} assets_cr=${p.assets_cr} net_worth_cr=${p.net_worth_cr} (ebitda_cr/debt_cr/eps=null)`
    );
  }
}

main();
