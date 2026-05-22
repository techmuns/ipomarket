# Phase 5B — Financial Table Normalization (planning only)

> **Mode**: planning. No code edits. No parser modification. No normalizer implementation. No `npm run pdf` invocation. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §9 implementation prompt below.
>
> **Date**: 2026-05-22
>
> **Predecessors**: `phase-5A.4-curated-official-pdf-seed-plan.md` (planning), `phase-5A.4-status.md` (sandbox), `phase-5A.4` CI run `0a96591` (validation), Phase 5C closure (`547c2d1`), master plan §Z.
>
> **Trigger**: Phase 5A.4 CI proved Phase 5B viability — the OnEMI Technology Solutions RHP downloaded cleanly from BSE (`bseindia.com`, 464 pages, sha256 `4668b4e2…`), and the financials extractor returned `overall_confidence: high` with 66 candidate pages and 13 tables detected (including a high-confidence multi-period restated P&L on page 71).
>
> **Scope discipline (binding)**:
> - **OnEMI only** in this implementation. No multi-IPO scaling in Phase 5B.
> - **Staging only**: write to `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json`. Do NOT mutate `src/data/snapshots/ipo-financials.json`.
> - No UI / DB / Workers / cron / GMP production integration.
> - No Chittorgarh field ingestion (Phase 5C closure stands).
> - No LLM-based row-label inference.
> - No `src/types/source.ts` extension.
> - No new workflow files; reuse `.github/workflows/pdf-parse.yml`.
> - No PDF binaries or full-text dumps committed.
> - Stay on `main`.

---

## 1. Header — two-gate execution

Phase 5B execution is split into two gates that must be **approved separately**.

| Gate | Scope | Approval mechanism |
|---|---|---|
| **Gate 1 — Planning doc only (the act of producing THIS file)** | Create + commit + push `phase-5B-financial-normalization-plan.md` to repo root. **No code edits. No parser changes. No normalizer implementation. No `npm run pdf` invocation. No production-adjacent snapshot mutation (not even the audit JSON).** | Approved when this plan was accepted |
| **Gate 2 — Implementation pass** | Execute the §9 implementation prompt verbatim: extend `scripts/pdf/lib/pdf-financials.py` (additive only), add the Node normalizer, wire the orchestrator, run + commit + push, write `phase-5B-status.md`. | **Separate explicit operator approval** of the §9 implementation prompt (after reading this document on `main`) |

Gate 2 MUST NOT start in the same turn as Gate 1.

---

## 2. Objective

Convert OnEMI's 13 detected financial tables into a normalized, reviewable JSON snapshot with per-line-item confidence, period detection, unit handling (the RHP uses **₹ in millions** while the production schema uses **crores** — see §6), and full provenance back to the source page + raw label.

**Production `src/data/snapshots/ipo-financials.json` is NOT written in this phase.** The normalized output lives in the side-artifact directory and is hand-reviewable as the first proof-of-concept for the full Phase 5B+ pipeline. Promoting from staging to production is a separate Phase 5B.1 gate, requiring its own approval.

---

## 3. Source input

### 3.1 Existing artifacts (already on `main` post Phase 5A.4 CI run `0a96591`)

- `phase-0/pdf-extracts/curated_onemi-technology-solutions/financials.json` — feasibility metadata (66 candidate pages, 13 tables, `header_row_sample[]` per table, confidence signals, page numbers).
- `phase-0/pdf-extracts/index.json` — orchestrator summary.
- `src/data/snapshots/ipo-pdf-extraction-audit.json` — `pdf_2_financial_target` block carries the OnEMI selection record.

### 3.2 Critical engineering finding (drives the §7 architecture)

The existing `scripts/pdf/lib/pdf-financials.py` outputs **only metadata**. Each `tables_detected[]` entry carries `page`, `flavor` (camelot lattice/stream or pdfplumber), `rows`, `cols`, `header_row_sample[]` (first 6 cells of the first row), and `confidence_signal` — **no body cells, no numerical data**. To normalize values, Phase 5B must re-extract cell-level data from the source PDF.

The source PDF (`phase-0/pdf-extracts/curated_onemi-technology-solutions/source.pdf`) is downloaded fresh by `scripts/pdf/run.ts:downloadPdf()` on every `npm run pdf` invocation and is gitignored. So Phase 5B's cell-extraction step runs in the same workflow invocation, after the existing feasibility extraction, while `source.pdf` is on disk.

**No new PDF downloading is introduced by Phase 5B.** It piggybacks on the orchestrator's existing download.

---

## 4. Normalization target schema

The Gate 2 implementation produces a JSON file conforming to this shape (informally typed below; the strict TypeScript types live in the to-be-created `scripts/pdf/normalize/types.ts`).

```jsonc
{
  "ipo_id": "onemi-technology-solutions",
  "company_name": "OnEMI Technology Solutions",
  "source_pdf_url": "https://www.bseindia.com/corporates/download/378749/IPO%20Open/6RedHerringProspectussigned_20260427195413.pdf",
  "source_pdf_sha256": "4668b4e22fde35670ccc8405e185a0fe4cd532f84597eed339265c00a84de22f",
  "source_doc_kind": "RHP",
  "parsed_at_utc": "<ISO timestamp>",
  "parser_version": "5B.0",
  "manual_review_required": <bool>,

  "unit_detected": {
    "value": "INR millions",
    "source": "page-68 heading: '₹ in millions, unless otherwise stated'",
    "confidence": "high"
  },
  "scope_preference": {
    "preferred": "Consolidated",
    "available": ["Standalone", "Consolidated"],
    "rationale": "consolidated chosen when both present (covers subsidiary)"
  },
  "restated_preference": {
    "preferred": "Restated",
    "rationale": "SEBI-mandated restated form is the audited baseline"
  },

  "periods_detected": [
    { "label_raw": "As at and for the nine months ended December 31, 2025", "normalized": "9M FY 26", "source_page": 70, "confidence": "high" },
    { "label_raw": "As at March 31, 2025", "normalized": "FY 25", "source_page": 70, "confidence": "high" },
    { "label_raw": "As at March 31, 2024", "normalized": "FY 24", "source_page": 70, "confidence": "high" }
  ],

  "line_items": [
    {
      "key": "revenue",
      "raw_label": "Revenue from operations",
      "normalized_label": "Revenue from operations",
      "source_page": 71,
      "source_table_index": 11,
      "values_by_period": {
        "9M FY 26": { "raw": "9,283.45", "normalized_cr": 928.35, "confidence": "high" },
        "FY 25":    { "raw": "10,452.12", "normalized_cr": 1045.21, "confidence": "high" },
        "FY 24":    { "raw": "7,123.89", "normalized_cr": 712.39, "confidence": "high" }
      },
      "manual_review_required": false
    }
    // similar entries for: ebitda, pat, eps_basic, total_assets, net_worth,
    // total_borrowings, cash_and_equivalents
  ],

  "line_items_missing": [
    {
      "key": "ebitda",
      "reason": "EBITDA not directly disclosed; would require derivation from P&L lines (PBT + interest + depreciation). Phase 5B writes derivations only when all components extract at high confidence."
    }
  ],

  "table_origin_map": [
    { "key_present": ["total_assets", "net_worth"], "source_page": 68, "table_index": 8, "scope": "Consolidated", "form": "Restated Statement of Assets and Liabilities" },
    { "key_present": ["revenue", "pat", "eps_basic"], "source_page": 71, "table_index": 11, "scope": "Consolidated", "form": "Restated Statement of Profit and Loss" }
  ],

  "warnings": [
    "page-71 confidence-high P&L matched; page-70 medium P&L was an earlier draft of the same statement — chose page-71 for higher confidence (rule §6.6)",
    "Cash flow line items not yet supported in 5B.0 — table-shape detection works but row labels need a separate dictionary"
  ],
  "errors": []
}
```

### 4.1 Key principles

- **Every value is traceable** back to a `source_page` + `source_table_index` + `raw_label`. No black-box numbers.
- **Numeric values are stored twice**: `raw` (string, as printed in the PDF) AND `normalized_cr` (number, in crores). Unit conversion is auditable.
- **Per-line-item confidence** lets the dashboard later surface high-confidence rows while flagging low rows for human review.
- **Missing line items are explicit** with reason — no silent gaps.
- `manual_review_required` rolls up the per-line-item flags into one top-level signal.

### 4.2 Expected line items (10 keys)

| Key | Notes |
|---|---|
| `revenue` | Revenue from operations / Total revenue / Total income / Income from operations. |
| `ebitda` | Earnings before interest, tax, depreciation, amortisation. Often derived rather than disclosed. |
| `pat` | Profit for the year / Profit after tax / Net profit. May be negative for loss-making issues. |
| `eps_basic` | Basic earnings per share. |
| `total_assets` | Total assets / Total equity and liabilities. |
| `net_worth` | Total equity / Net worth / Shareholders' funds. |
| `total_borrowings` | Borrowings (current + non-current). |
| `cash_and_equivalents` | Cash and cash equivalents / Cash and bank balances. |

Two additional keys (`eps_diluted`, `total_liabilities`) are out of scope for 5B.0 and explicitly excluded from the §8 acceptance gate.

---

## 5. Staging output location

**Primary staging path**: `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json`.

Sibling to the existing `financials.json` and (when present) `cover.json` in the same per-IPO directory. This is the operator's confirmed preference for Phase 5B (vs. `src/data/snapshots/ipo-financials-staging.json`).

**Production `src/data/snapshots/ipo-financials.json` is NOT written** in this implementation pass. A short pointer is added to the §W.6.1 feasibility audit (`src/data/snapshots/ipo-pdf-extraction-audit.json`) under a new top-level `normalization` block:

```jsonc
"normalization": {
  "attempted_for": ["curated_onemi-technology-solutions"],
  "staging_path": "phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json",
  "line_items_extracted_high_confidence": [...],
  "line_items_extracted_medium_confidence": [...],
  "line_items_missing": [...],
  "manual_review_required": true,
  "production_snapshot_mutated": false
}
```

This is the **§W.6.1-sanctioned audit surface** — NOT production financial data. It is the only `src/data/snapshots/*.json` file Phase 5B writes.

---

## 6. Validation rules

1. **Unit detection** (binding): scan the page text immediately preceding each detected table for `₹ in (millions|crores|lakhs)` / `Rs. (million|crore|lakh)` / `INR (million|crore|lakh)` patterns. Default if no marker found: mark `unit_detected.confidence: 'low'` and set `manual_review_required: true`. Conversions: `millions ÷ 10 = crores`; `lakhs ÷ 100 = crores`; `crores × 1 = crores`.
2. **Period normalization**: regex pipeline mapping raw header text → canonical period. Patterns to handle: `As at March 31, YYYY` → `FY (YY mod 100)`; `for the year ended March 31, YYYY` → `FY (YY mod 100)`; `for the nine months ended (Jun|Sep|Dec) DD, YYYY` → `9M FY (YY+1 mod 100)`; `H1 FY YY` / `6M FY YY` direct mapping; explicit `FY YY` direct mapping. If none match, mark period `confidence: 'low'` and `manual_review_required: true`.
3. **Duplicate table handling**: when multiple tables on different pages match the same line-item key (e.g. page-70 medium-confidence P&L *and* page-71 high-confidence P&L), prefer the higher-confidence table. Record the rejected duplicates in `warnings[]`.
4. **Standalone vs Consolidated detection**: scan page text near the table heading for `RESTATED STANDALONE` / `RESTATED CONSOLIDATED` markers. If both forms present, prefer **Consolidated** (covers subsidiary financials; the dashboard signal value is consolidated by industry convention). Record the choice in `scope_preference`.
5. **Restated vs non-restated**: SEBI mandates restated financial information; prefer tables on pages whose heading contains `RESTATED`. Non-restated tables are kept as fallback only when no restated equivalent exists; `restated_preference.preferred` records the call.
6. **Confidence-based preference**: when multiple tables exist for the same line-item key, prefer the one with `confidence_signal: high`, then `medium`, then `low`. Tie-break by page number (earlier page wins — restated standalone usually precedes restated consolidated).
7. **Row label mapping** (dictionary): explicit lookup table per `key`:
   - `revenue`: `["revenue from operations", "total revenue", "total income", "income from operations"]`
   - `ebitda`: `["earnings before interest, tax and depreciation", "ebitda", "operating profit before depreciation and amortisation"]`
   - `pat`: `["profit for the year", "profit/(loss) for the year", "profit after tax", "net profit", "profit/(loss) for the period"]`
   - `eps_basic`: `["earnings per share — basic", "basic earnings per share", "eps (basic)"]`
   - `total_assets`: `["total assets", "total equity and liabilities"]`
   - `net_worth`: `["total equity", "net worth", "shareholders' funds", "shareholders' equity"]`
   - `total_borrowings`: `["total borrowings", "borrowings (current + non-current)"]`
   - `cash_and_equivalents`: `["cash and cash equivalents", "cash and bank balances"]`
   - Matches are case-insensitive, whitespace-normalised, and require the label cell to *start with* one of the listed terms (substring matches anywhere in the row are too permissive).
8. **Numeric parsing**: strip `,`; treat `(value)` as `-value`; map `Nil` / `—` / `-` / blank / `n.a.` / `N.A.` to `null`. Reject if more than one numeric token in a cell (e.g. `"123 (4.5%)"` → flag low-confidence and keep the first number). Reject negative values where the line item semantically must be positive (revenue, total_assets, net_worth, cash_and_equivalents).
9. **Sanity checks** (post-extraction): revenue > 0; total_assets > 0; PAT may be negative (loss-making IPOs are real); cash_and_equivalents ≥ 0; periods ordered newest-to-oldest in the output. Failures → `manual_review_required: true` and a `warnings[]` entry, NOT silent rejection.
10. **Confidence scoring per line item**: `high` = label matched in dictionary + numeric parsed cleanly + period unambiguous + table confidence high; `medium` = any one mild caveat (e.g. unit inferred from context, not header); `low` = any one of: label-match required fuzzy edit-distance, numeric parse had to fall back to second token, period defaulted to low, table confidence was low, or sanity check failed.
11. **Manual review flag**: rolls up to top-level `manual_review_required: true` if ANY of:
    - `unit_detected.confidence == 'low'`, OR
    - any extracted period has `confidence == 'low'`, OR
    - any line-item has `confidence == 'low'`, OR
    - any required line item is missing (revenue, total_assets, pat, net_worth, total_borrowings), OR
    - sanity check failed on any value.

---

## 7. Architecture + Phase 5B implementation scope

### 7.1 Controlled exception (binding callout)

The Phase 5B planning request asked for a single normalizer script under `scripts/pdf/normalize/`. That assumes the existing `phase-0/pdf-extracts/<ipo_id>/financials.json` already contains body cells — but it does not (see §3.2). Phase 5B therefore extends `scripts/pdf/lib/pdf-financials.py` as a **controlled exception**: the extension is **strictly additive** (every existing key stays unchanged; only a new `tables_with_cells[]` top-level block is added), and the extension is the minimum necessary to give the normalizer real input. No other Python files are touched. No refactor. No rewrite of the existing feasibility logic.

### 7.2 Two-stage pipeline within the existing orchestrator

**Stage 1 — Python extension (`scripts/pdf/lib/pdf-financials.py`, additive only)**:
- Keep existing feasibility output unchanged (metadata-only `tables_detected[]` block).
- Add a NEW top-level block `tables_with_cells: [{ table_index, page, flavor, scope_hint, form_hint, page_text_window (≤ 1024 chars before/after the table), cells: [[...]] }]`.
- Only populate for tables with `confidence_signal ∈ {high, medium}` AND a heading match within the candidate-pages window (excludes random non-financial tables that happened to score medium).
- Bounded per the §8.1 HARD GATE caps.
- Reuse existing camelot lattice/stream + pdfplumber fallback chain. Re-extract from `source.pdf` already on disk.
- Bump `PARSER_VERSION` to `5B.0`.

**Stage 2 — Node normalizer (`scripts/pdf/normalize/financials.ts`, NEW)**:
- Reads `phase-0/pdf-extracts/<ipo_id>/financials.json` (the extended one from Stage 1).
- For each `tables_with_cells[]` entry:
  - Detect unit via `page_text_window` regex (§6 rule 1).
  - Detect periods via header row regex (§6 rule 2).
  - Walk body rows; map each label cell to a known key via §6 rule 7; parse numeric cells (§6 rule 8); validate (§6 rule 9).
- Apply duplicate-table preference (§6 rule 3), scope preference (§6 rule 4), restated preference (§6 rule 5), confidence preference (§6 rule 6).
- Roll up `manual_review_required` per §6 rule 11.
- Write `phase-0/pdf-extracts/<ipo_id>/normalized-financials.json` per §4 schema.
- Reuse `scripts/ingest/lib/safeWrite.ts:safeWriteJson` and `readJsonOrNull` (already used by Phase 5A.x code).

**Stage 3 — Orchestrator wiring (`scripts/pdf/run.ts`, small additive change)**:
- After the existing `runPythonExtractor('scripts/pdf/lib/pdf-financials.py', ...)` call, invoke the Node normalizer for the same `pdf2Selected.candidate.ipo_id`.
- Append a `normalization` block to `audit` (top-level) summarising what was normalized + path to the staging file.
- Bump orchestrator `PARSER_VERSION` to `5B.0`.

### 7.3 Files allowed to change in the Gate 2 implementation pass

| File | Change | Why |
|---|---|---|
| `scripts/pdf/lib/pdf-financials.py` | EXTEND — add `tables_with_cells[]` output (additive only; existing keys unchanged) | Stage 1 cell extraction |
| `scripts/pdf/normalize/financials.ts` | NEW | Stage 2 normalizer |
| `scripts/pdf/normalize/types.ts` | NEW | Normalizer type definitions |
| `scripts/pdf/run.ts` | EXTEND — call normalizer after feasibility extractor; add `normalization` audit block; bump `PARSER_VERSION` | Wiring |
| `scripts/pdf/lib/types.ts` | EXTEND — add optional `tables_with_cells?` to `FinancialsExtraction`; add `NormalizationAudit` types | Type alignment |
| `src/types/pdf-audit.ts` | EXTEND — mirror only what the audit's new `normalization` block needs (reference-only per §W.6.1) | Type mirror |
| `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json` | NEW (auto-generated) | Staging output |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | EXTEND (auto-generated) — `normalization` block; existing audit shape preserved | Audit surface |
| `phase-5B-status.md` | NEW (repo root) | Status report after CI run |

**Scope ceiling**: ONE IPO — OnEMI Technology Solutions. Even if other curated entries become available later in the same CI run (e.g. Bagmane or vegorama somehow getting fetched), the normalizer runs only for whichever single candidate `pdf2Selected` picked. Phase 5B does not scale to multi-IPO normalization in this pass.

---

## 8. What Phase 5B does NOT do (hard guardrails)

### 8.1 `tables_with_cells[]` cap — HARD GATE (binding, enforced at extractor boundary)

The cell-extraction extension MUST enforce, at the Python boundary, ALL of the following limits. Each limit is a hard gate — if the extractor would exceed any limit, it truncates and records a `warnings[]` entry; it does NOT emit unbounded data.

| Limit | Cap | Enforcement site |
|---|---|---|
| Max rows per table | **100** | per-table loop in `pdf-financials.py` |
| Max columns per table | **8** | per-row slice |
| Max chars per cell | **200** | per-cell truncation with `…` suffix |
| Max total cell payload per IPO | **200 KB** (200 000 bytes of serialised `tables_with_cells[]` JSON) | post-build check; if exceeded, the lowest-confidence table is dropped until under the cap; a `warnings[]` entry records each dropped table |
| Full-text dumps | **NONE** — no `*.full.txt`, no raw-text-of-the-PDF artifact, no page-text dumps beyond the existing ≤ 240 chars `raw_snippet` already in `candidate_pages[]` | CI binary-guard step in `pdf-parse.yml` already greps for `\.full\.txt$` |
| PDF binaries | **NONE** — `source.pdf` stays gitignored; no PDF binary committed | CI binary-guard step already greps for `\.pdf$` |

The cap is enforced by the **extractor**, not by post-hoc verification. The extractor must refuse to emit unbounded cell payloads even when a future iteration would want them — the security boundary is the cap itself.

### 8.2 Production-adjacent snapshot mutation policy (binding)

The ONLY snapshot in `src/data/snapshots/` that Phase 5B is allowed to write is `src/data/snapshots/ipo-pdf-extraction-audit.json`, and even that write is constrained to a NEW additive top-level `normalization` block. The audit JSON is the §W.6.1-sanctioned Phase 5A feasibility audit — NOT production financial data. The following 4 snapshots stay **untouched**:

| Snapshot | Untouched? |
|---|---|
| `src/data/snapshots/ipo-financials.json` | ✅ untouched — Phase 5B writes staging only; production promotion is a separate Phase 5B.1 gate |
| `src/data/snapshots/ipo-documents.json` | ✅ untouched |
| `src/data/snapshots/ipo-narrative.json` | ✅ untouched |
| `src/data/snapshots/ipo-source-audit.json` | ✅ untouched |

### 8.3 Additional hard guardrails

- **No `src/types/source.ts` extension** (Phase 5C closure binds — no `Chittorgarh` SourceTag, no `aggregator` DataState).
- **No UI changes** (`src/components/**`, `src/pages/**`, `src/lib/**` all untouched).
- **No `scripts/ingest/*` changes** (the ingest pipeline doesn't consume staging financials yet).
- **No new dependencies** beyond what's already installed (pdfplumber + camelot already in `requirements.txt`; no new Node packages).
- **No DB / Workers / cron / GMP production integration / LLM-based row inference.**
- **No multi-IPO scaling** in this pass.
- **No Chittorgarh field ingestion** — Phase 5C closure stands; `discovered_via` provenance label is the only Chittorgarh trace.
- **No PDF binaries or full-text dumps** committed (existing `pdf-parse.yml` PDF binary guard applies).
- **No new workflow file**; reuse `.github/workflows/pdf-parse.yml`.

---

## 9. Acceptance gate + implementation prompt

### 9.1 Acceptance gate (binding — applies to Gate 2 implementation pass)

Phase 5B implementation can be accepted only if ALL of the following hold post-CI:

1. ✅ The orchestrator runs end-to-end without crashing; `npm run pdf` exits 0.
2. ✅ `phase-0/pdf-extracts/curated_onemi-technology-solutions/financials.json` carries a `tables_with_cells[]` block with ≥ 1 entry (the page-71 high-confidence P&L at minimum).
3. ✅ `phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json` exists and validates against the §4 schema.
4. ✅ At least three of `revenue`, `pat`, `total_assets`, `net_worth`, `total_borrowings` extracted at `confidence: medium` or `high` for at least one period (operator-stated minimum bar: revenue / PAT / total_assets).
5. ✅ `unit_detected.value` and `unit_detected.confidence` populated (high or medium); `periods_detected[]` has ≥ 2 periods with `confidence: medium` or higher.
6. ✅ Every extracted value traces to a `source_page` + `source_table_index` + `raw_label`. No black-box numbers.
7. ✅ `src/data/snapshots/ipo-financials.json` unchanged (`git show <commit> --name-only | grep ipo-financials.json` → empty).
8. ✅ `src/data/snapshots/ipo-documents.json` unchanged.
9. ✅ `src/data/snapshots/ipo-narrative.json` unchanged.
10. ✅ `src/data/snapshots/ipo-source-audit.json` unchanged.
11. ✅ No PDF binaries or full-text dumps staged.
12. ✅ typecheck + build green; CI commit-back gates held.
13. ✅ §8.1 caps held (no `tables_with_cells[]` payload > 200 KB per IPO; per-table caps respected).
14. ✅ `phase-5B-status.md` records the run with per-line-item confidence, the `manual_review_required` rollup, and the operator-facing question: **approve promotion to production `ipo-financials.json` in a separate Phase 5B.1 pass, or hold for further normalization tuning?**

If gates 4–6 partially pass (e.g. only 2 of the 3 minimum line items reach medium/high), the call is **HOLD with selector tuning** — analogous to Phase 5C.3's calibration retry path, but for row-label dictionaries rather than table-row selectors.

### 9.2 Implementation prompt for the Gate 2 implementation pass

> Use this prompt verbatim when launching the Phase 5B Gate 2 execution pass. Implementation must not start until the operator explicitly approves this prompt as a separate, post-Gate-1 decision.

```
Phase 5B — financial-table normalization (one IPO; staging only; no production mutation).

In-scope file changes:
  - scripts/pdf/lib/pdf-financials.py (EXTEND — add tables_with_cells[] output additive
    to existing feasibility block; cap rows/cols/chars per §8.1; bump version → 5B.0)
  - scripts/pdf/normalize/financials.ts (NEW — Node normalizer)
  - scripts/pdf/normalize/types.ts (NEW — normalizer types)
  - scripts/pdf/run.ts (EXTEND — call normalizer after feasibility extractor; add
    normalization audit block; bump PARSER_VERSION → 5B.0)
  - scripts/pdf/lib/types.ts (EXTEND — FinancialsExtraction gets optional
    tables_with_cells?; add NormalizationAudit types)
  - src/types/pdf-audit.ts (EXTEND — mirror the audit's normalization block;
    reference-only per §W.6.1)
  - phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json
    (auto-generated by the new normalizer)
  - src/data/snapshots/ipo-pdf-extraction-audit.json (auto-refreshed; existing audit
    shape preserved; new top-level `normalization` block added)
  - phase-5B-status.md (NEW — written after the CI run with per-line-item evidence)

Out of scope (HARD — same guardrails as Phase 5A.4):
  - src/data/snapshots/ipo-financials.json (do NOT mutate — production stays untouched)
  - src/data/snapshots/ipo-documents.json (do NOT mutate)
  - src/data/snapshots/ipo-narrative.json (do NOT mutate)
  - src/data/snapshots/ipo-source-audit.json (do NOT mutate)
  - src/types/source.ts (do NOT extend — Phase 5C closure stands)
  - scripts/ingest/* (do NOT touch — ingest doesn't consume staging financials yet)
  - All UI files (src/components, src/pages, src/lib)
  - Workers, cron, DB, GMP production integration, LLM row inference
  - Chittorgarh field ingestion of any kind
  - New workflow files
  - Multi-IPO scaling (this pass normalizes OnEMI only)
  - New Node or Python dependencies

Behavior:
  - npm run pdf invokes the existing orchestrator. For the selected PDF #2 (OnEMI),
    the extended pdf-financials.py emits both the feasibility metadata AND a bounded
    tables_with_cells[] block for high/medium confidence tables (≤ 100 rows × 8 cols
    × 200 chars per cell each; ≤ 200 KB total per IPO).
  - The Node normalizer scripts/pdf/normalize/financials.ts reads the financials.json,
    detects unit/periods/scope/restatement, maps row labels via the §6 dictionary,
    parses numeric cells with paren-negative + comma + Nil/—/dash handling, applies
    duplicate/scope/restatement/confidence preferences, and writes the §4 schema
    to phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json.
  - The orchestrator records a top-level `normalization` block in
    src/data/snapshots/ipo-pdf-extraction-audit.json with: attempted_for, staging_path,
    line_items_extracted_high_confidence, line_items_extracted_medium_confidence,
    line_items_missing, manual_review_required, production_snapshot_mutated=false.
  - phase-5B-status.md records: per-line-item confidence + value, unit + periods
    detected, manual_review rollup, and the explicit operator question about
    promotion to production ipo-financials.json (separate Phase 5B.1 gate).

Hard guardrails:
  1. No mutation of src/data/snapshots/ipo-financials.json, ipo-documents.json,
     ipo-narrative.json, or ipo-source-audit.json.
  2. No PDF binaries or full-text dumps committed (existing CI guard applies).
  3. typecheck + build still pass.
  4. Stay on main; no feature branches.
  5. tables_with_cells[] payload capped per §8.1 — extractor refuses to emit
     unbounded data even when a future iteration would want it.
  6. phase-5B-financial-normalization-plan.md (this document) is the authoritative
     reference. Implementation must not expand scope beyond §7.3.
  7. Phase 5B normalizes OnEMI ONLY. Do not run the normalizer against vegorama
     or other curated entries even if they happen to be fetched.

Verification before push:
  - npm run typecheck
  - npm run build
  - npm run pdf
  - confirm phase-0/pdf-extracts/curated_onemi-technology-solutions/normalized-financials.json
    exists and validates against the §4 schema
  - confirm at least 3 of revenue/pat/total_assets/net_worth/total_borrowings reach
    medium-or-high confidence on at least one period
  - confirm no PDF binaries or full-text dumps staged
  - confirm src/data/snapshots/ipo-financials.json untouched
  - confirm src/data/snapshots/ipo-documents.json untouched
  - confirm src/data/snapshots/ipo-narrative.json untouched
  - confirm src/data/snapshots/ipo-source-audit.json untouched
  - confirm src/types/source.ts untouched
  - confirm scripts/ingest/* untouched
  - confirm §8.1 caps held (file size of tables_with_cells[] segment ≤ 200 KB)

After verification:
  - Commit + push to main.
  - STOP and ask the user to trigger pdf-parse.yml for CI validation.
  - Do NOT start Phase 5B.1 (production promotion to ipo-financials.json) without
    explicit further approval.
```
