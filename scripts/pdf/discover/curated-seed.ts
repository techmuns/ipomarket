// Phase 5A.2 — manually curated official PDF URL seed.
//
// Reads phase-0/curated-official-pdfs.json, validates each entry against
// the CURATED_OFFICIAL_HOSTS allow-list (only sebi.gov.in / nseindia.com /
// nsearchives.nseindia.com / bseindia.com / bsesme.com — broker /
// aggregator hosts MUST be rejected at runtime), and returns the surviving
// entries to the orchestrator for merge into the unified candidate pool.
//
// Rejected entries are recorded in the returned `rejected` array so the
// audit can surface them. This is the only path by which a non-discovery
// URL enters the Phase 5A.2 candidate pool, so the host check is the
// security boundary for §X source policy.

import { readJsonOrNull, safeWriteJson } from '../../ingest/lib/safeWrite.ts';
import {
  CURATED_OFFICIAL_HOSTS,
  type CuratedOfficialPdfEntry,
  type CuratedOfficialPdfFile,
} from '../lib/types.ts';

const CURATED_INPUT_PATH = 'phase-0/curated-official-pdfs.json';
const CURATED_OUT_PATH = 'phase-0/pdf-extracts/curated-official-pdfs.json';
const PARSER_VERSION = '5A.4';

interface RawCuratedInput {
  entries?: Array<Partial<CuratedOfficialPdfEntry>>;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowlisted(host: string): boolean {
  return (CURATED_OFFICIAL_HOSTS as ReadonlyArray<string>).includes(host);
}

function validKind(k: unknown): k is CuratedOfficialPdfEntry['doc_kind'] {
  return k === 'DRHP' || k === 'RHP' || k === 'Final Offer Document' || k === 'Prospectus';
}

export function loadCuratedSeed(): CuratedOfficialPdfFile {
  const generatedAt = new Date().toISOString();
  const raw = readJsonOrNull<RawCuratedInput>(CURATED_INPUT_PATH);
  const accepted: CuratedOfficialPdfEntry[] = [];
  const rejected: CuratedOfficialPdfFile['rejected'] = [];

  if (!raw || !Array.isArray(raw.entries)) {
    console.log(
      `[pdf:curated] ${CURATED_INPUT_PATH} missing or has no entries[]; treating as empty seed`
    );
    const file: CuratedOfficialPdfFile = {
      generated_at_utc: generatedAt,
      parser_version: PARSER_VERSION,
      entries: [],
      rejected: [],
    };
    safeWriteJson(CURATED_OUT_PATH, file);
    return file;
  }

  for (const e of raw.entries) {
    const ipo_id = typeof e.ipo_id === 'string' ? e.ipo_id : '';
    const doc_url = typeof e.doc_url === 'string' ? e.doc_url : '';
    if (!ipo_id || !doc_url) {
      rejected.push({
        ipo_id: ipo_id || '(missing)',
        doc_url: doc_url || '(missing)',
        reason: 'missing required field ipo_id and/or doc_url',
      });
      continue;
    }
    const host = hostOf(doc_url);
    if (!host) {
      rejected.push({ ipo_id, doc_url, reason: 'doc_url is not a valid URL' });
      continue;
    }
    if (!isAllowlisted(host)) {
      rejected.push({
        ipo_id,
        doc_url,
        reason: `host ${host} not in CURATED_OFFICIAL_HOSTS allow-list (broker / aggregator hosts are forbidden in Phase 5A.2)`,
      });
      continue;
    }
    if (!validKind(e.doc_kind)) {
      rejected.push({
        ipo_id,
        doc_url,
        reason: `doc_kind ${String(e.doc_kind)} is not DRHP|RHP|Final Offer Document|Prospectus`,
      });
      continue;
    }
    // Phase 5A.4 — operator quarantine. Explicit `false` skips the entry.
    // Missing or any other value (including the default `true`) accepts.
    if (e.allowed_for_parser === false) {
      rejected.push({
        ipo_id,
        doc_url,
        reason: 'allowed_for_parser=false (operator-quarantined)',
      });
      continue;
    }
    // Recorded source_host is canonicalised from the URL — not whatever
    // the curator typed — so the audit can't be misled by a stale literal.
    // Phase 5A.4 additive optional metadata passes through verbatim; it's
    // never used as a security gate, only as audit / provenance signal.
    accepted.push({
      ipo_id,
      doc_kind: e.doc_kind,
      doc_url,
      source_host: host,
      curated_at_utc: typeof e.curated_at_utc === 'string' ? e.curated_at_utc : generatedAt,
      verified_at_utc:
        typeof e.verified_at_utc === 'string' || e.verified_at_utc === null
          ? e.verified_at_utc
          : null,
      notes: typeof e.notes === 'string' ? e.notes : '',
      ...(typeof e.company_name === 'string' ? { company_name: e.company_name } : {}),
      ...(typeof e.discovered_via === 'string' ? { discovered_via: e.discovered_via } : {}),
      ...(typeof e.discovered_at_utc === 'string'
        ? { discovered_at_utc: e.discovered_at_utc }
        : {}),
      ...(typeof e.curated_by === 'string' ? { curated_by: e.curated_by } : {}),
      ...(typeof e.allowed_for_parser === 'boolean'
        ? { allowed_for_parser: e.allowed_for_parser }
        : {}),
    });
  }

  const file: CuratedOfficialPdfFile = {
    generated_at_utc: generatedAt,
    parser_version: PARSER_VERSION,
    entries: accepted,
    rejected,
  };
  safeWriteJson(CURATED_OUT_PATH, file);
  console.log(
    `[pdf:curated] accepted=${accepted.length} rejected=${rejected.length} (wrote ${CURATED_OUT_PATH})`
  );
  for (const r of rejected) {
    console.warn(`[pdf:curated] REJECTED ${r.ipo_id} <- ${r.doc_url} (${r.reason})`);
  }
  return file;
}
