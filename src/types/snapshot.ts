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

export interface SourceHealthSnapshot {
  generated_at_utc: string;
  totals: { green: number; yellow: number; red: number };
  probes: ProbeHealth[];
}
