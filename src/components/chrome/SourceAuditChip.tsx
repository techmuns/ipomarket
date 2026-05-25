import type { SourceTag, DataState } from '@/types/source';
import { SourcePill } from './SourcePill';
import { FreshnessChip } from './FreshnessChip';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

interface Props {
  source: SourceTag;
  fetchedAt: string | null;
  state: DataState;
  url?: string | null;
  note?: string;
  className?: string;
}

const STATE_BORDER: Record<DataState, string> = {
  live: 'border-emerald-500/20',
  awaiting: 'border-amber-500/30',
  manual: 'border-violet-500/30',
  aggregator: 'border-orange-500/30',
  unavailable: 'border-rose-500/30',
};

export function SourceAuditChip({ source, fetchedAt, state, url, note, className }: Props) {
  const inner = (
    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5', STATE_BORDER[state], className)}>
      <SourcePill source={source} />
      <FreshnessChip fetchedAt={fetchedAt} />
    </div>
  );
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="font-medium text-slate-200">{source} · {state}</div>
          {url && <div className="break-all text-[10px] text-slate-400">{url}</div>}
          {note && <div className="text-[10px] text-slate-400">{note}</div>}
          {!url && !note && <div className="text-[10px] text-slate-500">No source URL recorded.</div>}
        </div>
      }
    >
      {inner}
    </Tooltip>
  );
}
