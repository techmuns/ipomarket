# Polish-2 — status

> Date: 2026-05-21
> Scope: 5 low-risk trust/readability fixes from `live-product-review.md` Top-5, per master plan §U.

---

## 1. Per-fix outcome

### Fix 1 — Mock labels on KPIs + Recently Listed banner
- `src/components/pulse/KpiCard.tsx` — added optional `mock?: boolean` prop. When true, renders a violet `mock` Badge below the value (next to existing trend pill + hint).
- `src/pages/MarketPulse.tsx` — computes `listedAllMock = listed.length > 0 && listed.every(p => p.state === 'manual')`. Passes `mock={listedAllMock}` to the **Avg listing gain** and **Hit rate** KPI cards. The two other KPIs (Open IPOs · ₹ raised sample) don't compute from listing-performance and stay unflagged.
- `src/pages/RecentlyListed.tsx` — added a page-level amber note immediately under the page header (above the gain bar / fade scatter / table) whenever every row in `listingPerformance.by_ipo` has `state === 'manual'`. Copy: *"Listing performance currently uses mock seed rows until official BSE/NSE listing data is mapped."* Subtle but clearly visible (amber Card surface + amber Info icon).
- Current snapshot state: both Lumino + Greendale listing-perf rows are `state: 'manual'` → banner renders + KPI mock chips render.

### Fix 2 — Pipeline real/synthetic separation + footer rewrite
- `src/pages/Pipeline.tsx` — added a top-right pill toggle (`Real only · 19` / `All · 33`) with `useState<'real'|'all'>('real')`. Default view is **Real only**. Status-count tiles recompute from the visible (filtered) entries. Footer rewritten: *"19 of these are real SEBI filings, harvested from sebi.gov.in/sebiweb/home/HomeAction.do by probe P-08. The remaining 14 are Phase-1 placeholder rows preserved for layout stability and clearly tagged mock when the All view is on."*
- `src/components/pipeline/PipelineTimelineTable.tsx` — now accepts `entries`, `filter`, `counts` props (falls back to `Snapshots.sebiPipeline.entries` when called without arguments). Adds a **Source** column with `Badge tone="live">SEBI</Badge>` for real rows and `Badge tone="manual">mock</Badge>` for placeholders. Synthetic rows render muted (text-slate-500/90, slate-400 company name) and have no PDF link (em-dash instead). Real-vs-mock detection via `e.source === 'SEBI'` (the 2A ingest bridge adds the field; legacy placeholders lack it). Exposes the `isRealPipelineEntry` predicate for re-use in `Pipeline.tsx`.
- Status-count tiles in Pipeline.tsx now reflect *visible* entries — switching to All exposes the 14 placeholder rows in the status mix.

### Fix 3 — IPO Detail TL;DR card (PriorityReadCard)
- `src/components/ipo/PriorityReadCard.tsx` — NEW (~210 LOC after final polish, slightly larger than the ~80 LOC plan estimate because the analyst-sentence + date-pick + mix summary logic all live inline rather than being split into separate helpers). Renders inside an indigo-tinted Card with header "5-second priority read · summary". Four cells:
  1. **Demand read** — `subscriptionQualityScore(sub)` from `src/lib/derive.ts`. Mechanical bucket: `>=70 → QIB-led (emerald) "Institutional conviction"`, `40-69 → Mixed (amber) "Balanced demand mix"`, `<40 → Retail-led (rose) "Retail-led demand fades historically"`, `null → "Awaiting demand signal" (amber)`.
  2. **Next key date** — auto-picks the closest *future* milestone from `{bid_close, allotment_finalization, listing_date}` (timeline-row first, ipo-level fallback). Renders "Closes today" / "Listing in 5 days" / "Allotment in 1 day". If everything is in the past, shows the most recent milestone instead ("Listing 28 days ago"). Pure mechanical — no judgment.
  3. **Source mix** — top source (e.g. "NSE 54%") as the headline value + a thin (1.5px) mini source-mix bar reusing the same MIX_COLORS palette as `SourceAuditPanel`. Hint line shows the top-3 sources with their pct.
  4. **Analyst read** — a single derived sentence composed mechanically from the three above. Example for NFP: *"Mixed demand at 1.57× total; closes today; NSE 54% · Manual 31% · RHP 15%."* Example for Vegorama: *"QIB-led demand at 1.69× total; allotment in 4 days; BSE 56% · RHP 33% · SEBI 11%."* No analyst recommendation, no judgment call — just the summary.
- `src/pages/IpoDetail.tsx` — imports `PriorityReadCard` and renders it between `<HeroHeader>` and `<Tabs>`. One-line insertion.

### Fix 4 — Compact upcoming-IPO card variant
- `src/components/ipo/IpoCard.tsx` — added `isSparse` heuristic: `status === 'upcoming' && price_band == null && issue_size_cr == null && lot_size == null`. When true, returns the new `CompactCard` component instead of the full 4-tile-grid card. Compact variant shows: segment + status + sector badges, name, tagline, an inline "DRHP filed via SEBI" line (when the IPO has DRHP/Prospectus docs), an "Issue details TBA" muted note, and the StateBadge. Top accent line stays but uses amber (vs indigo on the standard card) to telegraph the awaiting state.
- Affects only the 5 placeholder-y upcoming IPOs (InCred Holdings, Online Instruments, Jindal Supreme, Playsimple Games, Punjab Carbonic). Open + closed + listed IPOs (NFP, Vegorama, Quasar, Lumino, Greendale) keep the full card. Same Link target — clicking still takes the user to `/ipo/<slug>`.

### Fix 5 — Source Health Ingest panel reframing
- `src/pages/SourceHealth.tsx` — added `SLICE_STATE_ORDER` and now sorts `ingest_slices[]` in place: `live → partial → empty → skipped → failed → missing`. So the eye lands on the GREEN row first (`2A · SEBI bridge · live`) instead of whichever slice happens to be amber/red first in dependency order.
- CardDescription extended with a one-line explainer: *"Empty / skipped can be healthy — they mean ‘no upstream data yet', not ‘broken’."* Visible at-a-glance directly under the card title.

---

## 2. Files touched

| File | LOC delta | Type |
|---|---|---|
| `src/components/pulse/KpiCard.tsx` | +6 | optional `mock?: boolean` prop |
| `src/pages/MarketPulse.tsx` | +7 | pass `mock` on synthetic KPIs |
| `src/pages/RecentlyListed.tsx` | +18 | page-level banner when all perf rows manual |
| `src/pages/Pipeline.tsx` | +57 | real/all toggle + footer rewrite (lifts predicate from table) |
| `src/components/pipeline/PipelineTimelineTable.tsx` | +50 | filter-aware props + Source column + mock chip + muted styling |
| `src/components/ipo/PriorityReadCard.tsx` | +210 (new) | TL;DR card (demand · date · mix · analyst sentence) |
| `src/pages/IpoDetail.tsx` | +2 | render PriorityReadCard between hero and tabs |
| `src/components/ipo/IpoCard.tsx` | +38 | CompactCard variant + isSparse guard |
| `src/pages/SourceHealth.tsx` | +14 | ingest-panel sort + explainer line |
| `polish-2-status.md` | new | end-of-pass report |

Total ≈ **402 LOC** across 9 code files + 1 status doc. Higher than the ~193 LOC plan estimate because (a) PriorityReadCard absorbed all its helper logic inline rather than into separate utility files (cleaner end-state), and (b) the Pipeline+Table fix needed slightly more glue once the props extended. No new dependencies. No new workflows. No type changes (existing `SliceResult` in `src/types/snapshot.ts` already covered everything).

---

## 3. Verification

| Step | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run build` | ✅ pass (existing >500 kB chunk warning unchanged) |
| `npm run dev` smoke check | ✅ HTTP 200 on `/`, `/open`, `/recently-listed`, `/pipeline`, `/source-health`, `/ipo/nfp-sampoorna-foods` |
| Playwright screenshot pass | ⏸ skipped locally — sandbox doesn't have Chromium binary cached. Trigger `phase-1-visual-qa` workflow from GitHub Actions UI for fresh screenshots if visual confirmation is needed. |

Routes that need eyeball confirmation post-deploy:
- `/` — confirm violet `mock` chip on Avg listing gain + Hit rate KPI cards.
- `/recently-listed` — confirm amber "Mock seed in use" banner above the charts.
- `/pipeline` — confirm Real-only / All toggle defaults to Real and shows 19 rows; switching to All shows 33 with synthetic rows muted + `mock` chip + em-dash in the link column.
- `/source-health` — confirm Ingest pipeline panel orders live → empty → failed top-down + explainer copy visible.
- `/ipo/nfp-sampoorna-foods` — confirm PriorityReadCard renders between hero and tabs with 4 cells populated. Demand read should show "Mixed", analyst sentence should compose mechanically.
- `/open` — confirm 5 upcoming IPOs render as slim CompactCard variant (no 4-tile grid of em-dashes); open card variants for NFP + Vegorama unchanged.

---

## 4. Deferred (unchanged)

- **Phase 5** — RHP narrative + financial PDF parsing. Strengths / risks / objectives / promoter / shareholding all stay manual-seed until P-17 lands.
- **Phase 6** — GMP scraping (multi-source averaging + dispersion + indicative tag). `/gmp` continues to render the "awaiting live data" state.
- Symbol-map population for listing performance — manual per-IPO edits as real listings occur, not a code pass.

---

## 5. Cloudflare auto-deploy

Push to `main` triggers a Cloudflare Pages build on the live URL (`https://ipomarket-pages.pages.dev/`). Expected within ~1–2 minutes of the commit landing on `main`. No env-var changes, no build-config changes.
