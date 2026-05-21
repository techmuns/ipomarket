import { KpiCard } from '@/components/pulse/KpiCard';
import { SectorHeatmap } from '@/components/pulse/SectorHeatmap';
import { SubscriptionLeaderboard } from '@/components/pulse/SubscriptionLeaderboard';
import { Snapshots } from '@/lib/loadSnapshots';
import { formatCr, formatPct } from '@/lib/format';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export function MarketPulse() {
  const ipos = Snapshots.master.ipos;
  const open = ipos.filter((i) => i.status === 'open').length;
  const upcoming = ipos.filter((i) => i.status === 'upcoming').length;
  const closed = ipos.filter((i) => i.status === 'closed').length;
  const listed = Object.values(Snapshots.listingPerformance.by_ipo);
  const raisedYtd = ipos.reduce((sum, i) => sum + (i.issue_size_cr ?? 0), 0);
  const avgListingGain =
    listed.length > 0
      ? listed.reduce((s, p) => s + (p.listing_gain_pct ?? 0), 0) / listed.length
      : null;
  const hitRate =
    listed.length > 0
      ? (listed.filter((p) => (p.listing_gain_pct ?? 0) > 0).length / listed.length) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Pulse</h1>
        <p className="mt-1 text-sm text-slate-400">
          Buy-side view of the Indian IPO market — live + upcoming + recently listed. Phase 1 mock data with source labels.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Open IPOs" value={open} hint={`+${upcoming} upcoming · ${closed} listing soon`} accent="emerald" trend="up" trendLabel="snapshot" />
        <KpiCard label="₹ raised (sample)" value={formatCr(raisedYtd)} hint="across IPOs in current snapshot" accent="indigo" />
        <KpiCard
          label="Avg listing gain"
          value={avgListingGain != null ? formatPct(avgListingGain, { sign: true }) : '—'}
          hint={listed.length > 0 ? `over ${listed.length} listed` : 'awaiting fresh data'}
          trend={avgListingGain != null ? (avgListingGain > 0 ? 'up' : 'down') : 'flat'}
          accent="amber"
        />
        <KpiCard
          label="Hit rate"
          value={hitRate != null ? formatPct(hitRate) : '—'}
          hint="listing gain > 0 (Phase 5 metric)"
          accent="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectorHeatmap />
        </div>
        <SubscriptionLeaderboard />
      </div>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle>What's happening</CardTitle>
            <CardDescription>Module quick-links and current data state</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { to: '/open', title: 'Open & Upcoming', desc: `${open} open · ${upcoming} upcoming` },
              { to: '/listing-soon', title: 'Listing Soon', desc: `${closed} closed, awaiting listing` },
              { to: '/recently-listed', title: 'Recently Listed', desc: `${listed.length} listed (synthetic seed)` },
              { to: '/subscription', title: 'Subscription Heatmap', desc: 'Per-IPO QIB/NII/Retail mix' },
              { to: '/pipeline', title: 'DRHP Pipeline', desc: `${Snapshots.sebiPipeline.entries.length} SEBI filings · live` },
              { to: '/source-health', title: 'Source Health', desc: `${Snapshots.sourceHealth.totals.green}G / ${Snapshots.sourceHealth.totals.yellow}Y / ${Snapshots.sourceHealth.totals.red}R probes` },
            ].map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="group flex items-start justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 hover:border-slate-700"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">{m.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{m.desc}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
