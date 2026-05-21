import type { IpoDocuments } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { FileText, ExternalLink } from 'lucide-react';

const KIND_LABEL: Record<IpoDocuments['docs'][number]['kind'], string> = {
  DRHP: 'Draft Red Herring Prospectus',
  RHP: 'Red Herring Prospectus',
  Anchor: 'Anchor allocation circular',
  AllotmentBasis: 'Basis of allotment',
  Prospectus: 'Prospectus',
};

export function DocumentsList({ docs }: { docs: IpoDocuments | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <SourceAuditChip source="SEBI" fetchedAt={docs?.docs?.[0]?.fetched_at_utc ?? null} state={docs?.state ?? 'awaiting'} url={null} />
      </CardHeader>
      <CardContent>
        {!docs || docs.docs.length === 0 ? (
          <p className="text-sm text-slate-500">No documents discovered yet.</p>
        ) : (
          <ul className="space-y-2">
            {docs.docs.map((d, i) => (
              <li key={i}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 hover:border-slate-700"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10">
                      <FileText className="h-3.5 w-3.5 text-fuchsia-300" />
                    </span>
                    <span className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-fuchsia-300">{d.kind}</span>
                        {d.page_count && <span className="text-[10px] text-slate-500">{d.page_count} pages</span>}
                        {d.bytes && <span className="text-[10px] text-slate-500">{Math.round(d.bytes / 1024)} KB</span>}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-slate-200">{d.title}</div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{KIND_LABEL[d.kind]}</div>
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-300" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
