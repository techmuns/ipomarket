# Next Dashboard Polish — Status

> **Mode**: implementation complete (Gate 2 of `phase-next-dashboard-polish-plan.md`). **Date**: 2026-05-25. **Branch**: `main`.
>
> Surfaces the now-complete OnEMI Technology Solutions source-backed data: corrects its stale status, makes it render honestly on Recently Listed, adds a compact completeness/source chip, and clarifies the issue-terms-vs-financials source split. No new sources, no scraping, no redesign.

## 1. OnEMI stale-status correction (`upcoming` → `listed`)

OnEMI carried a stale `status: "upcoming"` — a Phase 5B.X conservative default set when its dates were null. Its issue terms are now source-backed (Chittorgarh, Phase 6A.2 / 6A.2.1) with a **verified `listing_date` of 2026-05-08**, which is ~17 days in the past as of this run. The dashboard was therefore showing a listed IPO as upcoming — dishonest.

- **Mechanism**: new guarded, OnEMI-only promoter `scripts/pdf/promote/onemi-status-correct.ts`. Preflight requires OnEMI present, `status === 'upcoming'`, and `listing_date` present + strictly in the past; otherwise it HALTs without writing. Idempotent (no-op when already `listed`). String-surgery on the single status line; atomic `.tmp` + rename.
- **No status engine** was built; no other row's status logic was touched.
- **Verified scoped change** (git diff + `JSON.parse` comparison vs `HEAD`):
  - Only two lines changed in `ipo-master.json`: OnEMI's `"status"` and the top-level `generated_at_utc`.
  - Row count 11 → 11; ids + order identical; **only the OnEMI row** differs, and it differs **only by `status`**.
  - `timelines[]` and `source_meta` byte-identical.
  - Re-run → idempotent no-op (confirmed).

## 2. Recently Listed — graceful degradation for listed-without-perf

**Finding**: `src/pages/RecentlyListed.tsx` previously filtered by *presence in `ipo-listing-performance.json`*, not status. Flipping OnEMI to `listed` alone would have made it vanish from both `/open` and `/recently-listed` (it has no perf row, and that snapshot is do-not-touch).

- **Table** now filters `status === 'listed'` and **left-joins** listing-performance (`perf` may be `null`). Rows without perf render gain/price cells as `—` (neutral slate, no red/green) plus a small **"listing data pending"** hint under the company name. greendale + lumino (which have perf) render unchanged.
- **Charts unchanged**: `ListingGainBar` + `FadeScatter` keep their existing `.filter((ipo) => listingPerformance.by_ipo[ipo.id])`, so OnEMI (no gains) is **not plotted** — no fake/NaN values.
- `ipo-listing-performance.json` was **not** mutated.

## 3. Compact completeness + dominant-source chip

- **`dataCompleteness(ipo, audit)`** added to `src/lib/derive.ts` → `{ source: 'Chittorgarh'|'Official'|'Manual'|'Sparse'; terms; tone }`. `terms` = source-audit field count when an audit entry has fields, else count of non-null economic fields. `source` = dominant `source_mix` bucket (NSE/BSE/SEBI/RHP → Official, chittorgarh → Chittorgarh, manual/derived → Manual); `terms <= 1` → Sparse. **Pure read of existing snapshots — no new data, no source logic.**
- **`src/components/ipo/CompletenessChip.tsx`** (new): compact `"{source} · {n} terms"` chip reusing the existing palette (Chittorgarh→orange, Official→emerald, Manual→violet, Sparse→slate).
- **Wired into** `IpoCard` (Open header badge row), `Screener` (inline under company name), and the `RecentlyListed` table (company cell).
- **Data-driven, not hardcoded.** Observed in the render check:
  - OnEMI → **`Chittorgarh · 8 terms`** (best-filled example).
  - nfp / vegorama / incred → `Official · N terms`.
  - quasar / lumino / greendale → `Manual · N terms`.
  - online-instruments / jindal / playsimple / punjab-carbonic → `Sparse · 1 term`.

## 4. OnEMI detail-page polish

- **Hero prominence** (`HeroHeader.tsx`): the stat grid now leads with **Price band** (`₹162 – ₹171`) and **Issue size** (`₹926Cr`) before the dates (the redundant "Listing exchange" stat — already shown in the sub-header — was dropped). Plain values, no source chip in the hero (the single Chittorgarh chip stays on the IssueTermsGrid card below).
- **Chittorgarh badge restraint**: `IssueTermsGrid` already carried exactly one header source chip with the 6A.2.1 dominant-source de-hardcode — left unchanged. No per-row source badges added.
- **RHP financials stay distinct**: `FinancialsChart` already renders its own fuchsia `RHP` chip — unchanged.
- **Richer analyst read** (`PriorityReadCard.composeAnalystSentence`): now prepends a mechanical issue-terms clause from `price_band` + `issue_size_cr` + `lot_size` + `minInvestment`. For OnEMI it reads:
  > *"₹926 Cr mainboard at ₹162–171, lot 87 (₹14,877); demand signal pending; listing 17 days ago; Chittorgarh 100%."*

  Factual only, no judgment; `—`-safe (returns the original demand-only sentence when no issue terms are filled).

## 5. Source-audit clarity

`SourceAuditPanel` explainer rewritten to state the split explicitly: the mix bar covers **issue-term provenance** (gap-filled from the Chittorgarh aggregator, below official and never overwriting it), while the **financials on the Analysis tab are official RHP-derived** with their own RHP source label — so a high Chittorgarh share here does not understate the official financial data. No new audit rows; `source_mix` unchanged (no financials added to it).

## 6. Files changed

| File | Change |
|---|---|
| `scripts/pdf/promote/onemi-status-correct.ts` | NEW — guarded OnEMI-only status corrector |
| `src/data/snapshots/ipo-master.json` | OnEMI `status` upcoming→listed + `generated_at_utc` (nothing else) |
| `src/lib/derive.ts` | ADD `dataCompleteness(ipo, audit)` |
| `src/components/ipo/CompletenessChip.tsx` | NEW — compact completeness/source chip |
| `src/components/ipo/IpoCard.tsx` | render chip in header badge row |
| `src/pages/Screener.tsx` | render chip under company name |
| `src/pages/RecentlyListed.tsx` | table = status-listed left-join perf; `—` + pending hint; chip; charts unchanged |
| `src/components/ipo/HeroHeader.tsx` | hero stats: + Price band, + Issue size |
| `src/components/ipo/PriorityReadCard.tsx` | issue-terms clause in analyst read |
| `src/components/ipo/SourceAuditPanel.tsx` | explainer states Chittorgarh-issue-terms vs RHP-financials split |

**Not touched** (per guardrails): `ipo-listing-performance.json`, `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `ipo-documents.json`, `ipo-source-audit.json`, `scripts/ingest/*`, `.github/workflows/*`, types, `chittorgarh-map.json`. No new sources / scraping / map rows / GMP / PDF-parser / DB / cron / redesign.

## 7. Verification

- ✅ `ipo-master.json`: only OnEMI `status` changed (`upcoming`→`listed`); all non-OnEMI rows + timelines + source_meta byte-identical; promoter idempotent.
- ✅ Do-not-touch snapshots + `scripts/ingest/*` clean (git).
- ✅ `npm run typecheck` green.
- ✅ `npm run build` green.
- ✅ Headless render check (chromium-1194), **0 console + 0 page errors** on every route:
  - `/open` — OnEMI **absent** (correctly dropped after listing); "Upcoming" section still renders.
  - `/recently-listed` — OnEMI present in the table with `—` gains + "listing data pending" + `Chittorgarh · 8 terms`; charts render (OnEMI not plotted); greendale + lumino unchanged.
  - `/screener` — OnEMI present (status `listed`) with `Chittorgarh · 8 terms`; SEBI-only IPOs show `Sparse · 1 term`.
  - `/ipo/onemi-technology-solutions` — status badge `listed`; hero shows Price band + Issue size; analyst read carries the issue-terms clause; source-audit explainer states the Chittorgarh-vs-RHP split.

## 8. Follow-ups (not started; need separate approval)

- OnEMI has issue terms (Chittorgarh) + financials (RHP) but **no listing-performance row** — it will show `—` gains on Recently Listed until official listing-day OHLC is mapped (a future, separately-gated step; `ipo-listing-performance.json` is do-not-touch here).
- `fresh_cr` / `ofs_cr` / `sector` remain `null` for OnEMI (not on the Chittorgarh cover; deferred).
