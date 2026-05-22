# Phase 5B.2 — OnEMI Cover Extraction & Issue-Term Enrichment Plan (planning only)

> **Mode**: planning. No code edits. No snapshot mutations. No PDF download. No new extractor or promoter created. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §10 implementation prompt below.
>
> **Date**: 2026-05-22
>
> **Predecessors**: `phase-5BX-onemi-master-linkage-plan.md` (Phase 5B.X Gate 1), `phase-5BX-status.md` (Phase 5B.X Gate 2 acceptance at commit `10a7ff5`), `phase-5BX-route-status.md` (post-Gate-2 route diagnostic at `06e6c2e`), `phase-5B1-production-promotion-plan.md` + `phase-5B1-status.md` (Phase 5B.1), `phase-5B-financial-normalization-plan.md` + `phase-5B-status.md` (Phase 5B), `phase-5A.4-curated-official-pdf-seed-plan.md` (curated seed), master plan §CC.
>
> **Trigger**: Phase 5B.X closed accepted. The OnEMI master row carries 13 explicit-null fields; the OnEMI documents row carries `registrar: null` + `brlms: []`. The operator approved Phase 5B.X follow-up question (i) — Phase 5B.2 cover-extraction-for-OnEMI to populate issue-term fields + `registrar` / `brlms`.
>
> **Scope discipline (binding)**:
> - **OnEMI only** in this implementation.
> - Extract only cover / issue-term fields from the curated, source-backed BSE-hosted OnEMI RHP via the existing `scripts/pdf/lib/pdf-cover.py` extractor (untouched).
> - Promote **only HIGH or MEDIUM-confidence values** into the OnEMI rows of `src/data/snapshots/ipo-master.json` and `src/data/snapshots/ipo-documents.json`.
> - **DO NOT** mutate `ipo-financials.json`, `ipo-narrative.json`, or `ipo-source-audit.json`.
> - **DO NOT** mutate the 10 existing entries in `ipo-master.json` or `ipo-documents.json`.
> - **DO NOT** mutate `timelines[]` or `source_meta` in `ipo-master.json`.
> - No UI / type / workflow / ingest changes. No DB / Workers / cron / GMP. No Chittorgarh / Trendlyne / Zerodha / Upstox / broker scraping. No LLM inference. No PDF binaries or full-text dumps committed.
> - Missing/unverified fields remain explicit `null`.
> - Stay on `main`.
>
> **Two-gate execution**: Gate 1 = this planning doc only (no code). Gate 2 = the implementation pass described in §10, requires separate explicit operator approval.

---

## 1. Objective

Extract OnEMI's cover-page issue terms from the **curated, source-backed BSE-hosted OnEMI RHP** (already curated at `phase-0/curated-official-pdfs.json` with `allowed_for_parser: true`) using the existing `pdf-cover.py` extractor. Promote **only HIGH and MEDIUM-confidence values** into the existing OnEMI rows of `ipo-master.json` and `ipo-documents.json`. Leave every field the cover does NOT surface as explicit `null`. **No fake values. No broad PDF intelligence. No financial selector tuning.**

OnEMI-only scope. The Phase 5B.X four-tier classification (`verified` / `inferred` / `conservative default` / `unknown/null`) is updated at the end of the pass — fields the cover extracts at HIGH/MEDIUM move from `unknown/null` to `verified`; everything else stays where it is.

---

## 2. Source inputs

The Gate 2 pass reads (in order):

1. **`phase-0/curated-official-pdfs.json`** — fetch the OnEMI entry by `ipo_id === 'onemi-technology-solutions'`. Pull `doc_url`, `source_host`, `doc_kind`. Confirm `allowed_for_parser: true`. This is the canonical URL/metadata source.
2. **`src/data/snapshots/ipo-pdf-extraction-audit.json`** — read the `by_ipo['curated_onemi-technology-solutions']` row. Pull `pdf_sha256` (`4668b4e22fde35670ccc8405e185a0fe4cd532f84597eed339265c00a84de22f`) for download-validation; pull `doc_url` as a cross-check against item 1. Confirm `sections.financials.attempted: true` (Phase 5B precondition).
3. **`src/data/snapshots/ipo-documents.json`** — read the OnEMI documents row to confirm `state: 'live'`, `docs[0].url` matches item 1's `doc_url`, and `registrar: null` + `brlms: []` (pre-flight idempotency: refuse to re-run if these are already non-null).
4. **`src/data/snapshots/ipo-master.json`** — read the OnEMI master row to confirm sparse-row shape (pre-flight idempotency: refuse to re-run if `price_band` is already populated).

The PDF itself is downloaded fresh at Gate 2 to a **gitignored temp path** (`phase-0/pdf-extracts/curated_onemi-technology-solutions/source.pdf` — already covered by the `.gitignore` rules added in Phase 5A). The download is verified against:
- `%PDF` magic bytes
- SHA-256 must match the audit row's `pdf_sha256`
- page count > 5

If any verification fails, **HALT** and do not write anything.

If the cover.json side artifact already exists for OnEMI when Gate 2 runs (e.g. a previous Gate 2 attempt left it), the run reuses the existing cover.json and skips the download/extract — promoter pass still applies.

---

## 3. Fields to extract / enrich

### 3.1 `ipo-master.json` (existing OnEMI row)

| Field | Cover extractor supports? | Phase 5B.2 plans to populate when… |
|---|---|---|
| `price_band: { low, high }` | ✅ yes (`price_band` field) | extracted at HIGH or MEDIUM confidence |
| `issue_size_cr` | ✅ yes (`issue_size_cr` field, in crores; extractor auto-divides lakhs by 100) | extracted at HIGH or MEDIUM |
| `lot_size` | ✅ yes (`lot_size` field) | extracted at HIGH or MEDIUM **and explicitly present** on the cover (per operator brief: "lot_size only if explicitly present") |
| `face_value` | ✅ yes (`face_value` field) | extracted at HIGH or MEDIUM |
| `fresh_cr` | ❌ extractor does NOT extract the fresh/OFS split | stays `null` (defer to a future pass) |
| `ofs_cr` | ❌ same as above | stays `null` |
| `open_date` / `close_date` / `listing_date` | ❌ cover extractor has no date-anchor regex | stays `null` (defer to a future pass that adds a dates-only extractor) |
| `sector` | ❌ cover has no SEBI/NSE sector classification | stays `null` |
| `status` | derived from dates (which stay null) | stays `'upcoming'` (conservative default preserved) |
| `state` | per-row tag, not per-field | stays `'manual'` (the row is enriched but still mixed; we keep `'manual'` until the master row has source-backed dates + sector — that's the threshold at which a future pass can re-tag, separately approved) |
| `reservation` | ❌ cover doesn't reliably surface QIB/NII/Retail/Emp splits | stays `null` |
| `tagline` | ❌ free-form, not a cover anchor | stays `null` |
| `nse_symbol` | ❌ OnEMI listed on BSE only | stays `null` |

### 3.2 `ipo-documents.json` (existing OnEMI row)

| Field | Cover extractor supports? | Phase 5B.2 plans to populate when… |
|---|---|---|
| `registrar: { name, portal_url }` | ✅ yes (`registrar` field; extractor returns the firm name) | extracted at HIGH or MEDIUM; `portal_url` stays `null` (cover doesn't link the registrar's allotment-status portal). The portal_url is a separate follow-up action |
| `brlms[]` | ✅ yes (`brlms` field; extractor returns up to 5 firm names) | extracted at HIGH or MEDIUM; the existing `[]` is replaced with the new array |
| `docs[]` | NOT touched by Phase 5B.2 | the single RHP entry remains byte-identical |
| `docs[].bytes`, `docs[].page_count` | optional fields in the type; the cover extractor's download step naturally surfaces both | populated as a cheap side-effect if and only if the cover extraction proceeded (HIGH/MEDIUM confidence threshold does NOT gate these — file size + page count are mechanical reads, not inferences) |
| `docs[].fetched_at_utc` | NOT touched (Phase 5B.1 set it; we leave it) | unchanged |

### 3.3 Cross-validation (logged but not written to production)

The cover extractor also returns `company_name` and `document_type`. These match the values already in the OnEMI rows (`OnEMI Technology Solutions` / `RHP`). They are logged in the status doc as cross-validation evidence — **not** written to either production snapshot (no schema field for them).

### 3.4 Do NOT touch

- `ipo-financials.json` (Phase 5B values are final).
- `ipo-narrative.json` (no cover anchor surfaces narrative content; narrative remains a Phase 5C / 5D scope decision).
- `ipo-source-audit.json` — **leave untouched**. Phase 5B.X / 5B.1 / Phase 5B all chose not to mutate this (per-field provenance shape doesn't fit financial-period / issue-term audit). The Phase 5B.2 audit trail lives in `ipo-pdf-extraction-audit.json` only.
- UI files (`src/components/**`, `src/pages/**`, `src/lib/**`).
- Workflows (`.github/workflows/*`).
- Ingest pipeline (`scripts/ingest/*`).
- Type files (`src/types/source.ts`, `src/types/ipo.ts`, `src/types/snapshot.ts`).

---

## 4. Schema compatibility

All fields proposed for enrichment are **already present and nullable** in the current types:

- `Ipo.price_band: PriceBand | null` (`PriceBand = { low: number; high: number }`) — `src/types/ipo.ts:13-16, 36`
- `Ipo.issue_size_cr: number | null` — `src/types/ipo.ts:38`
- `Ipo.lot_size: number | null` — `src/types/ipo.ts:37`
- `Ipo.face_value: number | null` — `src/types/ipo.ts:41`
- `IpoDocuments.registrar: { name: string; portal_url: string | null } | null` — `src/types/ipo.ts:143`
- `IpoDocuments.brlms: string[]` — `src/types/ipo.ts:144`
- `IpoDocument.bytes?: number`, `IpoDocument.page_count?: number` — `src/types/ipo.ts:135-136` (optional, additive)

**No type extension required**. The plan does NOT propose any change to `src/types/ipo.ts` / `src/types/snapshot.ts` / `src/types/source.ts`. If extraction during Gate 2 reveals a field the current schema cannot represent without changes, the recommendation is to **leave that field out** and surface it in the status doc as a manual-curation candidate — NOT to extend types in this pass.

---

## 5. Extraction method

**Deterministic, label-anchored, no LLM, no aggregator, no broker page**. The pass reuses `scripts/pdf/lib/pdf-cover.py` unchanged.

Architecture:

```
scripts/pdf/extract/
└── onemi-cover.ts          # NEW — OnEMI-only mini-orchestrator (≤ 200 LOC).
                            # Reads curated seed entry; downloads PDF to
                            # gitignored temp path; verifies %PDF magic + SHA-256
                            # + page count > 5; invokes pdf-cover.py via
                            # child_process; writes cover.json side artifact;
                            # appends `cover` section data to the existing
                            # ipo-pdf-extraction-audit.json `by_ipo` row for
                            # curated_onemi-technology-solutions (string-surgery
                            # update of one nested key — does NOT reflow the file).

scripts/pdf/promote/
└── onemi-issue-terms.ts    # NEW — OnEMI-only promoter (≤ 250 LOC).
                            # Reads the cover.json side artifact; preflight:
                            # cover must exist + manual_review_required must be
                            # false + each candidate field must be HIGH or
                            # MEDIUM. Splices accepted values into the OnEMI
                            # rows in ipo-master.json + ipo-documents.json via
                            # the same string-surgery pattern as Phase 5B.X.
                            # Atomic .tmp + rename. Refuses double-insert.
```

The extractor (`pdf-cover.py`) is **untouched**. The extractor's natural cover-page scope (anchors hit on pages 1-3 of a typical RHP) honors the operator's "first 5 pages maximum" guardrail. If a future need arises to add a `--max-pages` CLI flag, that's a separately-approved tweak — not in Phase 5B.2.

Provenance per populated value:

| Field | Provenance written to status doc |
|---|---|
| Every populated value | `source_pdf_url` (the BSE OnEMI RHP URL), `source_pdf_sha256` (`4668b4e2…`), `source_page` (from `cover.json.fields[<key>].page`), `raw_snippet` (≤ 240 chars surrounding the matched anchor, from `cover.json.raw_snippet` or a per-field snippet in the audit row), `confidence` (`high` / `medium`), `manual_review_required` (rolled up from per-field flags) |

Provenance is recorded in TWO places:
- `phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json` (the committed side artifact)
- The `cover` sub-block of the `by_ipo['curated_onemi-technology-solutions']` row in `ipo-pdf-extraction-audit.json` (additive update; same row Phase 5B already populated for `sections.financials`)

Production snapshots (`ipo-master.json`, `ipo-documents.json`) carry the values themselves; the provenance trail lives in the audit + side artifact. This matches the Phase 5B.1 / 5B.X precedent.

---

## 6. Confidence rules

| Tier | Definition | Phase 5B.2 action |
|---|---|---|
| **HIGH** | Cover-page anchor matched exactly (e.g. literal "Price Band" label) AND the regex captured a clean numeric/text value AND the value passes a per-field sanity check (issue_size_cr > 0, price_band.high > price_band.low > 0, lot_size > 0, face_value in [1, 100], registrar string ≥ 5 chars, brlms list 1–5 firms) | **Promote** to production snapshot |
| **MEDIUM** | Anchor matched in a nearby section (page 2-3, not the strict cover) OR the regex required a fallback heuristic but the value still passed sanity AND the field's `confidence` from `pdf-cover.py` is `medium` | **Promote** to production snapshot |
| **LOW** | Anchor matched but the captured value is ambiguous (multiple candidates), conflicting (header-row blocklist rejection still left ambiguity), or fails the sanity bound | **Do NOT promote**. Field stays `null`. Status doc lists the field as a manual-review candidate with the raw_snippet excerpted |
| **NONE** | The cover anchor was not found at all | **Do NOT promote**. Field stays `null`. Status doc reports the anchor as missing |

The `pdf-cover.py` extractor already returns `confidence: 'high' | 'medium' | 'low'` per field. The promoter consumes that tier verbatim — no re-scoring. Only HIGH and MEDIUM promote.

Per-row rollup: `manual_review_required` at the top of `cover.json` MUST be `false` for the promoter to proceed. If `true`, the promoter HALTs and writes nothing; the status doc lists the manual-review reason.

---

## 7. Safe merge rules

Binding for every Gate 2 write:

1. **Read existing snapshots first** via `readJsonOrNull` (existing helper at `scripts/ingest/lib/safeWrite.ts:15-22`). Missing or malformed file → HALT.
2. **Update only the OnEMI rows**. The 10 existing IPO entries in both snapshots remain byte-identical (JSON-semantic, verified by `json.dumps(sort_keys=True)` equality).
3. **Per-field merge**: populate a target field only if currently `null` (master) or `null`/`[]` (documents). If a field already carries a non-null production value, do NOT overwrite — instead, log the conflict in the status doc and exit non-zero. This makes the promoter explicitly idempotent + non-clobbering.
4. **Missing/unverified fields remain `null`**. No defaults synthesised, no empty objects substituted.
5. **Atomic writes**: `.tmp` + `rename` via the same pattern as `scripts/pdf/promote/onemi.ts` and `onemi-master.ts`.
6. **String-surgery splice** (no JSON reflow): the existing 10 IPO rows in both snapshots are preserved character-for-character; only the OnEMI row's targeted keys are mutated, and only the top-level `generated_at_utc` is bumped.
7. **Idempotent**: running the promoter twice in succession produces byte-identical output (modulo `generated_at_utc`). The pre-flight existing-value check + the cover-side-artifact reuse path together guarantee this.
8. **No PDF binaries committed**. The downloaded `source.pdf` is gitignored.
9. **No full-text dumps committed**. The `raw_snippet` in `cover.json` is capped at ≤ 240 chars per the extractor's existing limit; the audit row carries the same bounded snippet.
10. **CI guardrail**: the existing `pdf-parse.yml` workflow's `*.pdf` and `*.full.txt` staged-file check applies if/when this code is run via that workflow — but **Phase 5B.2 does NOT touch workflows**; Gate 2 invokes the extractor + promoter locally only.

---

## 8. Guardrails (binding)

### 8.1 Phase 5B.2 must NOT

- Parse any IPO other than OnEMI.
- Tune the financial extractor or its label dictionary.
- Extract EPS, total_borrowings, cash_and_equivalents, or any non-cover financial line item.
- Extract narrative content (strengths, risks, objectives, company_overview).
- Add UI components, pages, or library helpers (`src/components/**`, `src/pages/**`, `src/lib/**`).
- Add DB / Workers / cron / GMP production integration.
- Touch workflows (`.github/workflows/*`).
- Touch the ingest pipeline (`scripts/ingest/*`).
- Touch `src/types/source.ts` (Phase 5C closure binds).
- Touch `src/types/ipo.ts` / `src/types/snapshot.ts` (no new fields; no field renames).
- Scrape Chittorgarh / Trendlyne / Zerodha / Upstox / any broker / aggregator page.
- Use LLM inference of any kind.
- Commit PDF binaries or full-text dumps.
- Fake any issue term (synthetic dates, fabricated registrar, guessed BRLMs).
- Mutate `ipo-financials.json`, `ipo-narrative.json`, or `ipo-source-audit.json`.
- Mutate the existing 10 IPO entries in `ipo-master.json` or `ipo-documents.json`.
- Mutate `timelines[]` or `source_meta` in `ipo-master.json`.
- Promote any field at LOW confidence.

### 8.2 Phase 5B.2 IS allowed to

- Create `scripts/pdf/extract/onemi-cover.ts` (NEW; OnEMI-only).
- Create `scripts/pdf/promote/onemi-issue-terms.ts` (NEW; OnEMI-only).
- Create `phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json` (NEW side artifact).
- Update the existing `by_ipo['curated_onemi-technology-solutions']` row in `src/data/snapshots/ipo-pdf-extraction-audit.json` with a populated `sections.cover` sub-block (Phase 5B already wrote the row's structure; we're filling the `cover` block that currently reads `attempted: false, reason: "PDF #2 is financial feasibility target only"`).
- Add up to four key updates to the OnEMI row in `src/data/snapshots/ipo-master.json` (`price_band`, `issue_size_cr`, `lot_size`, `face_value`), conditional on HIGH/MEDIUM confidence per field.
- Add up to three key updates to the OnEMI row in `src/data/snapshots/ipo-documents.json` (`registrar`, `brlms`, optionally `docs[0].bytes` + `docs[0].page_count`), conditional on HIGH/MEDIUM confidence per field for `registrar` / `brlms`.
- Bump top-level `generated_at_utc` on both mutated snapshots.
- Write `phase-5B2-status.md` (NEW; end-of-pass status report).

---

## 9. Acceptance gate

Phase 5B.2 implementation can be accepted only if ALL hold post-implementation:

1. ✅ OnEMI cover.json exists at `phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json`, validates against the InCred cover.json shape model, has `manual_review_required: false`.
2. ✅ The audit row's `sections.cover` block under `by_ipo['curated_onemi-technology-solutions']` is now populated (`attempted: true`, `confidence`, `anchors_matched/total`, `errors: []`).
3. ✅ Every populated field in the OnEMI rows of `ipo-master.json` and `ipo-documents.json` traces to a `source_page` + `raw_snippet` + `confidence: 'high' | 'medium'` in `cover.json` (no LOW promotions; no values without provenance).
4. ✅ Missing fields remain explicit `null` (not omitted, not `undefined`, not faked). Specifically: `fresh_cr`, `ofs_cr`, `open_date`, `close_date`, `listing_date`, `sector`, `reservation`, `tagline`, `nse_symbol` stay `null` in the master row; `docs[0].fetched_at_utc` stays as Phase 5B.1 set it.
5. ✅ The 10 existing IPO rows in `ipo-master.json` JSON-semantically unchanged (`json.dumps(sort_keys=True)` equality).
6. ✅ The 10 non-OnEMI IPO rows in `ipo-documents.json` JSON-semantically unchanged.
7. ✅ `ipo-financials.json` byte-identical pre/post.
8. ✅ `ipo-narrative.json` byte-identical pre/post.
9. ✅ `ipo-source-audit.json` byte-identical pre/post.
10. ✅ `src/types/source.ts` / `src/types/ipo.ts` / `src/types/snapshot.ts` byte-identical pre/post.
11. ✅ `scripts/ingest/*` byte-identical pre/post.
12. ✅ `src/components/**`, `src/pages/**`, `src/lib/**` byte-identical pre/post.
13. ✅ `.github/workflows/*` byte-identical pre/post.
14. ✅ No PDF binaries or full-text dumps staged. `source.pdf` covered by existing `.gitignore` rules.
15. ✅ `npm run typecheck` green.
16. ✅ `npm run build` green.
17. ✅ Lightweight render check: `/ipo/onemi-technology-solutions` still renders cleanly (0 page errors, 0 console errors) — the existing null-tolerant `IpoDetail` children naturally handle the new non-null values; the IssueTermsGrid + RegistrarBrlmCard now show real data where previously they showed em-dashes / "not yet identified".
18. ✅ `phase-5B2-status.md` exists and records: (a) the OnEMI cover.json field-by-field outcome (anchors_matched/total, per-field value + confidence + page + raw_snippet), (b) the production-side delta (which fields moved from `null` to a value, which stayed `null` with reason), (c) the **updated §3.3 four-tier classification** reflecting **only the fields actually promoted at HIGH/MEDIUM confidence**. The status doc must NOT hard-code the post-promotion count. Use parameterized language:
    - "verified count moves from 4 to 4 + `<number_of_promoted_fields>`"
    - "unknown/null count decreases only by `<number_of_promoted_fields>`"
    - "inferred + conservative default counts unchanged"
    - "if a candidate field (`price_band` / `issue_size_cr` / `lot_size` / `face_value` / `registrar` / `brlms`) remains `null` due to LOW confidence, ambiguity, missing anchor, or extraction failure, it stays in `unknown/null` and the reason is listed verbatim from the cover.json field's `confidence`, `errors`, or absent-anchor signal."

    The actual post-run counts are computed from the cover.json output at status-doc-write time. They are NOT predicted in this plan and they are NOT pre-baked into the implementation prompt.

---

## 10. Implementation prompt for the Phase 5B.2 Gate 2 pass

> Use this prompt verbatim when launching the Phase 5B.2 Gate 2 execution pass. Implementation must not start until the operator explicitly approves this prompt as a separate, post-Gate-1 decision.

```
Phase 5B.2 — OnEMI cover extraction + issue-term enrichment (cover.json
side artifact + promoter into ipo-master.json + ipo-documents.json).

In-scope file changes:
  - scripts/pdf/extract/onemi-cover.ts (NEW; OnEMI-only mini-orchestrator
    that reads the curated seed entry, downloads OnEMI's BSE RHP to a
    gitignored temp path, verifies %PDF magic + SHA-256 match
    4668b4e22fde35670ccc8405e185a0fe4cd532f84597eed339265c00a84de22f +
    page count > 5, invokes scripts/pdf/lib/pdf-cover.py via
    child_process, writes the cover.json side artifact, and appends a
    populated sections.cover block to the existing audit row for
    curated_onemi-technology-solutions via string-surgery — does NOT
    reflow ipo-pdf-extraction-audit.json)
  - scripts/pdf/promote/onemi-issue-terms.ts (NEW; OnEMI-only promoter
    mirroring scripts/pdf/promote/onemi.ts + onemi-master.ts:
    read-existing → preflight (cover.json exists + manual_review_required
    false + each candidate field HIGH or MEDIUM + currently null/empty
    in production row) → string-surgery splice → atomic write; refuses
    to overwrite any non-null production value)
  - phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json
    (NEW side artifact written by the extractor)
  - src/data/snapshots/ipo-pdf-extraction-audit.json (sections.cover
    sub-block under by_ipo['curated_onemi-technology-solutions']
    populated; existing financials block byte-identical)
  - src/data/snapshots/ipo-master.json (up to 4 OnEMI fields populated:
    price_band, issue_size_cr, lot_size, face_value; only HIGH/MEDIUM;
    generated_at_utc bumped; 10 existing rows + timelines[] + source_meta
    JSON-semantically unchanged)
  - src/data/snapshots/ipo-documents.json (up to 3 OnEMI fields
    populated: registrar, brlms, optionally docs[0].bytes +
    docs[0].page_count; only HIGH/MEDIUM for registrar/brlms;
    generated_at_utc bumped; 10 non-OnEMI rows JSON-semantically
    unchanged)
  - phase-5B2-status.md (NEW; end-of-pass status report with cover.json
    field-by-field outcome, production-side delta, updated §3.3 four-tier
    classification based on actual post-run state, and operator
    follow-up question list)

Out of scope (HARD — same guardrails as Phase 5B.X):
  - src/data/snapshots/ipo-financials.json (do NOT mutate)
  - src/data/snapshots/ipo-narrative.json (do NOT mutate)
  - src/data/snapshots/ipo-source-audit.json (do NOT mutate)
  - The 10 existing rows in ipo-master.json / ipo-documents.json
  - timelines[] / source_meta in ipo-master.json
  - src/types/source.ts / src/types/ipo.ts / src/types/snapshot.ts
    (Phase 5C closure + no new fields)
  - scripts/ingest/* (do NOT touch)
  - All UI files (src/components, src/pages, src/lib) — Phase 5B.2 does
    not require any UI change; the IpoDetail children are already
    null-tolerant and will naturally render real values where the cover
    surfaced them
  - .github/workflows/* (do NOT touch)
  - scripts/pdf/lib/pdf-cover.py (UNCHANGED — used as-is via CLI)
  - scripts/pdf/lib/pdf-financials.py (do NOT tune; Phase 5B is final
    for the financial line items)
  - scripts/pdf/run.ts (do NOT modify; Phase 5B.2 uses a stand-alone
    mini-orchestrator under scripts/pdf/extract/)
  - No new dependencies (pdfplumber + camelot already installed)
  - No DB, Workers, cron, GMP, LLM, Chittorgarh / aggregator fields,
    broker pages
  - No PDF binaries or full-text dumps (source.pdf gitignored)
  - No multi-IPO scaling (OnEMI only — neither the extractor nor the
    promoter may iterate over other ipo_ids)
  - No financial line item extraction (EPS, borrowings, cash, etc.
    are explicitly out)
  - No narrative extraction
  - No sector / date / fresh-OFS-split extraction in this pass
    (defer to future passes)
  - No production-row state change ('manual' stays 'manual'; do NOT
    upgrade state to 'live' on the master row — the row remains mixed)

Extractor behaviour (scripts/pdf/extract/onemi-cover.ts):
  - Hard-code PRODUCTION_IPO_ID = 'onemi-technology-solutions' and
    AUDIT_IPO_ID = 'curated_onemi-technology-solutions'.
  - Read phase-0/curated-official-pdfs.json. Locate the OnEMI entry by
    ipo_id (which matches PRODUCTION_IPO_ID).
  - Verify allowed_for_parser: true; verify source_host ∈ official
    allow-list (sebi.gov.in, www.sebi.gov.in, nseindia.com,
    nsearchives.nseindia.com, bseindia.com, www.bseindia.com,
    bsesme.com, www.bsesme.com). Reject otherwise.
  - Verify the entry's doc_url matches docs[0].url in ipo-documents.json
    for OnEMI (cross-check).
  - Read ipo-pdf-extraction-audit.json. Pull pdf_sha256 from
    by_ipo['curated_onemi-technology-solutions'] (Phase 5B set this).
  - Idempotency: if cover.json already exists at
    phase-0/pdf-extracts/curated_onemi-technology-solutions/cover.json,
    skip download/extract and use the existing artifact. Otherwise:
    download OnEMI's PDF via httpGetBinary to source.pdf (gitignored);
    verify %PDF magic + sha256 match + page_count > 5; HALT on any
    mismatch.
  - Invoke `python3 scripts/pdf/lib/pdf-cover.py <pdf> <out.json>` via
    child_process. Capture stdout/stderr; HALT non-zero exit.
  - Read the resulting cover.json. Enrich with ipo_id, doc_url,
    doc_kind, pdf_sha256, parsed_at_utc, parser_version (matching the
    existing orchestrator's enrichment pattern in scripts/pdf/run.ts).
  - String-surgery update the audit row's sections.cover block:
    locate by_ipo['curated_onemi-technology-solutions'].sections.cover,
    replace the existing `{attempted: false, reason: "..."}` block with
    `{attempted: true, confidence: <overall>, anchors_matched: <n>,
    anchors_total: <m>, errors: []}` — preserving every other key in
    the row byte-identically.
  - Exit 0 on success.

Promoter behaviour (scripts/pdf/promote/onemi-issue-terms.ts):
  - Hard-code PRODUCTION_IPO_ID = 'onemi-technology-solutions'.
  - Read cover.json. HALT if missing.
  - HALT if manual_review_required is true.
  - For each candidate field (price_band, issue_size_cr, lot_size,
    face_value, registrar, brlms): include in the splice only if the
    field's `confidence` is 'high' or 'medium' AND the per-field sanity
    bound passes (per §6). Skip LOW; skip NONE.
  - Read ipo-master.json + ipo-documents.json. HALT if OnEMI rows
    absent. HALT if any candidate field is already non-null/non-empty
    in production (refusal to overwrite — explicit idempotency).
  - String-surgery splice the OnEMI row in ipo-master.json: for each
    accepted master field, locate the existing `"<key>": null` line
    inside the OnEMI row and replace its value verbatim (preserving
    whitespace + key order). The price_band replacement renders as a
    multi-line nested object matching the existing pretty-printed
    format (see greendale-cement row).
  - String-surgery splice the OnEMI row in ipo-documents.json: for
    accepted registrar, replace `"registrar": null` with the nested
    object `{ "name": <firm>, "portal_url": null }`. For accepted
    brlms, replace `"brlms": []` with the multi-line array. Optionally
    add `docs[0].bytes` + `docs[0].page_count` if cover.json carries
    them — these are mechanical reads, not inferences.
  - Bump generated_at_utc on both mutated snapshots.
  - Atomic .tmp + rename writes.
  - Print summary: per-field outcome (promoted / skipped-low /
    skipped-none / skipped-existing), production delta, byte-identity
    of untouched rows.

Hard guardrails:
  1. The extractor + promoter are OnEMI-only. They MUST NOT iterate
     over other ipo_ids.
  2. Existing 10 rows in each mutated snapshot stay byte-identical
     (excepting the top-level generated_at_utc).
  3. typecheck + build pass after the writes.
  4. Stay on main; no feature branches.
  5. LOW or missing cover fields stay null in production.
  6. No PDF binaries or full-text dumps staged (source.pdf covered by
     existing .gitignore rules).
  7. No UI change. No type change. No workflow change.
  8. The cover extractor's natural cover-page scope honors the operator's
     "first 5 pages maximum" intent — if extraction unexpectedly hits
     anchors beyond page 5, log it in the status doc but do not modify
     the extractor in this pass.

Verification order (binding — extractor first, then promoter, then build,
                    then render check, then status doc):
  (a) Preflight: confirm phase-0/curated-official-pdfs.json contains
      OnEMI with allowed_for_parser: true; confirm
      ipo-pdf-extraction-audit.json carries pdf_sha256 for OnEMI;
      confirm ipo-documents.json[onemi-technology-solutions].docs[0].url
      matches the curated seed URL.
  (b) Run: npx tsx scripts/pdf/extract/onemi-cover.ts (downloads PDF,
      verifies, runs pdf-cover.py, writes cover.json + updates the
      audit row's sections.cover block).
  (c) Confirm cover.json exists with manual_review_required: false. If
      true, HALT, write a status doc explaining why, and STOP without
      running the promoter.
  (d) Run: npx tsx scripts/pdf/promote/onemi-issue-terms.ts (reads
      cover.json, splices accepted fields into ipo-master.json +
      ipo-documents.json).
  (e) Diff ipo-master.json: only the OnEMI row's targeted keys changed
      (price_band / issue_size_cr / lot_size / face_value to the
      extracted values; generated_at_utc bumped). 10 existing rows +
      timelines[] + source_meta JSON-semantically unchanged via
      json.dumps(sort_keys=True).
  (f) Diff ipo-documents.json: only the OnEMI row's targeted keys
      changed (registrar / brlms / optionally docs[0].bytes +
      docs[0].page_count). 10 non-OnEMI rows JSON-semantically
      unchanged.
  (g) Confirm ipo-financials.json untouched.
      Confirm ipo-narrative.json untouched.
      Confirm ipo-source-audit.json untouched.
      Confirm src/types/* untouched.
      Confirm scripts/ingest/* untouched.
      Confirm src/components / src/pages / src/lib untouched.
      Confirm .github/workflows/* untouched.
      Confirm scripts/pdf/lib/pdf-cover.py + pdf-financials.py
      untouched.
      Confirm scripts/pdf/run.ts untouched.
      Confirm no PDF binaries or full-text dumps staged.
  (h) npm run typecheck (validates the populated OnEMI rows against
      the Ipo + IpoDocuments interfaces; PriceBand nested-object shape
      enforced).
  (i) npm run build (validates the dashboard bundles cleanly).
  (j) Lightweight headless render check via npm run preview + the
      pre-installed /opt/pw-browsers/chromium-1194: confirm
      /ipo/onemi-technology-solutions still renders cleanly (0 page
      errors, 0 console errors). The IssueTermsGrid now displays real
      values where it previously showed em-dashes; the
      RegistrarBrlmCard now displays the registrar firm + BRLM list
      where it previously showed "not yet identified" fallbacks. If
      the route crashes, HALT, do not commit, report which component
      crashed on which value and we will either approve a tiny shim
      or revert the splice.
  (k) Write phase-5B2-status.md with:
      - cover.json outcome (anchors_matched/total, per-field value +
        confidence + page + raw_snippet)
      - production-side delta (which fields moved from null to a
        value; which stayed null with reason)
      - updated §3.3 four-tier classification, computed from the
        actual post-promotion state and ONLY counting fields that
        were promoted at HIGH/MEDIUM confidence. Do NOT hard-code
        post-promotion counts. Use parameterized language:
          * "verified count moves from 4 to 4 + N" where N is the
            actual count of fields successfully promoted in this run
          * "unknown/null count decreases only by N"
          * "inferred + conservative default counts unchanged"
          * "if a candidate field (price_band / issue_size_cr /
            lot_size / face_value / registrar / brlms) remains null
            due to LOW confidence, ambiguity, missing anchor, or
            extraction failure, it stays in unknown/null and the
            reason is listed verbatim from the cover.json field's
            `confidence`, `errors`, or absent-anchor signal."
      - confirmation of every §9 acceptance-gate item
      - lightweight render-check outcome
      - operator-facing follow-up questions: (i) approve a future
        narrow pass to extract OnEMI's open_date / close_date /
        listing_date from the cover via a small dates-anchor
        extension to pdf-cover.py; (ii) approve a future narrow
        pass to extract the fresh/OFS split from the cover; (iii)
        approve a sector classification pass for OnEMI.
  (l) Commit + push to main.

After push:
  - STOP. Wait for operator review.
  - Do NOT start any follow-up pass (dates extraction; fresh/OFS
    extraction; sector classification; financial selector tuning)
    without explicit further approval.
```

---

*End of Gate 1 planning document. Gate 2 implementation requires separate explicit operator approval of §10 above.*
