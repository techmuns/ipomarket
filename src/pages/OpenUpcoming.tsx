import { IpoCard } from '@/components/ipo/IpoCard';
import { Snapshots } from '@/lib/loadSnapshots';
import { Badge } from '@/components/ui/badge';

export function OpenUpcoming() {
  const open = Snapshots.master.ipos.filter((i) => i.status === 'open');
  const upcoming = Snapshots.master.ipos.filter((i) => i.status === 'upcoming');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Open & Upcoming IPOs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live bidding + announced issues. Mainboard and SME combined. Click any card for the full IPO Detail page.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Open for bidding</h2>
          <Badge tone="live">{open.length}</Badge>
        </div>
        {open.length === 0 ? (
          <p className="text-sm text-slate-500">No open IPOs in current snapshot.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {open.map((ipo) => <IpoCard key={ipo.id} ipo={ipo} />)}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Upcoming / DRHP filed</h2>
          <Badge tone="awaiting">{upcoming.length}</Badge>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming IPOs in current snapshot.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((ipo) => <IpoCard key={ipo.id} ipo={ipo} />)}
          </div>
        )}
      </section>
    </div>
  );
}
