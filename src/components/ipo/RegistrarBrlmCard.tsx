import type { IpoDocuments } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { Briefcase, ExternalLink, UserSquare2 } from 'lucide-react';

export function RegistrarBrlmCard({ docs }: { docs: IpoDocuments | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Registrar & BRLMs</CardTitle>
        <SourceAuditChip source="RHP" fetchedAt={null} state="manual" url={null} />
      </CardHeader>
      <CardContent>
        <div>
          <div className="label-muted mb-1.5">Registrar</div>
          {docs?.registrar ? (
            <a
              href={docs.registrar.portal_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 hover:border-slate-700"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-teal-500/30 bg-teal-500/10">
                  <UserSquare2 className="h-3.5 w-3.5 text-teal-300" />
                </span>
                <span>
                  <div className="text-sm text-slate-200">{docs.registrar.name}</div>
                  <div className="text-[11px] text-slate-500">Check allotment status →</div>
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
            </a>
          ) : (
            <div className="text-sm text-slate-500">Registrar not yet identified.</div>
          )}
        </div>
        <div className="mt-5">
          <div className="label-muted mb-1.5">Book Running Lead Managers</div>
          {docs?.brlms && docs.brlms.length > 0 ? (
            <ul className="space-y-1.5">
              {docs.brlms.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-200">
                  <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">BRLMs not yet identified.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
