# Phase 2 (consolidated 2B–E) — Status Report

> **Date**: 2026-05-21
> **Scope**: implement NSE IPO master, Listing performance + Sector, Subscription, and Source-audit/health slices in one pass; wire all four through a single runner alongside the existing Phase 2A SEBI bridge. **Phase 2A remains the first step.**
> **Branch**: `main`

---

## 1. Scripts added

| File | Purpose |
|---|---|
| `scripts/ingest/run.ts` | Orchestrator — calls each slice's `run()` in order; passes `SliceResult[]` to 2E; never catches programming bugs (those fail the workflow). |
| `scripts/ingest/nse-ipos.ts` | Phase 2B. Fetches both `category=ipo` (mainboard) and `category=sme`. Maps NSE rows → `Ipo` shape with id from slugified company name. Tolerant date parser (`DD-MMM-YYYY` and ISO). Merge-by-id, preserves synthetics. |
| `scripts/ingest/listing-performance.ts` | Phase 2C. Per listed IPO with a known scripcode, fetches BSE `StockReachGraph` + NSE `quote-equity`. Skipped without mapping. Computes listing-gain and current-gain percentages. |
| `scripts/ingest/sector-map.ts` | Phase 2C (sub-step). NSE `industryInfo` for listed equities with a known symbol. Pre-IPO entries stay manual. |
| `scripts/ingest/subscriptions.ts` | Phase 2D. Per `status=open` IPO, hits `/api/ipo-current-issue?symbol=X`. Defensive field-pick across schema variants. Merges `daily[]` history. |
| `scripts/ingest/source-audit.ts` | Phase 2E. Recomputes per-IPO `source_mix` from the current `fields[]` array; rebuilds `source-health.json` from `phase-0/source-probe-results.json` and from the in-memory slice results captured by the runner. |
| `scripts/ingest/lib/slice.ts` | `SliceResult` shape + `SourceState` enum + small log helpers (`log`, `warn`). |
| `scripts/ingest/lib/http.ts` | Thin re-export of `scripts/probes/lib/http.ts` so ingest code has one stable import path. |
| `scripts/ingest/lib/symbol-map.ts` | Empty `BSE_SCRIPCODES` / `NSE_SYMBOLS` maps (populated as real symbols land). Renamed from the originally-proposed `sebi-ipo-map.ts` since it stores exchange symbols, not SEBI data. |

Modified: `scripts/ingest/sebi-pipeline.ts` (refactored to export `run(): Promise<SliceResult>` so the runner can invoke it as a slice; standalone `npm run ingest:sebi` path preserved). Workflow `.github/workflows/ingest.yml` swapped to call `npm run ingest`. `package.json` gained five new `ingest:*` scripts.

## 2. Snapshots changed (first local run)

| Snapshot | Touched by | Effect |
|---|---|---|
| `sebi-pipeline.json` | 2A | timestamp + `source_state: live` refreshed; 19 SEBI rows refreshed; 14 legacy rows preserved |
| `ipo-documents.json` | 2A | 5 IPO cross-fills refreshed (InCred + 4) |
| `ipo-source-audit.json` | 2A + 2E | 5 SEBI audit entries refreshed; **source_mix recomputed for 10 IPOs** (7 changed on first run, 0 on second — idempotent) |
| `ipo-master.json` | 2B (no live data; preserved) | sorted by id (stable order); top-level `source_meta` added with `nse_mainboard.source_state=failed` + `nse_sme.source_state=failed` |
| `ipo-listing-performance.json` | 2C-listing (skipped) | top-level `source_meta: source_state=skipped` added; existing 2 rows untouched |
| `sector-map.json` | 2C-sector (skipped) | unchanged (no listed IPO has an NSE symbol mapping yet) |
| `ipo-subscriptions.json` | 2D (failed) | top-level `source_meta: source_state=failed` added; existing 5 rows untouched |
| `source-health.json` | 2E | refreshed; **5 ingest slice results captured** alongside the 29 probe records (10G/11Y/8R) |

## 3. Per-slice run summary (first local run)

```
sebi                 live     +0/~19/=14  pipeline: +0/19/14 · docs: +0/5 · audit: +0/5 · matches: 5
nse                  failed   +0/~0/=10   mainboard=failed · sme=failed · 10 existing preserved
listing              skipped  +0/~0/=2    2 listed IPOs · no scripcode mapping · 2 preserved
sector               skipped  +0/~0/=0    0 of 2 listed IPOs have NSE symbol · sector-map unchanged
subscription         failed   +0/~0/=5    2 open IPOs · 5 existing rows preserved
2E-source-audit      live     +0/~7/=29   audit mix recomputed (7 changed) · health: 10G/11Y/8R
totals: live=2 empty=0 failed=2 skipped=2 missing=0
```

Second run (idempotency check):
```
sebi                 live     +0/~19/=14
nse                  failed   +0/~0/=10
listing              skipped  +0/~0/=2
sector               skipped  +0/~0/=0
subscription         failed   +0/~0/=5
2E-source-audit      live     +0/~0/=29   (mix recompute now finds 0 changed)
```

Structurally identical between runs — only the `generated_at_utc` / `fetched_at_utc` timestamps advance.

## 4. Sources that returned empty / failed in the sandbox

- **NSE mainboard + SME** → `failed` (HTTP 403: "Host not in allowlist") — the sandbox blocks `nseindia.com`. **Expected**; CI runners have unrestricted egress and will hit the real endpoints. Sandbox is the wrong environment to gate this — see §5.
- **NSE subscription** → `failed` (same 403). Same expectation.
- **BSE listing OHLC** → not even attempted in the sandbox (no listed IPO has a scripcode mapping yet). Same will be true on CI until a real IPO lists.
- **NSE sector industryInfo** → not attempted (no listed IPO with NSE symbol mapping).

The CI run will likely show:
- NSE master: either `live` (if there's an active IPO in NSE's feed) or `empty` (snapshot has 0 rows that day).
- NSE subscription: either `live` (per-open-IPO success) or `failed` per-IPO (no NSE listing for the SME ticker, e.g. Vegorama only on BSE).
- Listing + sector: still `skipped` until symbol-map.ts is populated for real listings.

## 5. What is now live vs still manual/mock

**Live (refreshed automatically on every ingest run)**:
- `sebi-pipeline.json` — 19 real DRHP filings.
- `ipo-documents.json` — 5 IPOs with SEBI DRHP cross-fills (InCred Holdings, Online Instruments, Jindal Supreme, Playsimple Games, Punjab Carbonic).
- `ipo-source-audit.json` — per-IPO source-mix recomputed every run from current `fields[]`.
- `source-health.json` — per-probe statuses (29 probes) + per-slice ingest results (5 slices) at every run.
- *(Pending CI)* `ipo-master.json` — when NSE returns at least one IPO, that row lands live; existing synthetic rows continue to survive.
- *(Pending CI)* `ipo-subscriptions.json` — when an open NSE-listed IPO is active, that row lands live; broker-seeded NFP/Vegorama rows survive until a matching NSE response replaces them.

**Manual / synthetic (preserved by safe-merge)**:
- NFP Sampoorna Foods + Vegorama Punjabi Angithi subscription rows (broker-derived).
- Lumino Hyperscale, Greendale Cement, Quasar Robotics master rows + listing-performance rows.
- Sector map entries for pre-IPO companies.
- Manual `fields` entries in `ipo-source-audit.json` (`company_overview`, `strengths`, `risks`, RHP-derived rows).

**Deferred to later phases**:
- RHP financial parsing → Phase 5 (P-17).
- Anchor PDF parsing → Phase 5 (P-18).
- GMP indicative band → Phase 6, optional.
- Direct SEBI refetch (currently artifact-only bridge) → Phase 2A.1, optional hardening.

## 6. CI failure semantics (binding, per master plan §S.6)

- **Expected upstream failure** (HTTP non-200, JSON parse, missing scripcode, no open IPO): each slice catches internally → returns `SliceResult.source_state = 'failed' | 'empty' | 'skipped'` → runner records and continues → **workflow green**, snapshot preserved.
- **Unexpected runtime/code exception**: nothing in the runner catches it → propagates → **workflow red**, no commit.
- `npm run typecheck` or `npm run build` failure → **workflow red**, no commit.

Per-slice idempotency is the safety property that makes re-running cheap.

## 7. Verification done locally

- `npm run typecheck` — pass.
- `npm run ingest` first run — all 6 slices completed; expected-failure rows recorded; snapshots preserved.
- `npm run ingest` second run — structurally identical; mix-recompute now finds 0 changes.
- `npm run build` — pass (19.31 s, no regressions).

The sandbox cannot reach NSE / BSE (HTTP 403 across the board); CI will exercise the real network paths.

## 8. Workflow

`.github/workflows/ingest.yml` updated:
1. Checkout `main` (fetch-depth 0).
2. Setup Node 20 + cache.
3. `npm install`.
4. `npm run ingest` — single command runs all 5 ingest slices + 2E.
5. `npm run typecheck` — blocks bad snapshots from main.
6. `npm run build` — proves snapshots still satisfy the UI types.
7. Show changed files (`git status --short`).
8. Commit changed snapshots back (rebase + 3× retry).

Trigger: `workflow_dispatch` only. No cron.

## 9. Next step

**You manually trigger `ingest`**: GitHub UI → Actions → `ingest` → Run workflow → branch `main`.

Expected CI outcome (assuming nothing has changed market-side since the workflow last touched main):
- 2A SEBI: live, 19 rows refreshed (timestamps move forward).
- 2B NSE: likely `failed` per-feed if NSE rate-limits the GH runner, or `empty` if NSE has 0 mainboard/SME IPOs in `category=ipo` / `category=sme` right now. Either way: snapshot preserved.
- 2C listing + sector: `skipped` (no symbol mappings yet for real listings).
- 2D subscription: per-IPO `failed` (Vegorama is BSE-only; NFP may or may not return data on the NSE SME endpoint). Existing broker-derived rows preserved.
- 2E source-audit: `live` — recomputes mix, refreshes source-health.

Cloudflare auto-deploy follows automatically if any snapshot commit lands.

After CI, I will pull and report:
- Per-slice CI outcomes.
- Snapshot changes.
- Source-health refresh.
- Cloudflare deploy status.

## 10. What's NOT in this slice

- No GMP scraping.
- No RHP / anchor PDF parsing beyond what P-09 already validates.
- No Trendlyne / Zerodha / Upstox production scraping.
- No database / Cloudflare Workers / KV.
- No UI redesign.
- No cron (workflow_dispatch only).
- No new dependencies. All ingest code reuses `tsx`, Node built-ins, and existing probe-side `http.ts`.

Phase 2 consolidated pass closes once you've triggered the workflow and reviewed the CI outcome.
