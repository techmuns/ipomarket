// P-09 — SEBI DRHP PDF Download (validation only).
//
// Refactored to consume the PDF discovery output written by P-08
// (phase-0/samples/sebi-publicissues-pdfs.json). Downloads the first PDF,
// validates magic bytes + size, and shells out to scripts/probes/lib/pdf-parse.py
// for an authoritative page count. Metadata only — the binary PDF is NOT
// committed to the repo.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { httpGetBinary, truncate } from './lib/http.ts';
import { ensureDir } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const DISCOVERY_PATH_FRAGMENT = 'sebi-publicissues-pdfs.json';

interface DiscoveredPdf {
  url: string;
  link_text: string;
  // Optional source-tag added by P-08 (e.g. "static-alt", "detail-page").
  // We don't require it; only `url` is mandatory.
  source?: string;
}

interface DiscoveryFile {
  captured_at_utc: string;
  // Schema accepts both old (winning_attempt + attempts) and new (phases + detail_urls_found) shapes.
  pdfs: DiscoveredPdf[];
  [key: string]: any;
}

function readDiscovery(samplesDir: string): DiscoveryFile | null {
  const p = join(samplesDir, DISCOVERY_PATH_FRAGMENT);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function runPdfParse(pdfPath: string, outJson: string): { ok: boolean; raw: string } {
  try {
    const res = spawnSync(
      'python3',
      ['scripts/probes/lib/pdf-parse.py', 'rhp', pdfPath, outJson],
      { encoding: 'utf-8', timeout: 60_000 }
    );
    if (res.error) return { ok: false, raw: String(res.error) };
    return { ok: res.status === 0, raw: (res.stdout ?? '') + (res.stderr ?? '') };
  } catch (e: any) {
    return { ok: false, raw: String(e?.message ?? e) };
  }
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const started = Date.now();
  ensureDir(ctx.samplesDir);

  const discovery = readDiscovery(ctx.samplesDir);
  if (!discovery || !discovery.pdfs || discovery.pdfs.length === 0) {
    return {
      probe_id: 'P-09',
      source: 'SEBI — DRHP PDF Download',
      url_or_endpoint: '(no URL — depends on P-08)',
      fetch_method: 'GET (binary)',
      headers_or_cookies_required: ['User-Agent', 'Referer'],
      status_code: null,
      response_type: 'EMPTY',
      fields_found: [],
      fields_missing: ['pdf url from P-08 discovery'],
      sample_record: '',
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Immutable once published',
      status: 'YELLOW',
      recommended_action:
        'P-08 produced no PDF URLs; re-run after P-08 GREEN. Fallback = P-10 exchange-side DRHP.',
      fallback_source: 'P-10',
      ran_at_utc: ctx.nowIso,
      latency_ms: Date.now() - started,
      notes: `No discovery file at ${DISCOVERY_PATH_FRAGMENT}, or it had zero PDFs (P-08 must run first).`,
    };
  }

  const first = discovery.pdfs[0]!;
  const pdfUrl = first.url;

  const bin = await httpGetBinary(pdfUrl, {
    headers: { Referer: 'https://www.sebi.gov.in/filings/public-issues.html' },
    timeoutMs: 60_000,
  });

  if (!bin.ok || !bin.buffer || bin.bytes < 1024) {
    return {
      probe_id: 'P-09',
      source: 'SEBI — DRHP PDF Download',
      url_or_endpoint: pdfUrl,
      fetch_method: 'GET (binary)',
      headers_or_cookies_required: ['User-Agent', 'Referer'],
      status_code: bin.status,
      response_type: 'ERROR',
      fields_found: [],
      fields_missing: ['downloadable pdf'],
      sample_record: `download failed: status=${bin.status} bytes=${bin.bytes} err=${bin.error ?? ''}`,
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Immutable once published',
      status: 'RED',
      recommended_action: 'Download failed; fall back to P-10 exchange-side DRHP archive.',
      fallback_source: 'P-10',
      ran_at_utc: ctx.nowIso,
      latency_ms: Date.now() - started,
      notes: `Sample URL: ${pdfUrl}; status=${bin.status} bytes=${bin.bytes}`,
    };
  }

  const first4 = bin.buffer.subarray(0, 4).toString('ascii');
  const magicOk = first4 === '%PDF';
  const sha = createHash('sha256').update(bin.buffer).digest('hex');

  // Page-count check via pdf-parse.py. Write the PDF to a temp file (NOT
  // the samples directory — we don't commit binaries).
  const tmp = mkdtempSync(join(tmpdir(), 'p09-'));
  const pdfPath = join(tmp, 'sample.pdf');
  writeFileSync(pdfPath, bin.buffer);
  const metaOut = join(ctx.samplesDir, 'sample-drhp.pdf-meta.json');
  const parsed = runPdfParse(pdfPath, metaOut);

  let pageCount = 0;
  let coverText = '';
  if (existsSync(metaOut)) {
    try {
      const m = JSON.parse(readFileSync(metaOut, 'utf-8'));
      pageCount = m.page_count ?? 0;
      coverText = (m.cover_text_first_500 ?? '').slice(0, 200);
    } catch {
      // ignore
    }
  }

  // Augment the metadata with our download stats.
  try {
    const m = existsSync(metaOut)
      ? JSON.parse(readFileSync(metaOut, 'utf-8'))
      : {};
    m.url = pdfUrl;
    m.link_text = first.link_text;
    m.bytes = bin.bytes;
    m.sha256 = sha;
    m.magic = first4;
    m.content_type = bin.headers['content-type'] ?? '';
    writeFileSync(metaOut, JSON.stringify(m, null, 2));
  } catch {
    // ignore
  }

  let status: ProbeResult['status'];
  let responseType: ProbeResult['response_type'];
  if (!magicOk) {
    status = 'RED';
    responseType = 'ERROR';
  } else if (parsed.ok && pageCount > 5) {
    status = 'GREEN';
    responseType = 'PDF';
  } else if (magicOk && pageCount > 0) {
    status = 'YELLOW';
    responseType = 'PDF';
  } else {
    status = 'YELLOW';
    responseType = 'PDF';
  }

  return {
    probe_id: 'P-09',
    source: 'SEBI — DRHP PDF Download',
    url_or_endpoint: pdfUrl,
    fetch_method: 'GET (binary) + pdf-parse.py (page-count)',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: bin.status,
    response_type: responseType,
    fields_found: magicOk ? ['%PDF magic', 'bytes', 'page_count'] : [],
    fields_missing: magicOk ? [] : ['valid pdf magic'],
    sample_record: truncate(
      JSON.stringify(
        {
          url: pdfUrl,
          link_text: first.link_text,
          bytes: bin.bytes,
          sha256: sha.slice(0, 16) + '…',
          magic: first4,
          page_count: pageCount,
          cover_text_first_200: coverText,
        },
        null,
        2
      ),
      1200
    ),
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Immutable once published',
    status,
    recommended_action:
      status === 'GREEN'
        ? 'PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17).'
        : status === 'YELLOW'
        ? 'PDF downloads but page-count check shaky; investigate before Phase 5.'
        : 'PDF magic invalid; verify discovery output is real RHP/DRHP, not landing page.',
    fallback_source: 'P-10',
    ran_at_utc: ctx.nowIso,
    latency_ms: Date.now() - started,
    notes: `discovery=${DISCOVERY_PATH_FRAGMENT}; pdf_url=${pdfUrl.slice(-60)}; bytes=${bin.bytes}; page_count=${pageCount}; pdf-parse=${parsed.ok ? 'ok' : 'failed'}`,
  };
};
