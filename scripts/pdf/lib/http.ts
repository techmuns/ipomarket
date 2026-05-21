// Thin re-export of the probe-side HTTP helpers so Phase 5A's orchestrator
// (and the Phase 5A.1 discovery helper) share the same cookie jar / UA /
// timeout behavior as P-09 / P-08.

export {
  httpGet,
  httpGetBinary,
  truncate,
  type FetchBinaryResult,
  type FetchResult,
} from '../../probes/lib/http.ts';
