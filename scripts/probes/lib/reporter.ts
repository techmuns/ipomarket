import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProbeResult, ProbeStatus } from './types.ts';

const STATUS_BADGE: Record<ProbeStatus, string> = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
};

export function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

export function writeSample(samplesDir: string, fileName: string, content: string | Buffer) {
  ensureDir(samplesDir);
  writeFileSync(join(samplesDir, fileName), content);
}

export function writeResults(outDir: string, results: ProbeResult[]) {
  ensureDir(outDir);
  writeFileSync(
    join(outDir, 'source-probe-results.json'),
    JSON.stringify(results, null, 2) + '\n'
  );
  const summary = Object.fromEntries(results.map((r) => [r.probe_id, r.status]));
  writeFileSync(
    join(outDir, 'source-status-summary.json'),
    JSON.stringify(summary, null, 2) + '\n'
  );
  writeFileSync(join(outDir, 'source-probe-report.md'), renderMarkdown(results));
}

function renderMarkdown(results: ProbeResult[]): string {
  const byStatus = (s: ProbeStatus) => results.filter((r) => r.status === s);
  const lines: string[] = [];
  lines.push('# Phase 0 — Source Probe Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Status Summary');
  lines.push('');
  lines.push(`- GREEN: ${byStatus('GREEN').length}`);
  lines.push(`- YELLOW: ${byStatus('YELLOW').length}`);
  lines.push(`- RED: ${byStatus('RED').length}`);
  lines.push('');
  lines.push('| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(
      `| ${r.probe_id} | ${r.source} | ${STATUS_BADGE[r.status]} | ${r.status_code ?? '-'} | ${r.response_type} | ${r.latency_ms} | ${r.recommended_action} |`
    );
  }
  lines.push('');
  lines.push('## Per-probe detail');
  for (const r of results) {
    lines.push('');
    lines.push(`### ${r.probe_id} — ${r.source} — ${STATUS_BADGE[r.status]}`);
    lines.push('');
    lines.push(`- URL: \`${r.url_or_endpoint}\``);
    lines.push(`- Method: ${r.fetch_method}`);
    lines.push(`- Headers/cookies required: ${r.headers_or_cookies_required.join(', ') || '(none)'}`);
    lines.push(`- Status code: ${r.status_code ?? '(no response)'}`);
    lines.push(`- Response type: ${r.response_type}`);
    lines.push(`- Fields found: ${r.fields_found.join(', ') || '(none)'}`);
    lines.push(`- Fields missing: ${r.fields_missing.join(', ') || '(none)'}`);
    lines.push(`- Parsing difficulty: ${r.parsing_difficulty}`);
    lines.push(`- Anti-bot risk: ${r.anti_bot_risk}`);
    lines.push(`- Legal/ToS risk: ${r.legal_tos_risk}`);
    lines.push(`- Update frequency: ${r.freshness_or_update_frequency}`);
    lines.push(`- Recommended action: ${r.recommended_action}`);
    lines.push(`- Fallback: ${r.fallback_source}`);
    lines.push(`- Latency: ${r.latency_ms} ms`);
    lines.push(`- Ran at (UTC): ${r.ran_at_utc}`);
    if (r.notes) {
      lines.push('');
      lines.push(`> ${r.notes}`);
    }
    if (r.sample_record) {
      lines.push('');
      lines.push('```');
      lines.push(r.sample_record);
      lines.push('```');
    }
  }
  return lines.join('\n') + '\n';
}

export function classify(input: {
  ok: boolean;
  hasRequiredFields: boolean;
  parsingDifficulty: 'Easy' | 'Medium' | 'Hard';
  legalToSRisk: 'Low' | 'Medium' | 'High';
  antiBotRisk: 'Low' | 'Medium' | 'High';
  blocked: boolean;
}): ProbeStatus {
  if (input.blocked || !input.ok) return 'RED';
  if (input.legalToSRisk === 'High') return 'RED';
  if (!input.hasRequiredFields) return 'RED';
  if (input.parsingDifficulty === 'Hard' || input.antiBotRisk === 'High') return 'YELLOW';
  if (input.legalToSRisk === 'Medium') return 'YELLOW';
  return 'GREEN';
}
