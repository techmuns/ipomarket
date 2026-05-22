# Phase 5A.4 — Status Report (curated official PDF seed extension)

> **Mode**: sandbox-verified; awaiting CI run of `pdf-parse.yml` for full validation.
>
> **Date**: 2026-05-22
>
> **Plan reference**: `phase-5A.4-curated-official-pdf-seed-plan.md` (§7 implementation prompt followed verbatim).
>
> **Scope discipline**: no Chittorgarh ingestion; no aggregator field ingestion; no production snapshot mutation; no UI changes; no `src/types/source.ts` changes; no `scripts/ingest/*` changes; no DB / Workers / GMP / cron; Phase 5B remains gated; stayed on `main`.

---

## 1. What landed

### Data — curated seed extension

| File | Change |
|---|---|
| `phase-0/curated-official-pdfs.json` | Schema version bumped 5A.2 → 5A.4. Vegorama entry kept verbatim (per decision 3). Two new entries added with full additive metadata (decision 2): **Bagmane Prime Office REIT** (Final Offer Document, BSE-hosted) and **OnEMI Technology Solutions** (Red Herring Prospectus, BSE-hosted). Both carry `discovered_via: chittorgarh-p26-2026-05-22` as provenance only. |

### Production code — minimal loader extension

| File | Change |
|---|---|
| `scripts/pdf/lib/types.ts` | `CuratedOfficialPdfEntry` extended with 5 additive optional fields (decision 1): `company_name?`, `discovered_via?`, `discovered_at_utc?`, `curated_by?`, `allowed_for_parser?`. No rename of existing fields. No `src/types/pdf-audit.ts` mirror (curated seed isn't UI-surfaced). |
| `scripts/pdf/discover/curated-seed.ts` | `PARSER_VERSION` bumped 5A.2 → 5A.4. Loader now passes the 5 new optional fields through to the accepted entry verbatim. Operator-quarantine logic added: when `allowed_for_parser === false` (explicit boolean false), the entry is pushed to `rejected[]` with reason `"allowed_for_parser=false (operator-quarantined)"`. Missing / any other value defaults to allowed. No change to the host-allow-list security boundary or the existing required-field validation. |

### Status

| File | Change |
|---|---|
| `phase-5A.4-status.md` | **NEW** — this file. |

### Auto-generated artifacts (refreshed every `npm run pdf` invocation)

| File | Purpose |
|---|---|
| `phase-0/pdf-extracts/curated-official-pdfs.json` | Audit copy of loaded curated seed (accepted + rejected). Confirms all 3 entries loaded; 0 rejections. |
| `phase-0/pdf-extracts/index.json` | Refreshed Phase 5A index — now records `merged_counts.curated_seed: 2`. |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | Refreshed Phase 5A feasibility audit only — this is the §W.6.1-sanctioned audit surface, NOT a production financial snapshot. Carries the new `scanned[]` rows tagged `origin: curated-seed` for both BSE entries. |

### Files explicitly NOT touched (binding scope)

- `src/data/snapshots/ipo-documents.json` — untouched ✅
- `src/data/snapshots/ipo-financials.json` — untouched ✅ (Phase 5B remains gated per decision 4)
- `src/data/snapshots/ipo-narrative.json`, `ipo-source-audit.json` — untouched ✅
- `src/types/source.ts` — untouched ✅ (Phase 5C closure stands; no `Chittorgarh` SourceTag, no `aggregator` DataState)
- `scripts/ingest/*` — untouched ✅
- All UI files (`src/components/**`, `src/pages/**`, `src/lib/**`) — untouched ✅
- `.github/workflows/*` — untouched ✅
- `scripts/pdf/run.ts` — untouched ✅ (existing `buildUnifiedPdf2Pool` already merges curated seed; no orchestrator changes required)
- Chittorgarh probes `scripts/probes/P-25..P-26-*` — untouched ✅ (Phase 5C closure; they remain as characterization artifacts only)

---

## 2. Sandbox verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ green |
| `npm run build` | ✅ green |
| `npm run pdf` | ✅ exit 0; curated loader reports `accepted=3 rejected=0`; orchestrator merges 2 net new curated entries (vegorama deduplicated against `ipo-documents.json`) |
| PDF / full-text staging guard | ✅ no `*.pdf` / `*.full.txt` / `source.pdf` staged |
| `src/data/snapshots/ipo-documents.json` mutation guard | ✅ not in `git diff --cached --name-only` |
| `src/data/snapshots/ipo-financials.json` mutation guard | ✅ not in `git diff --cached --name-only` |
| `src/types/source.ts` guard | ✅ not in diff |
| `scripts/ingest/*` guard | ✅ not in diff |
| UI files guard (`src/components` / `src/pages` / `src/lib`) | ✅ not in diff |

### Sandbox candidate-pool composition

```
[pdf:curated] accepted=3 rejected=0
[pdf:run] unified PDF #2 pool: 3 candidate(s) (17 merged from discovery+curated, 20 DAPs rejected)
[pdf:run] merged_counts: sebi=15 bse_sme=0 bse_mainboard=0 curated=2
```

Scan order (sort: curated first, then doc-type preference, then URL):

| Rank | ipo_id | doc_type | origin | host | sandbox verdict |
|---|---|---|---|---|---|
| 1 | `curated_onemi-technology-solutions` | Red Herring Prospectus | curated-seed | `www.bseindia.com` | `fetch_failed` (sandbox 403; no egress) |
| 2 | `curated_bagmane-prime-office-reit` | Final Offer Document | curated-seed | `www.bseindia.com` | `fetch_failed` (sandbox 403; no egress) |
| 3 | `vegorama-punjabi-angithi` | Red Herring Prospectus | ipo-documents | `www.sebi.gov.in` | `fetch_failed` (consistent with prior 5A.1/5A.2 results) |

PDF #1 (InCred Holdings cover target) also fetch_failed in sandbox (expected — no SEBI egress). CI's real network will exercise all 4 fetches properly.

---

## 3. Acceptance gate evaluation (post-sandbox, pre-CI)

The plan's §6 acceptance gate requires CI evidence. Pre-CI, we can confirm:

| Gate | Pre-CI status | Will be evaluated in CI |
|---|---|---|
| 1. ≥ 1 curated PDF downloads from official host | **pending CI** (sandbox 403'd all; no egress) | yes |
| 2. Selected PDF `page_count ≥ 200` | **pending CI** | yes — recorded in `scanned[].page_count` |
| 3. Cover extraction `medium`/`high` confidence | **pending CI** | yes — recorded in `by_ipo[<ipo_id>].sections.cover.confidence` |
| 4. Financial-table candidate detection runs end-to-end | **pending CI** | yes — recorded in `by_ipo[<ipo_id>].sections.financials` (`candidate_pages` / `tables_detected` / `confidence`) |
| 5. No production-snapshot mutation | **MET ✅** (sandbox + commit guards both green) | re-verified in CI commit diff |
| 6. typecheck + build + CI guards green | **typecheck + build MET ✅** locally | CI re-verifies |

If gates 1–4 all pass in CI: **Phase 5A.4 closes successfully** and the Phase 5B viability call can be re-made with real evidence. If gate 1 fails for BOTH new BSE candidates, the call reverts to "still blocked" pending operator decision.

---

## 4. What CI will do differently

In CI (`pdf-parse.yml`, manual workflow_dispatch trigger):
1. Real network egress: OnEMI RHP and Bagmane Offer Document are both expected to be reachable on `www.bseindia.com` (the URLs were observed live as of 2026-05-22 03:06 UTC during the Phase 5C probe run).
2. Per the sort order above, OnEMI RHP is selected first. If its `page_count ≥ 200`, it becomes PDF #2 and the financials extractor runs.
3. If OnEMI fetch_fails (URL drift / BSE blocks GH Actions egress), Bagmane Offer Document is the next candidate. REIT Offer Documents are typically 200–500 pages — also expected to clear the page-count gate.
4. If both BSE fetches fail, vegorama RHP is the third try (consistent with Phase 5A.2 behavior — still expected to fetch_fail per prior runs).
5. The existing pdf-parse CI guards remain in force: PDF binary guard, typecheck, build, commit-back gated on `if: success()`.

---

## 5. Source-policy guardrails held

| Guardrail | Enforcement | Held? |
|---|---|---|
| Official NSE / BSE / SEBI is the production data backbone | All 3 curated entries point to allow-listed hosts (`www.bseindia.com` × 2, `www.sebi.gov.in` × 1) | ✅ |
| No Chittorgarh fields ingested | `discovered_via: chittorgarh-p26-2026-05-22` is provenance only — never used as a data source. Chittorgarh data is NOT in `phase-0/curated-official-pdfs.json` or any snapshot. | ✅ |
| No aggregator field ingestion | Phase 5C closure stands; no `Chittorgarh` SourceTag added; no `aggregator` DataState added; no aggregator data anywhere in the pipeline | ✅ |
| `allowed_for_parser` quarantine works | Loader skip-path implemented; explicit `false` → `rejected[]` with clear reason | ✅ (code path; not exercised this pass since both new entries are `allowed_for_parser: true`) |
| Host allow-list security boundary intact | No change to `CURATED_OFFICIAL_HOSTS` or to the loader's host check | ✅ |
| Phase 5B gated | No production `ipo-financials.json` write; no DRHP-to-snapshot normalization; financials extractor output stays in `phase-0/pdf-extracts/<ipo_id>/financials.json` side artifact only | ✅ |
| `ipo-documents.json` untouched | Verified via `git diff --cached --name-only` | ✅ |
| No PDF binaries / full-text dumps committed | Verified via `git diff --cached --name-only \| grep -Ei '\.pdf$\|\.full\.txt$'` → empty | ✅ |
| typecheck + build green | tsc --noEmit exited 0; Vite build exited 0 | ✅ |
| Shared SEBI helper untouched → P-08 not re-run | `scripts/probes/lib/sebi-pdf-extract.ts` not in diff | ✅ |

---

## 6. Operator next step

Per the user's directive, this status report is the handoff point. The next step is **to trigger `pdf-parse.yml`** manually (workflow_dispatch). After CI commits the regenerated audit, I will:

1. Pull `origin/main` and inspect `src/data/snapshots/ipo-pdf-extraction-audit.json` for:
   - `pdf_2_financial_target` (which curated entry was selected, if any)
   - `scanned[].verdict` per curated entry (`selected` / `too_short` / `fetch_failed`)
   - `by_ipo[<selected>].sections.financials` (cover + financials extractor outputs)
2. Re-evaluate the §6 acceptance gate items 1–4.
3. Report the **Phase 5B viability call** (`yes` / `hold` / `blocked`) — but Phase 5B work itself does NOT start without separate approval (decision 4).
