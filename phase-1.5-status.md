# Phase 1.5 — Live-Site QA + Deployment Hygiene · Status Report

> **Date**: 2026-05-21
> **Scope**: Verify the deployed Cloudflare Pages site is stable, shareable, and ready before live ingestion begins.
> **Branch**: `main`
> **Phase 2 (ingestion)**: not started, not scoped here.

---

## 1. Live URL

> **Production URL**: `<paste-live-url-here>` *— to be filled in once shared from Cloudflare → Workers & Pages → ipomarket → latest deployment*

**Note on direct verification from this environment**: the sandbox that drove this Phase 1.5 work has its outbound HTTPS allowlist set to deny `pages.dev`, `cloudflare.com`, and most external hosts (verified: all three return HTTP 403 to `curl`). Live-URL curls and screenshot verification must therefore be done from your browser or a GitHub Actions runner. The smoke checklist (`post-deploy-checklist.md`) is the authoritative manual gate; running through it takes 3–5 minutes.

---

## 2. Routes that should respond on the live site

| # | Route | Expected behaviour |
|---|---|---|
| 1 | `/` | Market Pulse — KPI strip · sector treemap · subscription leaderboard · "What's happening" grid |
| 2 | `/open` | Open & Upcoming — 2 open cards (NFP, Vegorama) + 5 upcoming cards |
| 3 | `/listing-soon` | 1 card (Quasar Robotics) with countdown + registrar link |
| 4 | `/recently-listed` | Listing-gain bar + fade scatter (Lumino, Greendale) + 2-row listings table |
| 5 | `/screener` | Filter row + sortable 10-row table |
| 6 | `/subscription` | 5 IPO cards with QIB/NII/Retail stacked bars + composite quality |
| 7 | `/pipeline` | 4 status tiles + 19-row real SEBI table |
| 8 | `/gmp` | "Awaiting" state card + 4 source tiles |
| 9 | `/source-health` | 10G/11Y/8R probe tiles + 3 grouped tables |
| 10 | `/ipo/nfp-sampoorna-foods` | Full 17-section detail page · seeded from Zerodha capture |
| 11 | `/ipo/vegorama-punjabi-angithi` | Full 17-section detail page · seeded from Upstox capture |

All eleven routes are configured to be served by the SPA. Direct URL access + hard-refresh works via `public/_redirects → dist/_redirects`.

---

## 3. Issues found (in this Phase 1.5 pass)

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | Sandbox cannot reach `pages.dev` (HTTP 403, allowlist-deny) — cannot curl live URL from here | Operational, not a code defect | **Documented** (route-check is manual via `post-deploy-checklist.md`) |
| 2 | No favicon was being served (browsers fell back to 404 `/favicon.ico`) | Cosmetic | **Fixed** in this commit — `public/favicon.svg` (32×32 SVG, gradient "IPO" mark) + `<link>` in `index.html` |
| 3 | `theme-color` meta was missing — affects mobile browser chrome colour | Cosmetic | **Fixed** in this commit — `<meta name="theme-color" content="#0f172a" />` |
| 4 | `cloudflare-deploy.md` lacked an explicit "How to redeploy" section | Doc gap | **Fixed** — new section near top with push-trigger + preview deploys + rollback + manual retry |
| 5 | No production smoke checklist | Doc gap | **Fixed** — new `post-deploy-checklist.md` covering routes, refresh, charts, badges, top-bar/sidebar, both IPO detail pages, pipeline, source health, mobile/tablet, and known-mock callouts |

**No code defects found.**

---

## 4. Hygiene checks performed in this pass

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run build` | ✅ pass (17.06 s; bundle unchanged from Phase 1 polish — 1.87 MB / 588 KB gzip) |
| `dist/_redirects` exists with correct content | ✅ `/* /index.html 200` (19 bytes) |
| `dist/favicon.svg` exists | ✅ 527 bytes |
| `dist/index.html` references favicon + theme-color | ✅ both `<link rel="icon">` and `<meta theme-color>` present |
| `grep -rn 'localhost\|127.0.0.1' src/` | ✅ no matches (no hardcoded dev URLs) |
| `grep -rn 'example.invalid' src/` | ✅ 3 intentional matches under `src/data/snapshots/ipo-documents.json` — IANA-reserved placeholder TLD for synthetic mock IPOs (Quasar / Lumino / Greendale); will not 404 when clicked (browsers refuse to resolve) and never appears for real IPOs in production. |
| Existing visual-QA workflow | ✅ unchanged (will keep working on next push to main) |
| Phase 0 probe workflow | ✅ unchanged (continues on schedule) |

---

## 5. Files changed in Phase 1.5

| File | Change | Why |
|---|---|---|
| `public/favicon.svg` | new (527 bytes) | Browser tab icon — gradient "IPO" mark |
| `index.html` | +2 lines | Favicon `<link>` + `theme-color` meta |
| `cloudflare-deploy.md` | +20 lines | Live-URL placeholder near top + "How to redeploy" table |
| `post-deploy-checklist.md` | new (~130 lines) | 10-section production smoke checklist |
| `phase-1.5-status.md` | new (this file) | End-of-phase report |

No JS / TS / JSON changes. No new dependencies. No workflow changes. No data changes. Bundle size unchanged.

---

## 6. Phase 1.5 acceptance

**Accepted on the deliverables side.** All six tasks listed in the Phase 1.5 brief are complete:

1. ✅ Live URL check — **manual** via `post-deploy-checklist.md` (sandbox cannot curl from here)
2. ✅ Deployment doc cleanup — live-URL placeholder + "How to redeploy" added to `cloudflare-deploy.md`
3. ✅ Production smoke checklist — `post-deploy-checklist.md` written
4. ✅ Hygiene — favicon added, theme-color added, no localhost references, `_redirects` confirmed in dist
5. ✅ Verification — `npm run typecheck` + `npm run build` pass
6. ✅ End report — this file

**Final acceptance is gated on a single manual step**: run through `post-deploy-checklist.md` in your browser against the live URL. If everything renders, Phase 1.5 is closed. If anything is broken, report which checklist item failed and I will diagnose.

---

## 7. Recommendation for Phase 2 planning

Phase 1 + 1.5 establish:
- A working static dashboard reachable from anywhere.
- A frozen data contract (TypeScript types in `src/types/`).
- Realistic mock data seeded from real Phase 0 artifacts.
- A source-audit story that the UI already renders.
- Operational hygiene (favicon, theme-color, smoke checklist, rollback path).
- 29 probes with known GREEN / YELLOW / RED status documented in `phase-0/source-status-summary.json`.

Phase 2 should design the **ingestion layer that writes into the existing snapshot JSON files**. The UI does not need to change shape — only the values in `src/data/snapshots/*.json`. Specifically:

| Snapshot file | Ingestion source | Cadence | Probe(s) |
|---|---|---|---|
| `ipo-master.json` | NSE/BSE IPO list endpoints | hourly during market hours | P-01, P-02, P-03, P-05, P-06 |
| `ipo-subscriptions.json` | NSE subscription feed | every 10 min during an open IPO | P-04, P-07 |
| `ipo-documents.json` + `sebi-pipeline.json` | SEBI public-issues + detail-page PDF discovery | daily | P-08, P-09, P-10 |
| `ipo-listing-performance.json` | BSE historical (official fallback) + NSE current quote | EOD per listing-day + daily for recently listed | P-15, P-15b |
| `source-health.json` | Auto: post-processing of probe results | per probe-workflow run | n/a |
| `ipo-financials.json`, `ipo-narrative.json` | Manual seed CLI (Phase 2.0) → RHP parser (Phase 5) | per new IPO | P-17 (Phase 5) |
| `sector-map.json` | NSE equity industryInfo (auto for listed) + manual map file | per IPO | P-24 |

Phase 2 design choices to surface explicitly when you're ready:
- Where does ingestion run? (GitHub Actions cron mirroring the existing probe workflow is the closest fit and reuses scaffolding.)
- Where does the cron-written JSON land? (Same paths under `src/data/snapshots/` — push back to `main` and let Cloudflare auto-redeploy. No backend needed.)
- What's the manual-seed workflow for narrative / financials? (Tiny `tsx` CLI accepting a per-IPO YAML/JSON, or a `phase-1.5-seed` folder of human-curated files.)
- What's the cut-off for Phase 5 RHP parsing? (P-09 already proved download + page-count validation works end-to-end; Phase 5 adds the section-extraction layer on top.)

**These are not Phase 2 commitments — they are the surface for the Phase 2 plan.**

---

## 8. Stopping here

Phase 1.5 work is complete. **Phase 2 not started.** Awaiting your explicit approval before any ingestion design work begins.

To close Phase 1.5: run through `post-deploy-checklist.md` against the live URL and tell me the URL + any items that didn't pass.
