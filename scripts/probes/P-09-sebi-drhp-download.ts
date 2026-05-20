import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpGet, httpGetBinary, truncate } from './lib/http.ts';
import { classify, ensureDir } from './lib/reporter.ts';
import type { ProbeFn, ProbeResult } from './lib/types.ts';

const LIST_URL = 'https://www.sebi.gov.in/filings/public-issues.html';

// Lazy regex: capture the first .pdf URL inside the public-issues page.
function findFirstPdfUrl(html: string): string | null {
  const re = /href\s*=\s*"([^"]*\.pdf[^"]*)"/i;
  const m = html.match(re);
  if (!m) return null;
  let url = m[1]!;
  if (url.startsWith('/')) url = 'https://www.sebi.gov.in' + url;
  if (!/^https?:\/\//i.test(url)) url = 'https://www.sebi.gov.in/' + url;
  return url;
}

export const probe: ProbeFn = async (ctx): Promise<ProbeResult> => {
  const list = await httpGet(LIST_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: 'https://www.sebi.gov.in/',
    },
  });
  if (!list.ok) {
    return {
      probe_id: 'P-09',
      source: 'SEBI — DRHP PDF Download',
      url_or_endpoint: LIST_URL,
      fetch_method: 'GET (discovery) + GET (download)',
      headers_or_cookies_required: ['User-Agent', 'Referer'],
      status_code: list.status,
      response_type: 'BLOCKED',
      fields_found: [],
      fields_missing: ['pdf url'],
      sample_record: truncate(list.body, 400),
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'PDFs are immutable once published',
      status: 'RED',
      recommended_action: 'List page unreachable; cannot validate PDF pipeline. Re-check after P-08 GREEN.',
      fallback_source: 'P-10',
      ran_at_utc: ctx.nowIso,
      latency_ms: list.latency_ms,
      notes: `Listing fetch failed: status ${list.status}, ${list.error ?? ''}`,
    };
  }
  const pdfUrl = findFirstPdfUrl(list.body);
  if (!pdfUrl) {
    return {
      probe_id: 'P-09',
      source: 'SEBI — DRHP PDF Download',
      url_or_endpoint: LIST_URL,
      fetch_method: 'GET (discovery) + GET (download)',
      headers_or_cookies_required: ['User-Agent', 'Referer'],
      status_code: list.status,
      response_type: 'EMPTY',
      fields_found: [],
      fields_missing: ['pdf url'],
      sample_record: truncate(list.body, 400),
      parsing_difficulty: 'Easy',
      anti_bot_risk: 'Low',
      legal_tos_risk: 'Low',
      freshness_or_update_frequency: 'PDFs are immutable',
      status: 'YELLOW',
      recommended_action: 'No PDF URL discovered in HTML; selector may have drifted.',
      fallback_source: 'P-10',
      ran_at_utc: ctx.nowIso,
      latency_ms: list.latency_ms,
      notes: 'No <a href=...pdf> matched.',
    };
  }
  const bin = await httpGetBinary(pdfUrl, { headers: { Referer: LIST_URL } });
  let blocked = false;
  let notes = `PDF url: ${pdfUrl}`;
  let pdfOk = false;
  let sample = '';
  if (bin.ok && bin.buffer && bin.bytes > 1024) {
    const first4 = bin.buffer.subarray(0, 4).toString('ascii');
    pdfOk = first4 === '%PDF';
    const sha = createHash('sha256').update(bin.buffer).digest('hex');
    ensureDir(ctx.samplesDir);
    writeFileSync(
      join(ctx.samplesDir, 'sample-drhp.pdf-meta.json'),
      JSON.stringify({ url: pdfUrl, bytes: bin.bytes, sha256: sha, magic: first4 }, null, 2)
    );
    sample = JSON.stringify({ url: pdfUrl, bytes: bin.bytes, sha256: sha, magic: first4 }, null, 2);
    notes += ` · bytes=${bin.bytes} sha256=${sha.slice(0, 12)}…`;
  } else {
    blocked = !bin.ok;
    notes += ` · download failed: status=${bin.status} bytes=${bin.bytes}`;
  }
  const status = classify({
    ok: pdfOk,
    hasRequiredFields: pdfOk,
    parsingDifficulty: 'Easy',
    legalToSRisk: 'Low',
    antiBotRisk: 'Low',
    blocked,
  });
  return {
    probe_id: 'P-09',
    source: 'SEBI — DRHP PDF Download',
    url_or_endpoint: pdfUrl,
    fetch_method: 'GET (binary)',
    headers_or_cookies_required: ['User-Agent', 'Referer'],
    status_code: bin.status,
    response_type: pdfOk ? 'PDF' : 'ERROR',
    fields_found: pdfOk ? ['%PDF magic', 'bytes'] : [],
    fields_missing: pdfOk ? [] : ['valid pdf magic'],
    sample_record: sample,
    parsing_difficulty: 'Easy',
    anti_bot_risk: 'Low',
    legal_tos_risk: 'Low',
    freshness_or_update_frequency: 'Immutable once published',
    status,
    recommended_action: status === 'GREEN' ? 'PDF download pipeline viable; proceed to Phase 5 parsing.' : 'Investigate; fall back to NSE/BSE DRHP archive (P-10).',
    fallback_source: 'P-10',
    ran_at_utc: ctx.nowIso,
    latency_ms: list.latency_ms + bin.latency_ms,
    notes,
  };
};
