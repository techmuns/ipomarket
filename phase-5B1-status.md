# Phase 5B.1 — Status Report (Gate 2 implementation)

> **Mode**: implementation complete; awaiting operator review.
>
> **Date**: 2026-05-22
>
> **Plan reference**: `phase-5B1-production-promotion-plan.md` §10 — followed verbatim.
>
> **Scope discipline (binding, held)**: OnEMI only; staging-to-production promotion; one row added to each of `ipo-financials.json` + `ipo-documents.json`; no other production-snapshot mutation; no UI / DB / Workers / cron / GMP / Chittorgarh-fields / LLM / PDF binaries / full-text dumps / workflows / scripts/ingest / `src/types/source.ts` changes; stayed on `main`.

---

## 1. Files changed

| File | Action | Detail |
|---|---|---|
| `scripts/pdf/promote/onemi.ts` | **NEW (~250 LOC)** | Stand-alone single-purpose OnEMI promoter. Reads staging JSON, preflights confidence checks, builds production rows, splices into both snapshots via custom string-surgery (preserves byte-identical existing rows), atomic write via `.tmp` + rename, exits 1 on any failure. |
| `src/data/snapshots/ipo-financials.json` | **+17 lines** | One new IPO row for `onemi-technology-solutions` (`state: 'live'`); `generated_at_utc` updated; last existing row got a trailing comma. The 5 existing rows are otherwise byte-identical. |
| `src/data/snapshots/ipo-documents.json` | **+14 lines** | One new IPO row for `onemi-technology-solutions` (`state: 'live'`, one `docs[]` entry pointing at the BSE-hosted RHP); `generated_at_utc` updated; last existing row got a trailing comma. The 10 existing rows are otherwise byte-identical. |
| `phase-5B1-status.md` | **NEW** | This file. |

**Files explicitly NOT touched (binding)**:
- `src/data/snapshots/ipo-narrative.json` — untouched ✅
- `src/data/snapshots/ipo-source-audit.json` — untouched ✅
- `src/data/snapshots/ipo-master.json` — **untouched** ✅ (see §5 UI-visibility caveat)
- `src/types/source.ts` — untouched ✅ (Phase 5C closure stands)
- `scripts/ingest/*` — untouched ✅
- UI files (`src/components`, `src/pages`, `src/lib`) — untouched ✅
- `.github/workflows/*` — untouched ✅
- The 5 existing IPO rows in `ipo-financials.json` — semantically identical (vegorama-punjabi-angithi, nfp-sampoorna-foods, quasar-robotics, lumino-hyperscale, greendale-cement)
- The 10 existing IPO rows in `ipo-documents.json` — semantically identical (nfp-sampoorna-foods, vegorama-punjabi-angithi, incred-holdings, quasar-robotics, lumino-hyperscale, greendale-cement, online-instruments-india, jindal-supreme-india, playsimple-games, punjab-carbonic)

---

## 2. Exact OnEMI financial values promoted

All values normalized from `INR millions` (HIGH-confidence unit detection) to `INR crores` for the production schema.

### Revenue from operations (`revenue_cr`)

| 9M FY 26 | FY 25 | FY 24 | FY 23 |
|---|---|---|---|
| **₹ 1,559.90 cr** | ₹ 1,337.47 cr | ₹ 1,674.45 cr | ₹ 984.46 cr |

### PAT — Profit for the year (`pat_cr`)

| 9M FY 26 | FY 25 | FY 24 | FY 23 |
|---|---|---|---|
| **₹ 199.27 cr** | ₹ 160.62 cr | ₹ 197.29 cr | ₹ 27.67 cr |

### Total assets (`assets_cr` — production schema drops the `total_` prefix vs staging key `total_assets`)

| 9M FY 26 | FY 25 | FY 24 | FY 23 |
|---|---|---|---|
| **₹ 3,568.78 cr** | ₹ 2,701.10 cr | ₹ 1,796.53 cr | ₹ 1,275.20 cr |

### Net worth / Total equity (`net_worth_cr`)

| 9M FY 26 | FY 25 | FY 24 | FY 23 |
|---|---|---|---|
| **₹ 1,254.34 cr** | ₹ 1,005.99 cr | ₹ 804.57 cr | ₹ 566.23 cr |

**16 values promoted, all sourced from real OnEMI Technology Solutions data in the BSE-hosted signed RHP.**

---

## 3. Source provenance by line item

Every promoted value reverse-traces to:
1. `src/data/snapshots/ipo-pdf-extraction-audit.json.normalization.staging_path` →
2. `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json` →
3. Per-line-item `source_page` + `source_table_index` + `raw_label`:

| Production key | Production field | Staging key | `source_page` | `source_table_index` | `raw_label` |
|---|---|---|---|---|---|
| `revenue_cr` | (4 periods) | `revenue` | **70** | 8 | `"Revenue from operations"` |
| `pat_cr` | (4 periods) | `pat` | **70** | 8 | `"Profit for the year (V= III - IV)"` |
| `assets_cr` | (4 periods) | `total_assets` | **68** | 7 | `"Total Assets"` |
| `net_worth_cr` | (4 periods) | `net_worth` | **68** | 7 | `"Total equity"` |

Source PDF: `https://www.bseindia.com/corporates/download/378749/IPO%20Open/6RedHerringProspectussigned_20260427195413.pdf`
Source sha256: `4668b4e22fde35670ccc8405e185a0fe4cd532f84597eed339265c00a84de22f`
Source kind: `RHP` (existing `SourceTag` enum value — no type change)

---

## 4. Confirmation: missing fields are explicit `null`

Each of the 4 OnEMI period rows in `ipo-financials.json` contains the following **explicit null** cells (never undefined, never omitted, never 0):

| Field | All 4 periods | Reason |
|---|---|---|
| `ebitda_cr` | `null` | EBITDA not directly disclosed in OnEMI's Restated Statement of Profit and Loss; Phase 5B does not derive (PBT + interest + depreciation) — would require explicit derivation logic |
| `debt_cr` | `null` | Staging `total_borrowings` missing — Chittorgarh's label dictionary in `LABEL_DICTIONARY` didn't match OnEMI's exact row label. Selector tuning candidate. |
| `eps` | `null` | Staging `eps_basic` missing — same dictionary-mismatch root cause |

`derived.*` (5 fields: `revenue_3y_cagr_pct`, `pat_3y_cagr_pct`, `d_to_e`, `market_cap_cr`, `pe_at_upper_band`) are **all `null`**. No faked derived metrics. The plan explicitly defers derivation to a future pass to avoid mixing computed + manual `derived.*` rows.

---

## 5. UI-visibility caveat (§8.3 of the plan, repeated verbatim)

Phase 5B.1 writes financial data + a documents-row link, but it does **NOT** add OnEMI to `src/data/snapshots/ipo-master.json` — the dashboard's primary IPO master record (which feeds the IPO selector, the detail-page route, and the cross-snapshot joins for narrative / listing-performance / source-audit / sebi-pipeline).

**Consequence**: after Phase 5B.1 lands, OnEMI's financial + documents data will be present in production snapshots but may **NOT be visible** in the dashboard's IPO selector or detail page — depending on whether the UI iterates `ipo-master.json` (selector-driven) or iterates `ipo-financials.json` keys (financials-driven) to render the IPO list.

`npm run build` confirms the dashboard still builds and the existing 10 IPOs still render without crashes; it does NOT prove OnEMI is now visible to the user. That requires a manual UI check by the operator.

---

## 6. Verification results (per §10 prompt, in binding order)

| Step | Outcome |
|---|---|
| **(a)** Preflight staging JSON exists + passes confidence checks | ✅ `manual_review_required: false`, 4 HIGH-confidence periods present (9M FY 26, FY 25, FY 24, FY 23), required-3 keys (revenue/pat/total_assets) present at HIGH, `unit_detected.confidence: 'high'` (INR millions) |
| **(b)** Run `npx tsx scripts/pdf/promote/onemi.ts` | ✅ Exit 0, `[promote:onemi] SUCCESS`, atomic writes completed, 5+1=6 financial rows, 10+1=11 documents rows |
| **(c)** Diff `ipo-financials.json` against pre-promotion HEAD | ✅ Only OnEMI key added; `generated_at_utc` updated; all 5 existing rows semantically identical (verified via `json.dumps(..., sort_keys=True)` equality check) |
| **(c)** Diff `ipo-documents.json` against pre-promotion HEAD | ✅ Only OnEMI key added; `generated_at_utc` updated; all 10 existing rows semantically identical |
| **(d)** Confirm `ipo-narrative.json` untouched | ✅ `git diff --quiet HEAD --` returns clean |
| **(d)** Confirm `ipo-source-audit.json` untouched | ✅ Clean |
| **(d)** Confirm `ipo-master.json` untouched | ✅ Clean |
| **(d)** Confirm `src/types/source.ts` untouched | ✅ Clean |
| **(d)** Confirm `scripts/ingest/*` untouched | ✅ Empty diff |
| **(d)** Confirm `src/components`, `src/pages`, `src/lib` untouched | ✅ Empty diff |
| **(d)** Confirm `.github/workflows/*` untouched | ✅ Empty diff |
| **(d)** Confirm no PDF binaries or full-text dumps staged | ✅ Clean |
| **(e)** `npm run typecheck` | ✅ Green — OnEMI row validates against `IpoFinancials` / `FinancialPeriod` / `IpoDocuments` types |
| **(f)** `npm run build` | ✅ Green — dashboard builds cleanly with the new OnEMI row present |
| **(g)** Write `phase-5B1-status.md` | ✅ This document |
| **(h)** Commit + push to `main` | Pending — final step |

---

## 7. §9 Acceptance gate evaluation

| # | Gate | Status |
|---|---|---|
| 1 | OnEMI appears in `ipo-financials.json` with `state: 'live'` and 4 `periods[]` entries | ✅ |
| 2 | Every populated production value matches the corresponding staging value (16 values total) | ✅ — verified by side-by-side inspection in §2 |
| 3 | Missing fields (`ebitda_cr`, `debt_cr`, `eps`) are explicit `null` in every period row | ✅ — confirmed in §4 |
| 4 | `derived.*` keys are explicit `null` (no faked derived metrics) | ✅ |
| 5 | Existing 5 IPO rows in `ipo-financials.json` semantically byte-identical pre/post | ✅ — `json.dumps(sort_keys=True)` equality holds for all 5 |
| 6 | OnEMI appears in `ipo-documents.json` with `state: 'live'` and one `docs[]` entry pointing at the BSE-hosted RHP | ✅ |
| 7 | Existing 10 IPO rows in `ipo-documents.json` semantically byte-identical pre/post | ✅ — verified |
| 8 | `ipo-narrative.json` untouched | ✅ |
| 9 | `ipo-source-audit.json` untouched | ✅ |
| 10 | `ipo-master.json` untouched | ✅ |
| 11 | Provenance traceable to `source_page` + `source_table_index` + `raw_label` | ✅ — §3 trace table |
| 12 | `npm run typecheck` + `npm run build` green; dashboard renders without crashing on the new OnEMI row | ✅ — UI may not surface OnEMI per §5 caveat; bar is "no crash" |
| 13 | No PDF binaries or full-text dumps staged. No workflows touched. `src/types/source.ts` untouched. `scripts/ingest/*` untouched. UI files untouched. | ✅ |
| 14 | `phase-5B1-status.md` records run with values, missing-field explanation, UI caveat, two operator questions | ✅ (this file) |

**All 14 binding acceptance-gate conditions PASS.**

---

## 8. Operator-facing questions (for separate decisions)

### 8.1 Phase 5B.X — master/detail linkage pass

> **"Plan a separate Phase 5B.X master/detail linkage pass to add OnEMI to `ipo-master.json` (and any other selector-feeding snapshot) so the dashboard actually surfaces the new row — `yes` / `hold` / `no`?"**

Context: per §5 above, the dashboard may not yet show OnEMI in the IPO selector or detail page because `ipo-master.json` was deliberately left untouched in this pass.

### 8.2 Phase 5B.2 — cover-extraction-for-OnEMI

> **"Plan a separate Phase 5B.2 cover-extraction pass against the OnEMI RHP to populate the documents row's `registrar` + `brlms` fields — `yes` / `hold` / `no`?"**

Context: OnEMI's `ipo-documents.json` row currently has `registrar: null` and `brlms: []` because Phase 5B's cover-extraction path was pinned to InCred Holdings. A Phase 5B.2 pass could either (a) extend the orchestrator to extract a cover from any curated-seed PDF, or (b) run a one-shot cover extraction against the OnEMI source.pdf already on disk during a `pdf-parse.yml` run.

### 8.3 Phase 5B.X — selector tuning (label dictionary)

> Implicit follow-up: 4 line items (`ebitda`, `eps_basic`, `total_borrowings`, `cash_and_equivalents`) remain `null` in OnEMI's production row because the staging normalizer's `LABEL_DICTIONARY` didn't match OnEMI's exact row labels. A small selector-tuning pass could add OnEMI-specific synonyms and re-promote.

**Phase 5B.1 is complete and accepted under §9.** None of the three follow-up passes start without explicit operator approval.
