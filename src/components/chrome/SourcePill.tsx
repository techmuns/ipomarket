import type { SourceTag } from '@/types/source';
import { cn } from '@/lib/cn';

const STYLES: Record<SourceTag, string> = {
  NSE: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  BSE: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  SEBI: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  RHP: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  Registrar: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Manual: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'Broker-ref': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Derived: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

export function SourcePill({ source, className }: { source: SourceTag; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide',
        STYLES[source],
        className
      )}
    >
      {source}
    </span>
  );
}
