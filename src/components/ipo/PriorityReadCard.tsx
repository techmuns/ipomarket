import type { Ipo, IpoSourceAudit, IpoSubscription, IpoTimeline } from '@/types/ipo';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, CalendarClock, Lightbulb, ShieldCheck } from 'lucide-react';
import { subscriptionQualityScore, totalSubscriptionTimes, minInvestment } from '@/lib/derive';
import { formatRupee } from '@/lib/format';
import { cn } from '@/lib/cn';

const MIX_COLORS = {
  nse: 'bg-sky-500',
  bse: 'bg-cyan-500',
  sebi: 'bg-indigo-500',
  rhp: 'bg-fuchsia-500',
  manual: 'bg-violet-500',
  derived: 'bg-slate-500',
  broker_ref: 'bg-amber-500',
  chittorgarh: 'bg-orange-500',
} as const;

const MIX_LABELS = {
  nse: 'NSE',
  bse: 'BSE',
  sebi: 'SEBI',
  rhp: 'RHP',
  manual: 'Manual',
  derived: 'Derived',
  broker_ref: 'Broker-ref',
  chittorgarh: 'Chittorgarh',
} as const;

interface Props {
  ipo: Ipo;
  sub: IpoSubscription | undefined;
  timeline: IpoTimeline | undefined;
  audit: IpoSourceAudit | undefined;
}

/**
 * 5-second triage card. Sits between the hero and the tabs on /ipo/<slug>.
 * Four cells: demand read · next key date · source mix snapshot · derived
 * analyst sentence. All inputs come from existing snapshots — no judgment,
 * just summary.
 */
export function PriorityReadCard({ ipo, sub, timeline, audit }: Props) {
  const score = subscriptionQualityScore(sub);
  const subTimes = totalSubscriptionTimes(sub);
  const demand = demandRead(score);
  const nextDate = nextKeyDate(ipo, timeline);
  const mixSummary = sourceMixSummary(audit);
  const analystSentence = composeAnalystSentence({ ipo, demand, nextDate, subTimes, mixSummary });

  return (
    <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] to-transparent">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="label-muted flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-indigo-300" />
            5-second priority read
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">summary</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Cell
            icon={<Activity className="h-3.5 w-3.5 text-emerald-300" />}
            label="Demand read"
            value={demand.value}
            hint={demand.hint}
            tone={demand.tone}
          />
          <Cell
            icon={<CalendarClock className="h-3.5 w-3.5 text-sky-300" />}
            label="Next key date"
            value={nextDate.value}
            hint={nextDate.hint}
            tone="info"
          />
          <Cell
            icon={<ShieldCheck className="h-3.5 w-3.5 text-violet-300" />}
            label="Source mix"
            value={mixSummary.top ?? '—'}
            hint={mixSummary.line ?? 'No source audit'}
            tone="violet"
            inlineExtra={<MixBar audit={audit} />}
          />
          <Cell
            icon={<Lightbulb className="h-3.5 w-3.5 text-amber-300" />}
            label="Analyst read"
            value={analystSentence}
            hint={null}
            tone="amber"
            wide
          />
        </div>
      </CardContent>
    </Card>
  );
}

type CellTone = 'emerald' | 'amber' | 'rose' | 'violet' | 'info';

function Cell({
  icon,
  label,
  value,
  hint,
  tone,
  inlineExtra,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string | null;
  tone: CellTone;
  inlineExtra?: React.ReactNode;
  wide?: boolean;
}) {
  const valueTone = {
    emerald: 'text-emerald-200',
    amber: 'text-amber-200',
    rose: 'text-rose-200',
    violet: 'text-violet-200',
    info: 'text-sky-200',
  }[tone];

  return (
    <div className={cn('min-w-0', wide && 'lg:col-span-1')}>
      <div className="flex items-center gap-1.5 label-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('mt-1.5 text-sm font-medium leading-snug', valueTone)}>{value}</div>
      {inlineExtra}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function MixBar({ audit }: { audit: IpoSourceAudit | undefined }) {
  if (!audit) return null;
  const mix = audit.source_mix;
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full">
      {(Object.keys(MIX_LABELS) as Array<keyof typeof MIX_LABELS>).map((k) => {
        const v = mix[k] ?? 0;
        return v > 0 ? (
          <div
            key={k}
            className={MIX_COLORS[k]}
            style={{ width: `${(v / total) * 100}%` }}
            title={`${MIX_LABELS[k]} ${v}%`}
          />
        ) : null;
      })}
    </div>
  );
}

function demandRead(score: number | null): { value: string; hint: string; tone: CellTone } {
  if (score == null) {
    return { value: 'Awaiting demand signal', hint: 'No subscription data yet', tone: 'amber' };
  }
  if (score >= 70) {
    return { value: `${score}/100 · QIB-led`, hint: 'Institutional conviction', tone: 'emerald' };
  }
  if (score >= 40) {
    return { value: `${score}/100 · Mixed`, hint: 'Balanced demand mix', tone: 'amber' };
  }
  return { value: `${score}/100 · Retail-led`, hint: 'Retail-led demand fades historically', tone: 'rose' };
}

function nextKeyDate(ipo: Ipo, timeline: IpoTimeline | undefined): { value: string; hint: string } {
  const now = new Date();
  const candidates: Array<{ label: string; iso: string }> = [];
  const closeIso = timeline?.bid_close ?? ipo.close_date;
  if (closeIso) candidates.push({ label: 'Closes', iso: closeIso });
  if (timeline?.allotment_finalization) candidates.push({ label: 'Allotment', iso: timeline.allotment_finalization });
  const listingIso = timeline?.listing_date ?? ipo.listing_date;
  if (listingIso) candidates.push({ label: 'Listing', iso: listingIso });

  // Pick the closest future date.
  let nextFuture: { label: string; days: number } | null = null;
  let lastPast: { label: string; days: number } | null = null;
  for (const c of candidates) {
    const t = new Date(c.iso).getTime();
    if (Number.isNaN(t)) continue;
    const days = Math.ceil((t - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 0) {
      if (!nextFuture || days < nextFuture.days) nextFuture = { label: c.label, days };
    } else {
      if (!lastPast || days > lastPast.days) lastPast = { label: c.label, days };
    }
  }

  if (nextFuture) {
    const when =
      nextFuture.days === 0
        ? 'today'
        : nextFuture.days === 1
        ? 'in 1 day'
        : `in ${nextFuture.days} days`;
    return { value: `${nextFuture.label} ${when}`, hint: 'Closest upcoming milestone' };
  }
  if (lastPast) {
    const ago = Math.abs(lastPast.days);
    const when = ago === 0 ? 'today' : ago === 1 ? '1 day ago' : `${ago} days ago`;
    return { value: `${lastPast.label} ${when}`, hint: 'Most recent milestone' };
  }
  return { value: 'No timeline yet', hint: 'Dates pending' };
}

function sourceMixSummary(audit: IpoSourceAudit | undefined): { top: string | null; line: string | null } {
  if (!audit) return { top: null, line: null };
  const mix = audit.source_mix;
  const entries = (Object.keys(MIX_LABELS) as Array<keyof typeof MIX_LABELS>)
    .map((k) => ({ key: k, pct: mix[k] ?? 0 }))
    .filter((e) => e.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  if (entries.length === 0) return { top: null, line: null };
  const top = entries[0];
  const line = entries
    .slice(0, 3)
    .map((e) => `${MIX_LABELS[e.key]} ${e.pct}%`)
    .join(' · ');
  return { top: `${MIX_LABELS[top.key]} ${top.pct}%`, line };
}

// Mechanical issue-terms clause from the source-backed economic fields. Pure
// summary, no judgment. Returns null when no issue terms are filled.
function issueTermsClause(ipo: Ipo): string | null {
  const seg = ipo.segment === 'sme' ? 'SME' : 'mainboard';
  const size = ipo.issue_size_cr != null ? `₹${ipo.issue_size_cr} Cr ${seg}` : null;
  const band = ipo.price_band ? `₹${ipo.price_band.low}–${ipo.price_band.high}` : null;
  const minInv = minInvestment(ipo);
  const lot =
    ipo.lot_size != null
      ? `lot ${ipo.lot_size}${minInv != null ? ` (${formatRupee(minInv)})` : ''}`
      : null;
  if (!size && !band && !lot) return null;
  let s = size ?? (band ? seg : '');
  if (band) s += `${s ? ' at ' : ''}${band}`;
  if (lot) s += `${s ? ', ' : ''}${lot}`;
  return s || null;
}

function composeAnalystSentence({
  ipo,
  demand,
  nextDate,
  subTimes,
  mixSummary,
}: {
  ipo: Ipo;
  demand: { value: string; tone: CellTone };
  nextDate: { value: string };
  subTimes: number | null;
  mixSummary: { line: string | null };
}): string {
  const demandPart =
    demand.tone === 'emerald'
      ? 'QIB-led demand'
      : demand.tone === 'rose'
      ? 'Retail-led demand'
      : demand.tone === 'amber' && demand.value.startsWith('Awaiting')
      ? 'Demand signal pending'
      : 'Mixed demand';
  const subPart = subTimes != null ? ` at ${subTimes.toFixed(2)}× total` : '';
  const datePart = `; ${nextDate.value.toLowerCase()}`;
  const mixPart = mixSummary.line ? `; ${mixSummary.line}.` : '.';

  const terms = issueTermsClause(ipo);
  if (terms) {
    // Lead with the issue terms; lowercase the demand head so it reads as a clause.
    const demandText = demandPart.charAt(0).toLowerCase() + demandPart.slice(1);
    return `${terms}; ${demandText}${subPart}${datePart}${mixPart}`;
  }
  return `${demandPart}${subPart}${datePart}${mixPart}`;
}
