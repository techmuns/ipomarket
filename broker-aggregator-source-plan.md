# Broker / Aggregator Source Plan (Phase 5C — Source Characterization)

> **Mode**: planning + characterization. No production scraping. No snapshot mutation.
>
> **Date**: 2026-05-22
>
> **Master-plan reference**: §Y of `/root/.claude/plans/ipo-market-dashboard-we-zazzy-liskov.md` (mirrors §Y verbatim; sections here renumbered 1–12 per §Y.2).
>
> **Naming note**: "Phase 5C" is a planning slot for source-pivot characterization only. It is **unrelated to GMP** — GMP remains the optional, deferred Phase 6 module described in the master plan.
>
> **Scope discipline**: no Phase 5B implementation, no production financial extraction, no UI, no DB, no Workers, no cron, no GMP production integration, no broker scraping for production, no PDF binaries committed, no full-text dumps committed, `src/data/snapshots/` untouched, stay on `main`, no stealth / proxies / captcha solving / login access / account-based access.

---

## 1. Header — purpose

This document characterizes broker / aggregator surfaces (Chittorgarh, Zerodha, Upstox) for potential use as fallback or secondary production data sources for the IPO dashboard. It is paired with four characterization probes (P-25..P-28) registered in the existing probe framework. It does **not** authorize any production ingestion; that decision is gated on §9.1 below.

## 2. Context — why pivot

Phase 5A.1 closed with `manual_review_required` on the InCred cover; Phase 5A.2 added a curated seed + BSE Playwright + SEBI smid=11/12 Playwright but the CI run (`a824d16`) returned **`full_document_candidate_unavailable: true`** again. SEBI smid=11/12 are genuinely empty (Playwright caught only SEBI page chrome PDFs); BSE SME timed out on `networkidle`; BSE mainboard rendered a 322-byte shell that never hydrated; the curated seed's vegorama RHP URL is stale. **Phase 5B remains blocked because no full-document official candidate exists right now.**

Phase 5C is a source-pivot **planning + characterization** pass. Per user direction:
- **Official NSE/BSE/SEBI remains the backbone where it works.**
- **Chittorgarh** is allowed to be evaluated as a fallback / secondary production source (subject to characterization).
- **Zerodha / Upstox** stay as reference / fallback sources, never primary.
- No production scraping work is approved at the planning stage; only probes and this document.

## 3. Source-by-source analysis

### 3.1 Chittorgarh (`chittorgarh.com`)

| Dimension | Assessment |
|---|---|
| Fields provided | issue terms, schedule, subscription day-by-day, basic financials (3-year snapshot), objects, strengths, risks, registrar, BRLM, GMP history, **DRHP / RHP / Anchor PDF links typically pointing at official SEBI/NSE/BSE hosts** |
| Page type | both — list pages (`/ipo/`, `/report/...`) AND per-IPO detail (`/ipo/<slug>/<id>/`) |
| URL predictability | high — slug structure stable for 10+ years; per-IPO `*.asp` URLs |
| Render mode | server-rendered HTML with Next.js hydration for some widgets (partial sample at `phase-0/samples/sample-gmp-chittorgarh.html` from P-20) |
| Anti-bot risk | low from CI based on P-20 evidence (Cloudflare present but no aggressive challenge observed); confirmed only on the GMP page so far, must be re-confirmed on `/ipo/` list + detail pages via P-25 |
| ToS / legal risk | **medium**. Operating rules (all binding): use only public, non-login pages; use low-frequency GitHub Actions polling; attribute / source-label every field; do not bypass anti-bot or captcha; never treat Chittorgarh as official; do not scrape aggressively. |
| Recommended role | **fallback / secondary production**, subject to P-25/P-26 outcomes. Most valuable as a URL-discovery aid pointing at official PDFs; second-most-valuable for narrative / subscription / GMP fields when official is missing. |

### 3.2 Zerodha (`zerodha.com/ipo/...`)

| Dimension | Assessment |
|---|---|
| Fields provided | header (company / status / segment), schedule, key terms, "Download prospectus (PDF)" link, About copy, Financials snippet, Utilisation of proceeds, Strengths, Risks, allotment status link, subscription figures |
| Page type | mostly detail (`zerodha.com/ipo/<id>/<slug>/`); list page exists at `zerodha.com/markets/ipo/` |
| URL predictability | medium — requires `<id>` from Zerodha's own DB; slug is from company name. Not derivable from NSE/BSE master alone. |
| Render mode | server-rendered (P-23a confirmed: raw 38KB → rendered 39KB; ratio 1.04) |
| Anti-bot risk | none observed (P-23a: no Cloudflare / Datadome / challenge from GH Actions) |
| ToS risk | medium — site terms include "no automated access" clause; per user directive, **stays reference-only** unless explicitly approved otherwise |
| Recommended role | **reference / fallback only.** Never primary. Best use is URL-discovery hint (their "Download prospectus" link may point at official or at Zerodha mirror — per-page inspection required). |

### 3.3 Upstox (`upstox.com/ipo/<slug>-ipo/`)

| Dimension | Assessment |
|---|---|
| Fields provided | header, IPO Details, Checklist, Performance, Compare, Objectives, About, Subscription Status, FAQ block with registrar / listing exchange / open-close dates / allotment date / demat credit date |
| Page type | detail page; list at `upstox.com/ipo/` |
| URL predictability | high — slug derived from company name (`<company-name-with-hyphens>-ipo`) |
| Render mode | server-rendered with hydration (P-23b: raw 218KB → rendered 263KB; ratio 1.20) |
| Anti-bot risk | none observed (P-23b: no challenge) |
| ToS risk | medium (same as Zerodha) |
| Recommended role | **reference / fallback only**, same as Zerodha. |

## 4. Source policy (binding)

1. **Official source beats aggregator when both exist.** Aggregator value is recorded but does NOT overwrite an official `live` value.
2. **Trust order**: Official live > Manual curated > Aggregator (`live`) > Aggregator (`stale`) > unavailable.
3. **Every aggregator-sourced field carries**: `source` (e.g. `Chittorgarh`), `url` (absolute), `fetched_at_utc`, `confidence` (`high`/`medium`/`low`), `state: 'aggregator'`.
4. **`SourceTag` and `DataState` additions** (described in §6) are reference-only until production-ingest work is approved. Adding them now is a type extension; no UI consumes them until later.
5. **No login-gated pages.** No captcha bypass. No stealth plugins. No proxy rotation. No account-based access. No real-time broker price data.
6. **No silent promotion**: an aggregator-sourced value can never appear in a snapshot field with `state: 'live'` or `source: 'NSE' | 'BSE' | 'SEBI' | 'RHP' | 'Registrar'`. The labeling guard belongs in `scripts/ingest/source-audit.ts` (existing post-process — extension only, no rewrite).
7. **Low-frequency polling, non-aggressive access** (binding for all four probes and any future ingestion):
   - Use only **public, non-login** pages.
   - Use **low-frequency** GitHub Actions polling (target ≤ 1 request per page per hour during characterization; ingestion cadence — if ever approved — capped at the slowest practical setting that meets the use case).
   - Single request per page per probe pass. No parallel hammering of a single host.
   - Per-host timeout 60s; longer = RED, do not retry within the same workflow.
   - Identify ourselves honestly with a desktop UA (no stealth, no UA cycling).
   - Do NOT scrape aggressively. No bulk crawls. No archive scraping.
   - Treat any anti-bot challenge / captcha / 403 as a hard stop for that source for that pass — do not attempt circumvention.

## 5. Probe additions (P-25..P-28)

All four probes follow the existing P-23a/P-23b pattern via `makeBrokerPageProbe` in `scripts/probes/lib/playwright.ts:411-564`, OR via static `httpGet` from `scripts/probes/lib/http.ts` when Playwright isn't required. Output goes to `phase-0/broker-pages/` (existing convention). Registration via `REGISTRY` in `scripts/probes/run.ts`; group `'J'` added to `PROBE_GROUPS` in `scripts/probes/lib/types.ts`.

| Probe | Source | URL | Method | Artifacts |
|---|---|---|---|---|
| **P-25** | Chittorgarh list + detail accessibility | `https://www.chittorgarh.com/ipo/` (list) + 2 representative detail URLs discovered from the list page | static `httpGet` first; Playwright only if static returns < 10 KB | `chittorgarh-list-rendered.html`, `chittorgarh-detail-{N}-rendered.html`, `chittorgarh-fields.json` |
| **P-26** | Chittorgarh sample detail field extraction | Same detail URLs as P-25 | reads P-25 captured HTML; regex-based extraction in Node — no new browser session needed | `chittorgarh-detail-{N}-extracted.json` with: company / schedule / price band / lot size / objects / strengths / risks / registrar / BRLMs / DRHP-RHP-link list / GMP table (if visible) |
| **P-27** | Zerodha sample IPO detail refresh | `https://zerodha.com/ipo/<id>/<slug>/` — refresh of the P-23a URL | `makeBrokerPageProbe` (Playwright) | `zerodha-rendered.html`, `zerodha-text.txt`, `zerodha-screenshot.png`, `zerodha-fields.json` |
| **P-28** | Upstox sample IPO detail refresh | `https://upstox.com/ipo/<slug>-ipo/` — refresh of the P-23b URL | `makeBrokerPageProbe` | `upstox-rendered.html`, `upstox-text.txt`, `upstox-screenshot.png`, `upstox-fields.json` |

**Bounded artifact rules** (echo of §V.7 of the master plan):
- Visible text ≤ 50 KB.
- Rendered HTML capped at 50 KB by `writeSample` (existing helper).
- Screenshots optional, ≤ 1 MB each, full-page.
- No `*.full.txt` dumps.
- Each probe writes ONE `ProbeResult` row to `phase-0/source-probe-results.json` via the registry's existing flow.

## 6. Type-system additions (deferred — apply only when production ingestion is later approved)

These are SPECS, not changes for Phase 5C planning. They will be implemented only after probes pass and the user approves a Chittorgarh ingestion slice.

**`src/types/source.ts`** (extension, no rename):
- `SourceTag` adds: `'Chittorgarh'`.
- `DataState` adds: `'aggregator'` (real data from a non-official aggregator that we've vetted but explicitly don't trust as official).
- `SourceMix.totals` adds: `aggregator: number`.

**No code change to `scripts/ingest/source-audit.ts`** in Phase 5C — the post-process picks up new tags / states automatically from `SourceAuditEntry` writes.

## 7. Recommended source hierarchy

1. **Official NSE / BSE / SEBI** (current backbone) — `state: 'live'`.
2. **Manual curated** (`phase-0/curated-official-pdfs.json`, hand-vetted) — `state: 'manual'`.
3. **Chittorgarh** (subject to P-25 / P-26 outcomes) — `state: 'aggregator'`, `confidence: 'medium'` default; URL-discovery hints only count when the resolved URL is on an official host.
4. **Zerodha / Upstox** — `state: 'aggregator'`, `confidence: 'low'` default, never replacing official; reference-only by user directive.
5. **Unavailable** — surfaced as `state: 'unavailable'` only when 1–4 all fail.

## 8. Which source to try first for actual implementation

**Chittorgarh, after P-25 + P-26 pass.** Rationale:
- Highest field coverage of the three (issue terms, schedule, subscription, basic financials, objects, strengths, risks, registrar, BRLM, GMP, DRHP/RHP links).
- URL convention stable for 10+ years (predictable per-IPO slug).
- Lowest anti-bot risk from CI.
- Most-valuable secondary use: *URL discovery* pointing at official SEBI/NSE/BSE PDFs — directly addresses the Phase 5A.2 blocker.

Zerodha / Upstox refreshes (P-27 / P-28) run in the same probe pass for currency, but the user has already locked them at reference-only.

## 9. Should we implement a Chittorgarh-first ingestion slice?

**Not in Phase 5C.** Recommendation:
- Phase 5C = planning + characterization probes only (this section).
- A **later ingestion slice** (separate gate, NOT bundled into Phase 5C) can be considered for Chittorgarh — but only after all preconditions in §9.1 are met.
- If P-25 / P-26 return RED → no ingestion slice; consider Trendlyne-style read-only embed or manual-only fallback.

### 9.1 Chittorgarh production gate — preconditions for any later ingestion slice

Before any Chittorgarh ingestion slice is approved, ALL of the following must hold (binding):

1. **P-25 and P-26 both return GREEN or strong YELLOW** in the probe registry (`phase-0/source-probe-results.json`). RED on either is a hard stop.
2. **CI can fetch the targeted Chittorgarh pages from GitHub Actions egress without any captcha or anti-bot challenge.** If P-25 records `challenge_detected: true` or returns a Cloudflare interstitial → hard stop.
3. **P-26 demonstrates ≥ 80% field-extraction accuracy** on the two sample detail pages (mainboard + SME). Accuracy is measured per-field against a human spot-check captured in `phase-5C-status.md`; the threshold is binding.
4. **Official source fields are never overwritten.** The ingestion code must read the existing snapshot field's `source` + `state`; if `state === 'live'` and `source ∈ {NSE,BSE,SEBI,RHP,Registrar}`, the Chittorgarh value is dropped (or recorded only in a parallel audit slot).
5. **Every Chittorgarh-sourced field carries**: `source: 'Chittorgarh'`, `url` (absolute Chittorgarh detail URL), `fetched_at_utc` (ISO timestamp of the run), `confidence` (`high`/`medium`/`low`), `state: 'aggregator'`. No exceptions.
6. **Any official PDF URL discovered through Chittorgarh must be re-verified against the official host allow-list** (`sebi.gov.in` / `nseindia.com` / `nsearchives.nseindia.com` / `bseindia.com` / `bsesme.com`) before being promoted to `phase-0/curated-official-pdfs.json` or the candidate pool. Chittorgarh-hosted mirror URLs are NEVER added to `ipo-documents.json` and NEVER added to the candidate pool. The host check belongs at the same boundary used by `scripts/pdf/discover/curated-seed.ts`.

## 10. Which dashboard snapshots Chittorgarh could feed (when later approved)

| Snapshot | Use of Chittorgarh data | Risk |
|---|---|---|
| `ipo-documents.json` | URL-discovery only: extract DRHP/RHP links from Chittorgarh detail pages, then re-verify the resolved URL is on an official host (sebi.gov.in / nseindia.com / nsearchives.nseindia.com / bseindia.com / bsesme.com) before promoting to the candidate pool. Chittorgarh-hosted mirror URLs are NEVER added to `ipo-documents.json`. | Low — same allow-list as Phase 5A.2 curated seed. |
| `ipo-narrative.json` | Objectives, strengths, risks copy — populates fields currently `'manual'`-only. Per §4 rule 6, the per-IPO record gets a new top-level `state: 'aggregator'` (replacing `'manual'` only for IPOs sourced from Chittorgarh). | Low — narrative is informational, not transactional. UI may want a "via Chittorgarh" badge when the surfacing pass eventually happens. |
| `ipo-subscriptions.json` | Day-by-day subscription rows for IPOs missing from NSE feed. | Medium — risk of stale or mis-categorised retail/QIB/NII splits; require side-by-side with NSE when both exist. |
| `ipo-financials.json` | 3-year P&L snapshot only as a `confidence: 'low'` aggregator fallback. **Will NOT replace** full-DRHP extraction once Phase 5B unblocks. | Medium-high — risk of wrong period / units. |
| `ipo-source-audit.json` | Auto-rebuilt by `scripts/ingest/source-audit.ts` from per-field provenance — no Chittorgarh-specific change needed beyond the type additions in §6. | None. |
| GMP | **Out of scope by user directive** — no production GMP integration yet. |

## 11. Implementation prompt for the next pass (P-25..P-28 probes + this planning doc creation)

This prompt was used verbatim to drive the Phase 5C execution pass; preserved here for reproducibility.

```
Phase 5C — broker / aggregator characterization + planning document creation.
This is a naming slot for source-pivot characterization only; it is unrelated
to (and must not touch) the optional, deferred Phase 6 GMP module.

In-scope file changes:
  - broker-aggregator-source-plan.md (NEW, repo root)
  - scripts/probes/P-25-chittorgarh-accessibility.ts (NEW)
  - scripts/probes/P-26-chittorgarh-detail-extract.ts (NEW)
  - scripts/probes/P-27-broker-zerodha-refresh.ts (NEW; thin wrapper around makeBrokerPageProbe)
  - scripts/probes/P-28-broker-upstox-refresh.ts (NEW; thin wrapper around makeBrokerPageProbe)
  - scripts/probes/run.ts — extend REGISTRY with P-25..P-28
  - scripts/probes/lib/types.ts — extend PROBE_GROUPS with group 'J'
  - phase-0/broker-pages/chittorgarh-*.{html,json}
  - phase-0/broker-pages/zerodha-*.{html,txt,json,png}
  - phase-0/broker-pages/upstox-*.{html,txt,json,png}
  - phase-0/source-probe-results.json (refreshed via existing reporter)
  - phase-0/source-probe-report.md (refreshed via existing reporter)
  - phase-5C-status.md (NEW)

Out of scope (HARD):
  - src/types/source.ts
  - src/data/snapshots/*
  - scripts/ingest/*
  - UI files (src/components, src/pages, src/lib)
  - Workers, cron, DB, GMP production integration, LLM
  - Login-gated pages, captcha bypass, stealth plugins, proxy rotation, account-based access
  - Real-time broker price data of any kind
  - Trendlyne (reference product only, never a source)

Behavior:
  - P-25 attempts Chittorgarh list at https://www.chittorgarh.com/ipo/ via static GET first.
    Falls back to Playwright if static returns < 10 KB.
    Then probes 2 detail pages discovered from the list page (or hard-coded fallbacks).
  - P-26 reads HTML captured by P-25 from disk and runs node-side regex extraction.
  - P-27 / P-28 are thin re-runs of P-23a / P-23b via makeBrokerPageProbe.
  - All four probes obey §4 rule 7 (low-frequency polling).

Verification before push:
  - npm run typecheck
  - npm run build
  - npm run probe -- --probe P-25
  - npm run probe -- --probe P-26
  - npm run probe -- --probe P-27
  - npm run probe -- --probe P-28
  - confirm phase-0/source-probe-results.json contains P-25..P-28 rows
  - confirm no PDF binaries or full-text dumps staged
  - confirm src/data/snapshots/ untouched

After verification: commit, push to main, STOP and ask user to trigger probe workflow.
Do NOT start Chittorgarh ingestion without explicit further approval.
```

## 12. Open decisions for the user

After the probe pass runs (locally + in CI), the user should make the following decisions:

1. **Chittorgarh ingestion slice (yes / hold / no)** — gated on §9.1 preconditions. The `phase-5C-status.md` report records each precondition's evaluation and a recommendation.
2. **`SourceTag` / `DataState` type extensions** — approve adding `'Chittorgarh'` and `'aggregator'` to `src/types/source.ts` (described in §6) as a prerequisite for any later ingestion work.
3. **Which dashboard snapshots to feed first** if ingestion is approved — §10 lists candidates; the user picks priority.
4. **Cadence ceiling for any future Chittorgarh polling in CI** — confirm the §4 rule 7 default (≤ 1 request per page per hour during characterization).
