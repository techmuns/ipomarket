// P-23b — Upstox IPO detail page (Phase 0.1 information-architecture benchmark).
// Information-architecture reference only. Not a production data source.

import { makeBrokerPageProbe } from './lib/playwright.ts';
import type { ProbeFn } from './lib/types.ts';

export const probe: ProbeFn = makeBrokerPageProbe({
  probe_id: 'P-23b',
  source: 'Broker IPO page — Upstox (reference only)',
  url: 'https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/',
  file_prefix: 'upstox',
});
