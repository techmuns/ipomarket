import type { IpoSourceAudit } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const MIX_COLORS = {
  nse: 'bg-sky-500',
  bse: 'bg-cyan-500',
  sebi: 'bg-indigo-500',
  rhp: 'bg-fuchsia-500',
  manual: 'bg-violet-500',
  derived: 'bg-slate-500',
  broker_ref: 'bg-amber-500',
  chittorgarh: 'bg-orange-500',
} as const;

const MIX_LABELS = {
  nse: 'NSE',
  bse: 'BSE',
  sebi: 'SEBI',
  rhp: 'RHP',
  manual: 'Manual',
  derived: 'Derived',
  broker_ref: 'Broker-ref',
  chittorgarh: 'Chittorgarh',
} as const;

export function SourceAuditPanel({ audit }: { audit: IpoSourceAudit | undefined }) {
  if (!audit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Source audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No source-audit record for this IPO yet.</p>
        </CardContent>
      </Card>
    );
  }

  const mix = audit.source_mix;
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Source audit
        </CardTitle>
        <span className="text-[11px] text-slate-500">Our differentiator</span>
      </CardHeader>
      <CardContent>
        <div className="flex h-3 overflow-hidden rounded-full">
          {(Object.keys(MIX_LABELS) as Array<keyof typeof MIX_LABELS>).map((k) => {
            const v = mix[k] ?? 0;
            return v > 0 ? <div key={k} className={MIX_COLORS[k]} style={{ width: `${(v / total) * 100}%` }} title={`${MIX_LABELS[k]} ${v}%`} /> : null;
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] md:grid-cols-8">
          {(Object.keys(MIX_LABELS) as Array<keyof typeof MIX_LABELS>).map((k) => {
            const v = mix[k] ?? 0;
            return v > 0 ? (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${MIX_COLORS[k]}`} />
                <span className="text-slate-400">{MIX_LABELS[k]} <span className="num text-slate-300">{v}%</span></span>
              </div>
            ) : null;
          })}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Every datum on this page carries a source pill and freshness chip. The mix above covers <span className="text-slate-400">issue-term provenance</span> — for this IPO the issue terms (price band, dates, lot, registrar) are gap-filled from the Chittorgarh aggregator, below official sources and never overwriting them. The <span className="text-slate-400">financials</span> shown on the Analysis tab are official RHP-derived and carry their own RHP source label, so a high Chittorgarh share here does not understate the official financial data.
        </p>
      </CardContent>
    </Card>
  );
}
