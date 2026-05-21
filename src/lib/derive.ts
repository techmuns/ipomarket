import type { Ipo, IpoSubscription, ListingPerformance, IpoFinancials } from '@/types/ipo';

export function minInvestment(ipo: Ipo): number | null {
  if (!ipo.price_band || ipo.lot_size == null) return null;
  return ipo.price_band.high * ipo.lot_size;
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
