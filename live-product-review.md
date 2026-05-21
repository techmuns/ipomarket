# Live Product Review — Phase 2 Closed

> **Date**: 2026-05-21
> **Reviewer perspective**: Indian buy-side IPO analyst opening the dashboard cold.
> **Live URL**: `https://ipomarket-pages.pages.dev/`
> **Data state at review time**: 10 IPOs (3 manual synthetics · 7 live), 33 SEBI pipeline rows (19 real · 14 legacy synthetic), 5 subscription rows (2 broker-derived · 3 synthetic), 29 probes (10G/11Y/8R), 5 ingest slices captured.
> **Method**: review of latest committed screenshots (`phase-1-screens/`) + current snapshot data + code-read of new `/source-health` ingest panel (added after the screenshot pass).

---

## 1. Overall verdict

**The dashboard is solid for what it is — a Phase-1 mock shell with growing real-data backing.** A buy-side analyst landing on it would immediately understand the shape, find the IPO they care about, and trust the source-audit story. The shipped invariants — every datum carries a source pill + freshness chip, never-wipe-on-empty merge, atomic snapshot writes, build-fail-blocks-bad-data — give it production credibility well above what its mock fixtures suggest.

But it's not yet "decision-ready". The detail pages are long and lack a 5-second priority read. The pipeline page silently mixes 19 real SEBI filings with 14 fictional placeholders that look real. KPIs at the top compute over synthetic data without flagging it inline. None of these are blockers; all are small polish items the next implementation pass can knock out in <200 lines.

The thing that's NOT yet working is what we already knew: NSE list endpoints are reachable but empty, NSE Emerge subscription needs the real SME symbol, and listing performance needs scripcode mappings as IPOs list. Those are data-arrival issues, not product defects.

---

## 2. What works well

- **Source-audit story is convincing.** Every IPO detail page carries a multi-coloured source-mix bar (NSE 42% · SEBI 12% · RHP 8% · Manual 32% · Derived 6% for NFP, for example). Every cell-level value has a freshness chip. Neither Zerodha nor Upstox nor Trendlyne does this — it's the differentiator that lands.
- **The data-state vocabulary**: `Source live` / `Manual seed` / `Awaiting live data` / `Source unavailable` reads cleanly after the post-Phase-1 polish. The `auto` chip on cards now reads as "where the data came from" instead of being confused with the IPO's lifecycle state.
- **DRHP Pipeline is the most "production" page.** 19 real SEBI URLs, real PDFs, real status badges, with the validated InCred Holdings DRHP (13 pages, %PDF magic) anchoring it. The "About this data" footer cites P-08 explicitly.
- **Subscription Heatmap (`/subscription`) is buy-side-grade.** Per-IPO QIB/NII/Retail stacked bars + composite quality score (0–100) + automatic QIB-LED / MIXED / Retail-led classification. Quasar (85/100, QIB-LED) and Lumino (82/100, QIB-LED) sit beside NFP (49/100, MIXED) and Greendale (64/100, MIXED). This is the page a fund analyst would actually use.
- **Premium dark palette + tabular-nums numeric typography** gives it the trading-terminal feel without ostentation. Sidebar nav with current-status pill, top-bar Source Health pill, footer attribution — everything coheres.
- **Source Health is genuinely useful as a trust panel.** 29 probes broken into GREEN/YELLOW/RED with last-run timestamps and one-line recommendations. Now (post cleanup) the new "Ingest pipeline" card adds the five slice outcomes — first time the analyst can see "what the ingest just did" without leaving the app.
- **Documents and Registrar/BRLM card on the detail page** correctly link out to the SEBI PDF and the registrar's allotment portal (Skyline / Bigshare). Working hyperlinks to real targets, not placeholders.

---

## 3. Top 5 issues / confusions

| # | Issue | Where it shows | Why it confuses |
|---|---|---|---|
| 1 | **Pipeline mixes 19 real SEBI rows with 14 synthetic-placeholder rows that look real.** Names like "Veritas Pharma", "Brightway Energy Solutions", "BlueCircle Telecom Infra", "Sunhaven Hospitality" are constructed to look real, and the "About this data" footer says *"All filings are real, harvested from sebi.gov.in..."* — which is true of 19 of 33. | `/pipeline` table | An analyst could quote a fictional filing in a memo. The footer claim is partially false. |
| 2 | **IPO Detail page lacks a 5-second priority read at the top.** Hero shows subscription headline (1.57×) and min investment — but no quality signal, no days-to-listing-status banner, no "what to focus on" tag. The Subscription Quality composite (49/100 MIXED for NFP) exists on `/subscription` but doesn't surface on the detail page hero or the About tab. | `/ipo/<slug>` hero | An analyst clicking through 6 open IPOs has to scroll through every detail page or visit two routes to triage. |
| 3 | **`Hit rate 100%`** on Market Pulse is computed over 2 mock listings. The hint *"(2 listed)"* underneath is correct but easy to miss. The number reads as a strong product claim. | `/` KPI strip | First-screen confusion. Could be read as "the dashboard tracks IPOs and we've called all of them right." |
| 4 | **Upcoming-IPO cards on `/open` are mostly placeholders.** InCred, Online Instruments, Jindal, Playsimple, Punjab Carbonic each occupy a full IPO-card slot showing `—` for price band, lot size, dates, issue size. Only the segment + sector + status badges + tagline carry real content. | `/open` Upcoming row | They take card real estate but contain almost no information. An analyst scrolling past them learns nothing. |
| 5 | **Source Health "Ingest pipeline" colors paint a pessimistic picture.** The 5 ingest slices currently render: sebi=live (green), nse=empty (amber), listing=skipped (slate), sector=skipped (slate), subscription=failed (rose). Visually this reads "1 of 5 working." The notes column explains correctly (NSE feed has no rows; no scripcode mapping; symbol mismatch) but at-a-glance the dashboard looks more broken than it is. | `/source-health` ingest panel | Trust-panel paradox: surfacing failure honestly costs perceived trust unless the context lands at-a-glance. |

---

## 4. Top 5 low-risk polish fixes

| # | Fix | Effort | Where | Risk |
|---|---|---|---|---|
| 1 | **Add inline `(mock seed)` to KPI hints + the Recently Listed page when data is synthetic.** Tiny `<Badge tone="manual">mock</Badge>` next to the number, not in the tooltip. | ~20 lines | `src/pages/MarketPulse.tsx`, `src/pages/RecentlyListed.tsx`, `src/components/recently/ListingGainBar.tsx` | None — purely visual. |
| 2 | **Distinguish synthetic vs real SEBI pipeline rows.** Add a one-line filter toggle at the top of `/pipeline` ("19 real · 14 placeholder · 33 total"), and render synthetic rows with a slight visual demotion (muted text + a small `mock` chip). Also fix the "About this data" footer to read *"19 filings are real from SEBI..."*. | ~30 lines | `src/pages/Pipeline.tsx`, `src/components/pipeline/PipelineTimelineTable.tsx` | None. |
| 3 | **Add a TL;DR summary card at the top of `/ipo/<slug>`.** 4–6 inline data points: subscription headline + days-to-close OR days-to-listing + listing-exchange + subscription-quality composite + manual-vs-live source-mix bar (compact). The bar already exists in the right rail; surface it inline at the top so an analyst gets the 5-second triage without scrolling. | ~50 lines | `src/components/ipo/HeroHeader.tsx` (extend the hero) | Low — adds to existing component; doesn't move sections. |
| 4 | **Compact upcoming-IPO cards on `/open`.** When `status === 'upcoming'` and most fields are null, render a slimmer card variant — sector + segment + tagline + DRHP link + a one-line "details TBA". Saves vertical space and reads honest. | ~25 lines | `src/components/ipo/IpoCard.tsx` (variant prop or branch on status) | Low — same component, conditional render. |
| 5 | **Reframe the Source Health "Ingest pipeline" empty/skipped states.** Re-order the table by `live` → `partial` → `empty` → `skipped` → `failed` so green sits at the top, and add a brief description line under the card title: *"Slices that returned empty / skipped are waiting for upstream data; not failures."* | ~10 lines | `src/pages/SourceHealth.tsx` (sort + copy) | None. |

---

## 5. What should wait until Phase 5 / PDF intelligence

These ALL need the RHP parser layer (`P-17`) to be useful. Adding manual seeds for them at this stage would scale poorly and create more synthetic-vs-live confusion.

- **Financials table** for IPOs without a manual seed (NFP currently shows "no financials seeded yet" on the Analysis tab — correct behaviour for Phase 1.5; Phase 5 fills it from the DRHP).
- **Use of Proceeds line items** auto-populated for every IPO (Zerodha-style ₹ + %).
- **Promoter & shareholding** (pre/post + pledged).
- **Strengths / Risks** narrative auto-extracted from RHP (currently NFP + Vegorama have hand-pasted narratives — that doesn't scale beyond a handful of IPOs).
- **Anchor investor list + concentration** (needs P-18 anchor PDF parser; the dashboard already has a slot for it on `/ipo/<slug> → Analysis tab` rendered as "manual seed expected").
- **Allotment basis** parsed PDF (registrar-side; Phase 5 / 6).
- **Quality / Risk Checklist heuristics** that depend on per-IPO financials (currently shows "—" for all six checks when financials are absent — correct behaviour).

---

## 6. What should wait until GMP

- The full **GMP Monitor module** with multi-source averaging + dispersion band + per-source freshness chips. Right now `/gmp` correctly renders an "awaiting live data" state with the 4 source tiles (P-19/20/21/22) shown in their probe-status colours.
- **GMP indicative tag inline on `/open` IPO cards** (e.g. *"GMP indicative: ₹0–₹8"*) — needs at least one source GREEN.
- **GMP trend over time** on `/ipo/<slug>` — needs sampled historical GMP.
- **Phase-6 work is intentionally optional** per master plan §E and stays out of v1.

---

## 7. Recommended next implementation pass

A small **"polish-2" pass** — strict scope, ≤ ~200 lines of code, no new dependencies, no new workflows:

1. The 5 low-risk polish fixes in §4.
2. A small fix to `phase-1-status.md` to remove its now-outdated language about "Phase 2 ingestion not started."
3. Re-run the existing `phase-1-visual-qa` workflow once after the polish lands to capture fresh screenshots that include the Ingest pipeline card on `/source-health`. (Not new workflow code — just a re-trigger.)

**Out of scope for the next pass** (do NOT include):
- No GMP scraping.
- No PDF / anchor / RHP parsing.
- No new database / Workers / cron.
- No symbol-map population (those land per-IPO as real listings occur — manual edits, not a code pass).
- No new chart components.
- No layout redesign beyond the 5 fixes above.

After the polish-2 pass, the natural next major phase is **Phase 5 RHP parsing (P-17 / P-18)** — that's where the dashboard moves from "structurally complete with provenance" to "analyst-decision-ready with depth". GMP (Phase 6) remains optional and can wait.

---

## 8. Closing note

The dashboard is in a healthy "ready to deepen" state. The plumbing is right: snapshots are typed, ingest is idempotent, deploys are gated, source provenance is everywhere. The remaining gaps are visible to a buy-side reader but they're the right gaps to have at this point in the build — small fixes plus eventual RHP parsing, not a redesign.

**No fixes implemented in this pass.** Awaiting your direction on whether to ship the polish-2 pass or to start Phase 5 planning.
