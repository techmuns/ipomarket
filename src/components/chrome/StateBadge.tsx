import type { DataState } from '@/types/source';
import { Badge } from '@/components/ui/badge';

// LABEL is the *data-state* label — describes where the value came from
// (automated source vs manual seed vs unreachable). It is NOT the IPO
// lifecycle state (open / upcoming / closed / listed) which is communicated
// via separate status badges. To avoid confusing the two, "live" data-state
// renders as "Source live" / "Auto" instead of just "Live".
const LABEL: Record<DataState, string> = {
  live: 'Source live',
  awaiting: 'Awaiting live data',
  manual: 'Manual seed',
  aggregator: 'Aggregator · Chittorgarh',
  unavailable: 'Source unavailable',
};

const COMPACT_LABEL: Record<DataState, string> = {
  live: 'auto',
  awaiting: 'awaiting',
  manual: 'manual',
  aggregator: 'aggregator',
  unavailable: 'unavail',
};

const TONE: Record<DataState, 'live' | 'awaiting' | 'manual' | 'aggregator' | 'unavailable'> = {
  live: 'live',
  awaiting: 'awaiting',
  manual: 'manual',
  aggregator: 'aggregator',
  unavailable: 'unavailable',
};

export function StateBadge({ state, compact = false }: { state: DataState; compact?: boolean }) {
  return (
    <Badge tone={TONE[state]}>
      <span className={state === 'live' ? 'inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft' : ''} />
      {compact ? COMPACT_LABEL[state] : LABEL[state]}
    </Badge>
  );
}
