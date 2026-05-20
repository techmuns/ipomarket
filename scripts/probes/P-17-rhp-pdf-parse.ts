import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, httpGetBinary, truncate } from './lib/http.ts';
import { classify, writeSample } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const LIST_URL = 'https://www.sebi.gov.in/filings/public-issues.html';

function pythonAvailable(): string | null {
  for (const cmd of ['python3', 'python']) {
    const r = spawnSync(cmd, ['--version'], { stdio: 'pipe' });
    if (r.status === 0) return cmd;
  }
  return null;
}

function findFirstPdfUrl(html: string): string | null {
  const m = html.match(/href\s*=\s*"([^"]*\.pdf[^"]*)"/i);
  if (!m) return null;
  let u = m[1]!;
  if (u.startsWith('/')) u = 'https://www.sebi.gov.in' + u;
  if (!/^https?:\/\//i.test(u)) u = 'https://www.sebi.gov.in/' + u;
  return u;
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const py = pythonAvailable();
  if (!py) {
    return {
      probe_id: 'P-17',
      source: 'RHP PDF parsing — sample',
      url_or_endpoint: '(python/pdfplumber/camelot stack)',
      fetch_method: 'subprocess(python3)',
      headers_or_cookies_required: [],
      status_code: null,
      response_type: 'ERROR',
      fields_found: [],
      fields_missing: ['python3'],
      sample_record: '',
      parsing_difficulty: 'Hard',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'PDFs are immutable',
      status: 'YELLOW',
      recommended_action: 'Install Python + pdfplumber + camelot in CI (requirements.txt); skipping locally.',
      fallback_source: 'manual entry',
      ran_at_utc: ctx.nowIso,
      latency_ms: 0,
      notes: 'No python3 available; probe skipped without verdict.',
    };
  }

  const list = await httpGet(LIST_URL, {
    headers: { Accept: 'text/html', Referer: 'https://www.sebi.gov.in/' },
  });
  if (!list.ok) {
    return {
      probe_id: 'P-17',
      source: 'RHP PDF parsing — sample',
      url_or_endpoint: LIST_URL,
      fetch_method: 'GET (discovery)',
      headers_or_cookies_required: ['User-Agent', 'Referer'],
      status_code: list.status,
      response_type: 'BLOCKED',
      fields_found: [],
      fields_missing: ['pdf url'],
      sample_record: truncate(list.body, 400),
      parsing_difficulty: 'Hard',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'PDFs immutable',
      status: 'RED',
      recommended_action: 'Re-check after P-08 + P-09 GREEN.',
      fallback_source: 'manual',
      ran_at_utc: ctx.nowIso,
      latency_ms: list.latency_ms,
      notes: `SEBI list fetch failed: ${list.status}`,
    };
  }
  const pdfUrl = findFirstPdfUrl(list.body);
  if (!pdfUrl) {
    return {
      probe_id: 'P-17',
      source: 'RHP PDF parsing — sample',
      url_or_endpoint: LIST_URL,
      fetch_method: 'GET (discovery)',
      headers_or_cookies_required: [],
      status_code: list.status,
      response_type: 'EMPTY',
      fields_found: [],
      fields_missing: ['pdf url'],
      sample_record: '',
      parsing_difficulty: 'Hard',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Immutable',
      status: 'YELLOW',
      recommended_action: 'PDF discovery selector may have drifted.',
      fallback_source: 'manual',
      ran_at_utc: ctx.nowIso,
      latency_ms: list.latency_ms,
      notes: 'No PDF URL discovered.',
    };
  }
  const bin = await httpGetBinary(pdfUrl, { headers: { Referer: LIST_URL } });
  if (!bin.ok || !bin.buffer) {
    return {
      probe_id: 'P-17',
      source: 'RHP PDF parsing — sample',
      url_or_endpoint: pdfUrl,
      fetch_method: 'GET (binary)',
      headers_or_cookies_required: [],
      status_code: bin.status,
      response_type: 'ERROR',
      fields_found: [],
      fields_missing: ['pdf bytes'],
      sample_record: '',
      parsing_difficulty: 'Hard',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'Immutable',
      status: 'RED',
      recommended_action: 'PDF download failed.',
      fallback_source: 'manual',
      ran_at_utc: ctx.nowIso,
      latency_ms: list.latency_ms + bin.latency_ms,
      notes: `Download status=${bin.status}`,
    };
  }
  mkdirSync(join(ctx.outDir, '.scratch'), { recursive: true });
  const pdfLocal = join(ctx.outDir, '.scratch', 'p17.pdf');
  const outJson = join(ctx.outDir, '.scratch', 'p17.json');
  writeFileSync(pdfLocal, bin.buffer);
  let parseOk = false;
  let parsed: any = null;
  let pyErr = '';
  try {
    execFileSync(py, [join('scripts', 'probes', 'lib', 'pdf-parse.py'), 'rhp', pdfLocal, outJson], { stdio: 'pipe' });
    parseOk = true;
  } catch (e: any) {
    pyErr = String(e?.stderr ?? e?.message ?? e);
  }
  if (existsSync(outJson)) {
    try {
      parsed = JSON.parse(readFileSync(outJson, 'utf8'));
    } catch {
      parsed = null;
    }
  }
  if (parsed) writeSample(ctx.samplesDir, 'sample-rhp-extracted.json', JSON.stringify(parsed, null, 2));
  const hasFields = !!parsed?.ok;
  const status = classify({
    ok: parseOk,
    hasRequiredFields: hasFields,
    parsingDifficulty: 'Hard',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked: false,
  });
  return {
    probe_id: 'P-17',
    source: 'RHP PDF parsing — sample',
    url_or_endpoint: pdfUrl,
    fetch_method: 'GET + python pdfplumber/camelot',
    headers_or_cookies_required: [],
    status_code: bin.status,
    response_type: 'PDF',
    fields_found: parsed ? ['cover_text_first_500', 'page_count', 'tables_first_pages'] : [],
    fields_missing: parsed ? [] : ['parse-output'],
    sample_record: truncate(JSON.stringify(parsed ?? { pyErr }, null, 2), 800),
    parsing_difficulty: 'Hard',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Immutable',
    status,
    recommended_action: status === 'GREEN' || status === 'YELLOW'
      ? 'Phase 5 RHP intel viable; expand parsers per document section.'
      : 'Manual entry for top issues; revisit parser strategy.',
    fallback_source: 'manual',
    ran_at_utc: ctx.nowIso,
    latency_ms: list.latency_ms + bin.latency_ms,
    notes: pyErr ? `python-error: ${pyErr.slice(0, 200)}` : `parse-ok=${parseOk}`,
  };
};
