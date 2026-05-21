# Post-Deploy Smoke Checklist — Phase 1

Run through this checklist after every deploy to confirm the live Cloudflare Pages build is healthy. Estimated time: **3–5 minutes**.

Replace `<live-url>` below with the actual production URL from Cloudflare Pages (e.g. `https://ipomarket.pages.dev`).

---

## 1. Routes — direct URLs

Open each URL in a fresh tab. Each should render in under 3 seconds with no console errors.

- [ ] `<live-url>/` → **Market Pulse**: 4 KPI tiles · sector treemap · subscription leaderboard · "What's happening" grid
- [ ] `<live-url>/open` → **Open & Upcoming**: 2 open cards (NFP, Vegorama) + 5 upcoming cards
- [ ] `<live-url>/listing-soon` → **Listing Soon**: 1 card (Quasar Robotics) with countdown + registrar link
- [ ] `<live-url>/recently-listed` → **Recently Listed**: bar chart + fade scatter (Lumino, Greendale) + 2-row table
- [ ] `<live-url>/screener` → **IPO Screener**: filter row + sortable 10-row table
- [ ] `<live-url>/subscription` → **Subscription Heatmap**: 5 IPO cards with stacked bars + quality score
- [ ] `<live-url>/pipeline` → **DRHP Pipeline Watch**: 4 status tiles + 19-row table
- [ ] `<live-url>/gmp` → **GMP Monitor**: amber caveat card + 4 source tiles in "Awaiting" state
- [ ] `<live-url>/source-health` → **Source Health**: 10/11/8 GREEN/YELLOW/RED tiles + 3 status tables
- [ ] `<live-url>/ipo/nfp-sampoorna-foods` → NFP detail page · About tab default
- [ ] `<live-url>/ipo/vegorama-punjabi-angithi` → Vegorama detail page · About tab default

## 2. SPA refresh — confirm `_redirects` is live

Hard-refresh (`Cmd/Ctrl + Shift + R`) on each of these — should re-render the same page, **NOT 404**:

- [ ] `<live-url>/ipo/nfp-sampoorna-foods` (deepest, slug-based route)
- [ ] `<live-url>/source-health`
- [ ] `<live-url>/pipeline`
- [ ] `<live-url>/recently-listed`

If any returns 404, the `_redirects` file did not bundle correctly. Check the latest Cloudflare deployment log; locally confirm `dist/_redirects` exists after `npm run build`.

## 3. Charts render

- [ ] **Sector treemap** (`/`) — multiple coloured tiles; labels split across two lines (Macro / Sector); no empty tiles
- [ ] **Subscription leaderboard** (`/`) — 5 rows with name + segment + times + progress bar
- [ ] **Listing gain vs current gain bars** (`/recently-listed`) — 2 grouped bars per IPO
- [ ] **Fade scatter** (`/recently-listed`) — exactly 2 data points visible (Lumino top-right, Greendale middle) on the diagonal reference line
- [ ] **Subscription stacked bars** (`/subscription`) — QIB / NII / Retail bars distinct per IPO card
- [ ] **Financials chart** (`/ipo/vegorama-punjabi-angithi` → Analysis tab) — 4 metric tabs (Revenue / EBITDA / PAT / Assets); each switches without re-rendering the whole card
- [ ] **Objectives stacked bar** (`/ipo/vegorama-punjabi-angithi` → Analysis tab) — multi-coloured segments sum to 100%

## 4. Source-state badges read clearly

- [ ] Cards on `/open` show compact `auto` chip (lowercase), not `live`
- [ ] IPO detail hero shows `Source live` (full label) alongside the `OPEN` lifecycle badge — visually distinct
- [ ] Pipeline (`/pipeline`) shows `live` source-audit chip in the header
- [ ] Manual-seed sections (e.g. financials on NFP) show `Manual seed` violet badge

## 5. Top bar + sidebar

- [ ] **Top-bar Source Health pill** shows `10 / 11 / 8` (GREEN / YELLOW / RED) and links to `/source-health` when clicked
- [ ] **Sidebar** highlights the active route (background change + slight glow)
- [ ] **Sidebar footer** "Production data is sourced from NSE / BSE / SEBI / RHP …" is readable (not low-contrast)
- [ ] **Browser tab favicon** shows the gradient "IPO" logo
- [ ] **Browser tab title** reads `India IPO Dashboard`

## 6. IPO Detail Page — both seeded IPOs

For both `/ipo/nfp-sampoorna-foods` and `/ipo/vegorama-punjabi-angithi`:

- [ ] Hero: company name + segment badge + `OPEN` lifecycle badge + `Source live` data-state badge + subscription headline (`1.57×` / `1.69×`) + min investment
- [ ] Issue terms grid: price band, lot, min invest, issue size, fresh, OFS, face value, exchange + reservation stacked bar
- [ ] IPO timeline: 10 rows; past rows have green tick, future rows have empty circle
- [ ] About the company: full narrative paragraph (verbatim from Zerodha / Upstox capture)
- [ ] Source audit panel: per-IPO source-mix multi-colour bar + percentage breakdown
- [ ] Registrar & BRLMs: real registrar name (Skyline / Bigshare) with allotment-portal link
- [ ] **Analysis tab** (click): Financials chart + Strengths/Risks + Objectives + Promoter card + Analyst signals + Quality/Risk checklist
- [ ] **Subscription tab** (click): QIB/NII/Retail tiles + daily bar chart (where data exists) + composite quality + table
- [ ] **Documents tab** (click): DRHP/RHP/Anchor links + Registrar/BRLM card again

## 7. Pipeline page — real SEBI data

- [ ] All 19 rows visible (InCred Holdings, Online Instruments, Jindal Supreme, Playsimple Games, Punjab Carbonic, +14)
- [ ] Each row's **PDF** link opens the actual SEBI URL (`sebi.gov.in/sebi_data/commondocs/may-2026/...`)
- [ ] Status badges colour-code: `filed` (amber), `observations_issued` (blue), `cleared` (green), `withdrawn` (red)
- [ ] Status-counts tile shows: FILED 15 / OBSERVATIONS ISSUED 2 / WITHDRAWN 1 / CLEARED 1

## 8. Source Health page

- [ ] **GREEN section** (10 probes): P-08, P-09, P-12, P-13, P-14, P-14b, P-15, P-15b, P-23a, P-23b
- [ ] **YELLOW section** (11 probes): P-01, P-02, P-03, P-04, P-05, P-08b, P-17, P-18, P-19, P-22, P-24
- [ ] **RED section** (8 probes): P-06, P-06b, P-07, P-10, P-11, P-16, P-20, P-21
- [ ] Hover over any row's "Notes" column — full note tooltip appears

## 9. Mobile / tablet quick check

Resize the browser to ~768 px wide (or open dev-tools responsive mode):

- [ ] Sidebar collapses (`hidden lg:flex` rule)
- [ ] Top bar wraps cleanly without overlap
- [ ] Card grids reflow from 3-col → 2-col → 1-col
- [ ] IPO detail tabs remain accessible
- [ ] No horizontal scroll on any page

## 10. Known mock / manual sections (NOT bugs)

These are expected at Phase 1:

- All financial tables and bar charts on `/ipo/<slug> → Analysis tab` are **manual seed**. Vegorama has real seeded numbers; NFP is intentionally empty (Zerodha didn't expose a financial table).
- **Lumino Hyperscale / Greendale Cement / Quasar Robotics** are synthetic IPOs invented to populate Listing Soon and Recently Listed views.
- **GMP Monitor** is intentionally in "Awaiting live data" state — no GMP source GREEN at v1.
- **Promoter & shareholding** sections show a "manual seed expected" placeholder when not yet seeded.

---

## If something is broken

1. Confirm the same route works locally (`npm run dev` → `http://localhost:5173`). If it works locally but not live, the Cloudflare build is the suspect (check build log + `_redirects` in the deploy).
2. If it's broken locally too, file a polish ticket and roll back via Cloudflare → **Workers & Pages → ipomarket → Deployments → previous deployment → Rollback**.
3. Don't hot-fix on `main` without re-running visual QA — re-trigger `phase-1-visual-qa` workflow first.
