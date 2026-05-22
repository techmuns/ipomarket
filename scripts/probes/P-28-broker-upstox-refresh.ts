// P-28 — Upstox IPO detail refresh (Phase 5C source characterization).
//
// Thin re-run of the Phase 0.1 P-23b probe. Per §Y.5 of the master plan,
// this exists to refresh the broker-page artifacts under
// `phase-0/broker-pages/upstox-*` and capture a current ProbeResult row.
// Reference-only role: Upstox never replaces an official source.

import { makeBrokerPageProbe } from './lib/playwright.ts';
import type { ProbeFn } from './lib/types.ts';

export const probe: ProbeFn = makeBrokerPageProbe({
  probe_id: 'P-28',
  source: 'Upstox — IPO detail refresh (Phase 5C, reference only)',
  url: 'https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/',
  file_prefix: 'upstox',
});
