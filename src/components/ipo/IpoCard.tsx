import { Link } from 'react-router-dom';
import type { Ipo } from '@/types/ipo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/chrome/StateBadge';
import { formatDateRange, formatCr, formatPriceBand, formatRupee, daysUntil } from '@/lib/format';
import { Snapshots } from '@/lib/loadSnapshots';
import { totalSubscriptionTimes, minInvestment } from '@/lib/derive';
import { CompletenessChip } from '@/components/ipo/CompletenessChip';
import { ChevronRight, Activity, FileText } from 'lucide-react';

export function IpoCard({ ipo }: { ipo: Ipo }) {
  const sub = Snapshots.subscriptions.by_ipo[ipo.id];
  const subTimes = totalSubscriptionTimes(sub);
  const minInv = minInvestment(ipo);
  const dToClose = daysUntil(ipo.close_date);
  const dToListing = daysUntil(ipo.listing_date);

  // Sparse upcoming card: announced via SEBI but the exchanges haven't
  // published any economics yet. Showing a full 4-tile grid of em-dashes
  // is misleading; render a slim card instead.
  const isSparse =
    ipo.status === 'upcoming' &&
    ipo.price_band == null &&
    ipo.issue_size_cr == null &&
    ipo.lot_size == null;

  if (isSparse) {
    return <CompactCard ipo={ipo} />;
  }

  return (
    <Link to={`/ipo/${ipo.slug}`} className="block">
      <Card className="card-hover relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge tone={ipo.segment === 'mainboard' ? 'info' : 'accent'}>{ipo.segment === 'mainboard' ? 'Mainboard' : 'SME'}</Badge>
              <Badge
                tone={
                  ipo.status === 'open'
                    ? 'live'
                    : ipo.status === 'upcoming'
                    ? 'awaiting'
                    : ipo.status === 'closed'
                    ? 'info'
                    : ipo.status === 'listed'
                    ? 'manual'
                    : 'unavailable'
                }
              >
                {ipo.status}
              </Badge>
              {ipo.sector && <Badge>{ipo.sector.industry}</Badge>}
              <CompletenessChip ipo={ipo} audit={Snapshots.sourceAudit.by_ipo[ipo.id]} />
            </div>
            <h3 className="truncate text-base font-semibold text-slate-100">{ipo.short_name ?? ipo.name}</h3>
            {ipo.tagline && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{ipo.tagline}</p>}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-4 text-xs">
          <Stat label="Price band" value={formatPriceBand(ipo.price_band?.low ?? null, ipo.price_band?.high ?? null)} />
          <Stat label="Lot · Min invest" value={ipo.lot_size ? `${ipo.lot_size} · ${formatRupee(minInv)}` : '—'} />
          <Stat label="Issue size" value={formatCr(ipo.issue_size_cr)} />
          <Stat label="Dates" value={formatDateRange(ipo.open_date, ipo.close_date)} />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            {subTimes != null ? (
              <span className="num text-xs text-slate-200">
                {subTimes.toFixed(2)}× <span className="text-slate-500">total subscribed</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">no subscription data yet</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ipo.status === 'open' && dToClose != null && dToClose >= 0 && (
              <Badge tone="awaiting">{dToClose === 0 ? 'Closes today' : `${dToClose}d to close`}</Badge>
            )}
            {ipo.status === 'closed' && dToListing != null && dToListing >= 0 && (
              <Badge tone="info">{dToListing}d to listing</Badge>
            )}
            <StateBadge state={ipo.state} compact />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CompactCard({ ipo }: { ipo: Ipo }) {
  const docs = Snapshots.documents.by_ipo[ipo.id];
  const hasDrhp = docs?.docs.some((d) => d.kind === 'DRHP' || d.kind === 'Prospectus');

  return (
    <Link to={`/ipo/${ipo.slug}`} className="block">
      <Card className="card-hover relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge tone={ipo.segment === 'mainboard' ? 'info' : 'accent'}>
                {ipo.segment === 'mainboard' ? 'Mainboard' : 'SME'}
              </Badge>
              <Badge tone="awaiting">upcoming</Badge>
              {ipo.sector && <Badge>{ipo.sector.industry}</Badge>}
            </div>
            <h3 className="truncate text-base font-semibold text-slate-100">{ipo.short_name ?? ipo.name}</h3>
            {ipo.tagline && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{ipo.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {hasDrhp && (
                <span className="inline-flex items-center gap-1 text-indigo-300/80">
                  <FileText className="h-3 w-3" />
                  DRHP filed via SEBI
                </span>
              )}
              <span>Issue details TBA</span>
              <StateBadge state={ipo.state} compact />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
        </div>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="label-muted truncate">{label}</div>
      <div className="num mt-0.5 text-sm text-slate-200">{value}</div>
    </div>
  );
}
