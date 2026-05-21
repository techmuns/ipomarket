import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { Snapshots } from '@/lib/loadSnapshots';
import { ExternalLink } from 'lucide-react';

const STATUS_TONE: Record<string, 'live' | 'awaiting' | 'manual' | 'unavailable' | 'info'> = {
  filed: 'awaiting',
  observations_issued: 'info',
  cleared: 'live',
  withdrawn: 'unavailable',
};

export function PipelineTimelineTable() {
  const entries = Snapshots.sebiPipeline.entries;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>DRHP / Pipeline Watch</CardTitle>
          <CardDescription>{entries.length} filings harvested from SEBI · all data live</CardDescription>
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
                <th className="px-3 py-2 text-right font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-900/40">
                  <td className="px-3 py-2 text-slate-200">{e.company_name}</td>
                  <td className="px-3 py-2 text-slate-400">{e.doc_type}</td>
                  <td className="px-3 py-2 text-slate-400">{e.sector_hint ?? '—'}</td>
                  <td className="px-3 py-2 num text-slate-300">{e.filing_month}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[e.status] ?? 'default'}>{e.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
                    >
                      PDF <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
