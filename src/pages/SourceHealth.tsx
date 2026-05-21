import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Snapshots } from '@/lib/loadSnapshots';
import { relativeTime } from '@/lib/format';
import type { SliceResult } from '@/types/snapshot';

const SLICE_TONE: Record<SliceResult['source_state'], 'live' | 'awaiting' | 'unavailable' | 'default'> = {
  live: 'live',
  empty: 'awaiting',
  partial: 'awaiting',
  failed: 'unavailable',
  missing: 'unavailable',
  skipped: 'default',
};

const SLICE_LABEL: Record<string, string> = {
  sebi: '2A · SEBI bridge',
  nse: '2B · NSE IPO master',
  listing: '2C · Listing performance',
  sector: '2C · Sector map',
  subscription: '2D · Subscription',
  'source-audit': '2E · Source audit',
  '2E-source-audit': '2E · Source audit',
};

// Healthy at the top, problematic at the bottom. Re-sort the ingest slice
// table so the first thing the eye lands on is the GREEN row, not whichever
// slice happens to come back amber/red first in dependency order.
const SLICE_STATE_ORDER: Record<SliceResult['source_state'], number> = {
  live: 0,
  partial: 1,
  empty: 2,
  skipped: 3,
  failed: 4,
  missing: 5,
};

export function SourceHealth() {
  const { totals, probes, generated_at_utc, ingest_slices } = Snapshots.sourceHealth;
  const slices = [...(ingest_slices ?? [])].sort(
    (a, b) => SLICE_STATE_ORDER[a.source_state] - SLICE_STATE_ORDER[b.source_state]
  );
  const groups = {
    GREEN: probes.filter((p) => p.status === 'GREEN'),
    YELLOW: probes.filter((p) => p.status === 'YELLOW'),
    RED: probes.filter((p) => p.status === 'RED'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Source Health</h1>
        <p className="mt-1 text-sm text-slate-400">
          Per-probe health from the latest Phase 0 / 0.1 run · Refreshed {relativeTime(generated_at_utc)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Tile tone="live" label="GREEN" value={totals.green} />
        <Tile tone="awaiting" label="YELLOW" value={totals.yellow} />
        <Tile tone="unavailable" label="RED" value={totals.red} />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Ingest pipeline</CardTitle>
            <CardDescription>
              Per-slice outcomes from the latest <code className="text-[11px] text-slate-400">npm run ingest</code> run
              {slices.length > 0 && ` · ${slices.length} slices`}
              <span className="mt-1 block text-[11px] text-slate-500">
                Empty / skipped can be healthy — they mean "no upstream data yet", not "broken".
              </span>
            </CardDescription>
          </div>
          <Badge tone="info">{slices.length || 'none'}</Badge>
        </CardHeader>
        <CardContent>
          {slices.length === 0 ? (
            <p className="text-sm text-slate-500">No ingest pipeline data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-800/60">
                    <th className="px-3 py-2 text-left font-medium">Slice</th>
                    <th className="px-3 py-2 text-left font-medium">State</th>
                    <th className="px-3 py-2 text-right font-medium">+added</th>
                    <th className="px-3 py-2 text-right font-medium">~updated</th>
                    <th className="px-3 py-2 text-right font-medium">=preserved</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {slices.map((s) => (
                    <tr key={s.name} className="hover:bg-slate-900/40">
                      <td className="px-3 py-2 text-slate-200">{SLICE_LABEL[s.name] ?? s.name}</td>
                      <td className="px-3 py-2">
                        <Badge tone={SLICE_TONE[s.source_state] ?? 'default'}>{s.source_state}</Badge>
                      </td>
                      <td className="px-3 py-2 num text-right text-slate-300">{s.counts.added}</td>
                      <td className="px-3 py-2 num text-right text-slate-300">{s.counts.updated}</td>
                      <td className="px-3 py-2 num text-right text-slate-300">{s.counts.preserved}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 max-w-md truncate">
                        {s.errors.length > 0 ? (
                          <Tooltip
                            content={
                              <div className="space-y-1">
                                {s.errors.slice(0, 6).map((e, i) => (
                                  <div key={i} className="text-[11px] text-slate-300">· {e}</div>
                                ))}
                                {s.errors.length > 6 && (
                                  <div className="text-[10px] text-slate-500">+ {s.errors.length - 6} more</div>
                                )}
                              </div>
                            }
                          >
                            <span className="cursor-help underline decoration-rose-400/40 decoration-dotted">
                              {s.notes}
                            </span>
                          </Tooltip>
                        ) : (
                          <span title={s.notes}>{s.notes}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(['GREEN', 'YELLOW', 'RED'] as const).map((g) => (
        <Card key={g}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>{g} · {groups[g].length}</CardTitle>
              <CardDescription>
                {g === 'GREEN' && 'Probes returning expected data; safe to consume.'}
                {g === 'YELLOW' && 'Reachable but degraded; usable with caveats.'}
                {g === 'RED' && 'Currently unreachable or blocked; fallbacks engaged.'}
              </CardDescription>
            </div>
            <Badge tone={g === 'GREEN' ? 'live' : g === 'YELLOW' ? 'awaiting' : 'unavailable'}>{g}</Badge>
          </CardHeader>
          <CardContent>
            {groups[g].length === 0 ? (
              <p className="text-sm text-slate-500">No probes in this state.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-slate-800/60">
                      <th className="px-3 py-2 text-left font-medium">Probe</th>
                      <th className="px-3 py-2 text-left font-medium">Source</th>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Last run</th>
                      <th className="px-3 py-2 text-left font-medium">Latency</th>
                      <th className="px-3 py-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {groups[g].map((p) => (
                      <tr key={p.probe_id} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2 text-slate-200">{p.probe_id}</td>
                        <td className="px-3 py-2 text-slate-300">{p.source}</td>
                        <td className="px-3 py-2 num text-slate-300">{p.status_code ?? '—'}</td>
                        <td className="px-3 py-2 num text-slate-400">{p.response_type}</td>
                        <td className="px-3 py-2 num text-slate-400">{relativeTime(p.ran_at_utc)}</td>
                        <td className="px-3 py-2 num text-slate-400">{p.latency_ms} ms</td>
                        <td className="px-3 py-2 text-[11px] text-slate-500 max-w-md truncate" title={p.notes}>{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Tile({ tone, label, value }: { tone: 'live' | 'awaiting' | 'unavailable'; label: string; value: number }) {
  const ring = {
    live: 'ring-emerald-500/30 from-emerald-500/15',
    awaiting: 'ring-amber-500/30 from-amber-500/15',
    unavailable: 'ring-rose-500/30 from-rose-500/15',
  }[tone];
  return (
    <div className={`card-surface relative overflow-hidden bg-gradient-to-br ${ring} to-transparent ring-1`}>
      <div className="px-5 py-4">
        <div className="label-muted">{label}</div>
        <div className="num mt-1 text-3xl font-bold text-slate-100">{value}</div>
      </div>
    </div>
  );
}
