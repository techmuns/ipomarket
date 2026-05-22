// Phase 5A.2 — BSE mainboard DRHP/RHP discovery (Playwright-driven).
//
// Targets `bseindia.com/markets/PublicIssues/DRHP.aspx`. P-10 previously
// probed this URL via static GET and returned RED (rows + PDF links
// missing because the table is JS-rendered). This module retries with
// Playwright so the hydrated PDF anchors are visible.
//
// Writes phase-0/pdf-extracts/bse-mainboard-candidates.json regardless of
// outcome. Per §X.1 hard rule, NEVER mutates ipo-documents.json.

import { safeWriteJson } from '../../ingest/lib/safeWrite.ts';
import { renderBseWithPlaywright } from './bse-shared.ts';
import type { BseDiscoveryFile } from '../lib/types.ts';

const BSE_MAINBOARD_URL = 'https://www.bseindia.com/markets/PublicIssues/DRHP.aspx';
const OUT_PATH = 'phase-0/pdf-extracts/bse-mainboard-candidates.json';
const PARSER_VERSION = '5A.2';

export async function discoverBseMainboard(): Promise<BseDiscoveryFile> {
  const generatedAt = new Date().toISOString();
  console.log(`[pdf:bse-mainboard] start url=${BSE_MAINBOARD_URL}`);
  const r = await renderBseWithPlaywright({
    url: BSE_MAINBOARD_URL,
    source: 'bse-mainboard',
    capturedAtUtc: generatedAt,
  });
  console.log(
    `[pdf:bse-mainboard] attempted=${r.attempted} count=${r.count}` +
      (r.error ? ` error=${r.error}` : '') +
      ` (${r.note})`
  );
  const file: BseDiscoveryFile = {
    generated_at_utc: generatedAt,
    parser_version: PARSER_VERSION,
    source: 'bse-mainboard',
    url: BSE_MAINBOARD_URL,
    result: {
      count: r.count,
      ok: r.attempted && r.error == null,
      error: r.error,
      note: r.note,
      latency_ms: r.latency_ms,
    },
    candidates: r.candidates,
  };
  safeWriteJson(OUT_PATH, file);
  console.log(`[pdf:bse-mainboard] wrote ${OUT_PATH} (total=${r.candidates.length})`);
  return file;
}
