# Phase 0.2 — Combined IPO Dashboard Benchmark (Trendlyne + Zerodha + Upstox)

> **Generated**: 2026-05-20
> **Status**: Decision-ready synthesis. **Phase 1 not started.**
> **Inputs**: Master plan §A–G (Trendlyne baseline), §N (Zerodha/Upstox broker-page analysis), `phase-0/broker-pages/broker-page-benchmark-report.md`, `phase-0/source-probe-results.json`.
> **Constraint**: Trendlyne / Zerodha / Upstox are **information-architecture benchmarks only**. Production data comes from NSE / BSE / SEBI / RHP-PDFs / registrar portals / our derivations. Manual fallback where needed.

---

## O. Combined IPO Dashboard Benchmark — Trendlyne + Zerodha + Upstox

The benchmark is now **three-source**, not single-source. Trendlyne defines dashboard breadth (cross-market views, screener, leaderboards). Zerodha + Upstox define per-IPO depth (detail page IA, financial visuals, sector context, narrative depth). Production data layer is unaffected — all three are reference products only.

---

## O1. Benchmark roles

| Benchmark | Best used for | Not used for | Key features to borrow |
|---|---|---|---|
| **Trendlyne IPO** | **Dashboard breadth & market-wide tracking** — Open / Upcoming / Listing-Soon / Recently-Listed lists; best/worst IPOs YTD; gain-loss aggregate KPIs; IPO calendar; subscription day-by-day breakdown; Mainboard/SME split; screener-style filters; DRHP pipeline visibility. | Per-IPO narrative depth; broker-style financial visuals; sector-relative analytics; analyst signals. | (a) Module set for the top nav (Open / Upcoming / Listing-Soon / Recently-Listed / Best & Worst / Calendar / Screener); (b) gain-loss aggregate header KPIs; (c) Mainboard / SME tabs across every view; (d) screener-style left-rail filter pattern; (e) day-wise subscription matrix. |
| **Zerodha IPO page** | **Clean broker IPO detail page** — 10-row scheduled timeline with anchor lock-ins; narrative Strengths/Risks bullets; explicit Registrar allotment-portal link; GMP-with-caveat; full prospectus PDF download. | Analytics, peer comparison, sector context, multi-metric financial visuals (Zerodha shows a single bar chart and a narrative). | (a) Richest timeline (10 rows including UPI mandate, refund, share credit, anchor 50% and 100% lock-in ends); (b) Strengths / Risks narrative (5 + 5 bullets); (c) Use-of-proceeds with both ₹ Cr and %; (d) explicit "check your allotment at [Registrar]" link; (e) GMP shown as text, not as a number — caveat-first treatment. |
| **Upstox IPO page** | **Richer analytical detail page** — hero with live subscription headline + sector + min-investment; sub-nav tabs (About / Analysis / Subscription); "vs sector avg" qualifier badges on every key metric; Quality/Risk checklist (6 binary heuristics); per-metric Performance bar charts; sector peer comparison cards. | Narrative depth (Strengths/Risks bullets are replaced by binary checklist); prospectus depth; richer timeline (only 7 milestones vs Zerodha's 10). | (a) Hero subscription tag + sector chip + min-investment ₹; (b) "Higher/Lower than sector avg" qualifier badges; (c) Quality (3) + Risk (3) checklist; (d) multi-metric financial bar charts with FY tabs; (e) 6-metric peer comparison cards (Revenue / 3Y growth / PAT / Market cap / P/E / D/E); (f) sidebar timeline rail. |

**Synthesis rule**: Use **Trendlyne for top-level navigation and cross-IPO views**; use **Zerodha + Upstox merged** for the IPO Detail Page; add **our own** source-audit + analyst-signal differentiators on top.

---

## O2. Combined feature inventory

Every distinct feature seen across the three benchmarks, grouped by purpose. Columns: source benchmark · v1 / v1.5 / v2 · data source required · short note.

### O2.1 Market-wide dashboard features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Market Pulse KPI strip (open count, ₹ raised YTD, avg listing gain, hit rate) | Trendlyne (header KPIs) + master plan §C-1 | ✓ | | | NSE/BSE listing record + listing-performance | Our differentiator — combines Trendlyne KPIs with our pulse framing |
| Mainboard / SME tabs (everywhere) | Trendlyne | ✓ | | | NSE/BSE segment flag | Segment toggle on every list view |
| IPO calendar (month/quarter view) | Trendlyne | | ✓ | | NSE/BSE dates | Visual calendar grid; v1.5 because grid component takes work |
| Best / worst IPOs YTD (listing gain + current gain leaderboards) | Trendlyne | ✓ | | | NSE listing + NSE quote | Two leaderboards: by listing gain, by current gain |
| Sector heatmap (sector × count × ₹ raised × avg listing gain) | Master plan §C-10 | | ✓ | | Sector classification + listing-performance | Needs sector mapping |
| Subscription-quality leaderboard | Master plan §C-2 | | ✓ | | NSE subscription + anchor data | Our composite signal |
| Source health bar (top of every page) | Master plan §C-14 | ✓ | | | Our internal audit log | Our differentiator |

### O2.2 IPO list / screener features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Filter sidebar (segment, sector, size band, status, subscription range, listing-gain range) | Trendlyne | ✓ | | | All ingested fields | Client-side filter |
| Sortable result table (name, dates, size, subscription, gain) | Trendlyne | ✓ | | | Same | Client-side sort |
| Saved screens (client-side localStorage only) | Trendlyne | | ✓ | | Browser only | No backend |
| Inline mini subscription bar in row | Master plan §G-2 | ✓ | | | NSE subscription | Per-row sparkline |

### O2.3 Open / Upcoming / Listing-Soon features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Live "Open IPOs" list | Trendlyne + Zerodha (status badge) | ✓ | | | NSE current IPOs (P-01) | Cards or table |
| Upcoming IPOs list | Trendlyne | ✓ | | | NSE upcoming (P-02) | |
| Listing Soon (closed, awaiting listing) | Trendlyne | ✓ | | | Derived from dates | |
| Status badges per IPO (LIVE / Upcoming / Closed / Listed) | Zerodha (badge) + Upstox (status chip) | ✓ | | | Derived | Visual badge in lists + detail |
| Per-card mini timeline | Upstox (sidebar timeline rail) | | ✓ | | NSE dates | Compact 4-dot timeline |

### O2.4 Recently Listed / gain-loss features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Recently listed table (last N weeks) | Trendlyne | ✓ | | | NSE listing record + NSE quote | |
| Listing gain % (vs upper-band price) | Trendlyne | ✓ | | | Derived = (listing close − issue price) / issue price | Day-1 |
| Current gain % | Trendlyne | ✓ | | | NSE quote (P-15b) | |
| Listing-day open/high/low/close | Trendlyne + master plan §D | ✓ | | | NSE historical OHLC (P-15) | **Blocked — P-15 RED** |
| Listing-gain fade scatter (day-1 gain vs current gain) | Master plan §C-9 | | ✓ | | Same as above | Our differentiator |
| Cohort fade by sector | Master plan §C-12 | | | ✓ | + sector classification | Needs peers/sector DB |
| Alpha vs Nifty / sector index | Master plan §C-12 | | | ✓ | + index data | v2 |

### O2.5 IPO Detail Page features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Hero header (name + segment + status + sector + min-investment) | Upstox | ✓ | | | NSE/BSE + derived | Adopt Upstox hero |
| Sub-nav tabs (About / Analysis / Subscription) on long page | Upstox | | ✓ | | n/a | Anchor-style tabs |
| Issue-terms grid (price band, lot, size, fresh/OFS, face value, listing exchange) | Zerodha + Upstox + Trendlyne | ✓ | | | NSE/BSE/RHP | Core economics |
| 10-row scheduled timeline (open, close, UPI mandate, allotment, refund, demat, listing, anchor 50%/100% lock-in) | Zerodha | ✓ | | | NSE/BSE + derived | Best timeline of the three |
| Sidebar timeline rail (compact mode for narrower screens) | Upstox | | ✓ | | Same as above | Responsive variant |
| Reservation breakdown (QIB / NII / Retail / Employee) | Trendlyne + master plan §D | ✓ | | | NSE/BSE | |
| Live subscription table (per category × times × reserved/applied) | Zerodha (reserved/applied) + Upstox (multi-day) + Trendlyne | ✓ | | | NSE subscription (P-04) | Combine both shapes |
| Subscription day-by-day trajectory chart | Trendlyne + master plan §C-3 | | ✓ | | Same, sampled | Our differentiator |
| Subscription Quality composite | Master plan §C-2 | | ✓ | | NSE + anchor | Our signal |
| Subscription velocity heatmap (hour × day) | Master plan §C-4 | | | ✓ | Sampled NSE | Our signal |

### O2.6 Subscription / demand features

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Live × times per category | Zerodha + Upstox + Trendlyne | ✓ | | | NSE (P-04) | |
| Reserved/applied numerators per category | Zerodha | ✓ | | | NSE | Zerodha shows; Upstox doesn't |
| Multi-day subscription matrix | Upstox + Trendlyne | | ✓ | | NSE sampled | Adopt Upstox table shape |
| QIB-led vs Retail-led demand mix | Master plan §C-3 | ✓ | | | NSE | Stacked bar in detail |
| Subscription leaderboard across open IPOs | Master plan §C-2 | ✓ | | | NSE | Cross-IPO view |
| Anchor concentration (top-3 % of anchor book) | Master plan §C-8 | ✓ | | | Anchor PDF (P-18) | Risk signal |
| MF participation in anchor book | Master plan §C-8 | | ✓ | | Same | Counts only |

### O2.7 Financials / valuation / peer comparison

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| 3-FY + interim P&L table | Upstox (Performance) + Trendlyne | | ✓ | | RHP financials | Manual paste at v1; parsed at v1.5 |
| Per-metric bar chart (Revenue/EBITDA/PAT/Assets tabs) | Upstox | | ✓ | | Same | Adopt Upstox tabs |
| 3Y CAGR (Revenue, PAT) | Upstox | | ✓ | | Derived | |
| EPS / RoNW / RoCE / D/E | Trendlyne + Upstox (D/E) | | ✓ | | Derived from financials | |
| Market cap (post-issue, upper band) | Upstox | ✓ | | | Derived = shares × upper band | Needs post-issue share count |
| P/E / P/B / EV/EBITDA at upper band | Upstox (P/E) + Trendlyne | | ✓ | | Derived | |
| Peer comparison cards (vs sector avg, 6 metrics) | Upstox | | | ✓ | Sector + peers DB | Needs curated peers DB |
| "Higher / Lower than sector avg" qualifier badges | Upstox | | | ✓ | Same | Visual cue per metric |
| Sector peer median P/E benchmark | Master plan §C-11 | | | ✓ | Peers DB | Bubble or scatter |

### O2.8 Documents / DRHP / RHP / prospectus

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| DRHP link | Trendlyne + Zerodha (prospectus) | ✓ | | | SEBI (P-08) → exchange (P-10) | **Blocked — P-08 RED** |
| RHP link | Trendlyne + Zerodha + Upstox (Read) | ✓ | | | SEBI / exchange | Same |
| Anchor allocation PDF | Trendlyne + master plan §D | ✓ | | | NSE/BSE anchor circular | |
| Allotment basis PDF | Trendlyne + master plan §D | | ✓ | | Registrar (P-11) | |
| Listing prospectus | Trendlyne | ✓ | | | Exchange | |
| DRHP / Pipeline Watch view (filed but not opened) | Trendlyne + master plan §G-7 | ✓ | | | SEBI (P-08) | **Blocked — P-08 RED** |

### O2.9 Strengths / risks / objectives

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Strengths (3–5 narrative bullets) | Zerodha | ✓ (manual paste) | | ✓ (RHP parser) | RHP "Our Strengths" | Manual seed initially |
| Risks (3–5 narrative bullets) | Zerodha | ✓ (manual paste) | | ✓ (RHP parser) | RHP "Risk Factors" | Manual seed initially |
| Quality / Risk checklist (binary heuristics) | Upstox | | ✓ | | Derived from financials | Our v1.5 |
| Use-of-proceeds line items (₹ + %) | Zerodha | ✓ (manual paste) | | ✓ (RHP parser) | RHP "Objects of the Offer" | Zerodha format wins |
| Use-of-proceeds stacked-bar / Sankey visual | Upstox (stacked) + master plan §C-7 (Sankey) | ✓ stacked bar | | ✓ Sankey | UI | Stacked bar at v1 |
| Promoter & shareholding (pre/post, pledged) | Trendlyne + Upstox (checklist) | | ✓ | | RHP capital structure | |

### O2.10 Source health / freshness / audit

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| Per-field source URL chip | Master plan §C-14 | ✓ | | | Our internal | **Differentiator** |
| Per-field fetched-at timestamp | Master plan §C-14 | ✓ | | | Internal | |
| Per-IPO source-mix bar ("X% NSE / Y% RHP / Z% manual") | Master plan §C-14 | ✓ | | | Internal | |
| Source-health page (per-source pill green/amber/red) | Master plan §G-8 | ✓ | | | Internal | |
| Per-source last-error log | Master plan §G-8 | ✓ | | | Internal | |
| Per-IPO confidence pill | Master plan §C-14 | | ✓ | | Internal heuristic | |

### O2.11 GMP / grey-market features (optional throughout)

| Feature | Inspired by | v1 | v1.5 | v2 | Source needed | Notes |
|---|---|---|---|---|---|---|
| GMP indicative number | Trendlyne + Zerodha (mention) | ✓ (with caveat) | | | P-19/20/22 averager | Always show dispersion + "indicative" |
| GMP dispersion (3–5 source range) | Master plan §C, §D, §E | ✓ | | | Multi-source | |
| GMP trend over time | Trendlyne | | ✓ | | Sampled | |
| GMP-with-caveat treatment (text mention not number) | Zerodha | ✓ | | | n/a | Adopt Zerodha framing |

---

## O3. Final dashboard module structure

Ten modules. Each module shows: **purpose · inspired-by · data required · visuals · priority · source readiness**.

### Module 1 — Market Pulse
- **Purpose**: One screen showing "what's happening in IPO market this week".
- **Inspired by**: Trendlyne (KPIs) + master plan §C-1 (pulse framing).
- **Data required**: IPO master list, listing-performance, live subscription, sector classification.
- **Visuals**: KPI strip (open count · ₹ raised YTD · avg listing gain · hit rate); subscription leaderboard table; listing-gain heatmap or bar; sector tilt mini-chart; "source health" inline strip.
- **Priority**: **v1**.
- **Source readiness**: NSE P-01/02/03 + P-04 GREEN (assumed from baseline); listing gain needs P-15 historical OHLC — **blocked**. Workaround: defer listing-gain heatmap in Market Pulse to v1.5 and show "Open this week" + "Recent ₹ raised" only at v1.

### Module 2 — Open & Upcoming IPOs
- **Purpose**: Pipeline of IPOs in bidding + announced-but-not-opened.
- **Inspired by**: Trendlyne + Zerodha (status badge) + Upstox (hero pattern).
- **Data required**: IPO master + dates + live subscription (for open).
- **Visuals**: IPO cards with name, segment chip, status badge, dates, mini subscription bar; segment/sector/size filters; date-sorted.
- **Priority**: **v1**.
- **Source readiness**: P-01/02 GREEN. Ready.

### Module 3 — Listing Soon
- **Purpose**: IPOs that have closed bidding and are awaiting listing.
- **Inspired by**: Trendlyne.
- **Data required**: IPO master + close date + listing date.
- **Visuals**: Compact list with countdown-to-listing, registrar link, allotment date.
- **Priority**: **v1**.
- **Source readiness**: Derived from P-01/03. Ready.

### Module 4 — Recently Listed / Gain-Loss
- **Purpose**: Show listing performance + current performance for IPOs listed in last N weeks.
- **Inspired by**: Trendlyne (gain/loss) + master plan §C-9 (fade scatter).
- **Data required**: IPO master + listing-day OHLC + current quote.
- **Visuals**: Listing-gain bar chart; listing-vs-current scatter (fade); top-5 / bottom-5 cards.
- **Priority**: **v1 (basic table) → v1.5 (fade scatter)**.
- **Source readiness**: P-15 (historical OHLC) **RED — blocker**. P-15b (current quote) needs confirmation. **Cannot ship v1 without P-15 fix.**

### Module 5 — IPO Screener
- **Purpose**: Filterable / sortable view across all IPOs.
- **Inspired by**: Trendlyne (filter sidebar) + master plan §G-5.
- **Data required**: All ingested fields.
- **Visuals**: Left rail filters (segment / sector / size band / status / subscription range / listing gain range); sortable result table; saved-screens in localStorage.
- **Priority**: **v1**.
- **Source readiness**: Once P-01/02/03 + P-04 are confirmed GREEN, screener is data-ready. UI work only.

### Module 6 — Subscription Heatmap
- **Purpose**: Demand structure for currently open IPOs (QIB/NII/Retail/Anchor + velocity).
- **Inspired by**: Trendlyne (day-wise) + master plan §C-2/3/4 (signals).
- **Data required**: NSE live subscription, sampled hourly + anchor allocation.
- **Visuals**: Per-IPO stacked bar (category mix); cross-IPO leaderboard table; per-IPO Subscription Quality composite; velocity heatmap (v2).
- **Priority**: **v1 (stacked bar + leaderboard)**, **v1.5 (composite signal)**, **v2 (velocity)**.
- **Source readiness**: P-04 GREEN (assumed). Anchor P-18 needs confirmation.

### Module 7 — IPO Detail Page
- **Purpose**: Single-issue deep dive (see §O4 for full section spec).
- **Inspired by**: **Zerodha + Upstox merged**, plus our source-audit + analyst signals.
- **Data required**: All IPO snapshots + RHP-derived narrative (manual seed at v1).
- **Visuals**: See §O4.
- **Priority**: **v1**.
- **Source readiness**: Core fields covered by P-01–05; narrative needs manual seed at v1. Anchor list needs P-18.

### Module 8 — DRHP / Pipeline Watch
- **Purpose**: Companies that filed DRHP but not yet opened.
- **Inspired by**: Trendlyne + master plan §G-7.
- **Data required**: SEBI DRHP filings (P-08), DRHP PDF link (P-09), observation-letter status.
- **Visuals**: Timeline table (filing date · status · observation date · sector); filter by sector; "DRHP age" indicator.
- **Priority**: **v1**.
- **Source readiness**: **P-08 RED — blocker. P-09 YELLOW (depends on P-08). Cannot ship without P-08 fix or exchange-side fallback (P-10).**

### Module 9 — GMP / Grey Market Monitor (optional)
- **Purpose**: Indicative GMP with multi-source dispersion + caveat.
- **Inspired by**: Trendlyne + Zerodha (caveat-first treatment).
- **Data required**: 3–5 GMP scrapers (P-19/20/22; P-21 RED).
- **Visuals**: GMP value + range; per-source source-chip; "indicative" label always visible; trend chart (v1.5).
- **Priority**: **v1 (basic with caveat)**, **v1.5 (trend)**.
- **Source readiness**: P-19/20/22 status to confirm; P-21 RED (skip).

### Module 10 — Source Health
- **Purpose**: Trust panel — every source's freshness, error rate, last fetched.
- **Inspired by**: Master plan §C-14 + §G-8 (our differentiator).
- **Data required**: Internal audit log only.
- **Visuals**: Per-source pill (green / amber / red); last-fetched timestamp; failure rate; last error message.
- **Priority**: **v1**.
- **Source readiness**: Internal — no external dependency. Ready.

### Module readiness summary

| # | Module | Priority | Ready for v1 build? | Blocker |
|---|---|---|---|---|
| 1 | Market Pulse | v1 | Partial — without listing-gain heatmap | P-15 RED |
| 2 | Open & Upcoming | v1 | **Yes** | None |
| 3 | Listing Soon | v1 | **Yes** | None |
| 4 | Recently Listed / Gain-Loss | v1 | **No** | P-15 RED |
| 5 | IPO Screener | v1 | **Yes** | None |
| 6 | Subscription Heatmap | v1 | Partial | Anchor P-18 to confirm |
| 7 | IPO Detail Page | v1 | Partial | RHP narrative = manual at v1 (OK); anchor list needs P-18 |
| 8 | DRHP / Pipeline Watch | v1 | **No** | P-08 RED, P-09 YELLOW |
| 9 | GMP Monitor | v1 (opt) | Yes if any of P-19/20/22 GREEN | Confirm |
| 10 | Source Health | v1 | **Yes** | None |

**Build readiness conclusion**: 5 of 10 v1 modules are immediately data-ready (2, 3, 5, 10, plus 9 conditionally). 3 are partially ready (1, 6, 7). 2 are blocked (4, 8). The blockers are **P-08, P-09, P-15** — all known.

---

## O4. Final IPO Detail Page model

Merges Zerodha + Upstox; adds Trendlyne fields they miss; adds our differentiators. **17 sections**, each with fields × inspired-by × source × v1/v1.5/v2 × automatable.

### S1. Hero header

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Company name | All three | NSE/BSE listing | v1 | Auto | |
| Logo | (none — our add) | Manual upload / domain favicon | v1 | Manual | |
| Segment badge (Mainboard / SME) | Trendlyne + Zerodha | NSE/BSE flag | v1 | Auto | |
| Status badge (Upcoming / Open / Closed / Listed) | Zerodha + Upstox | Derived from dates | v1 | Auto | |
| Subscription headline tag (e.g. "1.69x subscribed") | Upstox | NSE live (P-04) | v1 | Auto | Strong top-of-fold signal |
| Sector tag | Upstox | NSE/BSE industry code + manual map | v1 | Auto + override | |
| Min. investment ₹ | Upstox | Derived (lot × upper band) | v1 | Auto | |
| Days-to-event counter (close / listing) | Master plan §G | Derived | v1 | Auto | |
| Source-audit chip ("X fields auto, Y manual") | Our own | Internal | v1 | Auto | Differentiator |

### S2. Issue terms

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Price band low–high | All three | NSE/BSE/RHP | v1 | Auto | |
| Lot size (shares **and** ₹) | Zerodha | NSE/BSE | v1 | Auto | Show both |
| Issue size ₹Cr | All three | NSE/BSE/RHP | v1 | Auto | |
| Fresh issue ₹Cr | Zerodha (line items) | NSE/BSE/RHP | v1 | Auto | |
| OFS ₹Cr | Zerodha | NSE/BSE/RHP | v1 | Auto | |
| Face value | Master plan §D | RHP | v1 | Auto | |
| Listing exchange(s) | Upstox | RHP / exchange | v1 | Auto | Upstox explicit row |
| Issue type label (Book-built / Fixed-price) | Master plan §D | NSE/BSE | v1 | Auto | |
| Reservation breakdown (QIB/NII/Retail/Employee %) | Trendlyne + master plan §D | NSE/BSE/RHP | v1 | Auto | |

### S3. IPO timeline (Zerodha-style, 10 milestones)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Bid open date | All three | NSE/BSE | v1 | Auto | |
| Bid close date | All three | NSE/BSE | v1 | Auto | |
| UPI mandate deadline | Zerodha | Derived from close | v1 | Auto | |
| Allotment finalization | Zerodha + Upstox | NSE/BSE | v1 | Auto | |
| Refund initiation | Zerodha | NSE/BSE | v1 | Auto | |
| Share credit to demat | Zerodha + Upstox | NSE/BSE | v1 | Auto | |
| Listing date | All three | NSE/BSE | v1 | Auto | |
| Anchor lock-in 50% end | Zerodha | Derived (allot + 30d) | v1 | Auto | |
| Anchor lock-in 100% end | Zerodha | Derived (allot + 90d) | v1 | Auto | |
| Timeline visualisation (Zerodha full table) | Zerodha | UI | v1 | Auto | |
| Sidebar compact rail (responsive variant) | Upstox | UI | v1.5 | Auto | Mobile / narrow-screen |

### S4. Apply / status area (broker-neutral)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Status line ("Bidding open — closes in 1d 4h" / "Listing on 25 May") | Zerodha + Upstox | Derived | v1 | Auto | |
| "How to apply" explainer (broker-neutral, generic) | (none — our add) | Static copy | v1 | Manual | One-time copy |
| Link out to NSE/BSE issue page | Master plan §D | NSE/BSE URL | v1 | Auto | |
| Allotment status link → registrar portal | Zerodha | P-11 resolution | v1 | Auto | Zerodha pattern |
| **No broker apply CTA** | (deliberate omission) | n/a | n/a | n/a | We are not a broker |

### S5. Subscription table

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Per-category × times (QIB/NII/Retail/Employee/Total) | All three | NSE (P-04) | v1 | Auto | |
| Reserved shares per category | Zerodha | NSE/BSE | v1 | Auto | Zerodha shows |
| Applied shares per category | Zerodha | NSE/BSE | v1 | Auto | |
| Multi-day history rows | Upstox + Trendlyne | NSE sampled | v1.5 | Auto | Upstox table shape |
| Subscription timestamp ("as of 5 PM 20 May 2026") | Zerodha | API timestamp | v1 | Auto | Freshness |

### S6. Demand quality panel (our signal layer)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| QIB-led vs Retail-led mix (stacked bar) | Master plan §C-3 | NSE | v1 | Auto | |
| Subscription Quality composite | Master plan §C-2 | NSE + anchor | v1.5 | Auto | Differentiator |
| Subscription velocity heatmap | Master plan §C-4 | NSE sampled | v2 | Auto | Differentiator |
| Anchor concentration (top-3 %) | Master plan §C-8 | Anchor PDF (P-18) | v1 | Auto | Differentiator |

### S7. Financial snapshot

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Revenue (3 FY + interim) | Upstox + Trendlyne | RHP | v1.5 | Manual → Auto | Manual paste at v1.5 first run |
| EBITDA | Upstox | RHP | v1.5 | Manual → Auto | |
| PAT | Upstox | RHP | v1.5 | Manual → Auto | |
| Total assets | Upstox | RHP | v1.5 | Manual → Auto | |
| Net worth | Master plan §D | RHP | v1.5 | Manual → Auto | |
| Debt | Master plan §D | RHP | v1.5 | Manual → Auto | |
| EPS | Master plan §D | RHP | v1.5 | Manual → Auto | |
| RoNW | Trendlyne | Derived | v1.5 | Auto (once inputs there) | |
| RoCE | Trendlyne | Derived | v1.5 | Auto | |
| D/E | Upstox + Trendlyne | Derived | v1.5 | Auto | |
| 3Y CAGR (Revenue, PAT) | Upstox | Derived | v1.5 | Auto | |

### S8. Performance / trend charts

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Per-metric bar chart with tabs (Revenue / EBITDA / PAT / Assets) | Upstox | Same table data | v1.5 | Auto | Upstox pattern |
| Single combined chart (revenue + PAT overlay) | Zerodha | Same | v1.5 | Auto | Alternate compact view |

### S9. Peer comparison

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Listed peers (3–5 names) | Upstox | Curated peers DB per sector | v2 | Manual seed → curated | |
| Per-metric peer cards (Revenue / 3Y growth / PAT / Market cap / P/E / D/E) | Upstox | Peers DB + own | v2 | Auto | |
| Sector-average qualifier badges ("Higher / Lower than sector avg") | Upstox | Derived | v2 | Auto | |
| Peer median scatter (valuation vs size) | Master plan §C-11 | Peers DB | v2 | Auto | Differentiator |

### S10. Quality / Risk checklist (Upstox-style binary heuristics)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Quality: Revenue growth check | Upstox | Derived from financials | v1.5 | Auto | Once financials there |
| Quality: Company valuation check | Upstox | Derived | v1.5 | Auto | |
| Quality: Earnings expansion check | Upstox | Derived | v1.5 | Auto | |
| Risk: D/E ratio check | Upstox | Derived | v1.5 | Auto | |
| Risk: Promoter holding check | Upstox | RHP shareholding | v1.5 | Manual → Auto | |
| Risk: Shares pledged check | Upstox | RHP | v1.5 | Manual → Auto | |

### S11. Strengths

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| 3–5 narrative bullets | Zerodha | RHP "Our Strengths" | v1 (manual paste) → v2 (parser) | Manual → Auto | Zerodha-style bullets |

### S12. Risks

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| 3–5 narrative bullets (top risks from RHP) | Zerodha | RHP "Risk Factors" | v1 (manual paste) → v2 (parser) | Manual → Auto | |

### S13. Objectives / use of proceeds

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Line items (purpose × ₹Cr × %) | Zerodha | RHP "Objects of the Offer" | v1 (manual paste) → v2 (parser) | Manual → Auto | Zerodha richer format |
| Stacked-bar visual | Upstox | UI | v1 | Auto | |
| Sankey visual | Master plan §C-7 | UI | v2 | Auto | Differentiator |

### S14. Promoter / shareholding

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Promoter names | Trendlyne + Upstox (checklist) | RHP | v1 (manual) | Manual → Auto | |
| Promoter holding pre-issue % | Trendlyne + master plan §D | RHP | v1.5 | Manual → Auto | |
| Promoter holding post-issue % | Same | RHP | v1.5 | Manual → Auto | |
| Shares pledged % | Upstox | RHP | v1.5 | Manual → Auto | |
| Promoter dilution waterfall | Master plan §C-6 | Derived | v2 | Auto | Differentiator |

### S15. Documents

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| DRHP link | Trendlyne | SEBI (P-08) / exchange (P-10) | v1 | Auto | **Blocked unless P-08 or P-10 GREEN** |
| RHP link | Trendlyne + Zerodha | Same | v1 | Auto | |
| Anchor allocation PDF | Master plan §D | NSE/BSE (P-18) | v1 | Auto | |
| Allotment basis PDF | Trendlyne | Registrar (P-11) | v1.5 | Auto | |
| Listing prospectus | Trendlyne | Exchange | v1 | Auto | |

### S16. Registrar / BRLM

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Registrar name | Master plan §D | RHP cover (P-17) | v1 | Auto (parse) | |
| Registrar allotment-portal link | Zerodha | P-11 resolution | v1 | Auto | Zerodha pattern |
| BRLM names | Master plan §D | RHP cover (P-17) | v1 | Auto (parse) | |
| BRLM websites | (none — our add) | Curated | v1.5 | Manual | |

### S17. Source audit (our differentiator)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Per-field source URL chip | Master plan §C-14 | Internal | v1 | Auto | Differentiator |
| Per-field last-fetched timestamp | Master plan §C-14 | Internal | v1 | Auto | Differentiator |
| Per-IPO source-mix bar | Master plan §C-14 | Internal | v1 | Auto | Differentiator |
| Per-field confidence flag | Master plan §C-14 | Internal heuristic | v1.5 | Auto | Differentiator |

### S18. Analyst signal panel (our differentiator)

| Field | Inspired by | Source | v1/v1.5/v2 | Automatable | Notes |
|---|---|---|---|---|---|
| Subscription Quality composite | Master plan §C-2 | NSE + anchor | v1.5 | Auto | Differentiator |
| Anchor concentration warning | Master plan §C-8 | P-18 | v1 | Auto | Differentiator |
| Listing-gain-fade score (post-listing) | Master plan §C-9 | P-15 + P-15b | v2 | Auto | Differentiator (blocked) |
| Valuation-vs-peers band | Master plan §C-11 | Peers DB | v2 | Auto | Differentiator |

---

## O5. Final v1 field cut

### O5.1 v1 must-have (cannot ship a credible product without these)

| Field | Module(s) | Source | Phase 0 status | Action needed |
|---|---|---|---|---|
| IPO master list (name, segment, exchange, status) | 1, 2, 3, 5 | NSE/BSE | GREEN (baseline) | Confirm in re-run |
| Open IPO list with live status | 2 | NSE current (P-01) | GREEN (baseline) | Confirm |
| Upcoming IPO list | 2 | NSE upcoming (P-02) | GREEN (baseline) | Confirm |
| Past / recently-listed IPO list | 3, 4 | NSE past (P-03) | GREEN (baseline) | Confirm |
| Issue dates (open, close, allotment, listing) | All modules | NSE/BSE | GREEN | Confirm |
| Price band, lot size, min investment, issue size | 2, 5, 7 (S2) | NSE/BSE/RHP | GREEN | Confirm |
| Fresh / OFS split | 7 (S2) | NSE/BSE/RHP | GREEN | Confirm |
| Reservation breakdown | 6, 7 (S2) | NSE/BSE/RHP | GREEN | Confirm |
| Live subscription per category × times | 1, 6, 7 (S5) | NSE (P-04) | GREEN (baseline) | Confirm |
| Reserved / applied shares per category | 7 (S5) | NSE/BSE | GREEN | Confirm |
| Subscription timestamp | 6, 7 (S5) | API meta | GREEN | Confirm |
| Sector classification | 1, 5, 7 (S1) | NSE/BSE industry code + manual map | New (no probe) | Add light probe / manual map file |
| Anchor allocation date + investor names + amounts | 6, 7 (S6, S15) | NSE/BSE anchor PDF (P-18) | TBD | Promote P-18 priority |
| Anchor concentration (top-3 %) | 6, 7 (S6) | Derived from P-18 | TBD | Same |
| Registrar name + allotment-portal link | 3, 7 (S16) | RHP cover + P-11 | TBD | Confirm P-11 |
| BRLM names | 7 (S16) | RHP cover (P-17) | TBD | Confirm P-17 reachability |
| DRHP link | 8, 7 (S15) | SEBI (P-08) → exchange (P-10) | **P-08 RED** | **Repair P-08 or wire P-10 fallback** |
| RHP link | 7 (S15) | SEBI / exchange | **YELLOW** | Same |
| Anchor allocation PDF link | 7 (S15) | NSE/BSE | TBD | Confirm |
| Listing prospectus link | 7 (S15) | Exchange | GREEN (assumed) | Confirm |
| GMP indicative + dispersion + caveat | 9, 7 (header strip) | P-19/20/22 averager (P-21 skip) | TBD | Confirm at least one GREEN |
| Source audit per field | Every module (10, S17) | Internal | n/a (internal) | Design & implement |
| Per-IPO source-mix bar | 10, 7 (S17) | Internal | n/a | Same |
| Source health page | 10 | Internal | n/a | Same |
| Manual seed for company overview / strengths / risks / use-of-proceeds | 7 (S5–S13) | Manual paste | n/a | Tooling: structured seed format |

**v1 critical-path totals**: 25 field families. Of these:
- 17 directly source from NSE / BSE / derived — most GREEN at baseline.
- 4 source from SEBI / RHP / anchor PDF — currently blocked or YELLOW.
- 4 are internal (source audit + manual seeds).

### O5.2 v1.5 should-have (richer feel, not blocking)

| Field | Module(s) | Source | Phase 0 status | Action needed |
|---|---|---|---|---|
| Listing-day OHLC (open/high/low/close) | 1, 4 | NSE historical (P-15) | **RED** | **Repair P-15** |
| Listing gain % (vs upper-band) | 1, 4 | Derived from P-15 | RED (depends on P-15) | Same |
| Current price / current gain % | 4 | NSE quote (P-15b) | TBD | Confirm |
| Listing-vs-current fade scatter | 4 | P-15 + P-15b | RED | Same |
| Sector heatmap | 1 | Sector + listing | RED for listing piece | Same |
| Multi-day subscription matrix | 6, 7 (S5) | Sampled NSE | Needs sampling design | Workflow change |
| Subscription Quality composite | 6, 7 (S6) | NSE + anchor | Derived | Build once inputs there |
| 3 FY + interim financials (manual paste) | 7 (S7) | RHP | Manual at v1.5 | Seed format + UI |
| Quality / Risk checklist heuristics | 7 (S10) | Derived from financials | Manual seed dep | Build once seeds there |
| Per-metric bar charts (Revenue/EBITDA/PAT/Assets) | 7 (S8) | Same table | UI work | |
| Market cap / P/E / P/B / EV/EBITDA at upper band | 7 (S2, S7) | Derived | Derived | Same |
| Promoter holding pre/post + pledged | 7 (S14) | RHP | Manual at v1.5 | |
| Allotment basis PDF | 7 (S15) | Registrar | Per-IPO | |
| IPO calendar | 1 | NSE/BSE | Yes | UI work |
| Saved screens (localStorage) | 5 | Browser | n/a | UI work |
| Per-field confidence flag | 7 (S17) | Internal heuristic | n/a | Build |
| GMP trend over time | 9 | Sampled scrapers | Workflow change | |

### O5.3 v2 deferred (Phase 4–6)

| Field | Module(s) | Source | Phase 0 status | Action needed |
|---|---|---|---|---|
| Strengths / Risks / Objectives auto-parsed from RHP | 7 (S11–S13) | RHP parser (P-17 new section logic) | Phase 5 | Build parser |
| 3 FY + interim financials auto-parsed | 7 (S7) | RHP parser (P-17) | Phase 5 | Build parser |
| Promoter / shareholding auto-parsed | 7 (S14) | RHP parser | Phase 5 | Build parser |
| Anchor PDF auto-parsing | 7 (S6) | P-18 enhanced | Phase 5 | Build parser |
| Peer comparison cards (6 metrics vs sector avg) | 7 (S9) | Peers DB | Phase 5 | Build peers DB |
| Sector-relative qualifier badges | 7 (S9) | Peers DB | Phase 5 | Same |
| Peer scatter (valuation vs size) | 7 (S9) | Peers DB | Phase 5 | Same |
| Sankey for use-of-proceeds | 7 (S13) | UI | Phase 5 | UI work |
| Promoter dilution waterfall | 7 (S14) | Derived | Phase 5 | |
| Subscription velocity heatmap | 6, 7 (S6) | Sampled NSE | Phase 5 | Workflow change |
| Listing-gain-fade score | 4, 7 (S18) | P-15 + P-15b | Phase 6 | Build signal |
| Cohort fade by sector | 4 | + sector | Phase 6 | |
| Alpha vs Nifty / sector index | 4 | + index data | Phase 6 | |
| Valuation-vs-peers band signal | 7 (S18) | Peers DB | Phase 6 | |
| MF anchor participation count | 7 (S6) | P-18 enhanced | Phase 6 | |
| BRLM websites | 7 (S16) | Curated | Phase 6 | |

---

## O6. Impact on Phase 0.1 repair priorities

### O6.1 Is P-08 (SEBI Public Issues) still critical?

**Yes — even more critical now.**

Reasons:
- DRHP link and Pipeline Watch module (Module 8) both depend on it.
- All three benchmarks (Trendlyne, Zerodha, Upstox) show a prospectus link — it is a baseline expectation, not optional.
- The combined benchmark adds a `DRHP / Pipeline Watch` module as v1; that module is **entirely** dependent on P-08 (or P-10 fallback).

Priority: **must repair before v1**.

### O6.2 Is P-09 (DRHP PDF download) still critical?

**Yes — same logic.**

Reasons:
- Even at v1 with manual narrative seed, an analyst will expect to download the RHP from the IPO Detail Page Documents section.
- Once P-08 is fixed, P-09 becomes reachable (its YELLOW is caused by P-08's RED — no DRHP URLs to download).
- For v2 (RHP parsing), P-09 becomes the input pipe for P-17.

Priority: **must repair after P-08**.

### O6.3 Is P-15 (NSE Historical OHLC) still critical?

**Yes — and Trendlyne raises its weight.**

Reasons:
- Module 4 (Recently Listed / Gain-Loss) and the Best/Worst leaderboards from Trendlyne both depend on listing-day OHLC.
- Listing gain % is computed from listing close ÷ upper-band — without P-15 we cannot show this anywhere.
- Module 1 (Market Pulse) loses the listing-gain heatmap KPI without P-15.

Priority: **must repair before v1 unless we accept shipping without listing performance** (which the brief explicitly does not).

### O6.4 Do we need new probes because of Zerodha / Upstox fields?

**Two new probes recommended, both small:**

1. **P-24 — Sector classification** (NSE/BSE industry code). Upstox shows a sector tag and uses it to compute "vs sector avg". Trendlyne uses sectors for filtering. Either a small NSE/BSE-industry-code probe + manual map file. Low effort.
2. **P-23 fix only** — the `__name` ReferenceError inside `extractFields`. One-line probe-code fix so future broker-page reruns produce structured `fields.json`. Not blocking, but cheap.

**Not needed** as new probes:
- No probe needed for "Peers DB" (v2; will be a curated CSV per sector, not scraped).
- No probe needed for broker pages as production sources (they stay reference-only).
- No probe needed for Trendlyne (never scraped).

### O6.5 Should broker pages remain reference-only?

**Yes. Reaffirmed.**

Reasons:
- Both broker ToS forbid automated scraping for commercial use.
- We have demonstrated technical access from GH Actions, but technical access does not imply legal access.
- Every field on the broker pages is sourceable from NSE / BSE / SEBI / RHP — there is no field that is broker-page-exclusive.
- Re-derivation from official sources also gives us the source-audit + freshness story the brokers lack.

### O6.6 Targeted Phase 0.1 repair pass — exact next step

**One focused workflow run** that repairs the three known blockers + adds the small sector probe:

| Probe | Action |
|---|---|
| P-08 (SEBI Public Issues) | Diagnose RED. Likely candidates: layout drift on SEBI's HomeAction.do page (table structure changed); JS rendering newly required; legitimate referrer header. Try in order: (a) fresh GET with browser-like headers, (b) Playwright-rendered fallback (we now have the helper), (c) exchange-side fallback via P-10 if SEBI stays RED. |
| P-09 (DRHP PDF download) | Re-run once P-08 produces URLs. Validate one sample PDF downloads + parses (page-count + first-page text). |
| P-10 (Exchange DRHP) | Confirm it can fully cover P-08 fallback (currently a secondary). Promote to primary if SEBI stays unreliable. |
| P-15 (NSE Historical OHLC) | Diagnose RED. Most likely a header / cookie issue similar to live-subscription. Try: cookie warmup chain, alt endpoint (`api.nseindia.com/api/historical/cm/equity`), test on a known ticker (e.g. RELIANCE) to separate "endpoint dead" from "ticker-specific". |
| P-18 (Anchor PDF parse) | Confirm reachability on an actual recent anchor PDF (NFP Sampoorna Foods has one — captured indirectly via Zerodha). Test PDF parsing with `pdfplumber` for table extraction. |
| P-11 (Registrar resolution) | Confirm at least the URL-only resolution table is correct for Skyline + Linkintime + Kfintech + Bigshare + MAS. |
| New P-24 (Sector mapping) | Lightweight: fetch NSE industry-code list once; commit a static `sector-map.json` keyed by ISIN or company-name. Manual override layer. |

Optional (small, cheap, not blocking):
- Fix the `__name` bug in `scripts/probes/lib/playwright.ts` so any future Group H rerun produces structured `fields.json`.

**Exit criterion for the repair pass:**
- P-08, P-15 either GREEN or P-10 / P-15b confirmed as full fallback.
- P-09 GREEN given P-08 GREEN.
- P-18 reachable + parses at least one sample.
- P-11 resolution table verified.
- P-24 mapping file committed.

After that, the v1 cut in §O5.1 becomes fully data-ready.

---

## O7. Source strategy after combined benchmark

Updated source map covering every benchmark feature. Replaces / refines master plan §D, §E and broker-page report §5.

| Source | Needed for which benchmark feature | Phase 0 status | v1 use | Risk | Fallback |
|---|---|---|---|---|---|
| **NSE — IPO list pages (current/upcoming/past)** | Modules 1, 2, 3, 5; all hero/issue-terms fields | GREEN (baseline) | Primary | Medium (anti-bot, cookie warmup needed) | BSE P-06; manual seed |
| **NSE — live subscription** | Modules 1, 6, 7 subscription; live status badge | GREEN (baseline) | Primary | Medium (same) | BSE P-07 |
| **NSE Emerge SME list** | All views' SME tab | GREEN (baseline) | Primary | Medium | BSE SME P-06b |
| **NSE — current quote** (P-15b) | Module 4 current price/gain | TBD | Primary | Medium | Manual stub |
| **NSE — historical OHLC** (P-15) | Module 4 listing day; Best/Worst leaderboards | **RED — blocker** | **Critical for v1** | Medium | Manual stub for failures (poor UX) |
| **SEBI — Public Issues** (P-08) | Module 8 DRHP pipeline; DRHP link in S15 | **RED — blocker** | **Critical for v1** | Low (gov't, but parse fragile) | Exchange-side P-10 |
| **SEBI / Exchange — RHP/DRHP PDFs** (P-09, P-17) | Documents S15; v2 narrative + financials parsing | YELLOW (P-09 dep on P-08); P-17 TBD | v1 = link only; v2 = parse | Low | Manual entry |
| **BSE — IPO pages** (P-06, P-06b, P-07) | Cross-validation + fallback for NSE | TBD | Fallback only (NSE primary) | Medium | NSE |
| **Exchange — DRHP archive** (P-10) | Fallback if SEBI RED | TBD | **Promote to primary if P-08 stays RED** | Medium | Manual |
| **Registrar — resolution table** (P-11) | Allotment-portal links in S4, S16 | TBD | Primary (URL only at v1) | Low | Manual map |
| **Specific registrar portals** (Linkintime P-12, Kfintech P-13, Bigshare P-14, MAS, Skyline) | Per-IPO allotment portal | Per-probe | Primary for the URL only | Low | Manual |
| **Anchor allocation PDFs** (P-18) | Module 6 anchor concentration; S6, S15 | TBD | Primary | Medium (PDF format varies per MB) | Manual |
| **GMP — IPOWatch** (P-19) | Module 9; header strip caveat | TBD | One of 3 sources in averager | Medium | Skip if all RED |
| **GMP — Chittorgarh** (P-20) | Module 9 | TBD | Same | Medium | Skip |
| **GMP — IPO Central** (P-21) | n/a (skip) | **RED** | Skip permanently | High | n/a |
| **GMP — InvestorGain** (P-22) | Module 9 | TBD | Same | Medium | Skip |
| **Sector / industry code source** (new — P-24) | Sector classification, Module 1 heatmap, Module 5 filter, S1 | New — to add | Primary | Low | Manual map file |
| **Peers DB** (curated) | Module 7 S9 (v2 only) | n/a (out of Phase 0) | v2 only | Low | Manual |
| **Internal source-audit log** | Module 10; S17 | n/a | Primary | Low | n/a |
| **Manual seed (company overview / strengths / risks / objectives)** | S5–S13 at v1 | n/a | Primary (v1 only) | Low | Skip section if unseeded |
| **Zerodha** | **Information-architecture benchmark only** | **GREEN access (probe-bug, not page-bug)** | **Never as production source** | Legal: ToS forbids commercial scraping | n/a |
| **Upstox** | **Information-architecture benchmark only** | **GREEN access** | **Never as production source** | Legal: same | n/a |
| **Trendlyne** | **Information-architecture benchmark only** | n/a (never probed) | **Never as production source** | Legal: ToS explicitly forbids; high enforcement risk | n/a |

---

## O8. Final recommendation

### O8.1 Are we ready to approve the combined benchmark model?

**Yes — the model itself (Trendlyne breadth + Zerodha/Upstox depth + our differentiators) is decision-ready.** §O3 (10 modules) and §O4 (17 sections) define the dashboard; §O5 defines the v1 cut.

**But the v1 cut is not data-ready.** Three known Phase 0 blockers stand between approval and a credible Phase 1 build:
- **P-08 RED** (SEBI Public Issues) → blocks Module 8 + DRHP link in Module 7.
- **P-09 YELLOW** (depends on P-08) → blocks DRHP downloads.
- **P-15 RED** (NSE historical OHLC) → blocks Module 4 + Best/Worst leaderboards + listing-gain heatmap in Module 1.

The right sequence is:
1. **Targeted Phase 0.1 repair pass** per §O6.6 (P-08, P-09, P-15, plus P-18 / P-11 confirmation + new lightweight P-24 sector probe).
2. **Final approval** of §O3 + §O5 once probe statuses are known.
3. **Phase 1 mock dashboard shell** (UI scaffolding + sample-data mocks for modules whose sources are GREEN).

### O8.2 What should v1 include?

§O5.1 — 25 field families: IPO master + dates + economics + subscription + reservation + sector + anchor + registrar + BRLM + documents + GMP-with-caveat + source-audit + manual narrative seeds.

### O8.3 What should wait?

§O5.2 (v1.5): listing performance (post-repair), multi-day subscription, financials (manual paste), Quality/Risk checklist, IPO calendar, saved screens.

§O5.3 (v2): RHP parser, peers DB + peer comparison, Sankey, dilution waterfall, velocity heatmap, advanced analyst signals.

### O8.4 What should Claude do next?

**Recommended order**:
1. **Wait for explicit approval** of the §O3 / §O4 / §O5 model.
2. On approval: run the **targeted Phase 0.1 repair pass** (§O6.6) — small, focused, scoped to the blockers + the new P-24 sector probe + the optional `__name` probe-code fix.
3. After the repair pass: re-state the v1 cut in light of new probe statuses, surface any new blockers.
4. **Only after a green light on §O5.1 with the resolved blockers**: start Phase 1 mock dashboard shell.

### O8.5 Next-work decision: targeted Phase 0.1 repair, OR Phase 1 mock dashboard?

**Targeted Phase 0.1 repair, not Phase 1.**

Rationale:
- Two of the v1 modules (Module 4 Recently Listed, Module 8 DRHP Pipeline) cannot ship without P-15 and P-08 respectively. Starting Phase 1 without fixing these means building UI shells that will hit "no data" placeholders within hours.
- A mock-data-only Phase 1 risks designing the UI around assumed data shapes that the real probes never validate.
- The repair pass is small (≤7 probes), well-scoped, and reuses the existing Phase 0 harness — no new infrastructure.
- The cost of waiting for the repair is one focused workflow run; the cost of skipping it is rework once Phase 1 hits real data.

**Final answer**: Approve §O3 + §O5; then do the targeted Phase 0.1 repair pass (§O6.6) before Phase 1.

---

## Critical files

Read references used to build this report:
- Master plan §A–G (Trendlyne baseline): `/root/.claude/plans/ipo-market-dashboard-we-zazzy-liskov.md:110–315`
- Master plan §N (broker-page analysis): same file, §N
- Broker-page benchmark report: `phase-0/broker-pages/broker-page-benchmark-report.md`
- Phase 0 probe results (current): `phase-0/source-probe-results.json` (latest reflects Group H only; baseline P-01–P-22 status carries from prior runs)

No code in this report. No UI. No DB. No ingestion pipeline. Stays on `main`.
