# Phase 6A.2 — Chittorgarh Fast-fill Ingestion — Status (Gate 2 complete)

> **Date**: 2026-05-25
> **Plan**: `phase-6A-2-chittorgarh-fastfill-plan.md` (Gate 1, committed `44c6206`)
> **Result**: OnEMI Technology Solutions gap-filled from the proven P-26b Chittorgarh extraction. 7 fields promoted, 0 skipped, 0 conflicts. typecheck + build green, route renders clean. Stayed on `main`.

---

## 1. Files changed

| File | Change |
|---|---|
| `scripts/pdf/promote/onemi-chittorgarh-fastfill.ts` | **NEW** — OnEMI-only artifact-to-snapshot bridge + string-surgery promoter (§6.1 freshness/provenance preflight, normalization, conflict-safe merge, atomic writes, idempotent). |
| `src/types/source.ts` | `SourceTag += 'Chittorgarh'`; `DataState += 'aggregator'`; `SourceMix.totals += chittorgarh?`. |
| `src/types/ipo.ts` | `IpoSourceAudit.source_mix += chittorgarh?`. |
| `src/components/ui/badge.tsx` | `+ aggregator` tone variant (orange) — supports the StateBadge `aggregator` tone. |
| `src/components/chrome/SourcePill.tsx` | `+ 'Chittorgarh'` STYLES entry (orange). |
| `src/components/chrome/StateBadge.tsx` | `+ 'aggregator'` in LABEL / COMPACT_LABEL / TONE. |
| `src/components/chrome/SourceAuditChip.tsx` | `+ 'aggregator'` STATE_BORDER entry. |
| `src/components/ipo/SourceAuditPanel.tsx` | `+ chittorgarh` to MIX_COLORS + MIX_LABELS; `?? 0` guards for the optional key; grid bumped to `md:grid-cols-8`; explainer mentions vetted-aggregator gap-fill. |
| `src/components/ipo/IssueTermsGrid.tsx` | De-hardcoded the header source chip — now derives the dominant issue-terms source from the IPO's `ipo-source-audit` entry; falls back to the segment heuristic only when no audit entry carries an issue-term field. |
| `src/pages/IpoDetail.tsx` | Pass `audit={audit}` into `<IssueTermsGrid>`. |
| `scripts/ingest/source-audit.ts` | Additive `chittorgarh` bucket in `recomputeSourceMix` (MIX_KEYS, mix/counts initializers, counting branch). **Not run in 6A.2** — dormant until the next ingest pass. |
| `src/data/snapshots/ipo-master.json` | OnEMI row: 6 null issue-term fields filled; `generated_at_utc` bumped. 10 existing rows + `timelines[]` + `source_meta` byte-identical. |
| `src/data/snapshots/ipo-documents.json` | OnEMI row: `registrar` filled; `brlms` stays `[]`; `docs[]` unchanged. 10 non-OnEMI rows byte-identical. |
| `src/data/snapshots/ipo-source-audit.json` | NEW OnEMI entry (7 Chittorgarh/aggregator field rows + `source_mix.chittorgarh = 100`). 10 existing entries byte-identical. |

No PDF binaries / full-text dumps. No `.github/workflows/*` change. No other `scripts/ingest/*` file changed. No other snapshot changed.

## 2. Source artifact + provenance (§6.1 preflight — PASSED)

| Item | Value |
|---|---|
| Exact OnEMI artifact path | `phase-0/broker-pages/chittorgarh-detail-1-extracted-retuned.json` (index resolved from `picked_detail_urls[]` slug `onemi-technology-ipo`) |
| Companion artifacts | `phase-0/broker-pages/chittorgarh-fields-v2.json`, `phase-0/broker-pages/chittorgarh-extraction-summary-v2.json` |
| Artifact `generated_at_utc` / `captured_at_utc` | `2026-05-24T19:02:37.030Z` (used as `fetched_at_utc` on every Chittorgarh audit row) |
| Artifact age at run | ~0.3 days (well within the 7-day freshness gate) |
| Source-probe commit ref (produced the artifacts) | `cbd9015` — "phase-0: refresh probe artifacts (2026-05-24T19:02Z)" on `main` |
| Robots classification | `allowed-prior-flag-was-over-match` (∈ allowed set) |
| P-26b precision — average | full-10 **0.833** (gate ≥ 0.80) · narrow-5 **0.933** (gate ≥ 0.90) — both pass |
| P-26b precision — OnEMI per-detail | full **0.9** · narrow **1.0** |
| OnEMI mapping match | `production_ipo_id=onemi-technology-solutions` · `chittorgarh_slug=onemi-technology-ipo` · `chittorgarh_id=2576` · `detail_url=https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/` — all verified against `picked_detail_urls[]` + the per-detail artifact `source_url`/`slug`. |

**Rebase note:** during the push, a later CI probe refresh landed on `main` (`4b5adc7`, "phase-0: refresh probe artifacts (2026-05-24T20:16Z)"). It re-rendered the Chittorgarh pages and regenerated `chittorgarh-fields-v2.json` / `chittorgarh-extraction-summary-v2.json` (new timestamp `2026-05-24T20:15:41.590Z`), but left `chittorgarh-detail-1-extracted-retuned.json` **byte-identical** — so OnEMI's extracted values are unchanged. After rebasing onto `4b5adc7`, the §6.1 preflight was re-run against the refreshed artifacts and **passed identically** (robots `allowed-prior-flag-was-over-match`; precision full 0.833 / narrow 0.933), then no-op'd (OnEMI already promoted). The audit rows record `fetched_at_utc = 2026-05-24T19:02:37.030Z` — the timestamp of the extraction snapshot (`cbd9015`) the promoter actually bridged from; the later refresh is value-identical, so the recorded provenance remains accurate.

## 3. Fields promoted (7) — per-field provenance

URL for every row: `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/` · `fetched_at_utc`: `2026-05-24T19:02:37.030Z` · `state`: `aggregator` · `source`: `Chittorgarh`.

| Production field | Target | raw_label (extraction method) | raw_value | normalized_value | confidence |
|---|---|---|---|---|---|
| `price_band` | ipo-master | `table[0].row[3] label="Price Band"` | `₹162 to ₹171` | `{ low: 162, high: 171 }` | high |
| `issue_size_cr` | ipo-master | `table[1].row[0] label="Total Issue Size"` | `5,41,47,390 shares (agg. up to ₹ 926 Cr)` | `926` | high |
| `lot_size` | ipo-master | `table[0].row[5] label="Lot Size"` | `87 Shares` | `87` | high |
| `open_date` | ipo-master | `table[0].row[0] label="IPO Date" (range-split start, year-inherited)` | `2026-04-30` | `2026-04-30` | medium |
| `close_date` | ipo-master | `table[0].row[0] label="IPO Date" (range-split end, year-inherited)` | `2026-05-05` | `2026-05-05` | medium |
| `listing_date` | ipo-master | `table[0].row[1] label="Listed on" iso-normalized` | `2026-05-08` | `2026-05-08` | high |
| `registrar` | ipo-documents | `class="registrar-name" anchor (contact-tail trimmed)` | `Kfin Technologies Ltd.` | `{ name: "Kfin Technologies Ltd.", portal_url: null }` | medium |

## 4. Fields skipped / deferred + why

No candidate field was dropped during promotion (all 7 passed found + HIGH/MEDIUM confidence + normalization + null-conflict checks). The following stay `null` **by design** (out of the 6A.2 candidate set — not extraction failures):

| Field | Why deferred |
|---|---|
| `brlms` | Static-unavailable on Chittorgarh (JS-rendered; `found:false`, `method:"static-unavailable"`). No JS render, no fake-fill. Stays `[]`. |
| `face_value` | Present in HTML (`₹1per share`) but **not in P-26b's `EXPECTED_FIELDS`** — needs a tiny extractor extension + re-probe. Deferred to slice 6A.2.1. |
| GMP / Kostak / subject-to-sauda | Not in Chittorgarh static HTML (only `<meta>` + outbound links). Phase 6 GMP module owns this. |
| subscription | Present only for closed IPOs; current-open Maniveni has no table; conflicts with the official NSE subscription pipeline. Deferred. |
| `sector` | Not extracted by P-26b. Deferred. |
| `fresh_cr`, `ofs_cr` | Fresh/OFS split not part of the issue-terms extraction. Deferred. |
| `status`, `state` | Out of 6A.2 scope — `status` stays `upcoming`, row-level `state` stays `manual` (status re-derivation from dates is a separate, future call). |

## 5. Verification (acceptance gate §10)

| Gate item | Result |
|---|---|
| 0 — §6.1 artifact freshness + provenance preflight passed | ✅ (values in §2) |
| 1 — only null OnEMI fields filled (6 master + registrar) | ✅ |
| 2 — official/non-null untouched; 10 master + 10 documents rows byte-identical | ✅ (JSON-semantic `json.dumps(sort_keys=True)` equality verified for every non-OnEMI row, plus `timelines[]` + `source_meta`) |
| 3 — Chittorgarh values visibly source-labeled (`source:Chittorgarh`,`state:aggregator`; SourceAuditPanel renders the orange Chittorgarh slice; IssueTermsGrid chip no longer mislabels) | ✅ |
| 4 — every filled field has provenance (url + fetched_at_utc + confidence + raw→normalized) | ✅ (§3) |
| 5 — conflicts reported, not overwritten | ✅ (0 conflicts for OnEMI; merge logic verified conflict-safe — drops + logs any non-null collision) |
| 6 — BRLM `[]`; face_value/GMP/subscription/sector stay null | ✅ |
| 7 — `ipo-financials.json` / `ipo-narrative.json` / `ipo-subscriptions.json` / `ipo-listing-performance.json` untouched | ✅ (git clean) |
| 8 — `npm run typecheck` + `npm run build` green | ✅ |
| 9 — `/ipo/onemi-technology-solutions` renders | ✅ HTTP 200, 0 console errors, 0 page errors (headless Chromium). Shows price band ₹162–₹171, lot 87 shares, min investment ₹14,877 (87×171), dates 30 Apr / 5 May / 8 May, registrar "KFin Technologies Ltd.", and the orange Chittorgarh slice (100%) in the Source audit panel. |
| 10 — no unrelated change; no robots/ToS violation; no PDF binaries/full-text dumps; on `main` | ✅ |

Idempotency: a second run is a clean no-op (exit 0) — the `OnEMI already present in source-audit` guard fires before any write. Other key routes (`/`, `/open`, `/ipo/nfp-sampoorna-foods`) also rendered clean.

## 6. Side effects worth noting

- **IssueTermsGrid de-hardcode** now resolves the header chip from the audit entry for *every* IPO. For `nfp-sampoorna-foods` (NSE-sourced SME) the chip changes from the old hard-coded `BSE` heuristic to the audit-correct `NSE` — a latent-mislabel fix, not a regression. IPOs with no issue-term audit fields still fall back to the segment heuristic (unchanged behaviour).
- **PriorityReadCard "Source mix" cell** (the 5-second triage card, not in the §11 in-scope list) uses its own 7-key map and does not yet know the `chittorgarh` bucket, so for OnEMI it shows "—/No source audit" (the same it showed before 6A.2, when OnEMI had no audit entry — i.e. neutral, no regression). The authoritative provenance surfaces (IssueTermsGrid chip + SourceAuditPanel) are correct. Folding `chittorgarh` into PriorityReadCard is a 2-line cosmetic follow-up — bundle into 6A.2.1 if desired.

## 7. Operator decision — scaling (slice 6A.2.1)

The promoter is OnEMI-only by an explicit hard-coded mapping. To scale, slice 6A.2.1 would generalize it to iterate an explicit `chittorgarh-map` (production_ipo_id ↔ slug/id) — filling each mapped IPO's null fields. Unmatched Chittorgarh IPOs are **never** auto-added to master (master rows come only from the gated master-linkage process). A companion 6A.2.1 item could add the `face_value` extractor selector to P-26b + the PriorityReadCard cosmetic fix.

**Question for the operator:** approve a Phase 6A.2.1 planning pass to (a) generalize the fast-fill promoter to a `chittorgarh-map` for multi-IPO scaling, (b) extend P-26b to extract `face_value`, and (c) fold the `chittorgarh` bucket into PriorityReadCard — `yes` / `hold` / `no`? No 6A.2.1 work starts without explicit further approval.
