// Snapshot file shapes — one per JSON file under src/data/snapshots.

import type {
  Ipo,
  IpoTimeline,
  IpoSubscription,
  IpoFinancials,
  IpoNarrative,
  IpoDocuments,
  ListingPerformance,
  IpoSourceAudit,
  SebiPipelineEntry,
  SectorMapEntry,
} from './ipo.ts';
import type { ProbeHealth } from './source.ts';

export interface IpoMasterSnapshot {
  generated_at_utc: string;
  ipos: Ipo[];
  timelines: IpoTimeline[];
}

export interface IpoSubscriptionsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoSubscription>;
}

export interface IpoFinancialsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoFinancials>;
}

export interface IpoNarrativeSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoNarrative>;
}

export interface IpoDocumentsSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoDocuments>;
}

export interface IpoListingPerformanceSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, ListingPerformance>;
}

export interface IpoSourceAuditSnapshot {
  generated_at_utc: string;
  by_ipo: Record<string, IpoSourceAudit>;
}

export interface SebiPipelineSnapshot {
  generated_at_utc: string;
  source_url: string;
  entries: SebiPipelineEntry[];
}

export interface SectorMapSnapshot {
  generated_at_utc: string;
  entries: SectorMapEntry[];
}

/**
 * One row per ingest slice (produced by the consolidated runner in
 * `scripts/ingest/run.ts`). Mirrors the ingest-side SliceResult shape.
 *
 * `partial` = some sub-sources live and some failed in the same slice
 * (e.g. NSE mainboard live but NSE SME failed). Rendered amber/awaiting.
 */
export interface SliceResult {
  name: string;
  source_state: 'live' | 'empty' | 'failed' | 'missing' | 'skipped' | 'partial';
  counts: { added: number; updated: number; preserved: number };
  errors: string[];
  notes: string;
}

export interface SourceHealthSnapshot {
  generated_at_utc: string;
  totals: { green: number; yellow: number; red: number };
  probes: ProbeHealth[];
  ingest_slices?: SliceResult[];
}
