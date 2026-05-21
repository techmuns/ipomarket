// Thin re-export of the probe-side HTTP helpers so ingest scripts have one
// stable import path. The probe code remains the canonical implementation.

export {
  httpGet,
  httpGetBinary,
  warmNseCookies,
  warmNseEquityPage,
  truncate,
  BASE_HEADERS,
} from '../../probes/lib/http.ts';

export type {
  FetchResult,
  FetchBinaryResult,
} from '../../probes/lib/http.ts';
