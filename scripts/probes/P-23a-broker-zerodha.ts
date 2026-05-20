// P-23a — Zerodha IPO detail page (Phase 0.1 information-architecture benchmark).
// Information-architecture reference only. Not a production data source.

import { makeBrokerPageProbe } from './lib/playwright.ts';
import type { ProbeFn } from './lib/types.ts';

export const probe: ProbeFn = makeBrokerPageProbe({
  probe_id: 'P-23a',
  source: 'Broker IPO page — Zerodha (reference only)',
  url: 'https://zerodha.com/ipo/440359/nfp-sampoorna-foods/',
  file_prefix: 'zerodha',
});
