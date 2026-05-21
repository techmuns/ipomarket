import type { IpoSubscription } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { formatTimes, formatDate } from '@/lib/format';
import { subscriptionQualityScore } from '@/lib/derive';

function fmtTimes(v: number) {
  return `${v.toFixed(2)}×`;
}

export function SubscriptionBlock({ sub }: { sub: IpoSubscription | undefined }) {
  if (!sub) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <SourceAuditChip source="NSE" fetchedAt={null} state="awaiting" url={null} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No subscription data yet — bidding has not started or this IPO is in pipeline.</p>
        </CardContent>
      </Card>
    );
  }
  const qib = sub.rows.find((r) => r.category === 'QIB')?.times ?? 0;
  const nii = sub.rows.find((r) => r.category === 'NII')?.times ?? 0;
  const retail = sub.rows.find((r) => r.category === 'Retail')?.times ?? 0;
  const total = sub.rows.find((r) => r.category === 'Total')?.times ?? 0;
  const quality = subscriptionQualityScore(sub) ?? 0;

  const dailyData = sub.daily.map((d) => ({ date: formatDate(d.date).slice(0, 6), QIB: d.qib, NII: d.nii, Retail: d.retail }));

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>As of {formatDate(sub.as_of_utc)}</CardDescription>
        </div>
        <SourceAuditChip source="NSE" fetchedAt={sub.as_of_utc} state={sub.state} url={null} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="QIB" value={fmtTimes(qib)} color="from-indigo-500/20 to-indigo-500/0 text-indigo-200" />
          <Tile label="NII" value={fmtTimes(nii)} color="from-violet-500/20 to-violet-500/0 text-violet-200" />
          <Tile label="Retail" value={fmtTimes(retail)} color="from-emerald-500/20 to-emerald-500/0 text-emerald-200" />
          <Tile label="Total" value={fmtTimes(total)} color="from-amber-500/20 to-amber-500/0 text-amber-200" />
        </div>

        {dailyData.length > 1 && (
          <div className="mt-5 h-44">
            <ResponsiveContainer>
              <BarChart data={dailyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                <RTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="QIB" fill="#6366f1" radius={[2,2,0,0]} />
                <Bar dataKey="NII" fill="#a78bfa" radius={[2,2,0,0]} />
                <Bar dataKey="Retail" fill="#34d399" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-5 border-t border-slate-800/60 pt-4">
          <div className="flex items-baseline justify-between">
            <div className="label-muted">Subscription Quality (composite)</div>
            <div className="num text-sm text-slate-200">{quality}/100</div>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-500"
              style={{ width: `${quality}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Weighted by QIB depth, NII demand and Retail spread. Our differentiator; not exposed by Zerodha or Upstox.
          </p>
        </div>

        {sub.rows.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Category</th>
                  <th className="px-2 py-1.5 text-right font-medium">Subscribed</th>
                  <th className="px-2 py-1.5 text-right font-medium">Reserved (L)</th>
                  <th className="px-2 py-1.5 text-right font-medium">Applied (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sub.rows.map((r) => (
                  <tr key={r.category}>
                    <td className="px-2 py-1.5 text-slate-200">{r.category}</td>
                    <td className="px-2 py-1.5 text-right num text-slate-200">{formatTimes(r.times)}</td>
                    <td className="px-2 py-1.5 text-right num text-slate-400">{r.reserved_shares_lakhs ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right num text-slate-400">{r.applied_shares_lakhs ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg border border-slate-800/80 bg-gradient-to-br ${color} p-3`}>
      <div className="label-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
