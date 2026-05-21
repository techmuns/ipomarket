import type { IpoTimeline } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { formatDate } from '@/lib/format';
import { Check, Circle } from 'lucide-react';

interface Row {
  label: string;
  iso: string | null;
}

export function TimelineRail({ tl }: { tl: IpoTimeline }) {
  const rows: Row[] = [
    { label: 'Bid open', iso: tl.bid_open },
    { label: 'Bid close', iso: tl.bid_close },
    { label: 'UPI mandate deadline', iso: tl.upi_mandate_deadline },
    { label: 'Allotment finalization', iso: tl.allotment_finalization },
    { label: 'Refund initiation', iso: tl.refund_initiation },
    { label: 'Share credit to demat', iso: tl.share_credit },
    { label: 'Listing', iso: tl.listing_date },
    { label: 'Anchor lock-in (50%) end', iso: tl.anchor_lockin_50pct_end },
    { label: 'Anchor lock-in (100%) end', iso: tl.anchor_lockin_100pct_end },
  ];
  const now = Date.now();
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>IPO timeline</CardTitle>
        <SourceAuditChip source="NSE" fetchedAt="2026-05-20T11:30:00Z" state="live" url={null} />
      </CardHeader>
      <CardContent>
        <ol className="relative ml-2 space-y-3 border-l border-slate-800 pl-5">
          {rows.map((r) => {
            const past = r.iso ? new Date(r.iso).getTime() < now : false;
            return (
              <li key={r.label} className="relative">
                <span
                  className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                    past ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {past ? <Check className="h-2.5 w-2.5 text-emerald-300" /> : <Circle className="h-2 w-2 text-slate-600" />}
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-sm ${past ? 'text-slate-400' : 'text-slate-200'}`}>{r.label}</span>
                  <span className="num text-xs text-slate-300">{r.iso ? formatDate(r.iso) : '—'}</span>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Schedule is tentative. Anchor lock-in: 50% of the shares unlock 30 days after allotment; the remaining 50% unlocks 90 days after. Allotment status can be checked on the registrar's website and the exchange website.
        </p>
      </CardContent>
    </Card>
  );
}
