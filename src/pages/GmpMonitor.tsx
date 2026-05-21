import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StateBadge } from '@/components/chrome/StateBadge';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle } from 'lucide-react';

export function GmpMonitor() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GMP / Grey Market Monitor</h1>
          <p className="mt-1 text-sm text-slate-400">
            Indicative grey-market premium from multiple aggregators, with explicit dispersion and caveats.
          </p>
        </div>
        <StateBadge state="awaiting" />
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            GMP is indicative · subject to high dispersion
          </CardTitle>
          <CardDescription>Grey-market premium is not exchange-traded, not SEBI-regulated, and varies across aggregators.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            We will show GMP as a band (average ± dispersion across 3–5 sources), not as a single number, and always with a
            source-pill per aggregator and a freshness chip.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Current snapshot
            </CardTitle>
            <CardDescription>No GMP source GREEN at v1 — module ships in "awaiting" state.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {[
              { name: 'IPOWatch', probe: 'P-19', status: 'YELLOW' },
              { name: 'Chittorgarh', probe: 'P-20', status: 'RED' },
              { name: 'IPO Central', probe: 'P-21', status: 'RED' },
              { name: 'InvestorGain', probe: 'P-22', status: 'YELLOW' },
            ].map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
                <span>
                  <div className="text-sm text-slate-200">{s.name}</div>
                  <div className="text-[11px] text-slate-500">{s.probe}</div>
                </span>
                <Badge tone={s.status === 'GREEN' ? 'live' : s.status === 'YELLOW' ? 'awaiting' : 'unavailable'}>{s.status}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-slate-500">
            GMP module activates when ≥1 source turns GREEN. Aggregator targets are scoped to public landing pages,
            not authenticated APIs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
