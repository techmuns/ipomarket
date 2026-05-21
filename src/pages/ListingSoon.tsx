import { Link } from 'react-router-dom';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, daysUntil } from '@/lib/format';
import { Clock3, ExternalLink } from 'lucide-react';

export function ListingSoon() {
  const items = Snapshots.master.ipos.filter((i) => i.status === 'closed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listing Soon</h1>
        <p className="mt-1 text-sm text-slate-400">
          IPOs that have closed bidding and are awaiting listing. Allotment + registrar link in one place.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">No IPOs in the awaiting-listing window right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((ipo) => {
            const docs = Snapshots.documents.by_ipo[ipo.id];
            const listingIn = daysUntil(ipo.listing_date);
            const allotment = Snapshots.master.timelines.find((t) => t.ipo_id === ipo.id)?.allotment_finalization;
            return (
              <Card key={ipo.id} className="card-hover">
                <CardHeader className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      <Link to={`/ipo/${ipo.slug}`} className="hover:underline">{ipo.name}</Link>
                    </CardTitle>
                    <CardDescription>{ipo.tagline}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone="info">closed</Badge>
                    {listingIn != null && <Badge tone="awaiting">{listingIn}d to listing</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Stat label="Bid closed" value={ipo.close_date ? formatDate(ipo.close_date) : '—'} />
                    <Stat label="Allotment" value={allotment ? formatDate(allotment) : '—'} />
                    <Stat label="Listing" value={ipo.listing_date ? formatDate(ipo.listing_date) : '—'} />
                    <Stat label="Listing exchange" value={ipo.listing_exchange.join(' + ') || '—'} />
                  </div>
                  {docs?.registrar?.portal_url && (
                    <a
                      href={docs.registrar.portal_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-200 hover:border-teal-500/50"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Check allotment at {docs.registrar.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-muted">{label}</div>
      <div className="num mt-0.5 text-sm text-slate-200">{value}</div>
    </div>
  );
}
