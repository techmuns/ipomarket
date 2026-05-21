import type { SebiPipelineEntry } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { Snapshots } from '@/lib/loadSnapshots';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<string, 'live' | 'awaiting' | 'manual' | 'unavailable' | 'info'> = {
  filed: 'awaiting',
  observations_issued: 'info',
  cleared: 'live',
  withdrawn: 'unavailable',
};

// Real SEBI rows carry `source: 'SEBI'` (added by the 2A ingest bridge);
// the 14 Phase-1 placeholder rows in `sebi-pipeline.json` lack it. The
// type doesn't declare `source` because it's an ingest-side annotation,
// so a structural cast is the safest way to inspect it.
function isReal(e: SebiPipelineEntry): boolean {
  return (e as SebiPipelineEntry & { source?: string }).source === 'SEBI';
}

export { isReal as isRealPipelineEntry };

interface Props {
  entries?: SebiPipelineEntry[];
  filter?: 'real' | 'all';
  counts?: { real: number; placeholder: number; total: number };
}

export function PipelineTimelineTable({ entries, filter = 'real', counts }: Props = {}) {
  const rows: SebiPipelineEntry[] = entries ?? Snapshots.sebiPipeline.entries;
  const allCount = Snapshots.sebiPipeline.entries.length;
  const realCount = counts?.real ?? Snapshots.sebiPipeline.entries.filter(isReal).length;
  const placeholderCount = counts?.placeholder ?? allCount - realCount;

  const description =
    filter === 'real'
      ? `${rows.length} real SEBI filings · ${placeholderCount} placeholder hidden`
      : `${rows.length} total · ${realCount} real SEBI · ${placeholderCount} placeholder`;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>DRHP / Pipeline Watch</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <SourceAuditChip
          source="SEBI"
          fetchedAt={Snapshots.sebiPipeline.generated_at_utc}
          state="live"
          url={Snapshots.sebiPipeline.source_url}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-800/60">
                <th className="px-3 py-2 text-left font-medium">Company</th>
                <th className="px-3 py-2 text-left font-medium">Doc type</th>
                <th className="px-3 py-2 text-left font-medium">Sector</th>
                <th className="px-3 py-2 text-left font-medium">Filed</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2 text-right font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((e) => {
                const real = isReal(e);
                return (
                  <tr
                    key={e.id}
                    className={cn(
                      'hover:bg-slate-900/40',
                      !real && 'text-slate-500/90'
                    )}
                  >
                    <td className={cn('px-3 py-2', real ? 'text-slate-200' : 'text-slate-400')}>
                      {e.company_name}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{e.doc_type}</td>
                    <td className="px-3 py-2 text-slate-400">{e.sector_hint ?? '—'}</td>
                    <td className="px-3 py-2 num text-slate-300">{e.filing_month}</td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[e.status] ?? 'default'}>{e.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {real ? (
                        <Badge tone="live">SEBI</Badge>
                      ) : (
                        <Badge tone="manual">mock</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {real ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
                        >
                          PDF <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
