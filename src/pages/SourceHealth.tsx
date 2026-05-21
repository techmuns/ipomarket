import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snapshots } from '@/lib/loadSnapshots';
import { relativeTime } from '@/lib/format';

export function SourceHealth() {
  const { totals, probes, generated_at_utc } = Snapshots.sourceHealth;
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
