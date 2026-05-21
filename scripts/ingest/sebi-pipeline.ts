#!/usr/bin/env tsx
// Phase 2A — SEBI Pipeline + Documents ingest bridge.
//
// Reads the probe-maintained artifact at
//   phase-0/samples/sebi-publicissues-pdfs.json
// (kept fresh by P-08 inside phase-0-probes.yml) and bridges it into the
// production snapshot files:
//   src/data/snapshots/sebi-pipeline.json     — DRHP pipeline rows
//   src/data/snapshots/ipo-documents.json     — per-IPO DRHP cross-fill
//   src/data/snapshots/ipo-source-audit.json  — per-IPO audit entries
//
// This is an artifact-to-snapshot bridge. It does NOT refetch SEBI.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { safeWriteJson, readJsonOrNull } from './lib/safeWrite.ts';
import { mergeByKey } from './lib/merge.ts';
import { appendAuditEntry } from './lib/audit.ts';
import type { ProbeArtifact, ProbePdf, SourceMeta } from './lib/types.ts';

const REPO_ROOT = process.cwd();
const PROBE_ARTIFACT = join(REPO_ROOT, 'phase-0', 'samples', 'sebi-publicissues-pdfs.json');
const SNAP_DIR = join(REPO_ROOT, 'src', 'data', 'snapshots');
const SEBI_PIPELINE_PATH = join(SNAP_DIR, 'sebi-pipeline.json');
const IPO_DOCS_PATH = join(SNAP_DIR, 'ipo-documents.json');
const IPO_AUDIT_PATH = join(SNAP_DIR, 'ipo-source-audit.json');
const IPO_MASTER_PATH = join(SNAP_DIR, 'ipo-master.json');

const NOW = new Date().toISOString();

// ----- Snapshot shapes (loose — typed only as much as we touch) -----

interface SebiEntry {
  id: string;
  company_name: string;
  doc_type: string;
  url: string;
  filing_month: string;
  status: 'filed' | 'observations_issued' | 'cleared' | 'withdrawn';
  sector_hint?: string | null;
  source?: string;
  fetched_at_utc?: string;
}

interface SebiPipelineSnapshot {
  generated_at_utc: string;
  source_url: string;
  source_meta?: SourceMeta;
  entries: SebiEntry[];
}

interface IpoMasterRow {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  [k: string]: unknown;
}

interface IpoMaster {
  generated_at_utc: string;
  ipos: IpoMasterRow[];
  timelines: unknown[];
}

interface IpoDoc {
  kind: string;
  url: string;
  title: string;
  fetched_at_utc: string | null;
  bytes?: number;
  page_count?: number;
}

interface IpoDocsForIpo {
  ipo_id: string;
  state: string;
  docs: IpoDoc[];
  registrar: unknown;
  brlms: string[];
}

interface IpoDocsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoDocsForIpo>;
}

interface IpoAuditForIpo {
  ipo_id: string;
  source_mix: Record<string, number>;
  fields: Array<{ field: string; source: string; state: string; url: string | null; fetched_at_utc: string | null }>;
}

interface IpoAuditSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoAuditForIpo>;
}

// ----- Helpers -----

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripDocTypeSuffix(s: string): string {
  // Strip "- Draft Abridged Prospectus", "-Abridged Prospectus", etc.
  return s
    .replace(/[-\s]+(Draft\s+Abridged|Abridged|Draft|Red\s+Herring)\s+Prospectus\s*$/i, '')
    .trim();
}

function deriveCompanyName(linkText: string): string {
  return stripDocTypeSuffix(linkText);
}

function deriveDocType(linkText: string): string {
  const m = linkText.match(
    /(Draft\s+Abridged\s+Prospectus|Abridged\s+Prospectus|Draft\s+Red\s+Herring\s+Prospectus|Red\s+Herring\s+Prospectus|Prospectus)\s*$/i
  );
  return m && m[1] ? m[1].replace(/\s+/g, ' ') : 'Draft Abridged Prospectus';
}

function deriveFilingMonth(url: string): string {
  const m = url.match(/\/commondocs\/([a-z]{3,4}-\d{4})\//i);
  return m && m[1] ? m[1].toLowerCase() : 'unknown';
}

function deriveCompanySlug(linkText: string): string {
  let name = deriveCompanyName(linkText);
  // Drop parentheticals: "Adroit Industries (India) Limited" -> "Adroit Industries Limited"
  name = name.replace(/\s*\(.*?\)\s*/g, ' ');
  // Drop trailing "Limited"/"Ltd"/"LIMITED"/"LTD"
  name = name.replace(/\s+(Limited|LIMITED|Ltd\.?|LTD\.?)\s*$/i, '');
  return slugify(name);
}

function matchesIpo(linkText: string, ipoSlug: string): boolean {
  const lt = linkText.toLowerCase();
  const tokens = ipoSlug.split('-').filter((t) => t.length > 1);
  if (tokens.length === 0) return false;
  return tokens.every((tok) => {
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lt);
  });
}

// ----- Main -----

async function main(): Promise<number> {
  console.log('[ingest:sebi] start');
  console.log(`[ingest:sebi]   probe artifact: ${PROBE_ARTIFACT}`);
  console.log(`[ingest:sebi]   snapshots dir:  ${SNAP_DIR}`);

  // 1. Read probe artifact.
  if (!existsSync(PROBE_ARTIFACT)) {
    console.warn(`[ingest:sebi] probe artifact MISSING — recording source_state=missing.`);
    const existing = readJsonOrNull<SebiPipelineSnapshot>(SEBI_PIPELINE_PATH);
    if (existing) {
      existing.source_meta = { source_state: 'missing', last_attempted_utc: NOW };
      existing.generated_at_utc = NOW;
      safeWriteJson(SEBI_PIPELINE_PATH, existing);
      console.log(`[ingest:sebi] preserved ${existing.entries.length} existing entries; metadata-only write.`);
    } else {
      console.warn(`[ingest:sebi] no existing snapshot either — nothing to write.`);
    }
    return 0;
  }

  const artifact = readJsonOrNull<ProbeArtifact>(PROBE_ARTIFACT);
  if (!artifact || !Array.isArray(artifact.pdfs)) {
    console.error(`[ingest:sebi] probe artifact MALFORMED (missing pdfs[]) — recording source_state=failed.`);
    const existing = readJsonOrNull<SebiPipelineSnapshot>(SEBI_PIPELINE_PATH);
    if (existing) {
      existing.source_meta = {
        source_state: 'failed',
        last_attempted_utc: NOW,
        last_error: 'malformed artifact',
      };
      existing.generated_at_utc = NOW;
      safeWriteJson(SEBI_PIPELINE_PATH, existing);
    }
    return 0;
  }

  const pdfs: ProbePdf[] = artifact.pdfs;
  console.log(`[ingest:sebi] artifact has ${pdfs.length} pdf(s)`);

  // 2. Read existing snapshots.
  const existingPipeline = readJsonOrNull<SebiPipelineSnapshot>(SEBI_PIPELINE_PATH) ?? {
    generated_at_utc: NOW,
    source_url:
      'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10',
    entries: [],
  };
  const existingDocs = readJsonOrNull<IpoDocsSnapshot>(IPO_DOCS_PATH);
  const existingAudit = readJsonOrNull<IpoAuditSnapshot>(IPO_AUDIT_PATH);
  const ipoMaster = readJsonOrNull<IpoMaster>(IPO_MASTER_PATH);

  // 3. Source-empty handling.
  if (pdfs.length === 0) {
    console.warn('[ingest:sebi] artifact pdfs[] is empty — source_state=empty; preserving existing entries.');
    existingPipeline.source_meta = { source_state: 'empty', last_attempted_utc: NOW };
    existingPipeline.generated_at_utc = NOW;
    safeWriteJson(SEBI_PIPELINE_PATH, existingPipeline);
    console.log(`[ingest:sebi] ${existingPipeline.entries.length} existing entries preserved.`);
    return 0;
  }

  // 4. Build incoming SebiEntry[] from the artifact.
  const incoming: SebiEntry[] = pdfs.map((p) => ({
    id: deriveCompanySlug(p.link_text),
    company_name: deriveCompanyName(p.link_text),
    doc_type: deriveDocType(p.link_text),
    url: p.url,
    filing_month: deriveFilingMonth(p.url),
    status: 'filed',
    sector_hint: null,
    source: 'SEBI',
    fetched_at_utc: NOW,
  }));

  // 5. Merge sebi-pipeline.json by URL key. Preserve curated `status`,
  //    `sector_hint`, and `id` from existing rows.
  const { merged: mergedEntries, stats: pipelineStats } = mergeByKey<SebiEntry>(
    existingPipeline.entries,
    incoming,
    (e) => e.url,
    (prior, fresh) => ({
      ...fresh,
      // Preserve manual/curated fields from the existing row.
      id: prior.id,
      status: prior.status ?? fresh.status,
      sector_hint: prior.sector_hint ?? null,
    })
  );

  mergedEntries.sort((a, b) => a.url.localeCompare(b.url));

  const newPipeline: SebiPipelineSnapshot = {
    generated_at_utc: NOW,
    source_url: existingPipeline.source_url,
    source_meta: { source_state: 'live', last_attempted_utc: NOW },
    entries: mergedEntries,
  };
  safeWriteJson(SEBI_PIPELINE_PATH, newPipeline);
  console.log(
    `[ingest:sebi] sebi-pipeline.json:  +${pipelineStats.added} added · ~${pipelineStats.updated} refreshed · =${pipelineStats.preserved} preserved (not in artifact)`
  );

  // 6. Cross-fill ipo-documents.json + ipo-source-audit.json for matched IPOs.
  let docsAdded = 0;
  let docsRefreshed = 0;
  let docsSkippedRhpInPlace = 0;
  let auditAdded = 0;
  let auditRefreshed = 0;
  const matches: Array<{ ipo_id: string; link_text: string }> = [];

  if (ipoMaster && existingDocs && existingAudit) {
    for (const pdf of pdfs) {
      const matchedIpo = ipoMaster.ipos.find((i) => matchesIpo(pdf.link_text, i.slug));
      if (!matchedIpo) continue;
      matches.push({ ipo_id: matchedIpo.id, link_text: pdf.link_text });

      // Cross-fill ipo-documents.json.
      const docsForIpo: IpoDocsForIpo =
        existingDocs.by_ipo[matchedIpo.id] ?? {
          ipo_id: matchedIpo.id,
          state: 'live',
          docs: [],
          registrar: null,
          brlms: [],
        };

      const docTitle = `${(matchedIpo.short_name as string | undefined) ?? matchedIpo.name} — ${deriveDocType(pdf.link_text)}`;
      const existingDocAtUrl = docsForIpo.docs.find((d) => d.url === pdf.url);

      if (existingDocAtUrl) {
        if (existingDocAtUrl.kind === 'RHP') {
          // Never overwrite an existing RHP with a DRHP. Just refresh fetched_at.
          docsSkippedRhpInPlace++;
          existingDocAtUrl.fetched_at_utc = NOW;
        } else {
          existingDocAtUrl.fetched_at_utc = NOW;
          existingDocAtUrl.title = docTitle;
          docsRefreshed++;
        }
      } else {
        // Don't add a DRHP if an RHP already exists for this IPO at a different URL.
        const hasRhp = docsForIpo.docs.some((d) => d.kind === 'RHP');
        if (!hasRhp) {
          docsForIpo.docs.push({
            kind: 'DRHP',
            url: pdf.url,
            title: docTitle,
            fetched_at_utc: NOW,
          });
          docsAdded++;
        } else {
          docsSkippedRhpInPlace++;
        }
      }
      existingDocs.by_ipo[matchedIpo.id] = docsForIpo;

      // Append a source-audit entry.
      const auditForIpo: IpoAuditForIpo =
        existingAudit.by_ipo[matchedIpo.id] ?? {
          ipo_id: matchedIpo.id,
          source_mix: { nse: 0, bse: 0, sebi: 0, rhp: 0, manual: 0, derived: 0, broker_ref: 0 },
          fields: [],
        };

      const res = appendAuditEntry(auditForIpo.fields, {
        field: 'drhp',
        source: 'SEBI',
        state: 'live',
        url: pdf.url,
        fetched_at_utc: NOW,
      });
      if (res.added) auditAdded++;
      if (res.refreshed) auditRefreshed++;
      existingAudit.by_ipo[matchedIpo.id] = auditForIpo;
    }

    existingDocs.generated_at_utc = NOW;
    existingAudit.generated_at_utc = NOW;
    safeWriteJson(IPO_DOCS_PATH, existingDocs);
    safeWriteJson(IPO_AUDIT_PATH, existingAudit);
  } else {
    console.warn('[ingest:sebi] skipping cross-fill — one of (master, docs, audit) snapshot not readable.');
  }

  console.log(
    `[ingest:sebi] ipo-documents.json:   +${docsAdded} DRHP added · ~${docsRefreshed} refreshed · skipped-rhp-in-place=${docsSkippedRhpInPlace}`
  );
  console.log(
    `[ingest:sebi] ipo-source-audit.json: +${auditAdded} added · ~${auditRefreshed} refreshed`
  );
  console.log(`[ingest:sebi] matched IPOs: ${matches.length}`);
  for (const m of matches) console.log(`[ingest:sebi]   - ${m.ipo_id}  ← "${m.link_text}"`);

  console.log('[ingest:sebi] done.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('[ingest:sebi] threw:', e?.stack ?? e?.message ?? String(e));
    process.exit(2);
  });
