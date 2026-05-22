// Phase 5A.2 — BSE SME DRHP/RHP discovery (Playwright-driven).
//
// Targets the BSE SME public-issues offer-documents page. The page is an
// ASP.NET WebForms shell that hydrates the document grid client-side, so
// static GET reliably returns no anchors. Playwright wait-for-network-idle
// surfaces the rendered table.
//
// Writes phase-0/pdf-extracts/bse-sme-candidates.json regardless of
// outcome — failure produces an empty-with-note file. Per §X.1 hard rule,
// this discovery is NEVER allowed to mutate src/data/snapshots/ipo-documents.json.

import { safeWriteJson } from '../../ingest/lib/safeWrite.ts';
import { renderBseWithPlaywright } from './bse-shared.ts';
import type { BseDiscoveryFile } from '../lib/types.ts';

const BSE_SME_URL = 'https://www.bsesme.com/static/markets/publicissues/issues_drhp.aspx';
const OUT_PATH = 'phase-0/pdf-extracts/bse-sme-candidates.json';
const PARSER_VERSION = '5A.2';

export async function discoverBseSme(): Promise<BseDiscoveryFile> {
  const generatedAt = new Date().toISOString();
  console.log(`[pdf:bse-sme] start url=${BSE_SME_URL}`);
  const r = await renderBseWithPlaywright({
    url: BSE_SME_URL,
    source: 'bse-sme',
    capturedAtUtc: generatedAt,
  });
  console.log(
    `[pdf:bse-sme] attempted=${r.attempted} count=${r.count}` +
      (r.error ? ` error=${r.error}` : '') +
      ` (${r.note})`
  );
  const file: BseDiscoveryFile = {
    generated_at_utc: generatedAt,
    parser_version: PARSER_VERSION,
    source: 'bse-sme',
    url: BSE_SME_URL,
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
  console.log(`[pdf:bse-sme] wrote ${OUT_PATH} (total=${r.candidates.length})`);
  return file;
}
