import type { Ipo, IpoSourceAudit } from '@/types/ipo';
import { dataCompleteness, type CompletenessTone } from '@/lib/derive';
import { cn } from '@/lib/cn';

// Tone families mirror the existing SourcePill / Badge palette:
// Chittorgarh → orange (aggregator), Official → emerald, Manual → violet,
// Sparse → slate.
const TONES: Record<CompletenessTone, string> = {
  aggregator: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
  official: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  manual: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  sparse: 'border-slate-500/40 bg-slate-500/15 text-slate-400',
};

// Compact "{source} · {n} terms" data-completeness chip. Computes only from the
// IPO row + its source-audit entry (no new data). Used on Screener / Open /
// Recently Listed so the best-filled IPOs stand out at a glance.
export function CompletenessChip({
  ipo,
  audit,
  className,
}: {
  ipo: Ipo;
  audit: IpoSourceAudit | undefined;
  className?: string;
}) {
  const c = dataCompleteness(ipo, audit);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide',
        TONES[c.tone],
        className,
      )}
      title={`Data completeness: ${c.terms} term${c.terms === 1 ? '' : 's'}, dominant source ${c.source}`}
    >
      {c.source} · {c.terms} term{c.terms === 1 ? '' : 's'}
    </span>
  );
}
