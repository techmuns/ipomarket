import { Clock } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export function FreshnessChip({ fetchedAt, className }: { fetchedAt: string | null; className?: string }) {
  if (!fetchedAt) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[10px] text-slate-500', className)}>
        <Clock className="h-3 w-3" /> not fetched
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] text-slate-400', className)}>
      <Clock className="h-3 w-3" /> {relativeTime(fetchedAt)}
    </span>
  );
}
