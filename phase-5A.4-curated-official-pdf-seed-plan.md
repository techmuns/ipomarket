# Phase 5A.4 — Curated Official PDF Seed Plan (planning only)

> **Mode**: planning. No implementation. No code changes in this turn.
>
> **Date**: 2026-05-22
>
> **Predecessors**: `phase-5A.2-candidate-discovery-plan.md`, `phase-5A.2-status.md`, `phase-5C-closure.md`, master plan §X / §Y.
>
> **Trigger**: Phase 5C closed with Chittorgarh ingestion rejected (precision 0.450 vs 0.800 gate). Phase 5B remains blocked: the only curated seed entry (vegorama RHP) persistently fetch-fails, and no full DRHP/RHP candidate has reached the PDF parser. During the Phase 5C run, P-26 surfaced **two official BSE-hosted PDFs** as a side-effect of Chittorgarh's allow-list-based PDF classifier. These URLs qualify on host alone and are the cleanest path to unblock Phase 5B.
>
> **Scope discipline (binding)**:
> - Use only official-host PDFs (`sebi.gov.in`, `bseindia.com`, `bsesme.com`, `nseindia.com`, `nsearchives.nseindia.com`).
> - **No Chittorgarh fields** in any snapshot or in the curated seed entry's data — Chittorgarh appears only as a `discovered_via` provenance label.
> - Chittorgarh is NOT a production data source.
> - Do not mutate `src/data/snapshots/ipo-documents.json` (or any other production snapshot).
> - No UI / DB / Workers / GMP / cron / production scraping.
> - No PDF binaries or full-text dumps committed (existing CI guards in `.github/workflows/pdf-parse.yml`).
> - Stay on `main`.

---

## 1. Objective

Manually seed **2 new official-host PDF URLs** into the existing Phase 5A.2 curated-seed mechanism (`phase-0/curated-official-pdfs.json`) so the PDF parser orchestrator (`scripts/pdf/run.ts`) finally has full DRHP / RHP / Offer Document candidates to score under the existing PDF #2 selection logic.

Concretely:
- The orchestrator's unified-pool builder (`scripts/pdf/run.ts:buildUnifiedPdf2Pool`) already merges curated-seed entries with sort priority over discovery-sourced rows. Adding 2 new entries should immediately surface them as PDF #2 candidates.
- The existing reader (`scripts/pdf/discover/curated-seed.ts:loadCuratedSeed`) already enforces the `CURATED_OFFICIAL_HOSTS` allow-list and rejects non-official URLs. No security-boundary change required.
- The existing `pdf-parse.yml` workflow runs the orchestrator and commits refreshed audit JSON back to `main` — no workflow change required.

**Net Phase 5A.4 footprint**: data-only seeding plus a small additive schema extension on the curated-seed entry. No new files, no new workflows, no new dependencies.

---

## 2. Candidate list

### 2.1 Bagmane Prime Office REIT — Offer Document (BSE-hosted)

| Field | Value |
|---|---|
| company_name | Bagmane Prime Office REIT |
| document_type | `Final Offer Document` (closest match in existing `DocType` taxonomy; REIT OD is functionally analogous to the equity-IPO Final Offer Document) |
| url | `https://www.bseindia.com/downloads/ipo/bagmane%20prime%20office%20reit%20-%20od_040520261128.pdf` |
| source_host | `www.bseindia.com` ✅ on allow-list |
| discovered_via | `chittorgarh-p26-2026-05-22` (provenance only — Chittorgarh is NOT the data source; the data source is BSE itself) |
| why it qualifies | Host on §Y.9.1 allow-list. URL path `/downloads/ipo/...-od_<timestamp>.pdf` is the canonical BSE Offer Document upload pattern. Surfaced by P-26's `extractOfficialPdfLinks()` on the Bagmane detail page and correctly classified `on_allowlist`. |
| expected parser use | **financial-table detection primary**; REIT Offer Documents typically 200–500 pages with full P&L, balance sheet, and SPV breakdowns. Cover extraction secondary — REITs use a different cover convention than equity IPOs so anchor matches may be lower. |
| expected page count | ≥ 200 (Final Offer Documents are full-length; would survive `FINANCIAL_PAGE_MIN = 200` filter in `scripts/pdf/run.ts`) |

### 2.2 OnEMI Technology Solutions — Red Herring Prospectus (BSE-hosted)

| Field | Value |
|---|---|
| company_name | OnEMI Technology Solutions |
| document_type | `Red Herring Prospectus` |
| url | `https://www.bseindia.com/corporates/download/378749/IPO%20Open/6RedHerringProspectussigned_20260427195413.pdf` |
| source_host | `www.bseindia.com` ✅ on allow-list |
| discovered_via | `chittorgarh-p26-2026-05-22` (provenance only) |
| why it qualifies | Host on §Y.9.1 allow-list. URL filename `6RedHerringProspectussigned_<timestamp>.pdf` plus path `/IPO Open/` clearly identify this as the signed RHP filed with BSE for an in-flight IPO. Surfaced by P-26 and classified `on_allowlist`. |
| expected parser use | **both cover extraction and financial-table detection**; signed RHPs are the canonical Phase 5B target — full P&L, balance sheet, cash flow, plus issue terms / BRLMs / registrar on the cover. |
| expected page count | ≥ 400 (signed RHPs are typically 400–700 pages) |

### 2.3 Optional third candidate

**None proposed in this plan.** The only other already-in-repo curated entry is `vegorama-punjabi-angithi` (RHP, SEBI-hosted), which has fetch-failed across the Phase 5A.1 / 5A.2 CI runs (likely a stale May-2026 commondoc URL). Recommendation: **keep the vegorama entry in place** as-is — the orchestrator records its `fetch_failed` verdict in the audit harmlessly. Do not delete it; do not promote it; do not add any new SEBI candidate that has not already been observed in repo artifacts.

If a future operator pass surfaces a stable SEBI / NSE / BSE SME / nsearchives URL, it can be added as a separate Phase 5A.4-extension entry — but that is **not** part of this plan.

---

## 3. Where to store the curated seed

**Use the existing file** `phase-0/curated-official-pdfs.json` (Phase 5A.2 — already in production, already wired into the orchestrator, already host-allow-list-enforced).

**Do NOT create** `phase-5/curated-official-pdfs.json` — that would split the seed across two locations, double the loader complexity, and orphan the existing vegorama entry. The file already lives under `phase-0/` and the orchestrator reads from there.

### 3.1 Schema reconciliation (binding)

The existing entry shape (Phase 5A.2):

```jsonc
{
  "ipo_id": "vegorama-punjabi-angithi",
  "doc_kind": "RHP",
  "doc_url": "https://www.sebi.gov.in/.../Vegorama%20Punjabi%20Angithi%20Limited-RHP_p.pdf",
  "source_host": "www.sebi.gov.in",
  "curated_at_utc": "2026-05-22T00:00:00Z",
  "verified_at_utc": null,
  "notes": "..."
}
```

The user-requested fields are mostly a renaming + 4 new fields. To avoid breaking the existing vegorama entry, the loader, and the orchestrator, **keep the existing field names** (`ipo_id` / `doc_kind` / `doc_url` / `curated_at_utc`) and **add the new fields as additive-optional**. The schema after Phase 5A.4 implementation:

| Field | Type | Required? | Source |
|---|---|---|---|
| `ipo_id` | string | ✅ required | existing — kept |
| `doc_kind` | enum (`DRHP` \| `RHP` \| `Final Offer Document` \| `Prospectus`) | ✅ required | existing — kept |
| `doc_url` | string | ✅ required | existing — kept |
| `source_host` | string | ✅ required | existing — kept |
| `curated_at_utc` | string (ISO timestamp) | ✅ required | existing — kept; canonical curation timestamp |
| `verified_at_utc` | string \| null | optional | existing — kept |
| `notes` | string | optional | existing — kept |
| **`company_name`** | string | **NEW** optional | full legal company name (free text) |
| **`discovered_via`** | string | **NEW** optional | provenance tag — `"chittorgarh-p26-2026-05-22"`, `"operator-manual-2026-05-22"`, `"sebi-smid10-cached"`, etc. **Provenance only** — never used as a data source. |
| **`discovered_at_utc`** | string (ISO timestamp) | **NEW** optional | when the candidate URL was first observed (may differ from `curated_at_utc` which records when the operator vetted it) |
| **`curated_by`** | string | **NEW** optional | operator identifier — e.g. `"phase-5C-closure"`, `"manual-operator"` |
| **`allowed_for_parser`** | boolean (default `true`) | **NEW** optional | when `false`, the loader excludes the entry from the candidate pool. Lets operators temporarily quarantine an entry without deleting it. |

The user's requested `id` is rendered as `ipo_id`; `document_type` as `doc_kind`; `url` as `doc_url`. This is purely a naming convention difference — the semantic content is identical. The plan picks the existing names because they're already in production code at `scripts/pdf/discover/curated-seed.ts` and `scripts/pdf/lib/types.ts`.

### 3.2 Loader change

`scripts/pdf/discover/curated-seed.ts:loadCuratedSeed()` — additive only:
- Read the new optional fields and pass them through to the in-memory entry.
- Enforce `allowed_for_parser`: if explicitly `false`, push to `rejected[]` with reason `"allowed_for_parser=false (operator-quarantined)"`. Default behaviour (when the field is missing) is to allow.
- No change to host allow-list logic.
- No change to existing required-field validation.

### 3.3 Type change

`scripts/pdf/lib/types.ts:CuratedOfficialPdfEntry` — additive only:
- Extend the interface with the 5 new optional fields.
- `src/types/pdf-audit.ts` does **not** need a mirror (the curated seed isn't surfaced to UI types).
- `src/types/source.ts` is **not** touched (the §Y.6 type extension specs from the closed Phase 5C remain unimplemented).

---

## 4. Parser integration

**No new parser code.** The existing flow already does what we need:

1. `scripts/pdf/discover/curated-seed.ts:loadCuratedSeed()` reads the file, validates, returns accepted entries.
2. `scripts/pdf/run.ts:main()` calls `loadCuratedSeed()` and passes the result to `buildUnifiedPdf2Pool()`.
3. `buildUnifiedPdf2Pool()` merges curated entries into the unified pool with **sort priority over discovery rows** (curated wins ties).
4. PDF #2 selection loop downloads each candidate (in sort order), reads page count, and selects the first surviving the DAP filter with `page_count >= FINANCIAL_PAGE_MIN` (200).
5. On selection, the existing extractor chain runs: `scripts/pdf/lib/pdf-financials.py` against the chosen PDF; results written to `phase-0/pdf-extracts/<ipo_id>/financials.json` and surfaced in the audit's `by_ipo[<ipo_id>].sections.financials.{candidate_pages, tables_detected, confidence}`.

**Boundary explicitly preserved**:
- The curated entries are **NEVER** promoted into `src/data/snapshots/ipo-documents.json`. The orchestrator only reads `ipo-documents.json`; it never writes.
- The financials extractor writes to a per-IPO side artifact (`phase-0/pdf-extracts/<ipo_id>/financials.json`), NOT to production `ipo-financials.json`.
- The audit (`src/data/snapshots/ipo-pdf-extraction-audit.json`) is updated as a feasibility / Phase 5A artifact — not a production financial snapshot.
- No normalization of P&L / BS / CFS into production schemas happens. Phase 5B remains gated.

The only Phase 5A.4 integration change is the **loader** extension (`allowed_for_parser` honoring + new optional fields pass-through). The rest of the chain is unchanged.

---

## 5. Verification

Before push (run in the implementation pass):

```
npm run typecheck
npm run build
npm run pdf
```

Plus CI-style guards:
- Confirm no `*.pdf` or `*.full.txt` staged: `git diff --cached --name-only | grep -Ei '\.pdf$|\.full\.txt$'` → empty
- Confirm `src/data/snapshots/ipo-documents.json` unchanged: not in `git diff --cached --name-only`
- Confirm `src/data/snapshots/ipo-financials.json` unchanged: not in `git diff --cached --name-only`
- Confirm `src/types/source.ts` unchanged: not in `git diff --cached --name-only`
- Confirm only audit JSON, curated-seed JSON, loader, types are in the diff

After push: trigger `pdf-parse.yml` in CI manually. CI's PDF binary guard step (`grep -Ei '\.pdf$'`) and existing typecheck + build gates remain in force.

---

## 6. Acceptance gate

Phase 5A.4 closes successfully when **all** of the following hold post-CI:

1. ✅ At least **one** curated PDF (Bagmane OD or OnEMI RHP) downloads successfully from its BSE host. Recorded by `scripts/pdf/run.ts` as `scanned[]` entry with `verdict: 'selected'` (or `'too_short'` if smaller than 200 pages, which would itself be informative).
2. ✅ The selected PDF's `page_count >= 200` (confirms it's a full-length document, not an abridged stub).
3. ✅ Cover extraction (`scripts/pdf/lib/pdf-cover.py`) returns `overall_confidence` of `medium` or `high` for the selected PDF. (If REIT — Bagmane — returns `low`, that's an informative parser-limit finding; the OnEMI RHP run is the more rigorous test.)
4. ✅ Financial-table candidate detection (`scripts/pdf/lib/pdf-financials.py`) **runs and reports** any of `high` / `medium` / `low` overall confidence. The bar is "the extractor ran end-to-end without crashing"; not "the extractor produced production-grade output". Phase 5B viability call follows from this evidence.
5. ✅ No mutation of any `src/data/snapshots/*.json` production file (verified via diff).
6. ✅ typecheck + build green; no PDF binaries or full-text dumps staged; CI guards held.

If gates 1–4 all pass: **Phase 5A.4 is successful** and the Phase 5B viability call can be re-made with real evidence. If gate 1 fails for BOTH new candidates (both BSE PDFs fetch-fail), **the call reverts to "still blocked" and the operator decides whether to escalate to NSE archive seeding or accept that the Phase 5A.x line is exhausted**.

---

## 7. Exact implementation prompt for the Phase 5A.4 implementation pass

> Use this prompt verbatim when launching the Phase 5A.4 execution pass. Implementation must not start until the user explicitly approves.

```
Phase 5A.4 — curated official PDF seed extension (data + tiny loader change).

In-scope file changes:
  - phase-0/curated-official-pdfs.json (UPDATE):
      * Keep the existing vegorama-punjabi-angithi entry unchanged.
      * Add the Bagmane Prime Office REIT entry (Final Offer Document; BSE host).
      * Add the OnEMI Technology Solutions entry (Red Herring Prospectus; BSE host).
      * Both new entries use the additive schema (ipo_id, doc_kind, doc_url, source_host,
        curated_at_utc, verified_at_utc=null, notes, company_name, discovered_via,
        discovered_at_utc, curated_by, allowed_for_parser=true).
  - scripts/pdf/lib/types.ts (EXTEND CuratedOfficialPdfEntry):
      * Add 5 new optional fields: company_name, discovered_via, discovered_at_utc,
        curated_by, allowed_for_parser.
      * No rename of existing fields.
  - scripts/pdf/discover/curated-seed.ts (EXTEND loadCuratedSeed):
      * Pass through new optional fields to the accepted entry.
      * Honor allowed_for_parser=false → push to rejected[] with reason
        "allowed_for_parser=false (operator-quarantined)". Default (missing) = allowed.
      * No change to host allow-list logic.
  - phase-5A.4-status.md (NEW; written at end of pass with CI evidence).
  - phase-0/pdf-extracts/curated-official-pdfs.json (auto-generated audit copy).
  - phase-0/pdf-extracts/index.json (auto-refreshed).
  - src/data/snapshots/ipo-pdf-extraction-audit.json (auto-refreshed Phase 5A audit only).

Out of scope (HARD — same as prior phases):
  - src/data/snapshots/ipo-documents.json (do NOT mutate)
  - src/data/snapshots/ipo-financials.json (do NOT mutate — Phase 5B remains gated)
  - src/data/snapshots/ipo-narrative.json / ipo-source-audit.json (do NOT touch)
  - src/types/source.ts (do NOT extend — Phase 5C closure stands)
  - scripts/ingest/* (do NOT touch)
  - All UI files (src/components, src/pages, src/lib)
  - Workers, cron, DB, GMP production integration, LLM
  - Chittorgarh ingestion code of any kind
  - Real-time broker price data
  - Stealth, proxies, captcha solving, login access, account-based access
  - Aggregator field ingestion (per Phase 5C closure §4)

Behavior:
  - On `npm run pdf`, the orchestrator merges the 3 curated entries (vegorama + 2 new)
    into the PDF #2 pool. Sort order: curated entries first; within curated, doc-type
    preference (DRHP > RHP > Final Offer Document > Prospectus) then URL string.
    Expected ranking: OnEMI RHP first, Bagmane OD second, vegorama RHP third.
  - PDF #2 selection loop downloads each in order, reads page count, picks the first
    with page_count >= 200. OnEMI RHP and Bagmane OD are both expected to pass; the
    first to download successfully wins.
  - On selection, pdf-financials.py runs against the chosen PDF and writes
    phase-0/pdf-extracts/<ipo_id>/financials.json plus audit row updates.
  - The phase-5A.4-status.md report records: which candidate was selected, its page
    count + SHA256, cover-extraction confidence, financials-extraction confidence,
    fetch_failed entries (if any), and the Phase 5B viability re-call.

Hard guardrails:
  1. No mutation of any src/data/snapshots/*.json production file beyond the existing
     Phase 5A audit (src/data/snapshots/ipo-pdf-extraction-audit.json), which is the
     §W.6.1-sanctioned feasibility audit — NOT production financial data.
  2. No PDF binaries or full-text dumps committed (existing pdf-parse.yml guard).
  3. typecheck + build still pass.
  4. Stay on main; no feature branches.
  5. Curated entries must resolve to CURATED_OFFICIAL_HOSTS. The host check at
     scripts/pdf/discover/curated-seed.ts is the security boundary — unchanged.
  6. No Chittorgarh fields, no Chittorgarh ingestion, no aggregator data of any kind
     enters the candidate pool or any snapshot. `discovered_via: chittorgarh-p26-*`
     is provenance only.

Verification before push:
  - npm run typecheck
  - npm run build
  - npm run pdf
  - confirm no PDF binaries or full-text dumps staged
  - confirm src/data/snapshots/ipo-documents.json untouched
  - confirm src/data/snapshots/ipo-financials.json untouched
  - confirm src/types/source.ts untouched
  - confirm scripts/ingest/ untouched

After verification:
  - Commit + push to main.
  - STOP and ask the user to trigger pdf-parse.yml in CI.
  - Do NOT start Phase 5B (full P&L / BS / CFS normalization into production
    snapshots) without explicit further approval.
```

---

## 8. Open decisions for the operator before implementation starts

1. **Approve the curated-seed additive schema** (5 new optional fields, no rename of existing fields). Or specify a full rename if preferred (more disruptive — loader + vegorama entry update required).
2. **Confirm both Bagmane OD and OnEMI RHP go in together**, or pick one for the first pass. (Recommendation: both — the orchestrator handles multiple candidates cleanly; cost is identical.)
3. **Confirm vegorama stays in place** (recommended) rather than being removed or quarantined via `allowed_for_parser: false`. (Recommendation: keep — fetch_failed is recorded harmlessly and the entry documents the SEBI-staleness signal.)
4. **Confirm Phase 5B is still gated** post-Phase-5A.4 — i.e. even if cover + financials extraction both run cleanly, no production `ipo-financials.json` write happens without a separate Phase 5B approval. (Recommendation: yes, keep Phase 5B gated.)

No code will be written until these four decisions land.
