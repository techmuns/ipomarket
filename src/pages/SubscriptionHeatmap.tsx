import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snapshots } from '@/lib/loadSnapshots';
import { subscriptionQualityScore, totalSubscriptionTimes } from '@/lib/derive';
import { formatTimes } from '@/lib/format';

export function SubscriptionHeatmap() {
  const rows = Snapshots.master.ipos
    .map((ipo) => ({ ipo, sub: Snapshots.subscriptions.by_ipo[ipo.id] }))
    .filter((r) => r.sub != null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Heatmap</h1>
        <p className="mt-1 text-sm text-slate-400">
          Demand structure across every IPO with bidding activity. QIB-led vs retail-led, plus our composite quality score.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-slate-500">No subscription data in current snapshot.</p>
            </CardContent>
          </Card>
        ) : rows.map(({ ipo, sub }) => {
          const qib = sub!.rows.find((r) => r.category === 'QIB')?.times ?? 0;
          const nii = sub!.rows.find((r) => r.category === 'NII')?.times ?? 0;
          const retail = sub!.rows.find((r) => r.category === 'Retail')?.times ?? 0;
          const tot = totalSubscriptionTimes(sub) ?? 0;
          const cap = Math.max(qib, nii, retail, 1);
          const quality = subscriptionQualityScore(sub) ?? 0;
          return (
            <Card key={ipo.id} className="card-hover">
              <CardHeader className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    <Link to={`/ipo/${ipo.slug}`} className="hover:underline">{ipo.short_name ?? ipo.name}</Link>
                  </CardTitle>
                  <CardDescription>{ipo.segment.toUpperCase()} · {ipo.status}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="num text-2xl font-semibold text-emerald-300">{formatTimes(tot)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">total</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  <Bar label="QIB" value={qib} cap={cap} colorClass="bg-indigo-500" />
                  <Bar label="NII" value={nii} cap={cap} colorClass="bg-violet-500" />
                  <Bar label="Retail" value={retail} cap={cap} colorClass="bg-emerald-500" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
                  <div>
                    <div className="label-muted">Subscription Quality</div>
                    <div className="num text-sm text-slate-200">{quality}/100</div>
                  </div>
                  <Badge tone={quality >= 70 ? 'live' : quality >= 40 ? 'awaiting' : 'unavailable'}>
                    {quality >= 70 ? 'QIB-led' : quality >= 40 ? 'Mixed' : 'Retail-led'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, value, cap, colorClass }: { label: string; value: number; cap: number; colorClass: string }) {
  const w = Math.max((value / cap) * 100, 2);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="num text-slate-200">{value.toFixed(2)}×</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-800/80">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
