import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StateBadge } from '@/components/chrome/StateBadge';
import { Snapshots } from '@/lib/loadSnapshots';
import { totalSubscriptionTimes } from '@/lib/derive';
import { formatTimes } from '@/lib/format';

export function SubscriptionLeaderboard() {
  const rows = Snapshots.master.ipos
    .map((ipo) => ({
      ipo,
      sub: Snapshots.subscriptions.by_ipo[ipo.id],
    }))
    .filter((r) => r.sub != null)
    .map((r) => ({
      ipo: r.ipo,
      total: totalSubscriptionTimes(r.sub) ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const maxTotal = rows[0]?.total ?? 1;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Subscription leaderboard</CardTitle>
          <CardDescription>Top-N IPOs by total times-subscribed</CardDescription>
        </div>
        <StateBadge state="live" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No active IPOs in snapshot.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map(({ ipo, total }) => {
              const w = Math.max((total / maxTotal) * 100, 4);
              return (
                <li key={ipo.id}>
                  <Link to={`/ipo/${ipo.slug}`} className="block rounded-md border border-slate-800/60 bg-slate-900/40 p-3 hover:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-200">{ipo.short_name ?? ipo.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">{ipo.segment} · {ipo.status}</div>
                      </div>
                      <div className="num text-lg font-semibold text-emerald-300">{formatTimes(total)}</div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-800/80">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" style={{ width: `${w}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
