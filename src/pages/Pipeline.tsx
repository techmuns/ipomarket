import { PipelineTimelineTable } from '@/components/pipeline/PipelineTimelineTable';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export function Pipeline() {
  const entries = Snapshots.sebiPipeline.entries;
  const statusCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DRHP / Pipeline Watch</h1>
        <p className="mt-1 text-sm text-slate-400">
          What's coming next — companies that have filed a DRHP with SEBI but have not yet opened bidding.
        </p>
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

      <PipelineTimelineTable />

      <Card>
        <CardHeader>
          <CardTitle>About this data</CardTitle>
          <CardDescription>How the pipeline list is constructed</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <span className="text-slate-500">·</span> All filings are real, harvested from
              <code className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 text-[11px]">sebi.gov.in/sebiweb/home/HomeAction.do</code>
              by probe P-08.
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
