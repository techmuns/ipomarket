# Phase 5A — Status Report

> **Mode**: Gate A complete (scaffold validated in sandbox). Gate B pending.
>
> **Date**: 2026-05-21
>
> **Plan reference**: `phase-5-pdf-intelligence-plan.md` §8 + master plan §W (closure gates)

---

## 1. What landed

Code scaffold + workflow + audit JSON. All UI files untouched. Production data snapshots (`ipo-financials.json`, `ipo-narrative.json`, `ipo-documents.json`, `ipo-source-audit.json`) untouched.

### Files created

| Path | Purpose | LOC |
|---|---|---|
| `scripts/pdf/run.ts` | Node orchestrator (download SEBI PDFs → call Python extractors → write side artifacts + audit JSON) | ~440 |
| `scripts/pdf/lib/types.ts` | Node-side shared types (`PdfSliceResult`, `CandidatePoolMeta`, `CoverExtraction`, `FinancialsExtraction`, `IpoPdfAuditRow`, `IndexSummary`) | ~155 |
| `scripts/pdf/lib/http.ts` | Thin re-export of `httpGetBinary` from probes/lib | 5 |
| `scripts/pdf/lib/pdf-cover.py` | Cover-page extractor — `pdfplumber` text + regex anchors for 8 issue-terms fields; bounded `raw_snippet` <= 240 chars; per-field confidence | ~290 |
| `scripts/pdf/lib/pdf-financials.py` | Financial-table FEASIBILITY detector — heading scan + per-candidate `camelot` lattice/stream probe with `pdfplumber` fallback; returns `candidate_pages[]` + `tables_detected[]` + overall confidence | ~230 |
| `src/types/pdf-audit.ts` | Reference-only TS type for the audit JSON shape (per W.6.1: not imported by any UI file, not in a barrel, not in `loadSnapshots.ts`) | ~80 |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | Initial committed audit (sandbox `failed` state — see §3) | small |
| `phase-0/pdf-extracts/.gitkeep` | Empty placeholder for the side-artifact dir | — |
| `phase-0/pdf-extracts/index.json` | Initial summary (sandbox `failed` state) | small |
| `.github/workflows/pdf-parse.yml` | `workflow_dispatch`-only workflow; sets up Node 20 + Python 3.11 + pdfplumber/camelot; runs `npm run pdf` → `npm run typecheck` → `npm run build` → **PDF binary guard** → commit back | ~95 |
| `phase-5A-status.md` | This file | — |

### Files modified

- `package.json` — added `"pdf": "tsx scripts/pdf/run.ts"`.
- `.gitignore` — added `phase-0/pdf-extracts/**/*.pdf`, `**/source.pdf`, `**/*.txt`, `**/pagecount.json`.

### Files reused (no edit)

- `scripts/probes/lib/http.ts` — `httpGetBinary` for SEBI downloads.
- `scripts/probes/lib/pdf-parse.py` — kept untouched; the orchestrator reuses it for fast `page_count` reads on candidate scanning.
- `scripts/ingest/lib/safeWrite.ts` — `safeWriteJson` for atomic writes.
- `requirements.txt` — unchanged (`pdfplumber==0.11.4` + `camelot-py[cv]==0.11.0`).

---

## 2. PDF candidates selected

### PDF #1 — cover-page extraction target

- **IPO**: `incred-holdings`
- **URL**: `https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Incred%20Holdings%20Limited-Abridged%20prospectus_p.pdf`
- **Reason**: pinned per §8.2 — InCred Holdings Draft Abridged Prospectus is the only SEBI PDF with end-to-end P-09 validation on `main` (13 pages, 728 KB, `%PDF` magic, SHA-256 recorded).

### PDF #2 — financial-feasibility target

- **Selected**: **none** in sandbox.
- **`financial_table_candidate_unavailable`**: **true** (sandbox-only result, expected — see §3).
- **Reason**: all 6 non-InCred SEBI URLs returned HTTP 403 from this sandbox before `page_count >= 200` could be evaluated. None had a pre-recorded `page_count` in `ipo-documents.json`. The orchestrator correctly reports unavailability rather than forcing a weak extraction.
- **Candidates scanned in sandbox** (all 403'd from sandbox; all will be re-evaluated on the Gate B run):
  - `jindal-supreme-india`
  - `nfp-sampoorna-foods`
  - `online-instruments-india`
  - `playsimple-games`
  - `punjab-carbonic`
  - `vegorama-punjabi-angithi`

---

## 3. Sandbox run outcome (Gate A)

Sandbox host-allowlist blocks `www.sebi.gov.in` — every fetch returned HTTP 403 in 1–2ms. This is the expected outcome of the Gate A run per W.10.1 step 4. The orchestrator caught every failure as a classified error, never threw, and wrote a valid audit JSON.

Output excerpt (`src/data/snapshots/ipo-pdf-extraction-audit.json`):

```
candidate_pool.total_ipo_documents_with_sebi_url: 7
candidate_pool.pdf_1_cover_target.ipo_id:        "incred-holdings"
candidate_pool.pdf_2_financial_target:           null
candidate_pool.financial_table_candidate_unavailable: true
candidate_pool.scanned: 6 entries, all verdict="fetch_failed", page_count=null
by_ipo.incred-holdings.sections.cover.attempted:  false
by_ipo.incred-holdings.sections.cover.reason:     "download failed: HTTP 403"
source_meta.source_state:                         "failed"
source_meta.errors:                               2 entries
```

### Verification checklist (Gate A)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run build` | ✅ pass (1,891 kB JS / 62.95 kB CSS — unchanged from Phase 1 baseline) |
| `python3 -c "import pdfplumber; import camelot"` | ⚠️ pdfplumber import worked once `pip install -r requirements.txt` was run in sandbox; camelot import path is fine (workflow installs both freshly via `actions/setup-python` + `pip install`). No deps changed. |
| `npm run pdf` exit code | ✅ 0 (all 7 fetches 403'd → all caught → audit JSON written → exit 0) |
| Any `*.pdf` staged | ✅ none (no `source.pdf` files exist — downloads 403'd before `writeFileSync`; `.gitignore` covers them regardless) |
| Any full text dump staged | ✅ none |
| Audit JSON small & scannable | ✅ ~85 lines, ~2.7 KB |
| Production snapshots mutated | ✅ none (zero diff in `ipo-financials.json` / `ipo-narrative.json` / `ipo-documents.json` / `ipo-source-audit.json`) |
| UI imports of `pdf-audit` | ✅ zero (`grep -rn "pdf-audit" src/{components,pages,lib} → clean`); type is reference-only per W.6.1 |
| `src/lib/loadSnapshots.ts` touched | ✅ no |

---

## 4. What got extracted

Nothing. The sandbox 403s prevented any PDF from being downloaded, so neither `pdf-cover.py` nor `pdf-financials.py` was invoked. The audit JSON correctly reflects this with `attempted: false` on every section and explicit `download failed: HTTP 403` errors.

This is exactly what Gate A validates: the **scaffold** is correct, error paths are exercised, the audit JSON is well-formed, the workflow YAML is in place. Gate B (real-data run) is where extraction actually happens.

---

## 5. What failed

| Failure | Classified? | Effect |
|---|---|---|
| All 7 SEBI fetches returned HTTP 403 from sandbox | yes — expected upstream failure | audit row written; exit 0 |
| No production snapshot mutation | n/a — by design | n/a |
| Anything unclassified (TypeError, ReferenceError, etc.) | no — would fail workflow red | none observed |

---

## 6. Financial table candidate exists?

**Unknown after sandbox.** Sandbox SEBI 403 prevented evaluation. Of the 6 non-InCred SEBI URLs, none has `page_count` pre-recorded in `ipo-documents.json` — that field is only populated for InCred (validated by P-09 last run). The Gate B run will re-evaluate from CI / user's local machine where SEBI is reachable, and either:

- (a) Find at least one `page_count >= 200` URL and run the financials extractor → audit row will carry `candidate_pages[]` count + `tables_detected[]` count + confidence.
- (b) Confirm all 6 are abridged prospectuses (< 200 pages) and emit the canonical `financial_table_candidate_unavailable: true` verdict with explanation. In that case, Phase 5A.1 is needed — a candidate-discovery probe that fetches the full DRHP/RHP from a different SEBI path (e.g. `/filings/public-issues/` table → linked detail PDFs).

---

## 7. What was written to audit JSON

- `candidate_pool` — 7 IPOs scanned, PDF #1 pinned, PDF #2 unavailable, full scan trail.
- `by_ipo.incred-holdings` — single audit row showing the 403 + sections marked `attempted: false`.
- `source_meta.source_state: "failed"` + 2 classified errors.

Total: ~85 lines of JSON, ~2.7 KB. Easy to read in a PR diff.

---

## 8. Is Phase 5B worth doing?

**Decision deferred until Gate B.** The signal needed is `pdf_2.overall_confidence === 'high'` on a real SEBI fetch — or, at minimum, `'medium'` with reviewable `tables_detected[]` rows. Sandbox cannot answer this question; only the Gate B run can.

Three possible Gate B outcomes drive different Phase 5B decisions:

| Gate B outcome | Phase 5B verdict |
|---|---|
| `pdf_2_financial_target` found AND `overall_confidence: 'high'` AND `tables_detected[]` shows recognizable column headers (`Particulars`, `FY24`, `FY25`, etc.) | **YES** — proceed with Phase 5B (Objects of Issue + Promoter holding ingest bridge, then financial-statement normalization). |
| `pdf_2_financial_target` found BUT `overall_confidence: 'medium'` OR `tables_detected[]` shows extracted but unusable rows | **HOLD** — adjust extractor heuristics first (e.g. add more heading variants, tune lattice line-tolerance); re-run; only then decide. |
| `financial_table_candidate_unavailable: true` | **BLOCKED** — Phase 5A.1 candidate-discovery probe needed before Phase 5B can begin. Manual seed remains the path for top-N IPOs until SEBI yields a full RHP/DRHP URL. |

---

## 9. Gate B — required next steps (user action)

1. **Trigger the `pdf-parse` workflow** from the GitHub Actions UI on `main` (workflow_dispatch, no inputs).
2. The workflow will: install deps → run `npm run pdf` → run `npm run typecheck` → run `npm run build` → run the PDF binary guard → commit the refreshed audit JSON + side artifacts back to `main`.
3. Alternative: run `npm run pdf` locally on a machine where SEBI is reachable, then push the resulting JSON files to `main`.
4. After the commit-back lands, I will:
   - `git fetch && git pull`.
   - Read `src/data/snapshots/ipo-pdf-extraction-audit.json` + `phase-0/pdf-extracts/index.json` + per-IPO `cover.json` / `financials.json`.
   - Report Gate B verdicts per W.10.2.

**Do not declare Phase 5A complete until that report lands.** Sandbox 403 is enough to validate the scaffold, not the parser output.

---

## 10. Strict-scope confirmation

Phase 5A scaffold did NOT:

- Touch any UI component / page / route.
- Touch `ipo-financials.json` / `ipo-narrative.json` / `ipo-documents.json` / `ipo-source-audit.json`.
- Wire `pdf-audit.ts` into `loadSnapshots.ts`.
- Add cron / scheduled triggers.
- Add a database / KV / R2 / D1.
- Add Cloudflare Workers.
- Add GMP or any new ingestion source.
- Commit any PDF binaries.
- Commit any full text dumps.
- Call any external API / LLM / cloud parsing service.
- Leave `main`.
