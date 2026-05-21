# Phase 2 — Ingestion Plan (planning only; not implementation)

> **Mode**: planning. **Implementation does NOT begin from this document.** Phase 2A is the first slice and must be explicitly approved via the §9 prompt.
>
> Phase 1 is live at `https://ipomarket-pages.pages.dev/`. Phase 2 must not break the live build.

## 1. Phase 2 objective

The Phase 1 dashboard reads typed JSON from `src/data/snapshots/`. Most fields are still mock / manual / synthetic. Phase 2 introduces **per-snapshot ingestion scripts** that pull from already-validated official sources (Phase 0 / 0.1 probes) and write back into the same paths. The UI does not change shape — only the values in the JSON files do. Cloudflare Pages auto-redeploys on every snapshot commit.

Phase 2 replaces selected mock / manual snapshot fields with auto-ingested data from **NSE / BSE / SEBI** while keeping the live dashboard rendering stable. Trendlyne / Zerodha / Upstox stay reference-only; no scraping. No database. No Cloudflare Workers. No UI changes. RHP narrative / financial parsing stays Phase 5; manual seed remains the v1 fallback for those fields.

## 2. Current snapshot inventory

(All under `src/data/snapshots/`.)

| Snapshot | UI modules powered | Current state | Future ingestion source | Phase 2 slice |
|---|---|---|---|---|
| `ipo-master.json` | Market Pulse · Open & Upcoming · Listing Soon · Recently Listed · Screener · IPO Detail hero · timeline · status badges everywhere | mix (NFP + Vegorama transcribed live; InCred from SEBI; 5 synthetic / pipeline) | NSE `all-upcoming-issues?category=ipo` + `?category=sme` (P-01/02/03/05); BSE fallback (P-06/06b) | **2B** |
| `ipo-subscriptions.json` | Market Pulse leaderboard · Open & Upcoming card mini-bars · Subscription Heatmap · IPO Detail Subscription tab | NFP + Vegorama live; 3 synthetic | NSE subscription (P-04); BSE (P-07) fallback | **2D** |
| `ipo-financials.json` | IPO Detail Analysis tab (Financials chart) · Quality/Risk checklist | manual (Vegorama from Upstox; 3 synthetic) | Manual seed CLI at v1 → RHP parser (P-17) at Phase 5 | **defer to Phase 2.5 / 5** |
| `ipo-narrative.json` | IPO Detail Analysis tab (Strengths / Risks / Objectives / About / Promoter) | manual (NFP from Zerodha; Vegorama from Upstox) | Manual seed CLI at v1 → RHP parser (P-17) at Phase 5 | **defer to Phase 2.5 / 5** |
| `ipo-documents.json` | IPO Detail Documents tab · Listing Soon registrar link · Pipeline doc links | InCred RHP=live (P-09 validated, 13 pages); others synthetic | SEBI (P-08/09); per-IPO matching from `sebi-pipeline.json` | **2A** |
| `ipo-listing-performance.json` | Recently Listed table + bar + fade scatter · Market Pulse "avg listing gain" / "hit rate" KPIs | 2 synthetic (Lumino, Greendale) | BSE historical (P-15 GREEN via BSE) + NSE quote (P-15b GREEN) | **2C** |
| `ipo-source-audit.json` | IPO Detail Source Audit panel (per-IPO mix bar) | hand-mapped | Auto: each ingest writes its own entries | **2E** |
| `sebi-pipeline.json` | DRHP Pipeline Watch table · status tiles | **already live** (19 real SEBI rows from P-08) | SEBI (P-08) — refresh daily | **2A** |
| `sector-map.json` | Sector tags · sector treemap · screener filter | manual (6 entries) | NSE equity `industryInfo` (P-24) for post-listed; manual for pre-IPO | **2C hybrid** |
| `source-health.json` | Source Health page · top-bar pill | mirrored from `phase-0/source-probe-results.json` | Auto-refresh after every probe workflow run | **2E** |

## 3. Source readiness from probes (current snapshot)

| Source / probe | Status | Phase 2 implication |
|---|---|---|
| NSE IPO list (P-01/02/03) | YELLOW — reachable, current snapshot empty | 2B will write nothing on empty days; existing rows survive |
| NSE Emerge SME (P-05) | YELLOW — modern URLs reachable, empty | Same as above; SME-day support proven |
| NSE subscription (P-04) | YELLOW — depends on active IPO | 2D no-ops when no IPO open |
| SEBI Public Issues (P-08) | **GREEN** — 19 DRHP URLs harvested | **2A primary** |
| DRHP PDF download (P-09) | **GREEN** — InCred 13-page DRHP validated end-to-end | 2A reuses P-09 output for `ipo-documents.json` cross-fill |
| Exchange DRHP archive (P-10) | RED — out of v1 ingest scope; pure fallback in future |
| BSE listing OHLC (P-15 via BSE fallback) | **GREEN** | 2C primary source |
| NSE current quote (P-15b) | **GREEN** | 2C for current-price field |
| Registrar landings (P-12/13/14/14b) | **GREEN** | Link-out only (already wired in mock); no ingest needed |
| Registrar resolution table (P-11) | RED | Manual map in v1; no ingest |
| Sector classification (P-24) | YELLOW — NSE equity `industryInfo` works for listed; pre-IPO needs manual | 2C hybrid |
| Anchor PDFs (P-18) | YELLOW | Phase 5 |
| GMP (P-19/P-22) / (P-20/P-21) | YELLOW / RED | Optional; Phase 6 |
| Broker pages (P-23a/b) | GREEN — **reference only**, never a data source |

## 4. Safe merge rules (binding for every ingest script)

1. **Read-existing-first**: every ingest script reads the current snapshot file before fetching, holds the existing rows in a `Map` keyed by `id` / `ipo_id` / `url` (see per-snapshot key in §6).
2. **Source-empty ≠ source-failed**:
   - **Source-empty**: fetch returned 200 + valid shape + zero rows. Action: write `{ source_state: 'empty', last_attempted_utc: ... }` into the snapshot's top-level metadata; keep existing rows untouched.
   - **Source-failed**: HTTP error, parse error, schema mismatch. Action: write `{ source_state: 'failed', last_attempted_utc, last_error: '...' }`; keep existing rows untouched; emit an entry into `source-health.json`.
3. **Never wipe manual rows**: if an existing row has `state: 'manual'`, it survives unless a new fetched row carries the same matching key AND is non-empty in the fields the manual row populated.
4. **Per-row provenance**: every row touched by an ingest script gets `state: 'live'`, `source: <SourceTag>`, `fetched_at_utc: <ISO>`. Untouched rows keep their existing `state`.
5. **State badges**:
   - `live` only when this run's fetch produced the row.
   - `awaiting` for rows the dashboard expects but the source did not produce in current snapshot (e.g. an IPO row in the master that has no subscription row yet because bidding hasn't opened).
   - `manual` for rows seeded by hand and not contradicted by a live row.
   - `unavailable` only after N consecutive `source-failed` runs (configurable; default 3).
6. **Idempotency**: re-running an ingest with identical upstream data must produce a byte-identical snapshot (modulo `fetched_at_utc`). Sort arrays by stable key before writing.
7. **Atomic writes**: write to `snapshot.json.tmp` then `rename()`. Never half-write a snapshot.
8. **Build-deploy independence**: ingest failures (§4.2 source-failed OR script runtime error) MUST NOT corrupt a snapshot. The dashboard ALWAYS builds and deploys.

## 5. Phase 2A recommendation — start here

**SEBI Pipeline + Documents ingestion** is the right first slice because:

- **P-08 is GREEN**, exercised twice already, with real data on `main`. No regression risk.
- **P-09 GREEN** validates the full PDF pipeline end-to-end. We are not building new probe machinery — we are wiring an ingest layer on top of already-proven probe artifacts.
- **Government data source.** Zero legal risk. Zero ToS exposure. No anti-bot fragility.
- **Improves a live module without depending on active IPO market state.** The Pipeline page already shows 19 real SEBI rows; 2A refreshes them daily and cross-fills `ipo-documents.json` for any pipeline entry that becomes an actual IPO in `ipo-master.json` (InCred Holdings is the obvious first match).
- **Decoupled from NSE warm-chain fragility.** No cookies, no anti-bot, no JS rendering.

**Phase 2A is an artifact-to-snapshot bridge, not a direct SEBI refetch.** The probe workflow (`phase-0-probes.yml`) is already responsible for keeping `phase-0/samples/sebi-publicissues-pdfs.json` fresh on `main` — P-08 runs on cron + workflow_dispatch and commits its artifacts back. Phase 2A reads that committed artifact, transforms it into the UI-shape snapshot files, and never touches the network. **Direct SEBI refetching from the ingest script itself is a later hardening step** (potentially Phase 2A.1) once the bridge is proven stable; we explicitly defer it now to keep Phase 2A scope minimal.

## 6. Phase 2 implementation slices

Each slice is a separate small commit. None is started without explicit user approval.

### Phase 2A — SEBI Pipeline + Documents
- **New file**: `scripts/ingest/sebi-pipeline.ts`
- **Inputs**: `phase-0/samples/sebi-publicissues-pdfs.json` (already maintained by the probe workflow).
- **Outputs**:
  - `src/data/snapshots/sebi-pipeline.json` — merge by `url` key; preserve existing rows; assign stable `id` via company-name slugify.
  - `src/data/snapshots/ipo-documents.json` — for any pipeline row whose company-name slug matches an `Ipo.slug` in `ipo-master.json`, upsert a `DRHP` document entry; never overwrite existing `RHP` entries.
  - `src/data/snapshots/ipo-source-audit.json` — append a `SourceAuditEntry { source: 'SEBI', url, fetched_at_utc, state: 'live' }` to each affected IPO's `fields[]`.
- **Reuses**: existing `src/lib/loadSnapshots.ts` shapes; existing `SebiPipelineEntry` type.

### Phase 2B — NSE IPO Master
- **New file**: `scripts/ingest/nse-ipos.ts`
- **Inputs**: NSE endpoints — `api/all-upcoming-issues?category=ipo` (mainboard) + `?category=sme` (SME). Uses `scripts/probes/lib/http.ts` warmup + cookie helpers.
- **Outputs**: `src/data/snapshots/ipo-master.json` — merge by `Ipo.id` (slugified `symbol` or `companyName`). Preserve synthetic IPOs (Quasar, Lumino, Greendale) via a static `do-not-overwrite` allow-list.
- **Empty handling**: if both endpoints return `[]`, write top-level `source_state: 'empty'`; touch nothing else.
- **Status derivation**: derive `Ipo.status` from `open_date` / `close_date` / `listing_date` relative to `now`.

### Phase 2C — Listing Performance + Sector
- **New file**: `scripts/ingest/listing-performance.ts`
- **Inputs**: for each `Ipo.status === 'listed'`, hit BSE historical (proven GREEN via `api.bseindia.com/StockReachGraph`) and NSE quote (P-15b GREEN).
- **Outputs**: `src/data/snapshots/ipo-listing-performance.json` — issue price, listing OHLC, current price, computed `listing_gain_pct` + `current_gain_pct`. Marks `source: 'BSE'` (or NSE for current quote).
- **Sector sub-step**: `scripts/ingest/sector-map.ts` — for any listed equity now in master, fetch NSE `quote-equity?symbol=X.industryInfo` and upsert into `sector-map.json`. Pre-IPO entries stay manual.
- **Pre-listing IPOs**: no-op.

### Phase 2D — Subscription Snapshot
- **New file**: `scripts/ingest/subscriptions.ts`
- **Inputs**: for each `Ipo.status === 'open'`, hit NSE subscription endpoint.
- **Outputs**: `src/data/snapshots/ipo-subscriptions.json` — append today's daily row, refresh latest `rows[]`, recompute `as_of_utc`.
- **Empty handling**: if no `open` IPO in master, source-empty → no writes.

### Phase 2E — Source Audit + Source Health
- **New file**: `scripts/ingest/source-audit.ts`
- **Inputs**: post-Phase-2A/B/C/D writes; plus `phase-0/source-probe-results.json` for the health view.
- **Outputs**:
  - `src/data/snapshots/source-health.json` — rebuild from latest probe-run JSON.
  - `src/data/snapshots/ipo-source-audit.json` — recompute per-IPO source-mix percentages from the audit-entry array.
- **No upstream fetch**. Purely a post-processor over the other ingests' output.

## 7. GitHub Actions design

- **File**: `.github/workflows/ingest.yml`
- **Initial trigger**: `workflow_dispatch` only. Conservative cron (every 4 h between 03:00 and 19:00 UTC) added only after one full week of clean manual runs.
- **Permissions**: `contents: write` (commit-back).
- **Steps**:
  1. Checkout `main`, `fetch-depth: 0`.
  2. Setup Node 20 + cache.
  3. `npm install --no-audit --no-fund`.
  4. (Phase 2A) Setup Python 3.11 + `pip install -r requirements.txt` for `pdf-parse.py` if subsequent slices need it.
  5. Run ingest slices in dependency order — first whichever slice(s) are enabled:
     - 2A: SEBI pipeline + documents.
     - 2B: NSE master.
     - 2C: Listing performance + sector.
     - 2D: Subscription.
     - 2E: Source audit + health (always last).
  6. `npm run typecheck` (proves JSON shapes still match types).
  7. `npm run build` (proves the UI still builds).
  8. Stage + commit changed snapshot files (skip if empty diff).
  9. `git pull --rebase --autostash origin main` then `git push` (with 3× retry, identical pattern to `visual-qa.yml`).
- **Failure semantics**:
  - Source-empty: warning + log; not a workflow failure.
  - Source-failed: warning + log + `source-health.json` row; not a workflow failure (unless ALL ingest slices fail).
  - typecheck / build failure: **workflow fails** — bad snapshot blocked from `main`.
  - Code/runtime error: **workflow fails**.

## 8. Risk controls

| Risk | Mitigation |
|---|---|
| Source-empty wipes manual data | §4.1 + §4.3 read-existing-first + key-matched merge; manual rows survive. |
| Source-failed corrupts snapshot | Atomic write (§4.7); existing snapshot kept on disk if ingest throws before rename. |
| Cloudflare auto-deploys broken data | typecheck + build gates run BEFORE commit (§7 steps 6–7). |
| Cloudflare auto-deploys too often | Cron ≥ 4 h. Manual outside that. Phase 2D only writes during open-IPO windows (which are rare). |
| Trendlyne/Zerodha/Upstox scrape | Prohibited. Master plan §A reaffirmed. No ingest script targets them. |
| Database creep | Disallowed at Phase 2; JSON-on-disk only. Re-evaluate after one full quarter of ingest data; not before. |
| Rollback | `git revert` the snapshot commit. Cloudflare auto-redeploys ~1 min. Rolls back deploy too. |
| Source-audit invisible | UI already renders per-IPO mix bar (master plan §O4 S17); ingest writes fill it automatically. |
| One source going RED breaks dashboard | `state: 'unavailable'` only after 3 consecutive failures (§4.5); UI gracefully degrades to the prior `state`. |

## 9. Phase 2A implementation prompt (copy-paste-ready)

Paste this verbatim when you want me to implement Phase 2A:

> Approve Phase 2A — SEBI Pipeline + Documents ingestion (artifact-to-snapshot bridge).
>
> What Phase 2A may create:
> - `scripts/ingest/sebi-pipeline.ts` (the bridge script).
> - Minimal shared helpers under `scripts/ingest/lib/` (e.g. `merge.ts` for merge-by-key, `audit.ts` for source-audit log writes, `safeWrite.ts` for atomic file writes) — only what `sebi-pipeline.ts` actually needs.
> - `.github/workflows/ingest.yml` in `workflow_dispatch`-only mode (no cron yet) that runs the script + `npm run typecheck` + `npm run build`, then commits changed snapshots back to `main` with rebase-then-push.
> - `package.json` scripts entry only if needed (e.g. `npm run ingest:sebi`).
> - `phase-2A-status.md` end-of-slice report.
>
> What Phase 2A does:
> - **Artifact-to-snapshot bridge first.** Read the probe-maintained artifact `phase-0/samples/sebi-publicissues-pdfs.json` (kept fresh by `phase-0-probes.yml` / P-08). **Do NOT refetch SEBI directly from this script.** Direct refetch is a later hardening step.
> - Transform/merge → `src/data/snapshots/sebi-pipeline.json` via merge-by-`url` key (never wipe existing rows on source-empty).
> - Cross-fill `src/data/snapshots/ipo-documents.json` for pipeline rows whose company slug matches an existing `Ipo.slug` in `ipo-master.json` (InCred Holdings is the expected first match). Never overwrite an existing `RHP` doc with a `DRHP` doc.
> - Append source-audit entries to `src/data/snapshots/ipo-source-audit.json` for affected IPOs.
> - Honor every rule in §4 (safe merge: read-existing-first, source-empty ≠ source-failed, atomic writes, idempotency, etc).
> - Honor every failure semantic in §7 (build/typecheck gates BEFORE commit; ingest failures must not corrupt snapshots; dashboard always deploys).
>
> Strict scope — Phase 2A does NOT:
> - Implement Phase 2B / 2C / 2D / 2E.
> - Fetch NSE / BSE / SEBI directly (Phase 2A is artifact-bridge only).
> - Parse RHP PDFs beyond the metadata P-09 already validates.
> - Add a database / KV / D1.
> - Add Cloudflare Workers.
> - Change any UI component.
> - Scrape Trendlyne / Zerodha / Upstox.
> - Add cron (workflow_dispatch only for the first run).
> - Leave `main`.

## 10. Files to create at Phase 2 approval (planning only — do NOT create now)

| File | Purpose | Phase |
|---|---|---|
| `scripts/ingest/sebi-pipeline.ts` | Phase 2A ingest entry-point | 2A |
| `scripts/ingest/lib/merge.ts` | Shared merge-by-key helper + safe-write helper | 2A |
| `scripts/ingest/lib/audit.ts` | Source-audit log writer (used by every slice) | 2A |
| `.github/workflows/ingest.yml` | Workflow | 2A (workflow_dispatch only) |
| `scripts/ingest/nse-ipos.ts` | Phase 2B | 2B |
| `scripts/ingest/listing-performance.ts` + `scripts/ingest/sector-map.ts` | Phase 2C | 2C |
| `scripts/ingest/subscriptions.ts` | Phase 2D | 2D |
| `scripts/ingest/source-audit.ts` | Phase 2E (rebuild source-health + ipo-source-audit) | 2E |

## 11. What's explicitly out of scope for Phase 2

- No Cloudflare Workers / D1 / KV / R2.
- No new UI work. The dashboard already consumes the snapshot shape; we are only filling values.
- No Trendlyne / Zerodha / Upstox production scraping.
- No GMP (still Phase 6, optional).
- No anchor PDF parsing beyond URL discovery (still Phase 5).
- No RHP narrative / financial parsing (still Phase 5; manual seed CLI continues).
- No new charts. ECharts code-split deferred.
- No environment variables. No secrets.
- No branch other than `main`.

## 12. Exit criterion for this plan (planning only)

Phase 2 plan is complete when:
1. User accepts the Phase 2A recommendation (or substitutes a different first slice).
2. The exact §9 prompt is what the user will paste later to trigger implementation.
3. `phase-2-plan.md` is committed to the repo root with this content.

**No code, no workflow, no snapshot change lands during planning.** The only repo change on approval is the new `phase-2-plan.md` file.
