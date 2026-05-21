// Typed loaders for the mock snapshot JSON. In Phase 1 these are baked into
// the bundle via Vite's JSON import; in Phase 2 they'll be re-loaded at runtime
// from the same paths (or fetched from a remote source).

import type {
  IpoMasterSnapshot,
  IpoSubscriptionsSnapshot,
  IpoFinancialsSnapshot,
  IpoNarrativeSnapshot,
  IpoDocumentsSnapshot,
  IpoListingPerformanceSnapshot,
  IpoSourceAuditSnapshot,
  SebiPipelineSnapshot,
  SectorMapSnapshot,
  SourceHealthSnapshot,
} from '@/types/snapshot';

import ipoMaster from '@/data/snapshots/ipo-master.json';
import ipoSubscriptions from '@/data/snapshots/ipo-subscriptions.json';
import ipoFinancials from '@/data/snapshots/ipo-financials.json';
import ipoNarrative from '@/data/snapshots/ipo-narrative.json';
import ipoDocuments from '@/data/snapshots/ipo-documents.json';
import ipoListingPerformance from '@/data/snapshots/ipo-listing-performance.json';
import ipoSourceAudit from '@/data/snapshots/ipo-source-audit.json';
import sebiPipeline from '@/data/snapshots/sebi-pipeline.json';
import sectorMap from '@/data/snapshots/sector-map.json';
import sourceHealth from '@/data/snapshots/source-health.json';

export const Snapshots = {
  master: ipoMaster as unknown as IpoMasterSnapshot,
  subscriptions: ipoSubscriptions as unknown as IpoSubscriptionsSnapshot,
  financials: ipoFinancials as unknown as IpoFinancialsSnapshot,
  narrative: ipoNarrative as unknown as IpoNarrativeSnapshot,
  documents: ipoDocuments as unknown as IpoDocumentsSnapshot,
  listingPerformance: ipoListingPerformance as unknown as IpoListingPerformanceSnapshot,
  sourceAudit: ipoSourceAudit as unknown as IpoSourceAuditSnapshot,
  sebiPipeline: sebiPipeline as unknown as SebiPipelineSnapshot,
  sectorMap: sectorMap as unknown as SectorMapSnapshot,
  sourceHealth: sourceHealth as unknown as SourceHealthSnapshot,
} as const;

export function findIpoBySlug(slug: string) {
  return Snapshots.master.ipos.find((i) => i.slug === slug);
}

export function findIpoById(id: string) {
  return Snapshots.master.ipos.find((i) => i.id === id);
}
