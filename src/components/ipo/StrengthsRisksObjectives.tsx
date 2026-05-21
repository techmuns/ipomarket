import type { IpoNarrative } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { CheckCircle2, AlertTriangle, Target } from 'lucide-react';
import { formatCr } from '@/lib/format';

export function StrengthsCard({ n }: { n: IpoNarrative | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Strengths
        </CardTitle>
        <SourceAuditChip source="RHP" fetchedAt={null} state={n?.state ?? 'manual'} url={null} note="From RHP 'Our Strengths' — manual paste at v1." />
      </CardHeader>
      <CardContent>
        {!n || n.strengths.length === 0 ? (
          <p className="text-sm text-slate-500">No strengths seeded yet. Manual paste from RHP at v1.</p>
        ) : (
          <ul className="space-y-2">
            {n.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-200">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RisksCard({ n }: { n: IpoNarrative | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          Risks
        </CardTitle>
        <SourceAuditChip source="RHP" fetchedAt={null} state={n?.state ?? 'manual'} url={null} note="From RHP 'Risk Factors' — manual paste at v1." />
      </CardHeader>
      <CardContent>
        {!n || n.risks.length === 0 ? (
          <p className="text-sm text-slate-500">No risks seeded yet. Manual paste from RHP at v1.</p>
        ) : (
          <ul className="space-y-2">
            {n.risks.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-200">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ObjectivesCard({ n }: { n: IpoNarrative | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-400" />
          Objectives / use of proceeds
        </CardTitle>
        <SourceAuditChip source="RHP" fetchedAt={null} state={n?.state ?? 'manual'} url={null} note="From RHP 'Objects of the Offer'." />
      </CardHeader>
      <CardContent>
        {!n || n.objectives.length === 0 ? (
          <p className="text-sm text-slate-500">No objectives seeded yet. Manual paste from RHP at v1.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full">
              {n.objectives.map((o, i) => (
                <div
                  key={i}
                  className={`${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${o.pct ?? 0}%` }}
                  title={`${o.purpose} — ${o.pct?.toFixed(1)}%`}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {n.objectives.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-start gap-2 min-w-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                    <span className="truncate text-slate-200">{o.purpose}</span>
                  </span>
                  <span className="num shrink-0 text-slate-300">
                    {formatCr(o.amount_cr)} <span className="text-slate-500">({o.pct?.toFixed(1)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const BAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500'];
