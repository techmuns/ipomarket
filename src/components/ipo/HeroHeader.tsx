import type { Ipo } from '@/types/ipo';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/chrome/StateBadge';
import { formatRupee, daysUntil, formatDate } from '@/lib/format';
import { Snapshots } from '@/lib/loadSnapshots';
import { totalSubscriptionTimes, minInvestment } from '@/lib/derive';
import { Activity, CalendarClock, Layers, MapPin } from 'lucide-react';

export function HeroHeader({ ipo }: { ipo: Ipo }) {
  const sub = Snapshots.subscriptions.by_ipo[ipo.id];
  const subTimes = totalSubscriptionTimes(sub);
  const minInv = minInvestment(ipo);
  const closeIn = daysUntil(ipo.close_date);
  const listIn = daysUntil(ipo.listing_date);

  return (
    <section className="card-surface relative overflow-hidden">
      <div className="absolute inset-0 accent-gradient pointer-events-none" />
      <div className="relative px-6 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
              <StateBadge state={ipo.state} />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-100 lg:text-3xl">{ipo.name}</h1>
            {ipo.tagline && <p className="mt-1 max-w-2xl text-sm text-slate-400">{ipo.tagline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              {ipo.sector && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {ipo.sector.macro} · {ipo.sector.sector}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Listing on {ipo.listing_exchange.join(' + ') || '—'}
              </span>
              {ipo.close_date && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                  {ipo.status === 'open' ? `Closes ${formatDate(ipo.close_date)}` : `Closed ${formatDate(ipo.close_date)}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            {subTimes != null && (
              <div className="flex items-baseline gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-emerald-300" />
                <span className="num text-2xl font-semibold text-emerald-200">{subTimes.toFixed(2)}×</span>
                <span className="text-[11px] text-emerald-200/70">subscribed</span>
              </div>
            )}
            <div className="text-right">
              <div className="label-muted">Min. investment</div>
              <div className="num text-lg font-semibold text-slate-100">{minInv != null ? formatRupee(minInv) : '—'}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open" value={ipo.open_date ? formatDate(ipo.open_date) : '—'} />
          <Stat label="Close" value={ipo.close_date ? formatDate(ipo.close_date) : '—'} hint={closeIn != null && closeIn >= 0 ? `in ${closeIn}d` : undefined} />
          <Stat label="Listing" value={ipo.listing_date ? formatDate(ipo.listing_date) : '—'} hint={listIn != null && listIn >= 0 ? `in ${listIn}d` : undefined} />
          <Stat label="Listing exchange" value={ipo.listing_exchange.join(' + ') || '—'} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="label-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="num text-sm font-medium text-slate-100">{value}</span>
        {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
