import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StateBadge } from '@/components/chrome/StateBadge';
import { Snapshots } from '@/lib/loadSnapshots';

export function ListingGainBar() {
  const rows = Snapshots.master.ipos
    .filter((ipo) => Snapshots.listingPerformance.by_ipo[ipo.id])
    .map((ipo) => {
      const p = Snapshots.listingPerformance.by_ipo[ipo.id]!;
      return {
        name: ipo.short_name ?? ipo.name,
        listing: p.listing_gain_pct ?? 0,
        current: p.current_gain_pct ?? 0,
      };
    });

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Listing gain vs current gain</CardTitle>
          <CardDescription>Last few listings (synthetic mock seed)</CardDescription>
        </div>
        <StateBadge state="manual" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No listings in current snapshot.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={rows} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <RTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="listing" fill="#34d399" radius={[4,4,0,0]}>
                  {rows.map((r, i) => <Cell key={i} fill={r.listing >= 0 ? '#34d399' : '#fb7185'} />)}
                </Bar>
                <Bar dataKey="current" fill="#818cf8" radius={[4,4,0,0]}>
                  {rows.map((r, i) => <Cell key={`c-${i}`} fill={r.current >= 0 ? '#818cf8' : '#fb7185'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Listing gain</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Current gain</span>
        </div>
      </CardContent>
    </Card>
  );
}
