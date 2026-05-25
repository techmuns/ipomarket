import { Link } from 'react-router-dom';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/chrome/StateBadge';
import { formatDate, formatPct, formatRupee } from '@/lib/format';
import { ListingGainBar } from '@/components/recently/ListingGainBar';
import { FadeScatter } from '@/components/recently/FadeScatter';
import { CompletenessChip } from '@/components/ipo/CompletenessChip';
import { Info } from 'lucide-react';

export function RecentlyListed() {
  // Drive the table off lifecycle status, left-joining listing-performance.
  // A listed IPO whose post-listing price data we don't have yet (e.g. OnEMI,
  // which has no ipo-listing-performance row) still belongs here — it renders
  // with "—" gains + a "listing data pending" hint rather than vanishing.
  const rows = Snapshots.master.ipos
    .filter((i) => i.status === 'listed')
    .map((i) => ({
      ipo: i,
      perf: Snapshots.listingPerformance.by_ipo[i.id] ?? null,
    }));

  const withPerf = rows.filter((r) => r.perf);
  const winners = withPerf.filter((r) => (r.perf!.listing_gain_pct ?? 0) > 0).length;
  const allManual = withPerf.length > 0 && withPerf.every((r) => r.perf!.state === 'manual');

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

      {allManual && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-amber-200">Mock seed in use</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-amber-200/80">
                Listing performance currently uses mock seed rows until official BSE/NSE listing data is mapped.
                Per-row <span className="font-medium">MANUAL SEED</span> badges below repeat the same signal.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListingGainBar />
        <FadeScatter />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listings table</CardTitle>
          <CardDescription>Issue price · listing close · current · gains. Listed IPOs without post-listing price data show "—" with a pending hint.</CardDescription>
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
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <CompletenessChip ipo={ipo} audit={Snapshots.sourceAudit.by_ipo[ipo.id]} />
                          {!perf && <span className="text-[11px] text-slate-500">listing data pending</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 num text-slate-400">{ipo.listing_date ? formatDate(ipo.listing_date) : '—'}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{perf ? formatRupee(perf.issue_price) : '—'}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{perf ? formatRupee(perf.listing_close) : '—'}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{perf ? formatRupee(perf.current_price) : '—'}</td>
                      <td className={`px-3 py-2 num text-right ${perf ? ((perf.listing_gain_pct ?? 0) >= 0 ? 'num-pos' : 'num-neg') : 'text-slate-500'}`}>
                        {perf ? formatPct(perf.listing_gain_pct, { sign: true }) : '—'}
                      </td>
                      <td className={`px-3 py-2 num text-right ${perf ? ((perf.current_gain_pct ?? 0) >= 0 ? 'num-pos' : 'num-neg') : 'text-slate-500'}`}>
                        {perf ? formatPct(perf.current_gain_pct, { sign: true }) : '—'}
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
