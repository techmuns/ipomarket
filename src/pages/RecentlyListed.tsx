import { Link } from 'react-router-dom';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/chrome/StateBadge';
import { formatDate, formatPct, formatRupee } from '@/lib/format';
import { ListingGainBar } from '@/components/recently/ListingGainBar';
import { FadeScatter } from '@/components/recently/FadeScatter';

export function RecentlyListed() {
  const rows = Snapshots.master.ipos
    .filter((i) => Snapshots.listingPerformance.by_ipo[i.id])
    .map((i) => ({
      ipo: i,
      perf: Snapshots.listingPerformance.by_ipo[i.id]!,
    }));

  const winners = rows.filter((r) => (r.perf.listing_gain_pct ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recently Listed / Gain-Loss</h1>
          <p className="mt-1 text-sm text-slate-400">
            Listing day performance and post-listing fade tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{rows.length} listed</Badge>
          <Badge tone="live">{winners} positive</Badge>
          <StateBadge state="manual" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListingGainBar />
        <FadeScatter />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listings table</CardTitle>
          <CardDescription>Issue price · listing close · current · gains. Synthetic mock seed for Phase 1.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No listings in current snapshot.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-800/60">
                    <th className="px-3 py-2 text-left font-medium">Company</th>
                    <th className="px-3 py-2 text-left font-medium">Listed</th>
                    <th className="px-3 py-2 text-right font-medium">Issue price</th>
                    <th className="px-3 py-2 text-right font-medium">Listing close</th>
                    <th className="px-3 py-2 text-right font-medium">Current</th>
                    <th className="px-3 py-2 text-right font-medium">Listing gain</th>
                    <th className="px-3 py-2 text-right font-medium">Current gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.map(({ ipo, perf }) => (
                    <tr key={ipo.id} className="hover:bg-slate-900/40">
                      <td className="px-3 py-2 text-slate-200">
                        <Link to={`/ipo/${ipo.slug}`} className="hover:underline">{ipo.short_name ?? ipo.name}</Link>
                      </td>
                      <td className="px-3 py-2 num text-slate-400">{ipo.listing_date ? formatDate(ipo.listing_date) : '—'}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{formatRupee(perf.issue_price)}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{formatRupee(perf.listing_close)}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{formatRupee(perf.current_price)}</td>
                      <td className={`px-3 py-2 num text-right ${(perf.listing_gain_pct ?? 0) >= 0 ? 'num-pos' : 'num-neg'}`}>
                        {formatPct(perf.listing_gain_pct, { sign: true })}
                      </td>
                      <td className={`px-3 py-2 num text-right ${(perf.current_gain_pct ?? 0) >= 0 ? 'num-pos' : 'num-neg'}`}>
                        {formatPct(perf.current_gain_pct, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
