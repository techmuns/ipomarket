// Shared types + helpers for the ingest runner.
//
// Every slice's `run()` returns a SliceResult — never throws for *expected*
// upstream failures (HTTP non-200, JSON parse, missing scripcode). It only
// throws for unclassified runtime/code exceptions (programming bugs), which
// the runner does NOT catch — those propagate and fail the workflow.

import type { MergeStats } from './merge.ts';

export type SourceState =
  | 'live'     // fetched, has rows, snapshot updated
  | 'empty'    // fetched, valid shape, zero rows in current snapshot
  | 'failed'   // expected upstream failure (HTTP/parse/shape), snapshot preserved
  | 'missing'  // upstream artifact missing (Phase 2A bridge path)
  | 'skipped'  // not eligible (e.g. no open IPO for subscriptions); snapshot preserved
  | 'partial'; // mixed: at least one sub-source live AND at least one failed

export interface SliceResult {
  name: string;
  source_state: SourceState;
  counts: MergeStats;
  errors: string[];   // one entry per expected failure path that was hit
  notes: string;      // free-form summary line for logs + the status report
}

export function emptySliceResult(name: string, source_state: SourceState = 'empty'): SliceResult {
  return {
    name,
    source_state,
    counts: { added: 0, updated: 0, preserved: 0 },
    errors: [],
    notes: '',
  };
}

// Tiny progress-print helper that matches the [ingest:X] prefix used by
// every slice's stdout.
export function log(slice: string, msg: string): void {
  console.log(`[ingest:${slice}] ${msg}`);
}

export function warn(slice: string, msg: string): void {
  console.warn(`[ingest:${slice}] ${msg}`);
}
