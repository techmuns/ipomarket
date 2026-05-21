import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  accent?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose';
  mock?: boolean;
}

const ACCENT_MAP: Record<NonNullable<Props['accent']>, string> = {
  indigo: 'from-indigo-500/15',
  emerald: 'from-emerald-500/15',
  amber: 'from-amber-500/15',
  violet: 'from-violet-500/15',
  rose: 'from-rose-500/15',
};

export function KpiCard({ label, value, hint, trend, trendLabel, accent = 'indigo', mock = false }: Props) {
  return (
    <Card className={cn('relative overflow-hidden', 'bg-gradient-to-br', ACCENT_MAP[accent], 'to-transparent')}>
      <div className="px-5 py-4">
        <div className="label-muted">{label}</div>
        <div className="num mt-2 text-2xl font-bold text-slate-100">{value}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium',
                trend === 'up' && 'bg-emerald-500/15 text-emerald-300',
                trend === 'down' && 'bg-rose-500/15 text-rose-300',
                trend === 'flat' && 'bg-slate-500/15 text-slate-300'
              )}
            >
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {trendLabel ?? ''}
            </span>
          )}
          {mock && <Badge tone="manual">mock</Badge>}
          {hint && <span className="text-slate-500">{hint}</span>}
        </div>
      </div>
    </Card>
  );
}
