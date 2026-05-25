import type { Ipo, IpoSubscription, ListingPerformance, IpoFinancials, IpoSourceAudit } from '@/types/ipo';

export function minInvestment(ipo: Ipo): number | null {
  if (!ipo.price_band || ipo.lot_size == null) return null;
  return ipo.price_band.high * ipo.lot_size;
}

export type CompletenessTone = 'aggregator' | 'official' | 'manual' | 'sparse';

export interface DataCompleteness {
  source: 'Chittorgarh' | 'Official' | 'Manual' | 'Sparse';
  terms: number;
  tone: CompletenessTone;
}

const ECONOMIC_FIELDS = (ipo: Ipo): Array<unknown> => [
  ipo.price_band,
  ipo.lot_size,
  ipo.issue_size_cr,
  ipo.open_date,
  ipo.close_date,
  ipo.listing_date,
  ipo.face_value,
];

// Compact "how well-filled + by whom" summary for the CompletenessChip. Pure
// read of existing snapshots — no new data, no source logic. `terms` is the
// audit field count when an audit entry carries fields, else the count of
// non-null economic fields. `source` is the dominant source_mix bucket
// (NSE/BSE/SEBI/RHP → Official, chittorgarh → Chittorgarh, manual/derived →
// Manual); a near-empty IPO (<= 1 term) reads as Sparse.
export function dataCompleteness(ipo: Ipo, audit: IpoSourceAudit | undefined): DataCompleteness {
  const terms =
    audit && audit.fields.length > 0
      ? audit.fields.length
      : ECONOMIC_FIELDS(ipo).filter((v) => v != null).length;

  let source: DataCompleteness['source'];
  if (terms <= 1) {
    source = 'Sparse';
  } else if (audit) {
    const m = audit.source_mix;
    const official = (m.nse ?? 0) + (m.bse ?? 0) + (m.sebi ?? 0) + (m.rhp ?? 0);
    const chittorgarh = m.chittorgarh ?? 0;
    const manual = (m.manual ?? 0) + (m.derived ?? 0);
    if (chittorgarh > 0 && chittorgarh >= official && chittorgarh >= manual) source = 'Chittorgarh';
    else if (official > 0 && official >= manual) source = 'Official';
    else source = 'Manual';
  } else {
    source = 'Manual';
  }

  const tone: CompletenessTone =
    source === 'Chittorgarh' ? 'aggregator' : source === 'Official' ? 'official' : source === 'Manual' ? 'manual' : 'sparse';
  return { source, terms, tone };
}

export function subscriptionQualityScore(sub: IpoSubscription | undefined): number | null {
  if (!sub) return null;
  const qib = sub.rows.find((r) => r.category === 'QIB')?.times ?? 0;
  const nii = sub.rows.find((r) => r.category === 'NII')?.times ?? 0;
  const retail = sub.rows.find((r) => r.category === 'Retail')?.times ?? 0;
  // QIB-led demand weighted highest. Simple composite, 0-100.
  const score = 50 + 12 * Math.log10(Math.max(qib, 0.1)) + 4 * Math.log10(Math.max(nii, 0.1)) + 2 * Math.log10(Math.max(retail, 0.1));
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function dToE(fin: IpoFinancials | undefined): number | null {
  if (!fin) return null;
  return fin.derived.d_to_e ?? null;
}

export function listingGainPct(perf: ListingPerformance | undefined): number | null {
  if (!perf || perf.issue_price == null || perf.listing_close == null) return null;
  return ((perf.listing_close - perf.issue_price) / perf.issue_price) * 100;
}

export function currentGainPct(perf: ListingPerformance | undefined): number | null {
  if (!perf || perf.issue_price == null || perf.current_price == null) return null;
  return ((perf.current_price - perf.issue_price) / perf.issue_price) * 100;
}

// Used by IpoCard mini bar and the Subscription Heatmap.
export function totalSubscriptionTimes(sub: IpoSubscription | undefined): number | null {
  if (!sub) return null;
  return sub.rows.find((r) => r.category === 'Total')?.times ?? null;
}
