# Phase 1 — Mock Dashboard Shell · Status Report

> **Built**: 2026-05-21
> **Scope**: TypeScript data contracts + mock JSON fixtures + static React/Vite dashboard shell. No live ingestion. No database. No deployment.
> **Branch**: `main`

## 1. What was built

### 1.1 Build & dev scaffolding (all root-level)
- `package.json` — merged probe + app deps; new scripts `dev` / `build` / `preview` alongside existing `typecheck` / `probe*`.
- `tsconfig.json` — extended with DOM lib + JSX + `@/*` path alias; covers both `scripts/probes/**` and `src/**`.
- `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html` — Vite + Tailwind + React JSX runtime, dark-first.

### 1.2 TypeScript data contracts (`src/types/`)
- `ipo.ts` — `Ipo`, `IpoTimeline`, `IpoSubscription`, `IpoFinancials`, `IpoNarrative`, `IpoDocuments`, `ListingPerformance`, `IpoSourceAudit`, `SebiPipelineEntry`, `SectorMapEntry`.
- `source.ts` — `SourceTag`, `DataState` (`live` / `awaiting` / `manual` / `unavailable`), `SourceAuditEntry`, `ProbeHealth`.
- `snapshot.ts` — typed envelopes per snapshot JSON file.

### 1.3 Mock JSON snapshot fixtures (`src/data/snapshots/`)
| File | What's in it | Seed source |
|---|---|---|
| `ipo-master.json` | 10 IPOs (2 open SME, 1 upcoming mainboard, 1 closed mainboard, 2 listed, 4 pipeline) + timelines | Hand-curated from Phase 0 artifacts |
| `ipo-subscriptions.json` | Live + multi-day subscription rows for 5 IPOs | NFP and Vegorama verbatim from broker artifacts; 3 synthetic |
| `ipo-financials.json` | 3-FY + 9M interim per IPO + derived (CAGR, D/E, P/E) | Vegorama from Upstox text; 3 synthetic |
| `ipo-narrative.json` | Company overview · 5 strengths · 5 risks · objectives | NFP verbatim from Zerodha; Vegorama from Upstox; 1 synthetic |
| `ipo-documents.json` | DRHP/RHP/Anchor URLs + registrar + BRLMs | InCred RHP is the real P-09-validated PDF; others synthetic URLs |
| `ipo-listing-performance.json` | Listing-day OHLC + current price + gains | 2 synthetic listings |
| `ipo-source-audit.json` | Per-field source URL + state + freshness; per-IPO source-mix | Real for NFP/Vegorama/InCred; manual for synthetic IPOs |
| `sebi-pipeline.json` | **19 real DRHP filings** (Incred Holdings, Online Instruments, Jindal Supreme, Playsimple Games, Punjab Carbonic, + 14 more) | Direct from `phase-0/samples/sebi-publicissues-pdfs.json` |
| `sector-map.json` | Manual sector mapping starter (6 entries) | Derived from broker artifacts + master plan §O |
| `source-health.json` | All 29 probes with current GREEN/YELLOW/RED status + last-run + notes | Direct from `phase-0/source-probe-results.json` |

### 1.4 Static React + Vite shell (`src/`)
- Entry + routing: `main.tsx`, `App.tsx` (via `AppShell`), `router.tsx` — 10 routes + per-IPO `/ipo/:slug`.
- Layout: `components/layout/AppShell.tsx` (sidebar + topbar + outlet), `Sidebar.tsx` (10 nav items with active state + lucide icons), `TopBar.tsx` (search input + global Source Health pill `10G / 11Y / 8R`).
- UI primitives (minimal shadcn-style, copied into the repo): `card.tsx`, `badge.tsx` (8 tones via cva), `tabs.tsx` (Radix), `tooltip.tsx` (Radix).
- Chrome: `SourcePill`, `FreshnessChip`, `StateBadge`, `SourceAuditChip` — provenance + freshness on every key datum.
- IPO components: `IpoCard`, `HeroHeader`, `IssueTermsGrid`, `TimelineRail` (10-row Zerodha-style with past/future tick), `SubscriptionBlock` (tiles + Recharts daily chart + quality composite + table), `FinancialsChart` (Recharts tabbed bar: Revenue/EBITDA/PAT/Assets), `StrengthsCard` / `RisksCard` / `ObjectivesCard` (Zerodha narrative + Upstox stacked-bar visual), `DocumentsList`, `RegistrarBrlmCard`, `SourceAuditPanel` (per-IPO source mix bar), `AnalystSignalPanel`.
- Pulse / Recently / Pipeline components: `KpiCard`, `SectorHeatmap` (ECharts treemap), `SubscriptionLeaderboard` (Recharts horizontal bars), `ListingGainBar` (Recharts vertical bars), `FadeScatter` (ECharts scatter with y=x reference line), `PipelineTimelineTable`.
- Pages (10): `MarketPulse`, `OpenUpcoming`, `ListingSoon`, `RecentlyListed`, `Screener`, `SubscriptionHeatmap`, `Pipeline`, `GmpMonitor`, `SourceHealth`, `IpoDetail`.

### 1.5 IPO Detail Page (the centerpiece, 17-section model from master plan §O4)
Four sub-nav tabs (Upstox-style): **About** · **Analysis** · **Subscription** · **Documents**.
- **Hero** with subscription tag + sector chip + min-investment + state badge + days-to-close / days-to-listing.
- **About** tab: Issue terms grid + 10-row Zerodha-style timeline + company overview + source-audit panel + registrar/BRLM card.
- **Analysis** tab: Financials chart (4 metric tabs) + Strengths + Risks + Objectives (with stacked bar) + Promoter card + Analyst signal panel + Quality/Risk checklist.
- **Subscription** tab: Tiles + daily Recharts + composite quality + per-category table.
- **Documents** tab: DRHP/RHP/Anchor links + Registrar/BRLM card.
- **State badges everywhere**: `live` (real data), `awaiting` (source reachable, empty), `manual` (seeded by hand), `unavailable` (source RED). No fake live data.

### 1.6 Verification
- ✅ `npm install` succeeds (217 packages installed; lockfile committed).
- ✅ `npm run typecheck` passes (covers both `scripts/probes/**` and `src/**`).
- ✅ `npm run build` succeeds (`tsc --noEmit && vite build`). Output: `dist/index-CYlTPOmL.js` 1.87 MB / 588 KB gzipped (ECharts is the heavy chunk; Phase 2 should code-split).
- ✅ `npm run dev` starts on `http://localhost:5173/`. Every route returns HTTP 200; SPA shell serves correctly.
- ⚠️  Playwright screenshot capture was attempted in the sandbox but the Chromium binary download is blocked by the sandbox network policy (same constraint as Phase 0.1 — `cdn.playwright.dev` not on allowlist). Run `npm run dev` locally to view the dashboard interactively.

## 2. What remains mocked / manual

| Module | Mocked / manual portion | Why | Phase 2 wiring path |
|---|---|---|---|
| **Market Pulse** | All KPIs over the mock 10-IPO master + listing-performance | Mock seed | Wire `ipo-master.json` from a scheduled ingestion (NSE/BSE) + listing-performance from P-15 (BSE fallback). |
| **Open & Upcoming** | 2 real (Zerodha/Upstox transcribed) + 8 synthetic | Live NSE list endpoint returned empty in latest snapshot | Re-wire `ipo-master.json` from probes P-01–P-05; will populate naturally when NSE has rows. |
| **Listing Soon** | 1 synthetic (Quasar Robotics) | No real "closed-not-yet-listed" snapshot | Derived from `ipo-master.json` status; same wiring as above. |
| **Recently Listed** | 2 synthetic (Lumino, Greendale) | No recently listed IPO in current real snapshot | Wire from P-15 (NSE OHLC) + P-15b (NSE quote); P-15 currently GREEN via BSE fallback. |
| **IPO Screener** | Filters/sort across mock 10 IPOs | Same | Same; UI is data-shape-agnostic, swap in live data unchanged. |
| **Subscription Heatmap** | NFP + Vegorama real; others synthetic | Snapshot moment | Wire from `ipo-subscriptions.json` populated by P-04. |
| **IPO Detail Page** | Hero/timeline/subscription live for NFP+Vegorama; financials/narrative/promoter manual for all | RHP parsing is Phase 5 | Hero/timeline/subscription auto-populate from live; financials seed format documented for manual entry until Phase 5 RHP parser ships. |
| **DRHP / Pipeline Watch** | **All 19 entries are real** from SEBI P-08 | — | Already live; only the observation-letter status field is illustrative (Phase 2 / P-08b enhancement). |
| **GMP Monitor** | Awaiting state for all 4 sources | No GMP source GREEN | Activate when ≥1 of P-19/P-20/P-22 turns GREEN. |
| **Source Health** | **All 29 probes are real** from `phase-0/source-probe-results.json` | — | Already live; refreshed from the next probe workflow run. |

**Real data already on the page**:
- 19 SEBI DRHP filings (Pipeline + Documents + IPO Master cross-references).
- 1 validated DRHP (InCred Holdings, 13 pages, %PDF magic).
- 29 probe health records.
- NFP Sampoorna Foods + Vegorama Punjabi Angithi — every visible field is transcribed verbatim from the Phase 0.1 broker-page artifacts.

## 3. What Phase 2 ingestion must connect

| Snapshot file | Populated by | Cadence | Probe(s) | Gating signal |
|---|---|---|---|---|
| `ipo-master.json` | New ingestion script `scripts/ingest/nse-bse-ipos.ts` | Hourly during market hours | P-01 + P-02 + P-03 + P-05 + P-06/06b | At least one GREEN with rows |
| `ipo-subscriptions.json` | `scripts/ingest/subscriptions.ts` | Every 10 min during open IPO bidding | P-04 + P-07 | P-04 GREEN with active IPO |
| `ipo-documents.json` | `scripts/ingest/sebi-docs.ts` | Daily | P-08 + P-09 + P-10 | P-08 GREEN + P-09 GREEN per IPO |
| `ipo-listing-performance.json` | `scripts/ingest/listing-perf.ts` | EOD on listing day + daily for recently listed | P-15 (BSE fallback) + P-15b | P-15 GREEN |
| `ipo-source-audit.json` | Internal — written by each ingestion script | Per-write | n/a | n/a |
| `sebi-pipeline.json` | Same as `ipo-documents.json` (P-08 output) | Daily | P-08 | Already live |
| `ipo-financials.json` | Manual seed via a tiny `tsx` CLI now; auto-parsed in Phase 5 | Per-IPO (manual) → per-RHP-fetch (auto) | P-17 (Phase 5) | Manual until Phase 5 |
| `ipo-narrative.json` | Same: manual at v1.5; auto at Phase 5 | Per-IPO | P-17 | Manual until Phase 5 |
| `sector-map.json` | Hand-curated; NSE post-listing `industryInfo` auto-fills for listed | Per-IPO | P-24 | Hybrid: P-24 for listed; manual for pre-IPO |
| `source-health.json` | Auto: post-processing of `phase-0/source-probe-results.json` | Every probe workflow run | All probes | n/a |

### Phase 2 acceptance gate (suggested)
- Ingestion scripts under `scripts/ingest/` mirror the probe-runner pattern (CLI args, status-summary output, source-audit-log writes).
- `.github/workflows/ingest.yml` schedules them on cron; writes back to `src/data/snapshots/*.json` and commits via the same pattern as `phase-0-probes.yml`.
- Phase 1 UI does NOT change shape; only the JSON values do.
- Manual seed CLI accepts a small YAML/JSON per IPO to populate financials + narrative until Phase 5 parser lands.

## 4. Known limitations / explicit non-goals (Phase 1)

- No code-splitting yet (ECharts adds ~600 KB to the bundle). Phase 1.5 candidate.
- No Framer Motion / page-transition animation.
- No light-mode toggle implementation (dark-first only; root `<html class="dark">`).
- No saved-screens persistence (Screener filters are in-memory only).
- Search box in TopBar is a placeholder (visual only; doesn't fuzzy-search yet).
- No mobile-specific layout adjustments beyond the sidebar collapsing at `lg`.
- No tests yet. Phase 1.5 / Phase 2 candidate.

## 5. Browse instructions

```bash
npm install            # if not already
npm run dev            # http://localhost:5173/
npm run typecheck      # tsc --noEmit
npm run build          # production bundle to dist/
npm run preview        # serve the dist/ on port 5174
```

Recommended walkthrough:
1. `/` — Market Pulse (KPI strip, sector treemap, subscription leaderboard, module quick-links).
2. `/open` — Two real SME IPOs (NFP, Vegorama) on cards.
3. `/ipo/nfp-sampoorna-foods` — Full 17-section detail page seeded from Zerodha artifact.
4. `/ipo/vegorama-punjabi-angithi` — Same, seeded from Upstox artifact (richer financials).
5. `/pipeline` — 19 real SEBI DRHP filings.
6. `/source-health` — 29 real probes, current status.
7. `/screener` — Filter / sort across all 10 mock IPOs.

## 6. Final state

Phase 1 deliverables in §1 are complete. Build green, typecheck green, dev server green, every route responds 200. The dashboard is ready for visual review and Phase 2 ingestion design.

**Phase 2 not started. Awaiting your review.**
