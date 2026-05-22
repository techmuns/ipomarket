# Phase 5C — Closure Note

> **Status**: closed. Chittorgarh ingestion **not approved**. Chittorgarh remains **reference-only / manual**.
>
> **Date**: 2026-05-22
>
> **Spanned commits**: `cab5af1` (5C scaffold) → `2669527` (5C.1 P-25 targeting fix) → `b47b1e2` (5C.2 P-25 regex + Playwright fallback) → `05b52a7` (5C.3 P-26 calibration) plus four CI artifact-refresh commits.
>
> **Scope discipline (binding going forward)**: no Chittorgarh ingestion; no production scraping; no production snapshot mutation; no UI changes; no `src/types/source.ts` extensions; no DB / Workers / GMP / cron.

---

## 1. Summary of Phase 5C outcome

Phase 5C ran four iterations characterizing Chittorgarh, Zerodha, and Upstox as potential broker/aggregator data sources via probes P-25..P-28.

| Probe | Final status | What it proved |
|---|---|---|
| **P-25** Chittorgarh list + detail accessibility | **GREEN** | Dashboards reachable from GH Actions (200, ~147+148 KB, no challenge). 40 detail URLs discovered statically via regex. Both sampled detail pages (Bagmane REIT, OnEMI Technology) fetched cleanly at 309 KB / 343 KB. No captcha / Cloudflare interference across 4 CI runs. |
| **P-26** Chittorgarh field extraction | **RED** | Table-aware parser correctly extracts 4–5 of 10 expected fields per page at HIGH confidence with **zero false positives** (`fields_rejected_low_confidence` empty on both pages). Average precision **0.450**. PDF allow-list classification works (2 BSE-hosted PDFs surfaced, 3 off-allow-list correctly rejected). |
| **P-27** Zerodha refresh | **GREEN** | Stable across all iterations. Reference-only. |
| **P-28** Upstox refresh | **GREEN** | Stable across all iterations. Reference-only. |

---

## 2. Why Chittorgarh is not approved for automated ingestion

| §9.1 precondition | Outcome |
|---|---|
| Access passed (no captcha / anti-bot / 403) | ✅ **PASSED** — confirmed across 4 CI runs |
| Detail-page discovery passed | ✅ **PASSED** — 40 URLs found, 2 sampled detail pages reachable |
| **P-26 precision ≥ 0.80** | ❌ **FAILED at 0.450** vs the 0.800 gate |
| Official-source non-overwrite | N/A (no ingestion code exists) |
| Per-field provenance feasible | ✅ shape documented and exercised in the audit JSON |
| Official PDF URL re-verification feasible | ✅ proven end-to-end (2 BSE-hosted PDFs on-allow-list, 3 others correctly rejected) |

Per the Phase 5C.3 acceptance gate ("If P-26 average precision is below 0.80 after this pass, recommend NO and keep Chittorgarh reference-only/manual"), the call is **NO**.

The shortfall is **selector-label coverage** — Chittorgarh's actual label text for `open_date`, `close_date`, `listing_date`, `registrar`, and `brlms` differs from the patterns P-26 tried. Closing the gap would require another selector-tuning iteration, which is now explicitly **out of scope**.

---

## 3. What remains useful

1. **Chittorgarh reference-only / manual** — operators may consult Chittorgarh pages by hand for context, GMP, subscription rumors, etc. Nothing automated reads from Chittorgarh in production.
2. **Zerodha (P-23a / P-27) and Upstox (P-23b / P-28) remain GREEN and refreshable on demand** — same reference-only role they've always carried. P-27 / P-28 are available in `--group J` if the operator wants to refresh the broker-page benchmarks.
3. **Two official BSE-hosted PDFs were discovered by P-26** and are on the §Y.9.1 allow-list. They are **candidates** for the Phase 5A.2 curated seed (`phase-0/curated-official-pdfs.json`):
   - `https://www.bseindia.com/downloads/ipo/bagmane%20prime%20office%20reit%20-%20od_040520261128.pdf` (Bagmane Prime Office REIT — Offer Document)
   - `https://www.bseindia.com/corporates/download/378749/IPO%20Open/6RedHerringProspectussigned_20260427195413.pdf` (OnEMI Technology Solutions — Red Herring Prospectus)

   Adding either of these to the curated seed is a **separate operator decision** under the existing Phase 5A.2 curated-seed mechanism (host-allow-list-enforced, human-vetted). It is **not** part of this closure and is **not** Chittorgarh ingestion.

---

## 4. Explicit guardrail (binding)

**No Chittorgarh production scraping without a new, explicit approval.**

Specifically:
- The probes `scripts/probes/P-25-chittorgarh-accessibility.ts` and `scripts/probes/P-26-chittorgarh-detail-extract.ts` remain on `main` as **characterization artifacts only**. They are runnable via `--probe P-25` / `--probe P-26` / `--group J` for diagnostics. They do **not** write to any production snapshot.
- No `Chittorgarh` value will be added to `SourceTag` in `src/types/source.ts`.
- No `aggregator` value will be added to `DataState` in `src/types/source.ts`.
- No `scripts/ingest/` code will read Chittorgarh.
- The §Y planning section in the master plan stands as documentation of the rejected ingestion direction; the Y.6 type-extension specs do not get implemented.

---

## 5. Recommended next step

**Return to the Phase 5A curated official PDF seed mechanism (`phase-0/curated-official-pdfs.json`) — official BSE / SEBI / NSE-hosted PDFs only.**

Concretely:
- The Phase 5A.2 curated seed currently has 1 entry (vegorama RHP, persistently fetch-failing). It needs operator-curated additions to unblock Phase 5B.
- The two BSE-hosted URLs surfaced by P-26 (Bagmane REIT OD, OnEMI Technology RHP) qualify on host alone and could be hand-added to the seed file — operator's choice, not automatic.
- The existing `phase-0-probes` workflow + `pdf-parse` workflow are sufficient to validate additions; no new infrastructure required.
- **No aggregator field ingestion**, ever, unless and until a future phase explicitly reopens that question with new approval.

---

## What is *not* changing as part of this closure

- `src/data/snapshots/*.json` — untouched.
- `src/types/source.ts` — untouched.
- `scripts/ingest/*` — untouched.
- UI (`src/components`, `src/pages`, `src/lib`) — untouched.
- `.github/workflows/*` — untouched.
- The Phase 5C probes themselves — kept on `main` as runnable characterization artifacts.
- The broker / aggregator source plan (`broker-aggregator-source-plan.md`) — kept as a record of the direction we evaluated and rejected.

Phase 5C is closed. Stay on `main`. No further iteration without explicit operator approval.
