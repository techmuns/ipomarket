// Probe record shape — must match Section L.2 of the master plan.

export type ProbeStatus = 'GREEN' | 'YELLOW' | 'RED';
export type ResponseType = 'JSON' | 'CSV' | 'HTML' | 'PDF' | 'BLOCKED' | 'EMPTY' | 'ERROR';

export interface ProbeResult {
  probe_id: string;
  source: string;
  url_or_endpoint: string;
  fetch_method: string;
  headers_or_cookies_required: string[];
  status_code: number | null;
  response_type: ResponseType;
  fields_found: string[];
  fields_missing: string[];
  sample_record: string;
  parsing_difficulty: 'Easy' | 'Medium' | 'Hard';
  anti_bot_risk: 'Low' | 'Medium' | 'High';
  legal_tos_risk: 'Low' | 'Medium' | 'High';
  freshness_or_update_frequency: string;
  status: ProbeStatus;
  recommended_action: string;
  fallback_source: string;
  ran_at_utc: string;
  latency_ms: number;
  notes: string;
}

export interface ProbeContext {
  outDir: string;
  samplesDir: string;
  nowIso: string;
}

export type ProbeFn = (ctx: ProbeContext) => Promise<ProbeResult>;

export const PROBE_GROUPS = {
  A: ['P-01', 'P-02', 'P-03', 'P-04', 'P-05'],
  B: ['P-08', 'P-08b', 'P-09', 'P-10'],
  C: ['P-15', 'P-15b', 'P-16'],
  D: ['P-06', 'P-06b', 'P-07'],
  E: ['P-11', 'P-12', 'P-13', 'P-14', 'P-14b'],
  F: ['P-17', 'P-18'],
  G: ['P-19', 'P-20', 'P-21', 'P-22'],
  // Phase 0.1 — broker IPO page benchmark (Zerodha, Upstox). Reference only.
  H: ['P-23a', 'P-23b'],
  // Phase 0.1 repair pass — auxiliary classifiers (sector mapping).
  I: ['P-24'],
} as const;

export type ProbeGroup = keyof typeof PROBE_GROUPS;
