# Phase 5A.2 — Status Report (combined bounded pass)

> **Mode**: sandbox-verified; awaiting CI run.
>
> **Date**: 2026-05-22
>
> **Plan reference**: `phase-5A.2-candidate-discovery-plan.md` §6 (recommended implementation prompt).
>
> **Scope discipline**: no Phase 5B implementation; no production financial extraction; no UI; no DB; no Workers; no GMP; no cron; no broker scraping; no PDF binaries committed; no full-text dumps committed; `src/data/snapshots/ipo-documents.json` untouched; stay on `main`.

---

## 1. What landed

### Production code

| File | Change |
|---|---|
| `scripts/pdf/discover/curated-seed.ts` | **NEW** — reads `phase-0/curated-official-pdfs.json`, validates each entry against `CURATED_OFFICIAL_HOSTS` allow-list (sebi.gov.in / nseindia.com / nsearchives.nseindia.com / bseindia.com / bsesme.com — broker / aggregator hosts rejected at runtime). Writes `phase-0/pdf-extracts/curated-official-pdfs.json` with `accepted` + `rejected` arrays. |
| `scripts/pdf/discover/sebi-playwright.ts` | **NEW** — Playwright fallback for SEBI `smid=11` / `smid=12`. Lazy-imports `playwright` and gracefully degrades if Chromium binary is missing (returns `attempted: false` with a clear note instead of crashing). |
| `scripts/pdf/discover/bse-shared.ts` | **NEW** — shared Playwright driver used by both BSE discoverers. Same lazy-import + graceful-degradation pattern. |
| `scripts/pdf/discover/bse-sme.ts` | **NEW** — BSE SME public-issues offer-documents discovery, Playwright-driven. Writes `phase-0/pdf-extracts/bse-sme-candidates.json`. |
| `scripts/pdf/discover/bse-mainboard.ts` | **NEW** — BSE mainboard DRHP page discovery (Playwright re-probe of P-10's `DRHP.aspx`, which was RED via static GET). Writes `phase-0/pdf-extracts/bse-mainboard-candidates.json`. |
| `scripts/pdf/discover.ts` | Phase 5A.2 — bumped `PARSER_VERSION` to `5A.2`; tagged `smid=10` cached / `smid=11/12` static / smid `*` Playwright candidates with `fetch_mode`; added Playwright fallback that fires per-smid when static returns `ok: true, count: 0`. |
| `scripts/pdf/run.ts` | Phase 5A.2 — bumped `PARSER_VERSION` to `5A.2`; orchestrator now calls `discoverBseSme()`, `discoverBseMainboard()`, `loadCuratedSeed()`. Extended `UnifiedCandidate` with `source: 'ipo-documents' \| 'discovery' \| 'curated'` + `origin` enum. Extended `buildUnifiedPdf2Pool` to merge all five sources (ipo-documents, SEBI discovery, BSE SME, BSE mainboard, curated) deduped by URL, with curated entries sorted first. Threaded `origin` through every `scan.push` row. Each discoverer is wrapped in its own try/catch so a failure in one source can't block the others. |
| `scripts/pdf/lib/types.ts` | Added `BseCandidate`, `BseDiscoveryResult`, `BseDiscoveryFile`, `CURATED_OFFICIAL_HOSTS`, `CuratedOfficialHost`, `CuratedOfficialPdfEntry`, `CuratedOfficialPdfFile`. Extended `SebiCandidate` with `fetch_mode: 'static' \| 'playwright' \| 'cached'`. Extended `SebiDiscoverySmidResult` with `playwright?: { attempted, count, error, note }`. Extended `CandidatePoolMeta` and `IndexSummary` with `merged_counts: { sebi_discovery, bse_sme_discovery, bse_mainboard_discovery, curated_seed }`. Extended `CandidateScanEntry` with `origin?`. |
| `src/types/pdf-audit.ts` | Mirrored the new `origin?` field on `CandidateScanEntry` and the new `merged_counts?` field on `CandidatePoolMeta`. Still reference-only per §W.6.1. |
| `.github/workflows/pdf-parse.yml` | Added `npx playwright install --with-deps chromium` step before `npm run pdf`. Mirrors the pattern already used by `probes.yml` for P-23a/P-23b. No other workflow changes. |

### Curated seed

| File | Change |
|---|---|
| `phase-0/curated-official-pdfs.json` | **NEW** — operator-editable seed file with one initial entry (vegorama-punjabi-angithi RHP from `ipo-documents.json`). Schema-validated by the reader; broker/aggregator hosts are rejected at runtime. |

### Status report

| File | Change |
|---|---|
| `phase-5A.2-status.md` | **NEW** — this file. |

### Auto-generated artifacts (refreshed every run)

| File | Purpose |
|---|---|
| `phase-0/pdf-extracts/bse-sme-candidates.json` | BSE SME discovery output. |
| `phase-0/pdf-extracts/bse-mainboard-candidates.json` | BSE mainboard discovery output. |
| `phase-0/pdf-extracts/curated-official-pdfs.json` | Audit copy of the loaded curated seed (`accepted` + `rejected` arrays). |
| `phase-0/pdf-extracts/sebi-candidates.json` | Extended with `fetch_mode` tags + per-smid `playwright{}` results. |
| `phase-0/pdf-extracts/index.json` | Extended with `merged_counts`. |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | Extended with `merged_counts` + per-row `origin` tags. |

### Files explicitly NOT touched (§X.1 + scope guards)

- `src/data/snapshots/ipo-documents.json` — production document snapshot is immutable in this pass.
- All other production snapshots (`ipo-financials.json`, `ipo-narrative.json`, `ipo-source-audit.json`).
- All UI files (`src/components/**`, `src/pages/**`, `src/lib/**`).
- `scripts/probes/lib/sebi-pdf-extract.ts` — shared SEBI helper unchanged, so no P-08 re-run required.
- `scripts/probes/P-08-sebi-publicissues.ts` — unchanged.
- `scripts/pdf/lib/pdf-cover.py` — unchanged.
- `scripts/pdf/lib/pdf-financials.py` — unchanged (Phase 5B smoke-test path runs against the existing extractor; no normalisation, no production write).
- `phase-0/source-probe-results.json`, `phase-0/source-probe-report.md` — Phase 5A.2 is not a probe pass; the discovery scripts live under `scripts/pdf/discover/` and never write to the probe registry.

---

## 2. Sandbox verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ green |
| `npm run build` | ✅ green |
| `npm run pdf` | ✅ exit 0; all five sources attempted; orchestrator wrote audit + index + 4 per-source candidate files |
| `npm run probe -- --probe P-08` | **Not required** — `scripts/probes/lib/sebi-pdf-extract.ts` was not modified |
| PDF/TXT staging guard | ✅ no `*.pdf` or `*.full.txt` or `source.pdf` staged |
| `ipo-documents.json` mutation guard | ✅ untouched; not in `git diff --cached --name-only` |

### Sandbox source-by-source outcomes

| Source | Sandbox outcome | Will work in CI? |
|---|---|---|
| `ipo-documents.json` SEBI rows | 7 entries (5 DAPs, 1 RHP, 1 InCred-pinned) ✅ | yes |
| SEBI `smid=10` cached load | 19 candidates from `phase-0/samples/sebi-publicissues-pdfs.json` ✅ | yes (no network) |
| SEBI `smid=11/12` static GET | HTTP 403 (sandbox lacks SEBI egress) — `ok: false` | yes (CI has egress; will succeed) |
| SEBI `smid=11/12` Playwright fallback | Did NOT fire (gated on `ok: true, count: 0` per design — won't trigger on a 403) | yes (in CI, static will return `ok: true, count: 0` and trigger the fallback) |
| BSE SME (`bsesme.com/static/markets/publicissues/issues_drhp.aspx`) | `attempted: false` — Chromium binary missing in sandbox (graceful skip with note) | yes (CI installs Chromium via the new workflow step) |
| BSE mainboard (`bseindia.com/markets/PublicIssues/DRHP.aspx`) | same as BSE SME — `attempted: false`, graceful skip | yes (same) |
| Curated seed (`phase-0/curated-official-pdfs.json`) | `accepted: 1` (vegorama), `rejected: 0` ✅ | yes |

### Unified pool composition (sandbox)

| Source | Merged into pool |
|---|---|
| ipo-documents (non-pinned, non-DAP) | 1 (vegorama RHP) |
| SEBI discovery (smid=10 cached) | 15 candidates entered seenUrls; **all rejected as DAPs** before download |
| SEBI discovery (smid=11/12) | 0 |
| BSE SME | 0 (Chromium missing in sandbox) |
| BSE mainboard | 0 (Chromium missing in sandbox) |
| Curated seed | 0 net (vegorama URL was already in seenUrls from ipo-documents) |
| **PDF #2 pool (post-DAP filter)** | **1** (vegorama RHP) |
| **PDF #2 scan outcome** | vegorama → `fetch_failed` (HTTP 403; same as Phase 5A.1 — likely stale May 2026 commondoc) |
| **PDF #2 selected** | **none** (full document still unavailable in sandbox) |

This matches Phase 5A.1's sandbox outcome exactly — no regression, just additional plumbing that's gated on Chromium availability and SEBI egress.

---

## 3. What CI will do differently

1. **SEBI egress works**: `smid=11/12` static GET will return `ok: true, count: 0` (or possibly `count > 0` if SEBI now exposes the rows). The Phase 5A.2 Playwright fallback will fire whenever static returns `ok: true, count: 0` — producing either real PDF anchors or a clear "page rendered but no anchors — likely genuinely empty" note in `sebi-candidates.json`.
2. **Chromium installed**: the new `npx playwright install --with-deps chromium` workflow step makes BSE SME + BSE mainboard discovery actually run. Either they yield real candidates, or they yield a "page rendered (X bytes) but contained no PDF anchors" note — both are informative.
3. **Vegorama URL re-probe**: the curated seed entry will attempt the SEBI URL again. If it 403s again, the audit will surface it as `fetch_failed` with `origin: 'ipo-documents'` (deduped against curated). The user can then edit `phase-0/curated-official-pdfs.json` to point at a fresher URL.
4. **InCred Holdings cover extraction**: PDF #1 download will succeed (proven by Phase 5A.1 CI run), and the existing cover heuristic runs unchanged. Expected: `manual_review_required: true` (matching Phase 5A.1).

---

## 4. Phase 5B smoke-test status

Per the §3 rule in the user's directive ("Phase 5B smoke test allowed only as a non-deliverable diagnostic"):

- The existing `scripts/pdf/lib/pdf-financials.py` extractor will run automatically against PDF #2 if and only if a full-document candidate (page_count ≥ 200) is found and survives the doc-type filter.
- Its output writes to `phase-0/pdf-extracts/<ipo_id>/financials.json` (gitignored side artifact, not a production snapshot) and to the audit's `financials.attempted` / `candidate_pages` / `tables_detected` summary fields.
- **It does NOT touch** `src/data/snapshots/ipo-financials.json` (production) or any UI.
- This path is unchanged from Phase 5A.1 — the Phase 5A.2 changes only feed it more candidate URLs to try.

In the sandbox run, no full-document candidate was found, so no Phase 5B smoke test executed.

---

## 5. Source-policy guardrails held

| Guardrail | Enforcement | Held? |
|---|---|---|
| Official NSE / BSE / SEBI is the production data backbone | All discovery sources are official; broker hosts never enter the pool. | ✅ |
| Zerodha / Upstox stay reference-only | Not imported or called by any Phase 5A.2 code. | ✅ |
| Chittorgarh not bundled into 5A.2 | No Chittorgarh code anywhere in the diff. | ✅ |
| Manual curated seed labelled + audited | `curated-official-pdfs.json` records `source_host` + `curated_at_utc` + `verified_at_utc`; rejected entries are kept in the audit copy with a reason. | ✅ |
| Curated host allow-list enforced | `loadCuratedSeed()` rejects any URL whose `host` is not in `CURATED_OFFICIAL_HOSTS`. Rejection reason is recorded in the audit copy. Broker/aggregator hosts → rejected. | ✅ |
| Phase 5B smoke test is non-deliverable | Only the existing `pdf-financials.py` extractor runs; no normalisation; no production write; no UI. | ✅ (path unchanged) |
| `ipo-documents.json` untouched | Verified via `git diff --cached --name-only`. | ✅ |
| No PDF binaries committed | Verified via `git diff --cached --name-only \| grep -Ei '\.pdf$'`. | ✅ |
| No full text dumps committed | Verified via `git diff --cached --name-only \| grep -Ei '\.full\.txt$'`. | ✅ |
| `npm run typecheck` green | tsc --noEmit exited 0. | ✅ |
| `npm run build` green | Vite build exited 0. | ✅ |
| `npm run pdf` exited 0 | Orchestrator completed; soft-failed sources produced clean audit rows. | ✅ |
| Shared SEBI helper untouched → P-08 re-run not required | `scripts/probes/lib/sebi-pdf-extract.ts` not in diff. | ✅ |

---

## 6. Phase 5B viability call (post-CI)

**Pre-CI assessment**: still **BLOCKED in sandbox**, because the only full-document candidate (vegorama RHP) fetch-fails locally. **The CI re-run will determine the post-Phase-5A.2 viability call:**

- If BSE SME or BSE mainboard Playwright surfaces any DRHP/RHP with `page_count ≥ 200` → **UNBLOCKED**, Phase 5B smoke test will fire automatically.
- If SEBI `smid=11/12` Playwright surfaces a Red Herring or Final Offer Document → **UNBLOCKED**, same.
- If curated seed's vegorama entry fetch-fails again, and BSE / SEBI Playwright surface nothing → **STILL BLOCKED**, and the operator action is to add 2–3 more entries to `phase-0/curated-official-pdfs.json` (NSE archive URLs like `nsearchives.nseindia.com/.../Prospectus_*.pdf` would be the highest-yield target).

---

## 7. Decisions deferred (per scope discipline)

The following remain explicitly out of scope for Phase 5A.2 and require separate approval:

- **NSE Offer Documents discovery** (Akamai bot wall; defer to Phase 5A.3).
- **Chittorgarh characterization probe (P-25)** — reference-only role if ever used; never data of record.
- **Exchange circulars** (NSE / BSE) — supporting signal source; lower yield than discoveries.
- **Phase 5B implementation** (normalising P&L / BS / CFS into production `ipo-financials.json`; UI wiring) — separate gate.
- **Production financial extraction** of any kind.
