// Source-audit + freshness types used everywhere a datum is rendered.

export type SourceTag =
  | 'NSE'
  | 'BSE'
  | 'SEBI'
  | 'RHP'
  | 'Registrar'
  | 'Manual'
  | 'Broker-ref' // Zerodha/Upstox used as IA reference only — never as data source
  | 'Chittorgarh' // vetted aggregator; gap-fill only, never overwrites official (Phase 6A.2)
  | 'Derived';

export type DataState =
  | 'live'         // real data from an automated source
  | 'awaiting'     // source reachable, no rows in current snapshot
  | 'manual'       // value populated from a human-curated seed
  | 'aggregator'   // real data from a vetted aggregator (Chittorgarh); below official, gap-fill only
  | 'unavailable'; // source RED and no fallback

export interface SourceAuditEntry {
  source: SourceTag;
  url: string | null;
  fetched_at_utc: string | null;
  confidence: 'high' | 'medium' | 'low';
  state: DataState;
  note?: string;
}

// Per-IPO mix used by the Source Audit Panel (S17 on the detail page).
export interface SourceMix {
  ipo_id: string;
  totals: { nse: number; bse: number; sebi: number; rhp: number; manual: number; derived: number; broker_ref: number; chittorgarh?: number };
  // Each entry references which field that source covers (for hovers / debug).
  fields: Array<{ field: string; source: SourceTag; state: DataState; url: string | null; fetched_at_utc: string | null }>;
}

export interface ProbeHealth {
  probe_id: string;
  source: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  status_code: number | null;
  response_type: string;
  notes: string;
  ran_at_utc: string;
  latency_ms: number;
  recommended_action: string;
  fallback_source: string;
}
