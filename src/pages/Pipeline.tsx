import { useState, useMemo } from 'react';
import { PipelineTimelineTable, isRealPipelineEntry } from '@/components/pipeline/PipelineTimelineTable';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type PipelineFilter = 'real' | 'all';

export function Pipeline() {
  const allEntries = Snapshots.sebiPipeline.entries;
  const [filter, setFilter] = useState<PipelineFilter>('real');

  const counts = useMemo(() => {
    const real = allEntries.filter(isRealPipelineEntry).length;
    return { real, placeholder: allEntries.length - real, total: allEntries.length };
  }, [allEntries]);

  const visibleEntries = useMemo(
    () => (filter === 'real' ? allEntries.filter(isRealPipelineEntry) : allEntries),
    [allEntries, filter]
  );

  const statusCounts = visibleEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DRHP / Pipeline Watch</h1>
          <p className="mt-1 text-sm text-slate-400">
            What's coming next — companies that have filed a DRHP with SEBI but have not yet opened bidding.
          </p>
        </div>
        <div className="inline-flex items-center rounded-md border border-slate-700/80 bg-slate-900/40 p-0.5 text-[11px]">
          <FilterButton active={filter === 'real'} onClick={() => setFilter('real')}>
            Real only · {counts.real}
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All · {counts.total}
          </FilterButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(statusCounts).map(([k, v]) => (
          <Card key={k}>
            <CardContent>
              <div className="label-muted">{k.replace('_', ' ')}</div>
              <div className="num mt-1 text-2xl font-semibold text-slate-100">{v}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent>
            <div className="label-muted">Source</div>
            <div className="num mt-1 text-lg font-medium text-slate-100">SEBI · static-alt</div>
            <div className="mt-1 text-[11px] text-slate-500">Harvested by probe P-08 (GREEN)</div>
          </CardContent>
        </Card>
      </div>

      <PipelineTimelineTable entries={visibleEntries} filter={filter} counts={counts} />

      <Card>
        <CardHeader>
          <CardTitle>About this data</CardTitle>
          <CardDescription>How the pipeline list is constructed</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <span className="text-slate-500">·</span> {counts.real} of these are real SEBI filings, harvested from
              <code className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 text-[11px]">sebi.gov.in/sebiweb/home/HomeAction.do</code>
              by probe P-08. The remaining {counts.placeholder} are Phase-1 placeholder rows preserved for layout
              stability and clearly tagged <span className="font-medium text-violet-300">mock</span> when the
              <span className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 font-mono text-[11px]">All</span> view is on.
            </li>
            <li>
              <span className="text-slate-500">·</span> P-09 validated one Draft Abridged Prospectus end-to-end
              (InCred Holdings, 13 pages, %PDF magic confirmed).
            </li>
            <li>
              <span className="text-slate-500">·</span> Status values are illustrative for the mock; observation-letter parsing
              is a Phase 2 / P-08b enhancement.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded px-2.5 py-1 font-medium transition-colors',
        active
          ? 'bg-slate-800 text-slate-100'
          : 'text-slate-400 hover:text-slate-200'
      )}
    >
      {children}
    </button>
  );
}
