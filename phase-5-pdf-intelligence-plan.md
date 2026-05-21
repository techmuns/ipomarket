# Phase 5 — PDF Intelligence Plan

> **Status**: planning only. This document is the canonical Phase 5 roadmap, lifted verbatim from §V of the master plan. **No parser code, no UI changes, no workflow changes, no DB, no Workers, no GMP, no cron lands at the moment this document is committed.** Stays on `main`. Phase 5A implementation is a separate, later approval using the prompt in §9.

---

## 1. Objective

Phase 5 adds **structured PDF intelligence** to the dashboard — extracting high-value fields from real DRHP / RHP / Prospectus PDFs (already harvested by P-08 / P-09 / P-10) into the snapshot shapes the Phase 1 dashboard already renders. Today every "Phase 5" field in the UI (financials, objectives, strengths, risks, promoters) is manually seeded and tagged `state: 'manual'`. Phase 5 turns those into `state: 'live'` per-IPO as PDFs become parseable, while honouring the safe-merge invariants the rest of the pipeline already uses.

Specifically Phase 5 should deliver:

- **Financials** (`ipo-financials.json`) — restated P&L revenue / EBITDA / PAT, total assets, net worth, debt, EPS across 3 FY + interim period if present.
- **Use of proceeds / Objects of the Issue** — `ipo-narrative.objectives[]` (`purpose`, `amount_cr`, `pct`) auto-filled per IPO.
- **Promoter & shareholding** — `promoter_holding_pre_pct`, `promoter_holding_post_pct`, `shares_pledged_pct`, `promoters[]`.
- **BRLM / Registrar** — fallback fill into `ipo-documents.json` (`brlms[]`, `registrar.name`) when SEBI-side or NSE-side ingest hasn't already populated them.
- **Strengths / Risks / Business overview** — `IpoNarrative.strengths[]`, `risks[]`, `company_overview` — extractive, not generative. Headings + first-sentence snippets, capped length, flagged for analyst review.
- **Peer comparison** — only if RHP's "Basis for Issue Price" section yields a parseable peer table; treated as Tier 2 (see §2).
- **Anchor allocation** — only when a short anchor-circular PDF exists per IPO (1–3 pages, single table); treated as Tier 2 because anchor PDFs are discovered separately from the main RHP and not all IPOs publish them in time.

Phase 5 explicitly does NOT:
- Generate narrative text via an LLM.
- Parse every page of every PDF — only the canonical sections.
- Touch UI components — every Phase 5 field has a Phase 1 UI consumer already.
- Add new dashboard modules.
- Add GMP, anchor circular discovery from broker pages, financial-statement reconciliation across periods, sector classification, or post-listing performance.

---

## 2. Buy-side priority ranking

| Field | Buy-side value | Parsing difficulty | Source section | Recommended phase |
|---|---|---|---|---|
| **Cover-page issue terms** (issue size, fresh / OFS split, price band, lot size, face value, BRLMs, registrar, dates) | **High** (sanity-check vs NSE/SEBI live ingest) | **Easy** — Page 1–3 text + small tables; `pdfplumber` text extraction with anchor labels | Cover page | **5A (Tier 1)** |
| **Restated P&L** (Revenue, EBITDA, PAT, EPS over 3 FY + interim) | **High** — feeds Financials chart, Quality/Risk checklist, P/E composite | **Medium** — Multi-page lattice table; `camelot` lattice mode + column-anchor heuristic | "Financial Information" / "Restated Financials" | **5A (Tier 1)** |
| **Objects of the Issue / Use of proceeds** | **High** — feeds Use-of-Proceeds stacked bar on IPO Detail | **Medium** — Short tabular block; mix of text + table | "Objects of the Issue" | **5B (Tier 1)** |
| **Promoter holding pre/post + pledged %** | **High** — dilution waterfall + governance signal | **Medium** — Tabular, found in "Capital Structure" | "Capital Structure" / "Our Promoters" | **5B (Tier 1)** |
| **BRLM list, Registrar name** | Medium — fallback only (NSE/SEBI usually have it) | **Easy** — Cover page text | Cover + back-cover | **5A (Tier 1, free with cover-page extract)** |
| **Restated Balance Sheet** (Total Assets, Net Worth, Total Debt) | Medium — supports D/E + price-to-book if EPS present | **Medium-High** — Larger tables, more drift across merchant bankers | "Restated Financials" — Balance Sheet block | **5C (Tier 2)** |
| **Strengths / Business overview** (headings + first-sentence) | Medium — analyst gloss; speeds first-read | **Medium** — Free-form prose, heading-anchor + N-sentence extraction (no LLM) | "Our Strengths" / "Our Business" | **5C (Tier 2)** |
| **Risk factors** (first 10–15 headings only) | Medium — first-pass risk surface; analyst still reads the long form | **Medium** — Bullet/heading extraction | "Risk Factors" | **5C (Tier 2)** |
| **Peers — listed company table** (P/E, P/B, RoNW per peer) | Medium — feeds Peer scatter, but RHP peer tables omit/cherry-pick | **Medium-High** — Single table inside narrative section; format varies | "Basis for Issue Price" / "Listed Peer Comparison" | **5D (Tier 2)** |
| **Anchor allocation** (anchor investor name, shares, amount) | Medium-High when present — feeds anchor concentration treemap + repeat-anchor signal | **Medium** — Short PDF, single lattice table; format mostly consistent across BSE/NSE circulars | Anchor circular (separate 1–3 page PDF) | **5D (Tier 2; needs anchor URL discovery first)** |
| **Use-of-proceeds Sankey** (granular routing per object) | Low — adds little beyond stacked bar at v1 | **Hard** — Often inferred from text, no canonical table | "Objects of the Issue" | **Tier 3 (defer)** |
| **Selling-shareholder breakdown** (OFS contributors) | Low-Medium — niche but signals promoter cash-out | **Hard** — Multi-table cross-reference | "Capital Structure" | **Tier 3 (defer)** |
| **Working-capital build-up** / **Capex schedule** | Low | **Hard** | "Objects of the Issue" detail | **Tier 3 (defer)** |
| **Litigation summary** | Low (free-form, hard to summarise faithfully) | **Hard** | "Outstanding Litigation" | **Tier 3 (manual only)** |

**Tier definitions**:
- **Tier 1 (5A / 5B)** — high value + feasible. Phase 5 ships these first.
- **Tier 2 (5C / 5D)** — useful but harder; ship after Tier 1 is steady.
- **Tier 3** — defer indefinitely; manual seed remains acceptable.

---

## 3. PDF source inventory

Drawn from the read-only survey of `phase-0/samples/sebi-publicissues-pdfs.json` and `src/data/snapshots/`:

| Source | What's there today | Suitable for Phase 5 parsing |
|---|---|---|
| **`phase-0/samples/sebi-publicissues-pdfs.json`** | 21 real SEBI PDF URLs harvested by P-08 (static + static-alt + Playwright fallback chain). Mix of "Draft Abridged Prospectus" + "Abridged prospectus" + RHP variants from May 2026 filings | **Yes** — primary candidate pool for Phase 5A |
| **`phase-0/samples/sample-drhp.pdf-meta.json`** | One validated DRHP: InCred Holdings — 13 pages, %PDF magic, SHA + 728 KB. Already parsed for cover-text-first-500 + table count by P-09's `pdf-parse.py rhp` mode | **Yes** — Phase 5A seed PDF #1 (small, validated end-to-end) |
| **`src/data/snapshots/ipo-documents.json`** | Per-IPO docs[] with `kind: 'DRHP' \| 'RHP' \| 'Anchor' \| 'AllotmentBasis' \| 'Prospectus'`. Currently: InCred Holdings + 4 SEBI pipeline IPOs (Online Instruments / Jindal Supreme / Playsimple Games / Punjab Carbonic) carry **real SEBI URLs**; NFP Sampoorna + Vegorama + the 3 synthetic listed (Quasar / Lumino / Greendale) carry placeholder URLs (`example.invalid` etc.) | **Yes for the 5 real SEBI ones; No for the 5 placeholder ones** |
| **`src/data/snapshots/sebi-pipeline.json`** | 33 entries: 19 with `source: 'SEBI'` (real); 14 Phase-1 legacy placeholders without `source` | Real 19 are candidates; placeholders are not |
| **NFP Sampoorna RHP URL** (referenced in audit) | `https://www.skylinerta.com/ipo.php` — Skyline-RTA mock URL; NOT a SEBI-side prospectus | **No** — would need a separate registrar/exchange discovery |
| **Vegorama RHP URL** (in source-audit) | `https://www.sebi.gov.in/.../Vegorama%20Punjabi%20Angithi%20Limited-RHP_p.pdf` (audit-only; not yet in documents.json as a fetched RHP) | **Yes** — SEBI-side, candidate for Phase 5A seed PDF #2 once cross-checked |
| **Anchor circulars** | None discovered yet (P-18 ran against probe-sample anchor PDFs, no per-IPO mapping). Anchor URLs typically live on BSE / NSE the day before opening, NOT on SEBI | Not yet — anchor URL discovery is its own probe (P-18 expansion in Phase 5D) |
| **Allotment-basis PDFs** | Registrar-side; per-PAN lookups only (P-12 / P-13 / P-14 / P-14b). Not bulk-fetchable | **No** — out of Phase 5 scope |

**Candidate pool for Phase 5A parser bring-up**: the 5 IPOs in `ipo-documents.json` that carry real SEBI URLs (InCred Holdings + 4 others) — plus Vegorama if its SEBI RHP URL is added to documents.json by a follow-up 2A pass. Five real PDFs is enough to characterise per-merchant-banker format drift.

---

## 4. Parser architecture

A single Python script directory under `scripts/pdf/`, called from a single GitHub Actions workflow (`.github/workflows/pdf-parse.yml`), writing JSON outputs into `src/data/snapshots/` via the same artifact-to-snapshot bridge pattern as `scripts/ingest/sebi-pipeline.ts`.

**Stack — locked**:
- **Language**: Python 3.11 (already wired in `.github/workflows/probes.yml` and `ingest.yml`).
- **Primary lib**: `pdfplumber` (already in `requirements.txt`) — text extraction, cover-page anchors, simple tables.
- **Secondary lib**: `camelot-py[cv]` (already in `requirements.txt`) — `--flavor lattice` for ruled financial tables; `--flavor stream` as second pass when lattice yields zero rows.
- **No new deps**. No PyMuPDF, no `unstructured`, no LLM SDKs, no Tesseract / OCR (we expect digital PDFs, not scans; if a SEBI PDF is image-only we mark it `state: 'unavailable'` and move on).
- **No Cloudflare Workers** — wasm PDF parsing is fragile and `camelot`'s OpenCV dep makes it a non-starter.

**Directory layout — proposed (illustrative; finalised at Phase 5A approval)**:

```
scripts/pdf/
├── run.ts                  # Orchestrator (Node, mirrors scripts/ingest/run.ts)
├── lib/
│   ├── pdf-cover.py        # Cover-page text + anchor labels (mode: 'cover')
│   ├── pdf-financials.py   # Restated P&L extractor (mode: 'financials')
│   ├── pdf-objects.py      # Objects of the Issue extractor (mode: 'objects')
│   ├── pdf-promoters.py    # Capital Structure / promoter holding (mode: 'promoters')
│   └── pdf-narrative.py    # Strengths / Risks / Overview heading-anchor (mode: 'narrative')
└── ingest/
    ├── financials.ts       # Merge per-IPO financials into ipo-financials.json
    ├── narrative.ts        # Merge objectives + strengths + risks + promoters into ipo-narrative.json
    ├── documents-fill.ts   # Backfill brlms[] + registrar from cover-page extract into ipo-documents.json
    └── pdf-audit.ts        # Write ipo-pdf-extraction-audit.json
```

`scripts/probes/lib/pdf-parse.py` (existing) is **kept and extended** — not replaced. The two existing modes (`rhp`, `anchor`) cover metadata-only checks; the new `lib/pdf-*.py` scripts handle structured extraction. The probe + ingest pipelines stay decoupled: probes confirm reachability + magic; ingest converts PDFs into snapshot rows.

**Side-artifact pattern (mirrors `phase-0/samples/`)**:
- Per-PDF intermediate JSON written to `phase-0/pdf-extracts/<ipo_id>/<doc_kind>.json` (a new directory created at Phase 5A; metadata-only, not full text dumps).
- These intermediate JSONs are committed to git as the audit trail; the ingest bridge reads them and writes snapshots. **PDFs themselves are never committed** (each is 500 KB – 50 MB; would bloat the repo within weeks).

**Workflow design (proposed)**:
- `.github/workflows/pdf-parse.yml`, `workflow_dispatch`-only (no cron at first; cadence is approved separately if/when the parser stabilises).
- Steps: checkout → setup Node + Python + `pip install -r requirements.txt` → discover real SEBI URLs from `ipo-documents.json` → download each PDF to a temp dir (re-using `phase-0/samples/sample-drhp.pdf-meta.json` shape for metadata) → run extractors → write side artifacts → run ingest bridges → typecheck + build → commit snapshots back to `main` if anything changed.
- Same safe-merge rules apply (read-existing-first, source-empty preserves rows, atomic writes, no overwrite of manual values with low-confidence parsed values — see §7).
- Same CI-failure semantics as the consolidated Phase 2 (`§S.6` of the master plan): classified extraction failures (low confidence / missing section / table-parse empty) keep CI green; unexpected runtime exceptions fail the workflow.

---

## 5. Proposed output snapshots

Phase 5 reuses the existing snapshot files where possible — the dashboard already renders them — and adds one new audit file.

| Snapshot | Shape | Phase 5 writes | Phase 1 UI consumer (already wired) |
|---|---|---|---|
| `src/data/snapshots/ipo-financials.json` | Existing `IpoFinancials { ipo_id, state, periods[], derived }` per `src/types/ipo.ts:98-109` | Replaces manually-seeded entries with parsed entries (`state: 'live'`, `source: 'RHP'`) per IPO; preserves the 3 synthetic listed manual rows because they have no SEBI URL to parse against | `FinancialsChart` (Analysis tab of IPO Detail), `AnalystSignalPanel` (valuation metrics), Market Pulse Quality/Risk checklist |
| `src/data/snapshots/ipo-narrative.json` | Existing `IpoNarrative { company_overview, strengths[], risks[], objectives[], promoters[], promoter_holding_pre_pct, ..., shares_pledged_pct }` per `src/types/ipo.ts:117-128` | Phase 5 fills `objectives[]`, `promoters[]`, `promoter_holding_*`, `shares_pledged_pct`, and (Tier 2) `strengths[]`, `risks[]`, `company_overview`. Manually seeded NFP + Vegorama narratives are preserved unless replaced with a higher-confidence parse | `StrengthsCard`, `RisksCard`, `ObjectivesCard`, `PromoterCard` (IpoDetail Analysis tab) |
| `src/data/snapshots/ipo-documents.json` | Existing `IpoDocuments { docs[], registrar, brlms[] }` per `src/types/ipo.ts:139-145` | Phase 5 backfills `brlms[]` + `registrar.name` from cover-page extract when missing; never overwrites SEBI-bridge-supplied entries | `DocumentsList`, `RegistrarBrlmCard` |
| `src/data/snapshots/ipo-source-audit.json` | Existing per-IPO `source_mix` + `fields[]` audit array | Phase 5 appends `SourceAuditEntry { source: 'RHP', url: <pdf-url>, fetched_at_utc, state: 'live', confidence: 'high' \| 'medium' \| 'low' }` for each field it populates | `SourceAuditPanel` (IpoDetail right-rail mix bar), `PriorityReadCard` (TL;DR source mix) |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | **NEW**. Per-PDF: `{ ipo_id, doc_url, doc_kind, pdf_sha256, page_count, parsed_at_utc, sections: { cover, financials, objects, promoters, narrative }, overall_confidence, errors[], manual_review_required }`. Schema mirrors the per-slice `SliceResult` pattern in `scripts/ingest/lib/slice.ts` | Full audit of every parse attempt (success or fail) | New small audit card on `/source-health` (Phase 5C concern; **out of Phase 5A**). Until then this file is reference-only |

**No** new file for use-of-proceeds — `ipo-narrative.objectives[]` already has the right shape (`{ purpose, amount_cr, pct }`). Extending the narrative file is cheaper than splitting it.

**Peer comparison** (Tier 2) — if it ships, it lives in `ipo-narrative.json` under a new optional `peers?: PeerRow[]` field, NOT a new snapshot. The type extension can wait until Phase 5D.

**Anchor allocation** (Tier 2) — same: lives in `ipo-narrative.json` under a new optional `anchor?: { investors: AnchorInvestor[], top_5_concentration_pct }` field. Type extension waits until Phase 5D.

---

## 6. Extraction strategy by section

| Section | Extraction method | Confidence calibration | Validation checks | Fallback / manual strategy |
|---|---|---|---|---|
| **Cover page / issue terms** | `pdfplumber.pages[0..2].extract_text()` + regex anchors: `Price Band`, `Issue Size`, `Fresh Issue`, `Offer for Sale`, `Lot Size`, `Face Value`, `BRLMs?`, `Registrar`, `Bid/Offer Period` | **High** when ≥6 of 8 anchors match within first 3 pages; **Medium** if 3–5; **Low** if 0–2 | Cross-check against existing `ipo-master.json` row (NSE/SEBI ingest). If `issue_size_cr` differs by >10% or `price_band` differs at all, flag `manual_review_required: true` | Manual values in `ipo-master.json` win; cover-page extract is fallback for BRLMs / registrar only |
| **Financial statements** | `camelot --flavor lattice` on a page-range derived from a heading scan (`Restated Financial Information`, `Restated Statement of Profit and Loss`). If lattice yields 0 tables, retry with `--flavor stream`. Column-anchor heuristic: rightmost numeric column = latest period; leftmost = oldest | **High** if ≥3 fiscal periods extracted and Revenue + PAT both present and signs sensible (Revenue > 0, PAT defined); **Medium** if 1–2 periods or only partial rows; **Low** if no numeric rows | Period labels match `FY\d{2}` / `9M FY\d{2}` / `H1 FY\d{2}`; Revenue ≥ EBITDA ≥ |PAT| (sanity); EPS only emitted if face-value-consistent | Preserve manually seeded Vegorama financials when overall confidence < `medium`. Mark IPOs with `state: 'manual'` + `manual_review_required: true` for analyst override |
| **Objects of the Issue** | `pdfplumber` text-region from "Objects of the Issue" heading to next H1. Parse table or bulleted ₹ amounts. Pct = amount / sum(amounts) × 100 (rounded to 1dp) | **High** if sum of `pct` is 95–105% AND ≥2 objects; **Medium** if 1 object or sum 70–95%; **Low** otherwise | Sum-of-percent invariant; each amount > 0; purpose text length 6–120 chars | Keep manually seeded `objectives[]` if parse confidence < `medium` |
| **Capital structure / promoter holding** | `camelot` lattice on "Capital Structure" pages. Extract pre-issue and post-issue % rows for "Promoter and Promoter Group" total. Pledged % from a separate "Pledged Shares" sub-table if present | **High** if both pre + post extracted with sensible difference (post < pre, both 0–100); **Medium** if only one extracted; **Low** if neither | Both values in [0,100]; post < pre by ≤ pre/2 (sanity dilution bound); `shares_pledged_pct` in [0,100] | Keep manual if parse confidence < `medium`; surface `manual_review_required` |
| **Basis for Issue Price / peers** | `pdfplumber` heading scan; `camelot` lattice on the explicit "Listed Peer Comparison" table. Map cols → `{ peer_name, p_e, p_b, ronw_pct }` | **High** if ≥3 peers extracted with all three numeric columns; **Medium** if 1–2 peers or 2/3 columns; **Low** otherwise | Each P/E in [-200, 500]; P/B in [0, 50]; RoNW in [-50, 100] | **Tier 2** — defer to Phase 5D. If parser fails, leave field absent |
| **Risk factors** | `pdfplumber` text from "Risk Factors" heading until "Internal Risk Factors" body. Extract first 10–15 bulleted headings only (not full body) | **High** if ≥10 headings extracted, each 20–200 chars; **Medium** if 5–9; **Low** if <5 | Heading length bounds; deduplicate; no all-caps boilerplate | Keep manual if confidence < `medium`. **Tier 2** — defer to Phase 5C |
| **Strengths / business overview** | `pdfplumber` heading-anchor on "Our Strengths" + "Our Business" + first paragraph of each strength section. Cap total at ~1200 chars to stop at the H1 boundary | **High** if ≥4 strength bullets and `company_overview` ≥ 200 chars; **Medium** between 2–3 bullets; **Low** otherwise | Bullet length 30–250 chars; no truncated mid-sentence (look for terminal punctuation) | Keep manual narratives if confidence < `medium`. **Tier 2** — defer to Phase 5C |
| **Anchor circular** | Once anchor URLs are mapped per IPO (Phase 5D, anchor-url-discovery probe), `camelot --pages 1 --flavor lattice` on the single short circular. Cols → `{ investor_name, shares, amount_cr }` | **High** if ≥5 rows extracted with sensible amounts; **Medium** if 2–4; **Low** if 0–1 | Sum of amounts ≈ anchor-portion-of-issue (sanity); investor names are not numeric | **Tier 2** — defer to Phase 5D entirely. Out of scope for Phase 5A |

---

## 7. Safety / quality controls

1. **No hallucination**. Every emitted field traces to a literal byte range in the source PDF — extractors never synthesise values. If a section is missing, the field is absent from the snapshot (not invented).
2. **Page references where possible**. Every audit entry carries `page: <int>` (or `pages: [<int>, <int>]` for tables spanning multiple pages). This is recorded in `ipo-pdf-extraction-audit.json` but not in the consumer snapshots (they only need source URL + fetched timestamp).
3. **Audit snippet, not full dump**. Each extraction audit row keeps a `raw_snippet: string` ≤ 240 chars (the surrounding text that produced the value), to let an analyst spot-check provenance. **Full PDF text dumps are never committed** — they bloat the repo and add no value the source URL doesn't already provide.
4. **Per-field confidence**. Every parsed field carries one of `'high' | 'medium' | 'low' | null` in the audit JSON; consumer snapshots only show the value when confidence ≥ `medium`. `low` extractions are quarantined in the audit file with `manual_review_required: true`.
5. **Per-IPO graceful failure**. A failed parse on IPO X never blocks IPO Y. `scripts/pdf/run.ts` collects per-IPO `PdfSliceResult` records (mirroring `SliceResult` from `scripts/ingest/lib/slice.ts`) and the workflow always commits the partial success.
6. **Never overwrite manual values with low-confidence parsed values**. The merge rule in every Phase 5 ingest bridge: incoming entry only replaces existing entry if (a) existing state is not `'manual'`, OR (b) incoming confidence is `'high'` AND a manual override flag in the audit JSON allows replacement. This is binding — the same invariant Phase 2 uses.
7. **Manual review flag**. `ipo-pdf-extraction-audit.json` carries `manual_review_required: boolean` per `(ipo_id, section)`. Phase 5C may later add a small `/source-health` card listing these for analyst attention; that's not in Phase 5A.
8. **PDF integrity gate**. Re-use the P-09 metadata pattern (`%PDF` magic + SHA-256 + byte length + page count > 5) before any extractor runs. PDFs that don't pass the gate are recorded in the audit with `state: 'unavailable'` and never reach the extractors.
9. **Idempotency**. Identical inputs (same PDF SHA + same parser version) → byte-identical snapshot outputs (modulo `parsed_at_utc`). Parsers stamp their own version into the audit so re-runs after a parser bump can be flagged for re-validation.
10. **No external API calls**. Extractors are local-only (pdfplumber + camelot). No LLM, no third-party "PDF AI" services. This is binding for v1 — we do not ship a network-dependent parser.
11. **No-binary-commit guardrail (hard rule)**. Binding for every Phase 5 slice:
    - Downloaded PDFs go to a **gitignored** temp path under `phase-0/pdf-extracts/<ipo_id>/source.pdf`. The `.gitignore` rule lands as part of Phase 5A.
    - **No PDF binaries are committed**, ever. Not even one. Not even "for testing".
    - **No full PDF text dumps are committed**. The `raw_snippet` in §7 item 3 is ≤ 240 chars per audit row; that is the only PDF-derived text that lands in git.
    - **Only the following PDF-derived artifacts are committed**: extraction-output JSON (per-IPO `cover.json`, `financials.json`, etc.), per-IPO confidence scores + page references, the per-PDF metadata JSON (URL, SHA-256, page count, byte length, %PDF magic check), the audit JSON (`ipo-pdf-extraction-audit.json`), and bounded `raw_snippet` audit rows.
    - The CI workflow must verify on every run that no `*.pdf` file is staged before committing snapshots back to `main`; if one is, the workflow fails (red) rather than committing.

---

## 8. Phase 5A — minimal first slice (recommendation)

Scope: **cover-page extract on one small validated SEBI PDF + restated P&L extract on one full RHP/DRHP/Prospectus PDF** — provided both candidates are real SEBI URLs. No UI changes. No new ingest bridge wired into the runner. No backfill into existing snapshots. Just prove the parser produces sane structured output that the existing snapshot shapes can absorb later.

### 8.1 Candidate-selection rule (binding)

**Phase 5A only parses PDFs whose URLs are real SEBI-hosted URLs** — i.e. entries in `src/data/snapshots/ipo-documents.json` whose `docs[].url` resolves to `sebi.gov.in/sebi_data/...` (the host the P-08 + P-09 chain validates). Brokers, registrars, merchant-banker hosts, and any URL containing `example.invalid`, `linkintime`, `skylinerta`, `bigshareonline`, `kfintech`, or `maashitla` are **excluded**. Manually-seeded placeholder URLs are excluded by the same rule.

Vegorama Punjabi Angithi is referenced in `ipo-source-audit.json` with a SEBI RHP URL, but it is **only eligible** for Phase 5A if `ipo-documents.json` carries that same SEBI RHP/DRHP/Prospectus URL on the Vegorama entry by the time Phase 5A is dispatched. If it doesn't, Phase 5A picks the next IPO with a real SEBI doc URL from the documents snapshot.

### 8.2 Two-PDF split (binding)

Phase 5A tests **two extractors against two PDFs** — not the same extractor on both. The PDFs are chosen for fitness:

- **PDF #1 — cover-page extraction target.** A small validated SEBI PDF, sufficient pages to contain the issue-terms anchors but no financial-table expectation. **InCred Holdings Draft Abridged Prospectus** (13 pages, validated by P-09) is the seed pick because the P-09 metadata is already on `main`. An abridged prospectus is the right shape for cover / BRLM / registrar / issue-terms extraction; it is **not** the right shape for restated financial statements.
- **PDF #2 — full financial-statement extraction target.** Preferably a full DRHP / RHP / Prospectus with enough pages (typically ≥ 200) to contain the canonical "Restated Financial Information" section. The orchestrator selects the first IPO in `ipo-documents.json` whose `docs[]` carries a real SEBI URL with `page_count >= 200` (or, if `page_count` is absent, downloads + checks it before parsing). If no such PDF is available in the current `ipo-documents.json`, Phase 5A **does not force a weak extraction** — instead it writes a clear `financial table candidate unavailable` status into `phase-0/pdf-extracts/index.json` with the reason and the list of candidates scanned, and reports back so a Phase 5A.1 candidate-discovery pass can be planned.

### 8.3 Deliverables

1. Add 2 small Python scripts under `scripts/pdf/lib/`:
   - `pdf-cover.py` (mode-style invocation, same shape as the existing `pdf-parse.py`).
   - `pdf-financials.py`.
2. Add a tiny Node orchestrator `scripts/pdf/run.ts` that:
   - Reads `src/data/snapshots/ipo-documents.json`, applies the §8.1 candidate filter, picks PDF #1 + PDF #2 per §8.2.
   - For each, downloads the PDF to a **gitignored** temp path (`phase-0/pdf-extracts/<ipo_id>/source.pdf`), runs the chosen extractor(s), writes per-IPO side artifacts: `phase-0/pdf-extracts/<ipo_id>/cover.json` and/or `phase-0/pdf-extracts/<ipo_id>/financials.json` (whichever was attempted).
   - Writes a top-level `phase-0/pdf-extracts/index.json` summarising per-IPO confidence + manual-review flags + `financial table candidate unavailable` if applicable.
3. Add a `workflow_dispatch`-only workflow `.github/workflows/pdf-parse.yml` that runs the orchestrator on demand (no cron yet).
4. **No** changes to `src/data/snapshots/ipo-financials.json`, `ipo-narrative.json`, or `ipo-documents.json`. **No** UI changes. **No** new TS types. **No** ingest bridge.
5. Status report `phase-5a-status.md` summarising per-PDF outcome with confidence + sample extracted rows + the candidate-selection result (which 2 PDFs ran, why; or "financial table candidate unavailable" with the reason).

Exit criterion for 5A: PDF #1 cover extract committed with `medium` or `high` confidence on at least the issue-terms / BRLM / registrar anchors, AND PDF #2 either yields a parseable financial table OR explicitly reports "financial table candidate unavailable" (both are accepted outcomes of the slice; the latter just means the next slice is a candidate-discovery pass, not a parser improvement). Until that bar is met, no Phase 5B (Objects of Issue + Promoter holding ingest bridge).

---

## 9. Phase 5A implementation prompt (copy-paste-ready)

> Approve Phase 5A — minimal PDF parser bring-up (cover page + restated P&L) on 1–2 real SEBI PDFs, side-artifacts only.
>
> What Phase 5A may create:
> - `scripts/pdf/run.ts` — tiny Node orchestrator that reads `src/data/snapshots/ipo-documents.json`, picks IPOs with a real SEBI DRHP/RHP/Prospectus URL, downloads each PDF to a gitignored temp path, runs both extractors, writes per-IPO side artifacts.
> - `scripts/pdf/lib/pdf-cover.py` — cover-page extractor (mode-style invocation, mirrors `scripts/probes/lib/pdf-parse.py`). Uses `pdfplumber` only.
> - `scripts/pdf/lib/pdf-financials.py` — restated P&L extractor. Uses `camelot-py[cv]` lattice first, stream fallback.
> - `.github/workflows/pdf-parse.yml` — `workflow_dispatch`-only workflow (no cron). Installs Node 20 + Python 3.11 + `pip install -r requirements.txt` (no new deps), runs the orchestrator, runs `npm run typecheck`, commits side artifacts back to `main` if anything changed.
> - `phase-0/pdf-extracts/.gitkeep` directory; `phase-0/pdf-extracts/<ipo_id>/{cover,financials}.json` per parsed IPO; `phase-0/pdf-extracts/index.json` summary.
> - `.gitignore` entry for `phase-0/pdf-extracts/*/source.pdf` (PDF binaries never committed).
> - `package.json` script `npm run pdf` pointing at the orchestrator.
> - `phase-5a-status.md` end-of-pass report with per-PDF confidence, sample rows, and observed format-drift notes.
>
> What Phase 5A does:
> - Apply the §8.1 candidate-selection rule: parser candidates **must come from real SEBI URLs only**. Broker / registrar / merchant-banker / `example.invalid` URLs are excluded. Vegorama is eligible only if `ipo-documents.json` carries a real SEBI RHP/DRHP/Prospectus URL for it at dispatch time; otherwise the orchestrator picks the next IPO with a real SEBI doc URL.
> - Apply the §8.2 two-PDF split:
>   - **PDF #1 — cover-page target**: InCred Holdings Draft Abridged Prospectus (13 pages, validated by P-09). Used for cover / BRLM / registrar / issue-terms extraction only.
>   - **PDF #2 — financial-statement target**: the first IPO in `ipo-documents.json` whose real SEBI URL is a full DRHP / RHP / Prospectus with `page_count >= 200` (download + verify if absent). If none qualifies, the orchestrator writes `financial table candidate unavailable` into `index.json` with the reason and **does not force a weak extraction**.
> - Download each chosen PDF to a **gitignored** temp path; verify `%PDF` magic + page count > 5 + SHA-256 before parsing (re-use P-09's gate).
> - Run cover-page extractor on PDF #1; emit `cover.json` with `{ issue_size_cr, price_band, lot_size, face_value, brlms[], registrar, anchors_matched, confidence, page_refs[] }`.
> - If PDF #2 is available, run financials extractor on it; emit `financials.json` with `{ periods[]: { period, revenue_cr, ebitda_cr, pat_cr, eps?, assets_cr?, net_worth_cr?, debt_cr? }, source_tables, confidence, page_refs[] }`. If PDF #2 is not available, record the unavailability and move on.
> - Write `index.json` summary with per-IPO overall confidence + `manual_review_required` flag + the candidate-selection outcome.
> - Honour every rule in §7 (no hallucination, page refs, audit snippets, confidence gating, never overwrite manual, no external API, **no-binary-commit guardrail per §7 item 11**).
> - Honour CI semantics from the master plan §S.6 (classified extraction failures keep CI green; unexpected runtime exceptions fail the workflow).
>
> Strict scope — Phase 5A does NOT:
> - Touch `src/data/snapshots/ipo-financials.json`, `ipo-narrative.json`, `ipo-documents.json`, or `ipo-source-audit.json` — Phase 5A writes side artifacts only.
> - Add any UI component / page / type / route.
> - Add Phase 5B / 5C / 5D extractors (Objects, Promoters, Narrative, Peers, Anchor).
> - Add cron / scheduled triggers.
> - Add a database / KV / R2 / D1.
> - Add Cloudflare Workers.
> - Add GMP or any new ingestion source.
> - Commit any PDF binaries (hard guardrail per §7 item 11; CI must fail red if a `*.pdf` is staged).
> - Commit any full PDF text dumps. Only metadata JSON, extraction-output JSON, bounded ≤240-char snippets, confidence scores, page refs, and the audit JSON land in git.
> - Call any external API / LLM / cloud parsing service.
> - Leave `main`.
