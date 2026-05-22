// Phase 5A.1 — bounded SEBI multi-subsection discovery.
//
// Reads phase-0/samples/sebi-publicissues-pdfs.json as the smid=10 seed
// (avoiding a re-fetch P-08 already performs), then fetches SEBI's other
// two listing subsections directly:
//   smid=11 → Red Herring Documents filed with ROC
//   smid=12 → Final Offer Documents filed with ROC
//
// Classifies each PDF by link_text → DocType, writes the unified
// candidate list to phase-0/pdf-extracts/sebi-candidates.json. The
// orchestrator (scripts/pdf/run.ts) consumes this to drive PDF #2
// (financial-feasibility) selection while honouring the §X.1 hard rule:
// production document snapshot (ipo-documents.json) is NEVER written.

import { httpGet } from './lib/http.ts';
import { extractAllPdfs, type DiscoveredPdf } from '../probes/lib/sebi-pdf-extract.ts';
import { readJsonOrNull, safeWriteJson } from '../ingest/lib/safeWrite.ts';
import { renderSebiSmidWithPlaywright } from './discover/sebi-playwright.ts';
import type {
  DocType,
  SebiCandidate,
  SebiDiscoveryFile,
  SebiDiscoverySmidResult,
} from './lib/types.ts';

const SEBI_SMID_URLS = {
  10: 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10',
  11: 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=11',
  12: 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=12',
} as const;

const P08_ARTIFACT_PATH = 'phase-0/samples/sebi-publicissues-pdfs.json';
const DISCOVERY_OUT_PATH = 'phase-0/pdf-extracts/sebi-candidates.json';
const PARSER_VERSION = '5A.2';

interface P08Artifact {
  captured_at_utc?: string;
  pdfs?: DiscoveredPdf[];
}

export function classifyDocType(linkText: string): DocType {
  const t = (linkText || '').toLowerCase();
  // Order matters: longer / more-specific qualifiers checked first.
  if (t.includes('final offer')) return 'Final Offer Document';
  if (t.includes('draft red herring')) return 'Draft Red Herring Prospectus';
  if (t.includes('red herring')) return 'Red Herring Prospectus';
  if (t.includes('draft abridged') || t.includes('abridged prospectus')) {
    return 'Draft Abridged Prospectus';
  }
  if (t.includes('prospectus')) return 'Prospectus';
  return 'unknown';
}

async function fetchSmid(
  smid: 11 | 12,
  capturedAtUtc: string
): Promise<{ result: SebiDiscoverySmidResult; candidates: SebiCandidate[] }> {
  const url = SEBI_SMID_URLS[smid];
  const res = await httpGet(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.sebi.gov.in/',
    },
  });
  if (!res.ok) {
    return {
      result: {
        count: 0,
        ok: false,
        error: res.error ?? `HTTP ${res.status}`,
      },
      candidates: [],
    };
  }
  const discovered = extractAllPdfs(res.body, url, `static-smid-${smid}`);
  const candidates: SebiCandidate[] = discovered.map((d) => ({
    url: d.url,
    link_text: d.link_text,
    doc_type: classifyDocType(d.link_text),
    source_smid: smid,
    captured_at_utc: capturedAtUtc,
    fetch_mode: 'static',
  }));
  return {
    result: { count: candidates.length, ok: true, error: null },
    candidates,
  };
}

function loadSmid10FromCache(capturedAtUtcFallback: string): {
  result: SebiDiscoverySmidResult;
  candidates: SebiCandidate[];
} {
  const cached = readJsonOrNull<P08Artifact>(P08_ARTIFACT_PATH);
  if (!cached || !Array.isArray(cached.pdfs)) {
    return {
      result: {
        count: 0,
        ok: false,
        error: `${P08_ARTIFACT_PATH} missing or malformed`,
        source: 'cached-from-P-08',
      },
      candidates: [],
    };
  }
  const ts = cached.captured_at_utc ?? capturedAtUtcFallback;
  const candidates: SebiCandidate[] = cached.pdfs.map((p) => ({
    url: p.url,
    link_text: p.link_text,
    doc_type: classifyDocType(p.link_text),
    source_smid: 10,
    captured_at_utc: ts,
    fetch_mode: 'cached',
  }));
  return {
    result: {
      count: candidates.length,
      ok: true,
      error: null,
      source: 'cached-from-P-08',
    },
    candidates,
  };
}

function dedupeByUrl(candidates: SebiCandidate[]): SebiCandidate[] {
  const seen = new Set<string>();
  const out: SebiCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out;
}

export async function discoverSebiCandidates(): Promise<SebiDiscoveryFile> {
  const generatedAt = new Date().toISOString();
  console.log(`[pdf:discover] start (parser_version=${PARSER_VERSION})`);

  const s10 = loadSmid10FromCache(generatedAt);
  console.log(
    `[pdf:discover] smid=10 ${s10.result.ok ? 'ok' : 'failed'} count=${s10.result.count}` +
      (s10.result.error ? ` error=${s10.result.error}` : '')
  );

  const [s11, s12] = await Promise.all([fetchSmid(11, generatedAt), fetchSmid(12, generatedAt)]);
  console.log(
    `[pdf:discover] smid=11 static ${s11.result.ok ? 'ok' : 'failed'} count=${s11.result.count}` +
      (s11.result.error ? ` error=${s11.result.error}` : '')
  );
  console.log(
    `[pdf:discover] smid=12 static ${s12.result.ok ? 'ok' : 'failed'} count=${s12.result.count}` +
      (s12.result.error ? ` error=${s12.result.error}` : '')
  );

  // Phase 5A.2 — Playwright fallback for smid=11/12 when static GET
  // returned 0. Each invocation is independent (parallel) and either
  // surfaces JS-rendered PDF anchors or records why it couldn't.
  for (const [smid, slot] of [
    [11, s11],
    [12, s12],
  ] as const) {
    if (slot.result.count > 0 || !slot.result.ok) continue;
    const pw = await renderSebiSmidWithPlaywright(smid, SEBI_SMID_URLS[smid], generatedAt);
    slot.result.playwright = {
      attempted: pw.attempted,
      count: pw.count,
      error: pw.error,
      note: pw.note,
    };
    if (pw.candidates.length > 0) {
      // Roll Playwright finds up into the smid's total so the index
      // summary's `discovery_smid_counts[<smid>]` reflects both modes.
      slot.candidates.push(...pw.candidates);
      slot.result.count += pw.candidates.length;
    }
    console.log(
      `[pdf:discover] smid=${smid} playwright attempted=${pw.attempted} count=${pw.count}` +
        (pw.error ? ` error=${pw.error}` : '') +
        ` (${pw.note})`
    );
  }

  const allCandidates = dedupeByUrl([
    ...s10.candidates,
    ...s11.candidates,
    ...s12.candidates,
  ]);

  const file: SebiDiscoveryFile = {
    generated_at_utc: generatedAt,
    parser_version: PARSER_VERSION,
    by_smid: {
      '10': s10.result,
      '11': s11.result,
      '12': s12.result,
    },
    candidates: allCandidates,
  };

  safeWriteJson(DISCOVERY_OUT_PATH, file);
  console.log(
    `[pdf:discover] wrote ${DISCOVERY_OUT_PATH} (total=${allCandidates.length} after dedupe)`
  );

  // Per-doc_type breakdown for at-a-glance debugging.
  const byType: Record<string, number> = {};
  for (const c of allCandidates) byType[c.doc_type] = (byType[c.doc_type] ?? 0) + 1;
  for (const [t, n] of Object.entries(byType)) {
    console.log(`[pdf:discover]   ${t}: ${n}`);
  }

  return file;
}

// Allow running this script directly: `tsx scripts/pdf/discover.ts`.
const isDirectInvoke =
  process.argv[1] && process.argv[1].endsWith('scripts/pdf/discover.ts');
if (isDirectInvoke) {
  discoverSebiCandidates()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(
        '[pdf:discover] UNEXPECTED runtime exception:',
        e?.stack ?? e?.message ?? String(e)
      );
      process.exit(2);
    });
}
