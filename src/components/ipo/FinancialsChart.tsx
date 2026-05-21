import { useState } from 'react';
import type { IpoFinancials } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { formatCr, formatPct } from '@/lib/format';

type Metric = 'revenue_cr' | 'ebitda_cr' | 'pat_cr' | 'assets_cr';
const LABELS: Record<Metric, string> = {
  revenue_cr: 'Revenue',
  ebitda_cr: 'EBITDA',
  pat_cr: 'PAT',
  assets_cr: 'Assets',
};
const COLORS: Record<Metric, string> = {
  revenue_cr: '#34d399',
  ebitda_cr: '#818cf8',
  pat_cr: '#fb7185',
  assets_cr: '#fbbf24',
};

export function FinancialsChart({ fin }: { fin: IpoFinancials | undefined }) {
  const [metric, setMetric] = useState<Metric>('revenue_cr');

  if (!fin || fin.periods.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Financials</CardTitle>
          <SourceAuditChip source="RHP" fetchedAt={null} state="manual" url={null} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Financials seed expected from RHP. Phase 1 ships without a seeded table; Phase 5 RHP parsing will populate.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = fin.periods.map((p) => ({ period: p.period, value: p[metric] ?? 0 }));

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Financials</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">Multi-period {LABELS[metric].toLowerCase()} from the RHP financial statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <SourceAuditChip source="RHP" fetchedAt={null} state={fin.state} url={null} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            {(Object.keys(LABELS) as Metric[]).map((m) => (
              <TabsTrigger key={m} value={m}>{LABELS[m]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-4 h-56">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
              <RTooltip
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                formatter={(v: number) => formatCr(v)}
              />
              <Bar dataKey="value" fill={COLORS[metric]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-4 md:grid-cols-4">
          <DerivedTile label="3Y CAGR (Revenue)" value={formatPct(fin.derived.revenue_3y_cagr_pct ?? null)} accent="emerald" />
          <DerivedTile label="3Y CAGR (PAT)" value={formatPct(fin.derived.pat_3y_cagr_pct ?? null)} accent="indigo" />
          <DerivedTile label="D/E" value={fin.derived.d_to_e != null ? fin.derived.d_to_e.toFixed(2) : '—'} accent="amber" />
          <DerivedTile label="P/E (upper band)" value={fin.derived.pe_at_upper_band != null ? fin.derived.pe_at_upper_band.toFixed(1) + '×' : '—'} accent="violet" />
        </div>
      </CardContent>
    </Card>
  );
}

function DerivedTile({ label, value, accent }: { label: string; value: string; accent: 'emerald' | 'indigo' | 'amber' | 'violet' }) {
  const colorMap = {
    emerald: 'text-emerald-300',
    indigo: 'text-indigo-300',
    amber: 'text-amber-300',
    violet: 'text-violet-300',
  } as const;
  return (
    <div>
      <div className="label-muted">{label}</div>
      <div className={`num mt-0.5 text-base font-semibold ${colorMap[accent]}`}>{value}</div>
    </div>
  );
}
