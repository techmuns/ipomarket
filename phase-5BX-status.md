# Phase 5B.X — Status Report (Gate 2 implementation)

> **Status**: Gate 2 implementation complete. Pre-push verification (typecheck + build + diff + static smoke check) all green. Operator manual UI verification per §5 of `phase-5BX-onemi-master-linkage-plan.md` is still required at acceptance time.
>
> **Date**: 2026-05-22
>
> **Predecessor**: `phase-5BX-onemi-master-linkage-plan.md` (Gate 1) committed at `b26e745`.

---

## 1. Summary

A single sparse `Ipo` row for `onemi-technology-solutions` has been spliced into the `ipos[]` array of `src/data/snapshots/ipo-master.json`. The 10 existing rows, the entire `timelines[]` array, and `source_meta` block are byte-identical (JSON-semantic; verified via `json.dumps(sort_keys=True)`). The dashboard now has a parent master record for the OnEMI financial + documents rows that Phase 5B.1 promoted on 2026-05-22 at commit `26b33c2`.

No code outside `scripts/pdf/promote/onemi-master.ts` was added. No snapshot beyond `ipo-master.json` was modified. No UI null-tolerance shim was required (build passed; render verification is operator-driven).

---

## 2. Files changed

| File | Change | LoC |
|---|---|---|
| `scripts/pdf/promote/onemi-master.ts` | **NEW** — single-purpose OnEMI master linker mirroring `scripts/pdf/promote/onemi.ts` (Phase 5B.1 promoter). Performs read-existing → preflight (financials + documents existence, master count + idempotency) → string-surgery splice (preserves the 10 existing rows byte-identically) → atomic `.tmp` + `rename` write. Exit 0 on success, exit 1 on any preflight failure. | +186 |
| `src/data/snapshots/ipo-master.json` | **MODIFIED** — 1 new entry appended to `ipos[]` (after `vegorama-punjabi-angithi`); `generated_at_utc` updated to `2026-05-22T10:46:51.958Z`; the previously-last row (`vegorama-punjabi-angithi`) gains a trailing comma on its closing brace (a whitespace-level change with identical `json.dumps(sort_keys=True)` output per §7 item 3). 10 existing rows + `timelines[]` + `source_meta` blocks JSON-semantically unchanged. | +25 / −1 |
| `phase-5BX-status.md` | **NEW** — this status doc. | (see below) |

---

## 3. Exact OnEMI master row added

```jsonc
{
  "id": "onemi-technology-solutions",
  "slug": "onemi-technology-solutions",
  "name": "OnEMI Technology Solutions",
  "segment": "mainboard",
  "status": "upcoming",
  "sector": null,
  "open_date": null,
  "close_date": null,
  "listing_date": null,
  "price_band": null,
  "lot_size": null,
  "issue_size_cr": null,
  "fresh_cr": null,
  "ofs_cr": null,
  "face_value": null,
  "listing_exchange": ["BSE"],
  "reservation": null,
  "state": "manual",
  "tagline": null,
  "nse_symbol": null
}
```

The 20-key row (19 conceptual fields; `id` and `slug` carry the same value but are separately enumerated in the `Ipo` schema) typechecks against `src/types/ipo.ts`'s `Ipo` interface — required fields populated, all optional fields explicit `null`, the `Segment` enum (`'mainboard' | 'sme'`) and `IpoStatus` enum (`'upcoming' | 'open' | 'closed' | 'listed' | 'withdrawn'`) both satisfied.

---

## 4. Field classification table (reproduced verbatim from §3.3 of the plan)

To prevent future operators from mistaking the sparse master row for fully-verified issue-term data, every populated and null field is classified into one of four tiers:

- **`verified`** — directly read from a source-backed artifact already in the repo (staging JSON, Phase 5B.1-promoted snapshot row, or a real RHP URL committed to `ipo-documents.json`). The value is what the source says.
- **`inferred`** — not in any source artifact verbatim, but reasoned from multiple independent evidence signals (URL paths, financial scale, page counts, etc.). Documented in §3.2 rationale; could change if the inference turns out wrong.
- **`conservative default`** — no source-backed evidence either way; a deliberately safe value chosen to minimise downstream UI risk (e.g. `'upcoming'` rather than guessing dates). Operator can override on a future pass once evidence lands.
- **`unknown/null`** — no source-backed evidence available; explicit `null` to honour the `Ipo` type's nullability without faking data.

| Tier | Fields | Why this tier |
|---|---|---|
| **verified** | `id`, `slug`, `name`, RHP/document linkage (evidence basis — not a direct `Ipo` field; recorded via `state: 'manual'` + the §4 source basis trail back to `ipo-documents.json`) | Read directly from `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json` (`ipo_id`, `company_name`); the BSE RHP URL is already in `ipo-documents.json` from Phase 5B.1 |
| **inferred** | `segment` (= `"mainboard"`), `listing_exchange` (= `["BSE"]`) | `segment` inferred from financial scale + URL path + page count (§3.2 rationale); `listing_exchange` inferred from the BSE host of the source PDF URL (only BSE evidenced; NSE listing not yet confirmed) |
| **conservative default** | `status` (= `"upcoming"`), `state` (= `"manual"`) | `status` = no source-backed dates → safest pre-listing value; `state` = `"manual"` matches the convention for hand-curated rows (no automated ingest pipeline for OnEMI yet) |
| **unknown/null** | `sector`, `open_date`, `close_date`, `listing_date`, `price_band`, `lot_size`, `issue_size_cr`, `fresh_cr`, `ofs_cr`, `face_value`, `reservation`, `tagline`, `nse_symbol` | Not in any source artifact; explicit `null` — Phase 5B.X does NOT guess |

**Tier count**: 3 verified direct fields (`id` / `slug` / `name`) + 1 verified-by-evidence (RHP linkage; not a direct field), 2 inferred (`segment`, `listing_exchange`), 2 conservative defaults (`status`, `state`), **13 unknown/null** (`sector`, `open_date`, `close_date`, `listing_date`, `price_band`, `lot_size`, `issue_size_cr`, `fresh_cr`, `ofs_cr`, `face_value`, `reservation`, `tagline`, `nse_symbol`).

---

## 5. The 13 explicit-null fields with reasons (§3 rationale)

| Field | Reason for `null` |
|---|---|
| `sector` | Sector classification (macro / sector / industry / basic_industry per NSE/SEBI taxonomy) is not in the staging snapshot. Phase 5B.X does NOT guess. |
| `open_date` | No source-backed evidence in staging. Conservative null. |
| `close_date` | No source-backed evidence in staging. Conservative null. |
| `listing_date` | No source-backed evidence in staging. Conservative null. |
| `price_band` | Not in the staging snapshot's `line_items[]` (staging captures restated financials, not the issue-terms cover page). |
| `lot_size` | Same reason as `price_band`. |
| `issue_size_cr` | Same reason. |
| `fresh_cr` | Same reason. |
| `ofs_cr` | Same reason. |
| `face_value` | Same reason. |
| `reservation` | Not in staging. |
| `tagline` | Operator can add a short tagline later if desired. |
| `nse_symbol` | OnEMI hasn't been ingested via NSE master yet (no NSE evidence; only BSE-hosted RHP). |

---

## 6. Confirmation that existing master rows stayed unchanged

```text
existing 10 rows json-identical: True ()
timelines unchanged: True
source_meta unchanged: True
OnEMI row present: True
OnEMI row keys: 20 (matches §3 schema)
OnEMI null fields: 13 (matches §3.3 unknown/null tier)
OnEMI populated fields: 7 (id, slug, name, segment, listing_exchange, state, status)
post ipos[] count: 11
post timelines[] count: 5 (unchanged)
```

This was verified locally via `python3` JSON-semantic equality (`json.dumps(sort_keys=True)`) against `git show HEAD:src/data/snapshots/ipo-master.json` versus the post-write content. Output reproduced verbatim from the pre-commit verification step.

§7 acceptance-gate item 3 ("Existing 10 IPO rows in `ipo-master.json` `ipos[]` byte-identical pre/post (verified via `json.dumps(sort_keys=True)` equality)"): **PASS**.

§7 acceptance-gate item 4 ("`timelines[]` and `source_meta` byte-identical pre/post"): **PASS**.

---

## 7. Confirmation that financials/documents rows were not mutated

`git diff HEAD -- <path>` output for each protected file (all clean):

```
✓ src/data/snapshots/ipo-financials.json untouched
✓ src/data/snapshots/ipo-documents.json untouched
✓ src/data/snapshots/ipo-narrative.json untouched
✓ src/data/snapshots/ipo-source-audit.json untouched
✓ src/types/source.ts untouched
✓ src/types/ipo.ts untouched
✓ scripts/ingest/ clean
✓ src/components clean
✓ src/pages clean
✓ src/lib clean
✓ .github/workflows clean
✓ no PDF binaries / full-text dumps staged
```

§7 acceptance-gate items 5–8 (financials / documents / narrative / source-audit untouched): **PASS**.
§7 acceptance-gate item 14 (no PDF binaries, no workflow changes, `src/types/source.ts` + `scripts/ingest/*` untouched): **PASS**.

---

## 8. Build + typecheck

| Step | Outcome |
|---|---|
| `npm run typecheck` | **GREEN** (exit 0). The OnEMI row validates against the `Ipo` interface — strict `Segment` and `IpoStatus` enums both satisfied; required `listing_exchange: ('NSE' \| 'BSE')[]` populated with `['BSE']`. |
| `npm run build` | **GREEN** (exit 0). Vite produced `dist/assets/index-XQ0WGMLi.js` (1,892.44 kB / 593.03 kB gzip) cleanly. |

§7 acceptance-gate items 10 (typecheck), 11 (build): **PASS**.

---

## 9. Lightweight route smoke check + UI verification status

The §8 verification step (g) — manual UI verification by the operator across all 10 routes consuming `ipo-master.json` — requires a browser and is the **operator's responsibility per §7 acceptance-gate item 12**.

The sandbox does not have a Playwright Chromium binary pre-installed (the existing `phase-1-visual-qa` workflow installs it at CI time). I therefore ran a lightweight static smoke check against the locally-built `dist/` via `npm run preview` on port 5174:

| Check | Result |
|---|---|
| `curl -fsI http://127.0.0.1:5174/ipo/onemi-technology-solutions` | **`HTTP/1.1 200 OK`** — Vite SPA index.html served for the slug (as expected for any client-side route). |
| `grep 'onemi-technology-solutions' dist/assets/index-*.js` | **Slug present** in the bundled JS — `loadSnapshots` carries the new row into the React tree. |
| `ipo-financials.json["by_ipo"]["onemi-technology-solutions"].periods` | **`9M FY 26, FY 25, FY 24, FY 23`** — financials chart will find OnEMI's 4 periods. |
| `ipo-documents.json["by_ipo"]["onemi-technology-solutions"].docs` | **`RHP: https://www.bseindia.com/corporates/download/378749/IPO%20Op…`** — documents list will find OnEMI's RHP. |

**Render-time verification status**: the static checks confirm the build is well-formed and the data layer carries OnEMI. The `IpoDetail` component's render-time null-tolerance (Hero / Tabs / TimelineRail / IssueTermsGrid / FinancialsChart / DocumentsList / Source Audit chips) was NOT exercised in this sandbox because Chromium was unavailable.

**Operator action required (§7 item 12 — acceptance gate)**: post-deploy, run `npm run dev` locally and visit each of the 10 routes in `phase-5BX-onemi-master-linkage-plan.md` §5, with explicit focus on `/ipo/onemi-technology-solutions`. If any route throws a render-time error on the sparse OnEMI row, report the component + null field and we will either approve a targeted null-tolerance UI shim or abandon the row.

§7 acceptance-gate item 12 (manual UI verification passes): **PENDING** (sandbox cannot complete; operator must verify post-deploy).
§7 acceptance-gate item 13 (UI shim only if separately approved): **N/A** (no shim applied; none required by sandbox checks).

---

## 10. Acceptance gate summary

| # | Gate | Status |
|---|---|---|
| 1 | OnEMI appears in `ipo-master.json` `ipos[]` with correct required-field values | ✅ PASS |
| 2 | 13 unverified fields in OnEMI row are explicit `null` (not omitted / undefined / faked) | ✅ PASS |
| 3 | Existing 10 IPO rows JSON-identical pre/post | ✅ PASS |
| 4 | `timelines[]` and `source_meta` byte-identical pre/post | ✅ PASS |
| 5 | `ipo-financials.json` unchanged | ✅ PASS |
| 6 | `ipo-documents.json` unchanged | ✅ PASS |
| 7 | `ipo-narrative.json` unchanged | ✅ PASS |
| 8 | `ipo-source-audit.json` unchanged | ✅ PASS |
| 9 | Provenance traceable (§3 / §4 documented in this status doc) | ✅ PASS |
| 10 | `npm run typecheck` green | ✅ PASS |
| 11 | `npm run build` green | ✅ PASS |
| 12 | Manual UI verification passes | ⏳ PENDING (operator action) |
| 13 | UI null-tolerance shim only if separately approved | ✅ N/A (no shim applied) |
| 14 | No PDF binaries / full-text dumps / workflow / types / ingest touched | ✅ PASS |
| 15 | Status doc records OnEMI row + unknown-field reasons + operator follow-up questions | ✅ PASS (this doc) |
| 16 | Status doc explicitly lists verified / inferred / conservative default / unknown-null tiers verbatim | ✅ PASS (see §4 above) |

**14 PASS, 1 PENDING (operator), 1 N/A.** No gate failed.

---

## 11. Operator follow-up questions (separate approval each)

Per §8 (h)(iii) of the planning doc:

1. **Phase 5B.2 cover-extraction-for-OnEMI** — re-run the PDF parser pinned to the OnEMI BSE-hosted RHP with the cover-page extractor to populate `open_date` / `close_date` / `listing_date` / `price_band` / `lot_size` / `issue_size_cr` / `face_value` / `fresh_cr` / `ofs_cr` (and the `registrar` + `brlms` fields in the existing OnEMI documents row). **Approve?** yes / hold / no.

2. **Selector-tuning pass** — extend `scripts/pdf/normalize/financials.ts`'s label dictionary to surface `ebitda` (derivation from PBT + interest + depreciation), `eps_basic`, `total_borrowings`, and `cash_and_equivalents` from OnEMI's restated P&L. **Approve?** yes / hold / no.

3. **Sector classification pass** — populate OnEMI's `sector` field (`macro` / `sector` / `industry` / `basic_industry`) from a small operator-curated mapping or a NSE-/SEBI-derived lookup. **Approve?** yes / hold / no.

None of these passes is started without an explicit "yes" — the same two-gate pattern Phase 5B / 5B.1 / 5B.X have used.

---

*End of Phase 5B.X status. Operator review for §7 acceptance-gate item 12 (manual UI verification) is the only remaining acceptance step.*
