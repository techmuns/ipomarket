import type { DataState, SourceAuditEntry } from './source.ts';

export type Segment = 'mainboard' | 'sme';
export type IpoStatus = 'upcoming' | 'open' | 'closed' | 'listed' | 'withdrawn';

export interface IpoSector {
  macro: string;
  sector: string;
  industry: string;
  basic_industry?: string;
}

export interface PriceBand {
  low: number;
  high: number;
}

export interface Reservation {
  qib_pct: number;
  nii_pct: number;
  retail_pct: number;
  emp_pct: number;
}

export interface Ipo {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  segment: Segment;
  status: IpoStatus;
  sector: IpoSector | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  price_band: PriceBand | null;
  lot_size: number | null;
  issue_size_cr: number | null;
  fresh_cr: number | null;
  ofs_cr: number | null;
  face_value: number | null;
  listing_exchange: Array<'NSE' | 'BSE'>;
  reservation: Reservation | null;
  state: DataState;
  // Per-IPO short tagline for cards (optional).
  tagline?: string | null;
  // Real NSE symbol when 2B NSE master ingest populated this row. Used by 2D
  // subscriptions to fetch /api/ipo-current-issue?symbol=<real-symbol>
  // instead of guessing from the slug.
  nse_symbol?: string | null;
}

export interface IpoTimeline {
  ipo_id: string;
  bid_open: string | null;
  bid_close: string | null;
  upi_mandate_deadline: string | null;
  allotment_finalization: string | null;
  refund_initiation: string | null;
  share_credit: string | null;
  listing_date: string | null;
  anchor_lockin_50pct_end: string | null;
  anchor_lockin_100pct_end: string | null;
}

export interface SubscriptionRow {
  category: 'QIB' | 'NII' | 'Retail' | 'Employee' | 'Anchor' | 'Total';
  times: number;
  reserved_shares_lakhs?: number | null;
  applied_shares_lakhs?: number | null;
}

export interface IpoSubscription {
  ipo_id: string;
  as_of_utc: string;
  state: DataState;
  rows: SubscriptionRow[];
  daily: Array<{
    date: string;
    qib: number;
    nii: number;
    retail: number;
    total: number;
  }>;
}

export interface FinancialPeriod {
  period: string;       // e.g. "FY 24" / "FY 25" / "9M FY 26"
  revenue_cr: number | null;
  ebitda_cr: number | null;
  pat_cr: number | null;
  assets_cr: number | null;
  net_worth_cr?: number | null;
  debt_cr?: number | null;
  eps?: number | null;
}

export interface IpoFinancials {
  ipo_id: string;
  state: DataState;
  periods: FinancialPeriod[];
  derived: {
    revenue_3y_cagr_pct?: number | null;
    pat_3y_cagr_pct?: number | null;
    d_to_e?: number | null;
    market_cap_cr?: number | null;
    pe_at_upper_band?: number | null;
  };
}

export interface ObjectiveLine {
  purpose: string;
  amount_cr: number | null;
  pct: number | null;
}

export interface IpoNarrative {
  ipo_id: string;
  state: DataState;
  company_overview: string | null;
  strengths: string[];
  risks: string[];
  objectives: ObjectiveLine[];
  promoters?: string[];
  promoter_holding_pre_pct?: number | null;
  promoter_holding_post_pct?: number | null;
  shares_pledged_pct?: number | null;
}

export interface IpoDocument {
  kind: 'DRHP' | 'RHP' | 'Anchor' | 'AllotmentBasis' | 'Prospectus';
  url: string;
  title: string;
  fetched_at_utc: string | null;
  bytes?: number;
  page_count?: number;
}

export interface IpoDocuments {
  ipo_id: string;
  state: DataState;
  docs: IpoDocument[];
  registrar: { name: string; portal_url: string | null } | null;
  brlms: string[];
}

export interface ListingPerformance {
  ipo_id: string;
  state: DataState;
  issue_price: number | null;
  listing_open: number | null;
  listing_high: number | null;
  listing_low: number | null;
  listing_close: number | null;
  current_price: number | null;
  listing_gain_pct: number | null;
  current_gain_pct: number | null;
  listing_date: string | null;
  // Source for the listing data. Official exchange (NSE/BSE), human seed
  // ('manual'), or — when the bounded source ladder falls through to a vetted
  // public fallback — 'Chittorgarh' / 'Broker-ref' (state then carries
  // 'aggregator'). Additive widening only; no consumer switches on this value.
  source: 'NSE' | 'BSE' | 'manual' | 'Chittorgarh' | 'Broker-ref';
}

export interface IpoSourceAudit {
  ipo_id: string;
  source_mix: { nse: number; bse: number; sebi: number; rhp: number; manual: number; derived: number; broker_ref: number; chittorgarh?: number };
  fields: Array<{ field: string; source: import('./source.ts').SourceTag; state: DataState; url: string | null; fetched_at_utc: string | null }>;
}

export interface SebiPipelineEntry {
  id: string;
  company_name: string;
  doc_type: string;     // "Draft Abridged Prospectus" etc
  url: string;
  filing_month: string; // "may-2026"
  status: 'filed' | 'observations_issued' | 'cleared' | 'withdrawn';
  sector_hint?: string | null;
}

export interface SectorMapEntry {
  slug: string;
  macro: string;
  sector: string;
  industry: string;
  basic_industry?: string;
  source: 'manual' | 'nse-post-listing' | 'rhp-cover';
}

// Re-exports for convenience.
export type { DataState, SourceAuditEntry };
