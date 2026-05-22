// P-27 — Zerodha IPO detail refresh (Phase 5C source characterization).
//
// Thin re-run of the Phase 0.1 P-23a probe. Per §Y.5 of the master plan,
// this exists to refresh the broker-page artifacts under
// `phase-0/broker-pages/zerodha-*` and capture a current ProbeResult row.
// Reference-only role: Zerodha never replaces an official source.

import { makeBrokerPageProbe } from './lib/playwright.ts';
import type { ProbeFn } from './lib/types.ts';

export const probe: ProbeFn = makeBrokerPageProbe({
  probe_id: 'P-27',
  source: 'Zerodha — IPO detail refresh (Phase 5C, reference only)',
  url: 'https://zerodha.com/ipo/440359/nfp-sampoorna-foods/',
  file_prefix: 'zerodha',
});
