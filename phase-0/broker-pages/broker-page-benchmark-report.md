# Phase 0.1 — Broker IPO Page Benchmark Report

> **Generated**: 2026-05-20 from Phase 0.1 Group H artifacts (commit `abce05c`).
> **Source**: `phase-0/broker-pages/` (P-23a Zerodha, P-23b Upstox).
> **Status**: Both pages **loaded successfully**. Section N.5 deliverable below.

This report combines the Phase 0.1 Group H probe results with field-level inventory, comparison, and an updated source map. It supersedes the Trendlyne-as-reference language in Section B/C/G of the master plan. Zerodha and Upstox remain **information-architecture benchmarks only**, not production data sources.

---

## 1. Access result per page

### 1.1 Zerodha — `https://zerodha.com/ipo/440359/nfp-sampoorna-foods/`

| | |
|---|---|
| HTTP status | **200 OK** |
| Final URL | (no redirect) |
| Page title | `NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size` |
| Render mode | **Server-rendered** (raw 38 058 → rendered 39 442; ratio 1.04) |
| Challenge detected | **No** (no Cloudflare / Datadome / interstitial) |
| Visible text captured | 8.1 KB — full page content end-to-end |
| Screenshot captured | 491 KB full-page PNG |
| Scrapability verdict | **Technically accessible from GitHub Actions runner without any anti-bot circumvention.** Server-rendered HTML means a simple authenticated HTTP GET would be sufficient (Playwright not actually required for Zerodha). |

### 1.2 Upstox — `https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/`

| | |
|---|---|
| HTTP status | **200 OK** |
| Final URL | (no redirect) |
| Page title | `Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotment | Upstox` |
| Render mode | **Server-rendered with hydration** (raw 218 103 → rendered 262 774; ratio 1.20). Most content is in the SSR payload; the comparison cards and charts hydrate after load. |
| Challenge detected | **No** |
| Visible text captured | 9.2 KB — full page content end-to-end |
| Screenshot captured | 394 KB full-page PNG |
| Scrapability verdict | **Technically accessible from GitHub Actions runner without any anti-bot circumvention.** Server-rendered enough that the core fields are present without JS; the dynamic sector-comparison numbers may need browser rendering for freshness, but the primary IPO fields are in the SSR HTML. |

### 1.3 Probe code bug (separate from page access)

The `extractFields` callback inside `page.evaluate` threw `ReferenceError: __name is not defined` — a tsx-emitted helper for `Function.prototype.name` preservation that does not exist in the Chromium context. This is **a probe-code bug, not a page-access failure**. Consequence: `{zerodha,upstox}-fields.json` headings/tables/doc_links/labels_detected arrays are empty even though the underlying pages have rich structure.

**Fix (small, follow-up):** rewrite the `page.evaluate` callback as a plain string body, or precompile the helper without tsx decorators, or pass an explicit `arg` and use only `function() {}` declarations. This does not block Section N — the visible-text and rendered-HTML captures are complete and sufficient for the inventory below. **Recommend pushing the probe-code fix only if/when you want to re-derive structured field detection automatically; the report below is hand-derived from the text + HTML + screenshot.**

### 1.4 Probe status correction (versus `source-status-summary.json`)

Both `P-23a` and `P-23b` are recorded as `RED` in `source-status-summary.json`. **The correct functional status given full page-load success is `GREEN` for both** — the `RED` is a side-effect of the field-extractor bug (which classified zero detected labels as "skeletal" then errored out before classification could land properly). I do not propose touching the summary file; the explanation lives here and in the master plan.

---

## 2. Full data / section inventory per page

### 2.1 Zerodha — NFP Sampoorna Foods IPO (SME)

Verbatim from `zerodha-text.txt` + screenshot. Provenance guess = which underlying source the broker likely sourced the value from.

| Section | Field | Value (from page) | Provenance guess |
|---|---|---|---|
| Header | Company name | NFP Sampoorna Foods IPO | NSE/BSE listing record |
| Header | Status badge | LIVE | Derived from exchange dates |
| Header | Segment badge | SME | NSE Emerge / BSE SME |
| Header | CTAs | "Apply now", "Remind me" | Zerodha-internal |
| Key terms | IPO date | 18th – 20th May 2026 | NSE/BSE |
| Key terms | Listing date | 25 May 2026 | NSE/BSE |
| Key terms | Price range | ₹52 – ₹55 | NSE/BSE/RHP |
| Key terms | Lot size | 2000 — ₹110000 | NSE/BSE/RHP |
| Key terms | Issue size | 25cr | NSE/BSE/RHP |
| Documents | Prospectus | "Download prospectus (PDF)" link | Exchange filings / Company / MB |
| Schedule | Issue open date | 18 May 2026 | NSE/BSE |
| Schedule | Issue close date | 20 May 2026 | NSE/BSE |
| Schedule | UPI mandate deadline | 20 May 2026 (5 PM) | NSE/BSE |
| Schedule | Allotment finalization | 21 May 2026 | NSE/BSE |
| Schedule | Refund initiation | 22 May 2026 | NSE/BSE |
| Schedule | Share credit | 22 May 2026 | NSE/BSE |
| Schedule | Listing date | 25 May 2026 | NSE/BSE |
| Schedule | Mandate end date | 04 Jun 2026 | NSE/BSE |
| Schedule | Anchor lock-in (50%) end | 19 Jun 2026 | Derived (allot + 30d) |
| Schedule | Anchor lock-in (rest) end | 18 Aug 2026 | Derived (allot + 90d) |
| Schedule | Disclaimer | "schedule is tentative … registrar's website and exchange website" | Zerodha-authored copy |
| About | Company description | 1 paragraph (~250 words on business: cashews, makhana, almonds, walnuts; channels; sourcing) | RHP "Our Business" section |
| Financials | Chart | Bar chart of revenue + profit (visible in screenshot) | RHP financial statements |
| Financials | Issue size table | Total issue size = 24.53 cr; Fresh Issue = 24.53 cr; OFS = 0 | RHP / exchange |
| Financials | Use-of-proceeds | Working capital 7.25 (29.56%); Repayment 9.5 (38.73%); General corporate 7.78 (31.71%) | RHP "Objects of the Offer" |
| Strengths | 5 bullets | Direct African sourcing; multi-channel; product mix; in-house processing; health-food expansion | RHP "Our Strengths" |
| Risks | 5 bullets | Seasonal supply; raw-material price volatility; procurement risk; competition; regulatory | RHP "Risk Factors" (summarised) |
| Allotment | Process | Instructions linking to Skyline Financial Services portal | Implies **Registrar = Skyline Financial Services** |
| Subscription | GMP note | "no premium in the grey market" + link to media report | External GMP source |
| Subscription | Live table | Institutional 0.42/0.42/1x · NII 20.94/7.20/0.34x · Retail 21/58.72/2.80x · Total 42.36/66.34/1.57x | NSE/BSE subscription API |
| Subscription | Timestamp | "as of 05:00 PM on May 20, 2026" | Exchange feed |

**Notably absent from Zerodha**: peer / valuation comparison, P/E, P/B, RoNW, RoCE, EPS, market-cap, BRLM list, anchor investor list / amount, promoter holding pattern, shareholding pattern (pre/post), industry / sector classification, sector-relative analytics.

### 2.2 Upstox — Vegorama Punjabi Angithi Limited IPO (SME)

| Section | Field | Value (from page) | Provenance guess |
|---|---|---|---|
| Header | Company name | Vegorama Punjabi Angithi IPO | NSE/BSE listing record |
| Header | Subscription tag (live) | 1.69x subscribed | NSE/BSE subscription API |
| Header | Sector tag | Hotel | Upstox-classified (industry mapping) |
| Header | Status | Open | Derived from exchange dates |
| Header | Min. investment | ₹2.34L | Computed (lot × upper band) |
| Header | Tabs | About / Analysis / Subscription Status | Upstox IA |
| IPO Details | Issue size | ₹38Cr | NSE/BSE/RHP |
| IPO Details | IPO type | SME | NSE Emerge / BSE SME |
| IPO Details | Market Cap | ₹127.9Cr | Derived (post-issue shares × price band upper) |
| IPO Details | Market Cap qualifier | "Lower than sector avg" | Upstox sector classifier + peers DB |
| IPO Details | Price range | ₹73.00 – ₹77.00 | NSE/BSE/RHP |
| IPO Details | Listing Exchange | BSE | RHP / exchange |
| IPO Details | Revenue (FY) | ₹101.31Cr | RHP financial statements |
| IPO Details | Revenue qualifier | "Lower than sector avg" | Sector benchmarking |
| IPO Details | Lot size | 1600 shares | NSE/BSE/RHP |
| IPO Details | Red Herring Prospectus | "Read" link | SEBI / exchange / MB |
| IPO Details | Growth rate (3Y CAGR) | 145% (Higher than sector avg) | Derived from RHP financials |
| Checklist (Quality) | Revenue growth | check badge | Upstox-proprietary heuristic |
| Checklist (Quality) | Company valuation | check badge | Upstox-proprietary heuristic |
| Checklist (Quality) | Earnings expansion | check badge | Upstox-proprietary heuristic |
| Checklist (Risk) | Debt to Equity ratio | check badge | Upstox-proprietary heuristic |
| Checklist (Risk) | Promoter holdings | check badge | Upstox-proprietary heuristic |
| Checklist (Risk) | Shares pledged | check badge | Upstox-proprietary heuristic |
| Performance | Tabs | Revenue / EBITDA / PAT / Assets | RHP financial statements |
| Performance | FY 24 (Revenue) | ₹65.95Cr | RHP |
| Performance | FY 25 (Revenue) | ₹101.31Cr | RHP |
| Performance | 9M FY 26 (Revenue) | ₹105.05Cr | RHP / interim |
| Performance | Chart | Bar chart (per tab) | RHP |
| Compare | Sector peers | Indian Hotels Company Ltd · EIH Ltd · Chalet Hotels Ltd | Sector DB (NSE/BSE listed peers) |
| Compare | Revenue (IPO vs sector avg) | ₹101.31Cr vs ₹271.36Cr | Peers DB |
| Compare | 3Y growth | 145% vs 0.01% | Derived |
| Compare | PAT | ₹8.22Cr vs ₹43.44Cr | Peers DB |
| Compare | Market cap | ₹127.9Cr vs ₹3,215.69Cr | Peers DB + own |
| Compare | P/E ratio | 11.83 vs 31.38 | Derived |
| Compare | D/E ratio | 0.15 vs 0.70 | RHP + peers DB |
| Objectives | Construction of restaurant | 39.40% | RHP "Objects of the Offer" |
| Objectives | General corporate purposes | 22.20% | RHP |
| Objectives | Capex for cloud kitchen | 16.40% | RHP |
| Objectives | Centralised kitchen | 14.20% | RHP |
| Objectives | Capex for upgradation | 7.60% | RHP |
| About | Company overview | 3 paragraphs (~350 words: incorporation, brands, channel mix %, geographic mix %, customer concentration %) | RHP "Our Business" + financial section |
| Subscription Status | Table | Date · QIB · NII · Retail · Total | NSE/BSE subscription API |
| Subscription Status | 20-May-26 row | 0.69x / 6.28x / 1.61x / 1.69x | NSE/BSE |
| FAQs | 4 generic questions | "How to invest", "What is the issue size", "What is 'pre-apply'", "Which exchanges" | Upstox-authored copy |
| Sidebar (right rail) | IPO Timeline | Pre-apply 19 May / Bidding 20–22 May / Allotment 25 May / Funds 26 May / Demat 26 May / Listing 27 May | NSE/BSE |
| Sidebar | Apply CTA | Phone + Apply button | Upstox-internal |

**Notably absent from Upstox**: explicit Registrar name (only implied by allotment process), BRLM list, Anchor investor names / amounts, GMP, Strengths/Risks as narrative bullets (replaced by checklist heuristics), prospectus download (only "Read" — i.e. open the linked SEBI PDF in a viewer).

---

## 3. Zerodha vs Upstox comparison

Coverage of each section/field, plus which page presents it better, plus whether our dashboard should include it.

| Section / Field | Zerodha | Upstox | Better presentation | Include in our dashboard? | Notes |
|---|---|---|---|---|---|
| Company name + segment + live status | Yes | Yes | Upstox (badge density + tabs) | Yes — v1 | Pull from NSE/BSE listing record + derive live status from dates |
| Subscription headline tag in hero | No (separate section) | **Yes** ("1.69x subscribed") | Upstox | **Yes — v1** | Strong signal at top of fold |
| Min. investment | No (only lot×price) | **Yes** (₹2.34L computed) | Upstox | Yes — v1 | Trivial computation; high analyst utility |
| Price band | Yes | Yes | Tie | Yes — v1 | NSE/BSE |
| Lot size | Yes (with rupee value) | Yes (shares only) | **Zerodha** (shows both) | Yes — v1 | Show both shares and ₹ |
| Issue size | Yes | Yes | Tie | Yes — v1 | NSE/BSE/RHP |
| Issue type (Mainboard/SME) | Yes (badge) | Yes (row + badge) | Tie | Yes — v1 | NSE/BSE |
| Listing exchange | Implicit | **Yes** (explicit row) | Upstox | Yes — v1 | RHP / NSE/BSE |
| Issue dates (open/close) | Yes (range) | Yes (range + timeline) | Upstox (timeline) | Yes — v1 | NSE/BSE |
| Detailed schedule (UPI mandate, allotment, refund, demat, listing) | **Yes** (10-row table) | Yes (sidebar timeline, 7 rows) | **Zerodha** (more milestones) | Yes — v1 | NSE/BSE + derive |
| Anchor lock-in dates | **Yes** (both 30d + 90d) | No | **Zerodha** | Yes — v1 | Derive from allotment date |
| Prospectus link (download) | Yes (PDF download) | Yes ("Read" link) | Tie | Yes — v1 | SEBI / exchange |
| Company overview / About | Yes (1 ¶) | **Yes** (3 ¶ richer, includes channel + geo mix %) | **Upstox** | Yes — v1 | RHP (manual at v1, parse at v2) |
| Strengths (narrative bullets) | **Yes** (5) | No (replaced by checklist) | **Zerodha** | Yes — v2 | RHP parse, deferred |
| Risks (narrative bullets) | **Yes** (5) | No (replaced by checklist) | **Zerodha** | Yes — v2 | RHP parse, deferred |
| Quality/Risk checklist (heuristic badges) | No | **Yes** (6 binary badges) | **Upstox** | Yes — v1.5 (compute from financials we already need) | Our own signal layer |
| Use of proceeds / Objectives | Yes (rupee + %) | **Yes** (% only, stacked bar) | **Zerodha** (richer numbers) + **Upstox** (visual) — combine | Yes — v1 | RHP "Objects of the Offer" |
| Issue composition (Fresh/OFS split) | **Yes** (line items) | No | **Zerodha** | Yes — v1 | RHP / exchange |
| Financials table (Revenue/EBITDA/PAT/Assets per FY) | Partial (chart only) | **Yes** (table + chart, multi-period) | **Upstox** | Yes — v1.5 | RHP / company filings |
| Financials chart | **Yes** (bar) | **Yes** (bar, per-metric tab) | **Upstox** (tabs) | Yes — v1.5 | Render from financial table |
| Growth rate (3Y CAGR) | No | **Yes** + sector qualifier | **Upstox** | Yes — v1.5 | Derive |
| Market cap (post-issue) | No | **Yes** + sector qualifier | **Upstox** | Yes — v1 | Derive |
| Valuation ratios (P/E, P/B, RoNW, RoCE, EPS) | No | **P/E**, **D/E** only | **Upstox** (partial) | Yes — v1.5 | Derive from RHP financials |
| Peer comparison cards (vs sector avg) | No | **Yes** (6 metrics) | **Upstox** | Yes — v2 | Needs sector mapping + peers DB |
| Sector classification | No | **Yes** ("Hotel" tag) | **Upstox** | Yes — v1 | NSE/BSE industry code / manual map |
| Registrar | Implicit (Skyline link only) | Implicit (only generic process) | Neither explicit | Yes — v1 | RHP / registrar resolution |
| BRLM list | No | No | Neither | Yes — v1 | RHP cover page |
| Anchor investors (names + amounts) | No | No | Neither (we want to add) | Yes — v1 | NSE/BSE anchor PDF |
| Promoter & shareholding pattern | No | No (only Checklist boolean) | Neither (we want to add) | Yes — v1.5 | RHP |
| GMP (with caveat) | **Yes** (mention, no number) | No | **Zerodha** | Yes — v1 | GMP scrapers (Phase 6) |
| Subscription live table (per category, % subscribed × times) | **Yes** (with reserved/applied) | **Yes** (times only, multi-day) | **Zerodha** (reserved/applied numerator) + **Upstox** (multi-day) — combine | Yes — v1 | NSE/BSE subscription API |
| Subscription timestamp | **Yes** explicit | Implicit (date column) | **Zerodha** | Yes — v1 | Required for freshness audit |
| Source audit per field | **No** | **No** | Neither | **Yes — v1 (differentiator)** | Our own |
| Apply CTA | Yes (Zerodha-only) | Yes (Upstox-only) | N/A | **No** (we're not a broker) | Out of scope |
| Allotment-check instructions | **Yes** (links to registrar portal) | No | **Zerodha** | Yes — v2 | Registrar portal links |
| FAQs | No | Yes (4 generic) | Upstox | Optional — v2 | Low analyst value |

**Key takeaways from the comparison:**
1. **Zerodha is timeline-strong + narrative-strong** (10-row schedule, strengths/risks bullets, GMP-aware). Light on analytics.
2. **Upstox is analytics-strong + visual-strong** (peer compare, sector qualifiers, checklist, market-cap-derived). Light on narrative + schedule depth.
3. **Neither shows source / freshness per field.** That stays our differentiator.
4. **Neither shows BRLM list or anchor investor breakdown.** Both are analyst-critical for v1.
5. **Both rely on RHP for narrative + financials** — confirming that Phase 5 RHP intelligence (probes P-17 / P-18) becomes more critical, not less.

---

## 4. New IPO Detail Page benchmark for our dashboard

Sections, fields, source, version-cut (v1 / v1.5 / v2), and initial-data-mode (auto vs manual placeholder).

### 4.1 Hero header
| Field | Source | Cut | Initial |
|---|---|---|---|
| Company name | NSE/BSE listing record | v1 | Auto |
| Logo (small) | Manual upload / domain favicon | v1 | Manual placeholder |
| Segment badge (Mainboard / SME) | NSE/BSE | v1 | Auto |
| Status (Upcoming / Open / Closed / Listed) | Derive from exchange dates | v1 | Auto |
| Subscription headline (e.g. "1.69x subscribed") | NSE subscription API (P-04) | v1 | Auto |
| Days-open / days-to-listing counter | Derive | v1 | Auto |
| Sector / industry tag | NSE/BSE industry code or manual map | v1 | Auto + manual override |
| Source-audit chip ("X fields from NSE, Y from RHP, Z manual") | Our own | v1 | Auto |

### 4.2 Key issue terms
| Field | Source | Cut | Initial |
|---|---|---|---|
| Price band (low–high) | NSE/BSE / RHP | v1 | Auto |
| Lot size (shares + ₹ value) | NSE/BSE / RHP | v1 | Auto |
| Min investment (₹) | Derive (lot × upper band) | v1 | Auto |
| Issue size (total ₹Cr) | NSE/BSE / RHP | v1 | Auto |
| Fresh issue ₹Cr | NSE/BSE / RHP | v1 | Auto |
| OFS ₹Cr | NSE/BSE / RHP | v1 | Auto |
| Face value | RHP | v1 | Auto |
| Listing exchange(s) | RHP | v1 | Auto |
| Issue type label (Book-Built / Fixed-Price) | NSE/BSE | v1 | Auto |
| Reservation breakdown (QIB/NII/Retail/Employee) | NSE/BSE / RHP | v1 | Auto |

### 4.3 IPO timeline
| Field | Source | Cut | Initial |
|---|---|---|---|
| Bid open date | NSE/BSE | v1 | Auto |
| Bid close date | NSE/BSE | v1 | Auto |
| UPI mandate deadline | Derive from close date | v1 | Auto |
| Allotment finalization | NSE/BSE | v1 | Auto |
| Refund initiation | NSE/BSE | v1 | Auto |
| Share credit to demat | NSE/BSE | v1 | Auto |
| Listing date | NSE/BSE | v1 | Auto |
| Anchor lock-in 50% end | Derive (allot + 30d) | v1 | Auto |
| Anchor lock-in 100% end | Derive (allot + 90d) | v1 | Auto |
| Timeline visualisation (rail) | UI | v1 | Auto |

### 4.4 Subscription & demand
| Field | Source | Cut | Initial |
|---|---|---|---|
| Live per-category × times (QIB/NII/Retail/Employee/Total) | NSE subscription (P-04) | v1 | Auto |
| Reserved shares per category | NSE subscription | v1 | Auto |
| Applied shares per category | NSE subscription | v1 | Auto |
| Subscription timestamp (last refresh) | API timestamp | v1 | Auto |
| Per-day subscription trajectory | NSE subscription (sampled) | v1.5 | Auto |
| Subscription Quality composite (our signal) | Our own | v1.5 | Auto |
| GMP indicative (with dispersion + caveat) | GMP scrapers (P-19/20/22) | v1 (caveat: indicative) | Auto |

### 4.5 Company overview
| Field | Source | Cut | Initial |
|---|---|---|---|
| Business description (1–3 ¶) | RHP "Our Business" | v1 (manual paste) → v2 (RHP parse) | Manual |
| Channel mix % | RHP | v2 | Manual / parsed |
| Geographic mix % | RHP | v2 | Manual / parsed |
| Customer concentration (top-N %) | RHP | v2 | Manual / parsed |
| Incorporation year | RHP cover | v1 | Manual / parsed |
| Brand portfolio | RHP / company site | v2 | Manual |

### 4.6 Financials
| Field | Source | Cut | Initial |
|---|---|---|---|
| Revenue (last 3 FYs + interim) | RHP financial statements | v1 (manual paste) → v1.5 (parsed) | Manual |
| EBITDA | RHP | v1.5 | Manual / parsed |
| PAT | RHP | v1.5 | Manual / parsed |
| Total assets | RHP | v1.5 | Manual / parsed |
| Net worth | RHP | v1.5 | Manual / parsed |
| Debt | RHP | v1.5 | Manual / parsed |
| EPS / Diluted EPS | RHP | v1.5 | Manual / parsed |
| RoNW | RHP / derive | v1.5 | Derived |
| RoCE | RHP / derive | v1.5 | Derived |
| D/E ratio | Derive | v1 (once we have the inputs) | Derived |
| 3Y CAGR (Revenue, PAT) | Derive | v1 | Derived |
| Per-metric bar chart with FY tabs | UI on top of the table | v1.5 | Auto |

### 4.7 Valuation
| Field | Source | Cut | Initial |
|---|---|---|---|
| Market cap (post-issue, at upper band) | Derive (post-issue share count × upper band) | v1 | Auto |
| P/E at upper band | Derive (price ÷ post-issue EPS) | v1.5 | Auto |
| P/B at upper band | Derive | v1.5 | Auto |
| EV/EBITDA | Derive | v1.5 | Auto |

### 4.8 Peer & sector comparison (Upstox-style)
| Field | Source | Cut | Initial |
|---|---|---|---|
| Sector classification | NSE/BSE industry code + manual map | v1 | Auto |
| Listed peers (3–5) | Manual curated peer set per sector | v2 | Manual |
| Per-metric peer comparison (Revenue / PAT / Market cap / P/E / D/E / 3Y growth) | Peers DB | v2 | Auto |
| Sector-average qualifier badges ("Higher / Lower than sector avg") | Derive | v2 | Auto |

### 4.9 Strengths & risks
| Field | Source | Cut | Initial |
|---|---|---|---|
| Strengths (3–5 bullets) | RHP "Our Strengths" | v1 (manual paste) → v2 (RHP parse) | Manual |
| Risks (3–5 bullets) | RHP "Risk Factors" (summarised top-5) | v1 (manual paste) → v2 (RHP parse) | Manual |
| Risk-flag chips (our Quality/Risk checklist) | Derive from financials | v1.5 | Auto |

### 4.10 Objectives (use of proceeds)
| Field | Source | Cut | Initial |
|---|---|---|---|
| Objective line items (purpose + ₹Cr + %) | RHP "Objects of the Offer" | v1 (manual) → v2 (parsed) | Manual / parsed |
| Stacked-bar visualisation | UI | v1 | Auto |

### 4.11 Promoter & shareholding
| Field | Source | Cut | Initial |
|---|---|---|---|
| Promoter names | RHP | v1 (manual) → v2 (parsed) | Manual |
| Promoter holding pre-issue % | RHP | v1.5 | Manual / parsed |
| Promoter holding post-issue % | RHP | v1.5 | Manual / parsed |
| Shares pledged % | RHP | v1.5 | Manual / parsed |
| Top non-promoter holders | RHP | v2 | Manual / parsed |

### 4.12 Anchor investors
| Field | Source | Cut | Initial |
|---|---|---|---|
| Anchor allocation date | NSE/BSE anchor announcement (P-18) | v1 | Auto |
| Anchor investor names | NSE/BSE anchor PDF (P-18) | v1 | Auto (parsed) |
| Anchor investor amounts | NSE/BSE anchor PDF (P-18) | v1 | Auto (parsed) |
| Anchor concentration (top-3 %) | Derive | v1 | Auto |
| Mutual-fund participation count | Derive | v1.5 | Auto |

### 4.13 Documents
| Field | Source | Cut | Initial |
|---|---|---|---|
| DRHP link | SEBI (P-08/09) | v1 | Auto |
| RHP link | SEBI / exchange | v1 | Auto |
| Anchor allocation PDF | NSE/BSE | v1 | Auto |
| Allotment basis PDF | NSE/BSE | v1.5 | Auto |
| Listing prospectus | Exchange | v1 | Auto |

### 4.14 Registrar & BRLMs
| Field | Source | Cut | Initial |
|---|---|---|---|
| Registrar name | RHP cover | v1 | Auto (parsed) |
| Registrar website + allotment-check link | Resolution table (P-11) | v1 | Auto |
| BRLM names (1+) | RHP cover | v1 | Auto (parsed) |
| Lead manager websites | Curated | v1.5 | Manual |

### 4.15 Source audit & freshness (our differentiator — not on Zerodha or Upstox)
| Field | Source | Cut | Initial |
|---|---|---|---|
| Per-field source URL | Internal | v1 | Auto |
| Per-field last-fetched-at | Internal | v1 | Auto |
| Per-field confidence flag | Internal heuristic | v1 | Auto |
| Per-IPO source-mix bar (X% NSE / Y% RHP / Z% manual) | Aggregate | v1 | Auto |

### 4.16 Analyst signal panel (our differentiator)
| Field | Source | Cut | Initial |
|---|---|---|---|
| Subscription Quality composite | Our own | v1.5 | Auto |
| Listing-gain-fade score (post-listing) | Our own | v2 | Auto |
| Anchor concentration warning | Our own | v1 | Auto |
| Valuation-vs-peers band | Our own | v2 | Auto |

---

## 5. Field-level source mapping (updated; supersedes Section D where divergent)

| Field | Best source | Probe ID | Phase 0 status | Fallback |
|---|---|---|---|---|
| Live + upcoming + past IPO list (Mainboard) | NSE | P-01/02/03 | (carry from Phase 0) | BSE (P-06) |
| Live + upcoming + past IPO list (SME) | NSE Emerge | P-05 | (carry from Phase 0) | BSE SME (P-06b) |
| Live subscription per category | NSE | P-04 | (carry) | BSE (P-07) |
| DRHP / RHP PDF list | SEBI Public Issues | P-08 | (carry — fix if RED) | Exchange filings (P-10) |
| DRHP / RHP PDF download | SEBI | P-09 | (carry) | Exchange (P-10) |
| Anchor allocation PDF | NSE/BSE | P-18 | (carry) | Manual |
| Registrar name | RHP cover (PDF parse) | P-17 | (carry) | RTA resolution table (P-11) |
| Registrar allotment-status URL | P-11 resolution table | P-11 | (carry) | Manual |
| Financial statements (3 FY + interim) | RHP parse | P-17 | (carry) | Manual paste |
| Strengths / Risks narrative | RHP parse (sections) | P-17 (new section logic) | (carry) | Manual paste |
| Objects of the Offer | RHP parse | P-17 | (carry) | Manual paste |
| Promoter holdings | RHP parse | P-17 | (carry) | Manual paste |
| Sector classification | NSE/BSE industry code | New v1 query | TBD | Manual map |
| Listed peers DB | Curated CSV per sector | New v2 query | Out of scope for Phase 0 | Manual |
| GMP indicative + dispersion | Multi-source (P-19/20/21/22) average | P-19/20/22 (P-21 RED) | (carry) | Show "no signal" |
| Post-listing price history | NSE historical (P-15) | P-15 | (carry — fix if RED) | NSE quote (P-15b) |
| Source audit metadata | Internal | n/a | n/a | n/a |
| Sector-relative analytics ("Higher/Lower than sector avg") | Derive from peers DB | New | Out of scope for Phase 0 | Hide if peers DB absent |

**Net change from Phase 0 source map (Section D):**
- **Sector classification** added as v1 (was not previously mapped).
- **Sector-relative analytics** and **peers DB** added as v2 (new categories).
- **Anchor concentration** elevated to v1 (was implicit before).
- **RHP-section parser** (strengths/risks/objects/shareholding) elevated in importance — broker-style narrative is now expected at v1, even if initially fed by manual paste.
- **Registrar-allotment-portal link** elevated to v1 (Zerodha links there explicitly).

---

## 6. Scrapability and production-source decision

### 6.1 Zerodha
- **Technically accessible**: yes, from GitHub Actions, server-rendered, no anti-bot intercept.
- **Legal / ToS**: Zerodha ToS prohibits "scraping, robots, spiders, or other automated means" for commercial use. Their IPO pages are commercial customer-acquisition pages.
- **Verdict**: **Reference only.** Do not scrape for production data. Use as IA inspiration + sanity-check against our own derivations from NSE/BSE/RHP.

### 6.2 Upstox
- **Technically accessible**: yes, same conditions.
- **Legal / ToS**: Upstox ToS similarly prohibits automated scraping.
- **Verdict**: **Reference only.** Same as Zerodha.

### 6.3 Decision

**Both stay reference-only.** Production data must come from NSE / BSE / SEBI / RHP-PDFs / registrar portals / our own derivations. The broker pages are studied periodically to confirm we are not missing fields users will expect.

---

## 7. v1 must-have vs v2/PDF-deferred field list

### 7.1 v1 must-have (ship without these = not credible to analysts)
- Company name, segment, status, subscription headline, sector tag
- Price band, lot size, min investment, issue size, fresh/OFS split, face value
- Full timeline (open, close, UPI mandate, allotment, refund, demat credit, listing, anchor lock-ins)
- Reservation breakdown (QIB/NII/Retail/Employee)
- Live subscription table per category × times, with reserved/applied numerator
- Subscription timestamp (freshness)
- Anchor allocation date + anchor investor list + amounts + top-3 concentration
- Registrar name + allotment-status link
- BRLM names (≥1)
- DRHP + RHP + anchor PDF links
- Sector classification
- GMP indicative + dispersion (with caveat)
- Source audit per field + per-IPO source-mix
- Company overview (manual paste at v1)
- Strengths + Risks (manual paste at v1)
- Use-of-proceeds (manual paste at v1; visual bar)

### 7.2 v1.5 (next iteration — adds analytics depth)
- Financials table (3 FY + interim) — manually entered initially, parsed eventually
- EPS / RoNW / RoCE / D/E
- 3Y CAGR (Revenue, PAT)
- Market cap, P/E, P/B, EV/EBITDA at upper band
- Quality / Risk checklist heuristics (computed from financials)
- Per-day subscription trajectory chart
- Subscription Quality composite signal
- Anchor MF participation count

### 7.3 v2 (Phase 5 / Phase 6 deliverables)
- Strengths/Risks narrative — RHP parser (auto)
- Use-of-proceeds — RHP parser (auto)
- Company overview — RHP parser (auto)
- Promoter & shareholding — RHP parser
- Peer comparison (6-metric cards vs sector avg) — needs peers DB
- Sector-average qualifier badges
- Allotment basis PDF
- Listing-gain-fade score
- Valuation-vs-peers band

### 7.4 Out of scope / explicitly deferred
- Broker apply CTAs (we are not a broker)
- FAQs (low analyst value; Upstox-style)

---

## 8. Impact on existing Phase 0 probes

| Existing probe | Phase 0 verdict | New Phase 0.1 verdict | Action |
|---|---|---|---|
| P-01/02/03 NSE current/upcoming/past | GREEN (assumed) | **Critical — confirmed.** All hero header + key terms + dates source from here. | None |
| P-04 NSE subscription | GREEN (assumed) | **Critical — confirmed.** Both pages live-poll this. | None |
| P-05 NSE Emerge SME | GREEN (assumed) | **Critical — confirmed.** Both IPOs in the benchmark are SME. | None |
| P-06/06b/07/10 BSE | likely RED | Now lower priority — broker pages source from NSE | Keep as fallback only; not v1 blocker |
| P-08 SEBI publicissues | RED in last run | **Re-prioritised UP** — RHP links + DRHP links are v1-critical | **Schedule a re-attempt / alternative approach** |
| P-08b SEBI processing | (carry) | Lower priority | None |
| P-09 SEBI PDF download | (carry) | v1 critical — RHP PDF needed for manual narrative even at v1 | None |
| P-10 Exchange DRHP | (carry) | Fallback for P-08 if SEBI stays RED | None |
| P-11 Registrar resolution | (carry) | **Re-prioritised UP** — Zerodha shows allotment-status link explicitly | None |
| P-12/13/14/14b Specific registrars | (carry) | Used for allotment-portal links per-IPO | None |
| P-15 NSE historical | RED in last run | Phase 5 (post-listing analytics) — no longer blocks v1 | Defer fix to Phase 5 |
| P-15b NSE quote | (carry) | Phase 5 | None |
| P-16 Ticker mapping | (carry) | v1 — needed for sector classification + post-listing linkage | None |
| P-17 RHP parse | (carry) | **Re-prioritised UP** — v2 narrative + financials all depend on this | Phase 5 priority confirmed |
| P-18 Anchor PDF parse | (carry) | **Re-prioritised UP** — v1 anchor list is must-have | Bring forward |
| P-19/20/22 GMP | GREEN (assumed) | v1 with caveat; weight low | None |
| P-21 GMP IPO Central | RED | Skip permanently (P-22 covers fallback) | None |
| **P-23a Zerodha (new)** | **GREEN functionally** (RED in summary due to probe-bug) | Reference-only IA benchmark | **Optional: fix `__name` bug for structured re-extraction** |
| **P-23b Upstox (new)** | **GREEN functionally** (RED in summary due to probe-bug) | Reference-only IA benchmark | **Same as above** |

**Net priority deltas:**
- ↑ P-08 (SEBI publicissues), P-11 (registrar resolution), P-17 (RHP parse), P-18 (anchor PDF) — all promoted in importance.
- ↓ P-06/06b/07/10 (BSE) — demoted to fallback-only.
- ↓ P-15 (NSE historical) — deferred to Phase 5.
- → P-23a / P-23b — done; reference-only; minor probe-code fix optional.

---

## 9. Recommendations (answers to the four briefing questions)

### 9.1 Should we revise Phase 0.1 probes based on Zerodha / Upstox?
**Two minor adjustments recommended; no new probes required.**
- Optional: fix the `__name` bug in `extractFields` so future re-runs produce structured field JSON automatically (small, isolated change in `scripts/probes/lib/playwright.ts`).
- Optional: add a follow-up "Phase 0.2" probe block that targets a Mainboard IPO too (only SMEs in this benchmark; Mainboard pages may have richer financial sections worth inspecting before we lock the v1 schema).
- No need for additional broker probes — Zerodha + Upstox already give us two distinct IA philosophies (timeline-narrative vs analytics-visual).

### 9.2 Should our IPO Detail Page be redesigned around this broker-style structure?
**Yes — adopt the 16-section model in §4 of this report.** It is a strict superset of both Zerodha and Upstox plus our differentiators (source audit, analyst signals). Key visual patterns to adopt:
- Upstox-style hero with subscription tag + sector + min-investment.
- Upstox-style sub-nav tabs (About / Analysis / Subscription Status) on long pages.
- Zerodha-style 10-row timeline table including anchor lock-in dates.
- Zerodha-style narrative Strengths/Risks bullets (not Upstox's binary checklist alone).
- Upstox-style peer comparison cards (v2).
- Upstox-style sector-relative qualifier badges.
- **Add (neither broker has):** per-field source chip + freshness timestamp, source-mix bar, anchor concentration warning, our own analyst signal panel.

### 9.3 Which Zerodha/Upstox fields are must-have for v1?
Listed in §7.1. The minimal believable v1 covers: hero · key terms · timeline · subscription · documents · registrar + BRLM · anchor list · GMP-with-caveat · sector · manual narrative for company/strengths/risks/objectives · source audit.

### 9.4 Which fields can wait for v2 / PDF intelligence?
Listed in §7.3. The deferred set is: RHP-parsed financials (Phase 5), RHP-parsed narrative (Phase 5), peer comparison + sector qualifiers (Phase 5/6), listing-gain-fade and valuation-vs-peers analyst signals (Phase 6), allotment basis PDF (Phase 5/6).

---

## 10. Suggested next step (for user)

The Phase 0.1 benchmark is complete. The recommended exit transition is:
1. **Approve §4 (16-section page model) and §7 (v1/v1.5/v2 field cut)** — or send changes.
2. Optional: greenlight the `__name` probe-code fix (one small commit).
3. Optional: greenlight a Mainboard-IPO benchmark run (P-23c / P-23d on a Mainboard URL each) before the v1 schema is locked.
4. After approval of §4 + §7, the gate for starting Phase 1 (data-model / schema / first dashboard scaffolding) is open.

Until §4 + §7 are explicitly approved, no Phase 1 work begins.
