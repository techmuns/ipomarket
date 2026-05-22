// Phase 0 probe runner. CLI: `tsx scripts/probes/run.ts [--group A|B|C|D|E|F|G] [--probe P-01]`
// With no flags, runs all groups in order A → B → C → D → E → F → G.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, writeResults } from './lib/reporter.ts';
import { PROBE_GROUPS, type ProbeFn, type ProbeContext, type ProbeResult, type ProbeGroup } from './lib/types.ts';

interface ProbeModule {
  probe: ProbeFn;
}

const REGISTRY: Record<string, () => Promise<ProbeModule>> = {
  'P-01': () => import('./P-01-nse-current.ts'),
  'P-02': () => import('./P-02-nse-upcoming.ts'),
  'P-03': () => import('./P-03-nse-past.ts'),
  'P-04': () => import('./P-04-nse-subscription.ts'),
  'P-05': () => import('./P-05-nse-emerge-sme.ts'),
  'P-06': () => import('./P-06-bse-mainboard.ts'),
  'P-06b': () => import('./P-06b-bse-sme.ts'),
  'P-07': () => import('./P-07-bse-subscription.ts'),
  'P-08': () => import('./P-08-sebi-publicissues.ts'),
  'P-08b': () => import('./P-08b-sebi-processing.ts'),
  'P-09': () => import('./P-09-sebi-drhp-download.ts'),
  'P-10': () => import('./P-10-exchange-drhp.ts'),
  'P-11': () => import('./P-11-registrar-resolution.ts'),
  'P-12': () => import('./P-12-mufg-intime.ts'),
  'P-13': () => import('./P-13-kfintech.ts'),
  'P-14': () => import('./P-14-bigshare.ts'),
  'P-14b': () => import('./P-14b-maashitla.ts'),
  'P-15': () => import('./P-15-nse-historical.ts'),
  'P-15b': () => import('./P-15b-nse-quote.ts'),
  'P-16': () => import('./P-16-ticker-mapping.ts'),
  'P-17': () => import('./P-17-rhp-pdf-parse.ts'),
  'P-18': () => import('./P-18-anchor-pdf-parse.ts'),
  'P-19': () => import('./P-19-gmp-ipowatch.ts'),
  'P-20': () => import('./P-20-gmp-chittorgarh.ts'),
  'P-21': () => import('./P-21-gmp-ipocentral.ts'),
  'P-22': () => import('./P-22-gmp-investorgain.ts'),
  'P-23a': () => import('./P-23a-broker-zerodha.ts'),
  'P-23b': () => import('./P-23b-broker-upstox.ts'),
  'P-24': () => import('./P-24-sector-classification.ts'),
  'P-25': () => import('./P-25-chittorgarh-accessibility.ts'),
  'P-26': () => import('./P-26-chittorgarh-detail-extract.ts'),
  'P-27': () => import('./P-27-broker-zerodha-refresh.ts'),
  'P-28': () => import('./P-28-broker-upstox-refresh.ts'),
};

function parseArgs() {
  const args = process.argv.slice(2);
  let group: ProbeGroup | null = null;
  let probe: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--group' && args[i + 1]) {
      group = args[i + 1] as ProbeGroup;
      i++;
    } else if (args[i] === '--probe' && args[i + 1]) {
      probe = args[i + 1]!;
      i++;
    }
  }
  return { group, probe };
}

function pickIds(group: ProbeGroup | null, probe: string | null): string[] {
  if (probe) return [probe];
  if (group) return [...PROBE_GROUPS[group]];
  // All groups in plan-defined order.
  return [
    ...PROBE_GROUPS.A,
    ...PROBE_GROUPS.B,
    ...PROBE_GROUPS.C,
    ...PROBE_GROUPS.D,
    ...PROBE_GROUPS.E,
    ...PROBE_GROUPS.F,
    ...PROBE_GROUPS.G,
    ...PROBE_GROUPS.H,
    ...PROBE_GROUPS.I,
    ...PROBE_GROUPS.J,
  ];
}

async function main() {
  const { group, probe } = parseArgs();
  const ids = pickIds(group, probe);

  const repoRoot = process.cwd();
  const outDir = join(repoRoot, 'phase-0');
  const samplesDir = join(outDir, 'samples');
  ensureDir(outDir);
  ensureDir(samplesDir);
  mkdirSync(join(outDir, '.scratch'), { recursive: true });

  const ctx: ProbeContext = {
    outDir,
    samplesDir,
    nowIso: new Date().toISOString(),
  };

  const results: ProbeResult[] = [];
  for (const id of ids) {
    const loader = REGISTRY[id];
    if (!loader) {
      console.error(`unknown probe id: ${id}`);
      continue;
    }
    process.stdout.write(`[probe] ${id} … `);
    try {
      const mod = await loader();
      const result = await mod.probe(ctx);
      results.push(result);
      console.log(`${result.status} (${result.status_code ?? '-'} in ${result.latency_ms}ms)`);
    } catch (e: any) {
      console.log(`THREW: ${e?.message ?? e}`);
      results.push({
        probe_id: id,
        source: '(uncaught error)',
        url_or_endpoint: '',
        fetch_method: '',
        headers_or_cookies_required: [],
        status_code: null,
        response_type: 'ERROR',
        fields_found: [],
        fields_missing: [],
        sample_record: String(e?.stack ?? e),
        parsing_difficulty: 'Hard',
        anti_bot_risk: 'Low',
        legal_tos_risk: 'Low',
        freshness_or_update_frequency: '',
        status: 'RED',
        recommended_action: 'Debug probe harness error.',
        fallback_source: 'none',
        ran_at_utc: ctx.nowIso,
        latency_ms: 0,
        notes: `Uncaught error: ${e?.message ?? e}`,
      });
    }
  }

  writeResults(outDir, results);
  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const r of results) counts[r.status]++;
  console.log(`\nDone. GREEN=${counts.GREEN} YELLOW=${counts.YELLOW} RED=${counts.RED}`);
  console.log(`Artifacts in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
