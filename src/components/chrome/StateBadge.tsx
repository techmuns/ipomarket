import type { DataState } from '@/types/source';
import { Badge } from '@/components/ui/badge';

const LABEL: Record<DataState, string> = {
  live: 'Live',
  awaiting: 'Awaiting live data',
  manual: 'Manual seed',
  unavailable: 'Source unavailable',
};

const TONE: Record<DataState, 'live' | 'awaiting' | 'manual' | 'unavailable'> = {
  live: 'live',
  awaiting: 'awaiting',
  manual: 'manual',
  unavailable: 'unavailable',
};

export function StateBadge({ state, compact = false }: { state: DataState; compact?: boolean }) {
  return (
    <Badge tone={TONE[state]}>
      <span className={state === 'live' ? 'inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft' : ''} />
      {compact ? state : LABEL[state]}
    </Badge>
  );
}
