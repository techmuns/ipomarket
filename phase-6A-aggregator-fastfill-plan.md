# Phase 6A — Aggregator Fast-fill Strategy Pivot (planning only)

> **Mode**: planning. No code edits. No snapshot mutations. No type changes. No probe runs. No UI changes. **This document is the Gate 1 deliverable — it does not authorise slice 6A.1 implementation.** Slice 6A.1 requires separate explicit operator approval of the §10 implementation prompt below. Slices 6A.2 / 6A.3 / 6A.4 / 6A.5 each require their own planning + implementation approval pair after 6A.1 closes.
>
> **Date**: 2026-05-22
>
> **Predecessors**: `phase-5C-closure.md` (Chittorgarh rejected as primary; reference-only), `broker-aggregator-source-plan.md` (§Y.4 source policy + §Y.9.1 production gate), Phase 5B / 5B.1 / 5B.X / 5B.2 status docs (PDF-first extraction works but is slow), master plan §DD.
>
> **Trigger**: Phase 5A → 5B.2 proved that PDF-first extraction works but is fragile + slow (OnEMI's RHP triggered `needs_manual_review` on cover-page registrar/brlms regex; narrow fix landed at `d197d11`, still pending re-run). The rate at which OnEMI's 13 explicit-null master fields can be filled via PDF parsing is too slow to scale across the IPO pipeline. The operator has decided to pivot: **keep official sources primary, use Chittorgarh as first-priority fast-fill for fields that are NULL in production, demote brokerage pages to secondary fallback**. Phase 5C had closed Chittorgarh as reference-only based on P-26's 0.45 precision vs the 0.80 gate; Phase 6A formally re-opens Chittorgarh under **stricter precedence rules** — gap-fill only, never overwrite, per-field audit labels, explicit gate at every slice.
>
> **Scope discipline (binding)**:
> - **OnEMI only in slice 6A.1** as the probe target (alongside Bagmane REIT baseline + one automatically-selected third IPO).
> - **No production scrape, no snapshot mutation, no type changes, no UI changes, no ingestion changes, no workflow changes, no PDF pipeline changes** in slice 6A.1.
> - **Official sources stay primary**. Chittorgarh values may only fill fields where the production value is `null`/`[]`. Broker values are below Chittorgarh.
> - **No Trendlyne under any circumstance** (master plan §A).
> - **No login / captcha bypass / stealth / fingerprint spoofing / proxy rotation / paid content / copyrighted long-form copying**.
> - **No LOW-confidence promotion**. Per-field audit + sanity bounds + non-clobber guards apply at every slice.
> - **No fake values, ever.**
> - Stay on `main`.
>
> **Slice-gate execution**: Gate 1 = this planning doc only (no code). Slice 6A.1 = the Chittorgarh probe retune pass described in §10, requires separate explicit operator approval. Slices 6A.2 / 6A.3 / 6A.4 / 6A.5 each their own planning + implementation gate pair after 6A.1 closes.

---

## 1. Objective

Shift the dashboard's enrichment strategy from **PDF-first, slow** to **aggregator-backed gap-fill, fast**, while keeping official sources as the highest-priority feed.

- **Keep official sources primary where they already work**: NSE / BSE / SEBI document links, existing PDF extraction outputs, OnEMI's official RHP-derived financials, official audit/freshness metadata. These are NOT replaced; they are NOT overwritten.
- **Use Chittorgarh as first-priority fast-fill** for fields that are currently `null` in production: IPO dates (open / close / listing), price band, issue size, fresh / OFS if available, lot size, face value, registrar, BRLMs, subscription data, GMP / Kostak / subject-to-sauda if available, listing gain / listing performance if available.
- **Demote brokerage websites to secondary fallback** (Zerodha / Upstox): company overview, strengths, risks, objectives / use of proceeds, issue summary, timeline fields. **Only when accessible without login / captcha / stealth bypass.**

Phase 6A does NOT replace the PDF pipeline; it parallels it. PDF extraction (Phase 5A → 5B.2) continues for high-value fields (financials, narrative) that aggregators don't surface reliably. Aggregator fast-fill closes the long tail.

---

## 2. Source precedence rules (binding)

For every field, evaluated in order:

1. **If an official value exists with valid provenance** (`state: 'live'` + `source` ∈ `{'NSE', 'BSE', 'SEBI', 'RHP', 'Registrar'}` + a non-stale `fetched_at_utc`), **keep the official value**. Aggregator + broker values are recorded in the audit trail as comparison notes but NOT promoted.
2. **Else if Chittorgarh has a HIGH-confidence value**, promote it with `source: 'Chittorgarh'`, `state: 'aggregator'`, full provenance per §3.
3. **Else if a brokerage source has a HIGH-confidence value AND access is non-login / non-captcha / non-stealth**, promote it with `source: 'Broker-ref'`, `state: 'broker_reference'`, full provenance.
4. **Else** the field stays `null` (or whatever `'manual' / 'awaiting'` value was already there).

**Hard rule — never overwrite official with aggregator/broker**: ingestion code must read the existing field's `source` + `state` before writing; if `state === 'live'` and `source ∈ {NSE, BSE, SEBI, RHP, Registrar}`, the new aggregator/broker value is recorded in the audit trail as a `conflict_note` but the production field stays untouched. Conflicts surface in `phase-6A-conflicts.json` (a new audit artifact under slice 6A.3) for operator review.

---

## 3. Data model (every imported aggregator/broker field carries)

Mandatory provenance per field:

| Key | Value |
|---|---|
| `value` | The actual extracted value (typed per the field's schema) |
| `source_label` | One of `Official` / `Chittorgarh` / `Broker` / `Manual` |
| `source_url` | Absolute URL the value was extracted from |
| `source_priority` | Numeric (`1` = Official, `2` = Chittorgarh, `3` = Broker, `4` = Manual) |
| `fetched_at_utc` | ISO-8601 of the fetch |
| `confidence` | `high` / `medium` / `low` |
| `state` | `live` / `aggregator` / `broker_reference` / `manual` / `unavailable` |
| `manual_review_required` | Boolean — set when confidence is low OR sanity bounds fail OR conflict with official |
| `notes` | Optional — used for conflict diff text vs official, or selector-match rationale |

Provenance is recorded in TWO places:

1. **`src/data/snapshots/ipo-source-audit.json`** — per-IPO `fields[]` array gains a per-field row tagged with the new `source` + `state` enum values. Already supports inline tags per `SourceAuditEntry`; only new enum values needed.
2. **`phase-0/broker-pages/<source>-<ipo>-extracted.json`** — per-IPO side artifact carrying the raw extraction output (raw_snippet, page anchor, regex match, table cell). Bounded; ≤ 240-char snippets per row.

The production snapshot itself (`ipo-master.json`, `ipo-documents.json`, etc.) carries only the `value` — the provenance trail lives in the audit + side artifact. This matches the Phase 5B.1 / 5B.X precedent.

**Type-extension impact (slice 6A.2 only — NOT slice 6A.1)**:

- `SourceTag` (in `src/types/source.ts`) gains `'Chittorgarh'` (already has `'Broker-ref'`).
- `DataState` (in `src/types/source.ts`) gains `'aggregator'` and `'broker_reference'`.
- `SourceMix.totals` (in `src/types/ipo.ts`) gains `chittorgarh: number`.
- These are the smallest type extensions; Phase 5C closure §Y.4 rule 4 explicitly noted them as deferred-until-approved (not banned).
- **Slice 6A.1 (probe only) does NOT touch types.** Type changes happen in slice 6A.2 only, with separate operator approval.

---

## 4. Snapshots affected

| Snapshot | Phase 6A use | Slice |
|---|---|---|
| `src/data/snapshots/ipo-master.json` | Fast-fill `open_date`, `close_date`, `listing_date`, `price_band`, `issue_size_cr`, `lot_size`, `face_value`, `sector` (if Chittorgarh reliably has it) for IPOs where these are `null`. Existing rows where these fields are already populated by NSE / BSE / RHP are **untouched**. | 6A.2 |
| `src/data/snapshots/ipo-documents.json` | Fast-fill `registrar.name`, `brlms[]` for IPOs where these are `null` / `[]`. Existing official `docs[]` entries (SEBI / BSE URLs) are **untouched**. | 6A.2 |
| `src/data/snapshots/ipo-subscriptions.json` | Fast-fill `rows[]` (QIB / NII / Retail / Anchor times) + `daily[]` from Chittorgarh's subscription table for IPOs where no NSE/BSE live data exists. Existing NSE/BSE-sourced rows are **untouched**. | 6A.2 |
| `src/data/snapshots/ipo-listing-performance.json` | Fast-fill `issue_price`, `listing_open / high / low / close`, `listing_gain_pct` for IPOs where official BSE / NSE quote-equity data is absent. Existing official rows **untouched**. | 6A.2 |
| `src/data/snapshots/ipo-source-audit.json` | Per-field provenance audit gains Chittorgarh / Broker-ref rows alongside existing NSE / BSE / SEBI / RHP / Manual / Derived. `source_mix.totals` gains `chittorgarh` + `broker_reference`. | 6A.3 |
| `src/data/snapshots/ipo-narrative.json` | **Only** for broker-reference narrative fields (`company_overview`, `strengths`, `risks`, `objectives`) — and only after slice 6A.5 separate approval. Existing manual narrative seeds for NFP / Vegorama / OnEMI are **untouched**. | 6A.5 (optional) |
| `src/data/snapshots/ipo-pdf-extraction-audit.json` | **NOT touched by Phase 6A**. PDF audit stays scoped to PDF extraction; aggregator audit lives in `ipo-source-audit.json`. | — |
| `src/data/snapshots/ipo-financials.json` | **HARD do-not-touch**. OnEMI's HIGH-confidence financials from Phase 5B are final. Chittorgarh's "basic financials" snippet has lower fidelity than RHP-extracted figures and would degrade the dashboard's signal value. | — |

---

## 5. Chittorgarh probe first (slice 6A.1)

Before building any fast-fill ingestion code, Phase 6A.1 runs a **refined** probe pass against Chittorgarh detail pages. Goals:

- **Re-run accessibility** against exactly 3 IPOs (see selection rule below) — confirm pages still load from GitHub Actions, no anti-bot/captcha regression vs the 2026-05-22 P-25 result.
- **Retune the P-26 selector set** to add the 5 fields that previously failed: `open_date`, `close_date`, `listing_date`, `registrar`, `brlms`. Use Chittorgarh's table label patterns (e.g., "IPO Opening Date", "IPO Closing Date", "Registrar", "Lead Manager(s)") — these labels are visible in the existing rendered HTML (`phase-0/broker-pages/chittorgarh-detail-1-rendered.html` + `-detail-2-rendered.html`).
- **Re-measure precision** on the 3 sample IPOs. Target: ≥ 0.80 precision across the 10-field set (per §Y.9.1 binding gate) OR ≥ 0.90 precision across a narrower 5-field set (`open_date`, `close_date`, `listing_date`, `price_band`, `lot_size`) that's most valuable for fast-fill.
- **Document layout stability**: how often does Chittorgarh's detail-page DOM change? P-25/P-26 captured one snapshot; 6A.1 captures a second snapshot for layout-drift baseline.
- **Document anti-bot / ToS posture**: confirm Chittorgarh's robots.txt + ToS posture vs low-frequency polling (single GET per page per hour at most).

### 5.1 IPO selection rule (automatic — binding)

1. **IPO #1**: OnEMI Technology (`https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/`) — Phase 6A's primary gap-fill target.
2. **IPO #2**: Bagmane REIT (`https://www.chittorgarh.com/ipo/bagmane-reit/3090/`) — the P-26 baseline; needed for the precision-delta comparison.
3. **IPO #3**: **automatically selected** — the extractor reads Chittorgarh's mainboard + SME list pages (already cached at `phase-0/broker-pages/chittorgarh-list-rendered.html` + `chittorgarh-sme-rendered.html` from Phase 5C P-25) and picks the first currently-open IPO whose detail URL is accessible (HTTP 2xx, no challenge). If no current/open IPO is accessible, the extractor falls back to the most recently-listed IPO from the same list pages. **No operator input required.** The fallback path + the selected IPO's slug + URL are recorded verbatim in `phase-6A-1-status.md`.

### 5.2 Output artifacts

- `scripts/probes/P-25b-chittorgarh-retune.ts` — refined accessibility check
- `scripts/probes/P-26b-chittorgarh-extract-retune.ts` — refined selector extraction
- `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html` — per-IPO HTML
- `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-extracted-retuned.json` — per-IPO field extraction
- New rows in `phase-0/source-probe-results.json` (`P-25b`, `P-26b`)
- `phase-6A-1-status.md` (NEW) — precision breakdown, per-field outcome, layout-stability finding, anti-bot / ToS / robots posture, selected IPO #3 + fallback flag, recommendation: PROCEED to 6A.2 / RETUNE further / HOLD.

### 5.3 Strict constraints

**No captcha solving, no login, no stealth plugins, no proxy bypass, no fingerprint spoofing**. Single request per page per probe pass. Desktop UA only. 60s per-host timeout. Any anti-bot challenge → RED + halt.

---

## 6. Brokerage probe second (slice 6A.4)

After slices 6A.1 + 6A.2 + 6A.3 are accepted, slice 6A.4 probes Zerodha / Upstox detail pages for **narrative-style fields only** (company_overview, strengths, risks, objectives) — fields that Chittorgarh either doesn't reliably surface or doesn't surface at all. P-23a / P-23b / P-27 / P-28 already established the access + render-mode baselines (both server-rendered, no anti-bot challenge from CI, GREEN in `phase-0/source-probe-results.json`).

Strict constraints:

- **No login.** No paid/paywalled content.
- **No captcha bypass.** No stealth / fingerprint spoofing.
- **No copyrighted long-form copying.** Only short, source-labeled, factual snippets (1–3 sentence summary; or bulleted strengths/risks list with ≤ 100 chars per bullet).
- **Per-snippet audit row** in `ipo-source-audit.json` tagged `source: 'Broker-ref'`, `state: 'broker_reference'`.
- **Defer to Chittorgarh first**: a field populated by Chittorgarh in slice 6A.2 takes precedence over a same-field broker fetch.

This slice's success criterion is **lower** than 6A.1 — broker is a fallback, so even a 0.60 precision is acceptable IF the displayed content is clearly source-labeled and corrigible.

---

## 7. Conflict handling

When an aggregator/broker value differs from the existing official value:

1. **Production field stays as the official value.** No silent replacement.
2. **Aggregator/broker value goes into the audit trail** as a `conflict_note` on the matching `SourceAuditEntry` row, with both values logged + the source URL + fetched_at_utc.
3. **Conflict surfaces in a new artifact** `phase-6A-conflicts.json` (slice 6A.3) listing per-IPO per-field disagreements between official and aggregator/broker. This is operator review material — NOT auto-merged.
4. **UI gets a small conflict indicator**: an info icon next to the field on the IPO Detail page links to the conflict-detail tooltip. Slice 6A.3 specifies the indicator; no UI redesign — same `<SourceAuditChip>` primitive gains an optional `conflict?: { other_source, other_value, other_url, fetched_at_utc }` prop.

If the conflict resolves in favor of the aggregator (e.g., the official source was stale and the operator confirms the aggregator value is current), promotion is done via a **separate explicit operator approval** — not automated. Phase 6A's pipeline is gap-fill, not authoritative-disagreement-resolution.

---

## 8. UI impact (no redesign)

Phase 6A does **not** redesign the dashboard. Existing components handle most of the new states via small additive changes:

1. **`src/components/chrome/SourcePill.tsx`** — currently supports 8 source labels (NSE / BSE / SEBI / RHP / Registrar / Manual / Broker-ref / Derived). Phase 6A.2 adds **one** new label: `Chittorgarh` (suggested tone: a distinct color, e.g., orange or peach, that's clearly aggregator-flavored). Same component shape, ~5-line type + label addition.
2. **`src/components/chrome/StateBadge.tsx`** — currently supports 4 tones (`live` / `awaiting` / `manual` / `unavailable`). Phase 6A.2 adds **two** new tones: `aggregator` (mid-saturation green or teal — distinguishable from `live` emerald) and `broker_reference` (amber, similar to today's `Broker-ref` source tone). ~10-line addition.
3. **`src/components/ipo/SourceAuditPanel.tsx`** — currently renders a per-IPO `source_mix.totals` bar across 7 buckets. Phase 6A.3 adds **two** new buckets: `chittorgarh` + `broker_reference`. The component already iterates `MIX_LABELS`; one entry per bucket.
4. **`SourceAuditChip`** (used inline next to field values across the detail page) — gains an optional `conflict?` prop (§7). When set, the chip renders a tiny info icon that, on hover, shows the aggregator's competing value + URL. ~15-line addition. Slice 6A.3.
5. **GMP card on `/gmp`** — currently shows "Awaiting" placeholder. Phase 6A.2 (if Chittorgarh's GMP table is in the probe's working set) wires up the existing `<IndicativeGMPCard>` (already designed in master plan §K.6) with per-IPO `aggregate_gmp` + `dispersion` + per-source breakdown. **Must carry "INDICATIVE" label + dispersion warning when `dispersion / median > 30%`** (master plan §K.6 verbatim).

**Strict rule**: Chittorgarh / GMP / broker values **must be visibly source-labeled** in the UI. A user looking at any IPO Detail page must be able to see, at a glance, which fields are official vs aggregator vs broker. This is the non-negotiable trust contract. No silent replacement.

---

## 9. Guardrails (binding)

### 9.1 Phase 6A must NOT

- Remove the existing official-source ingestion pipeline (NSE / BSE / SEBI ingest in `scripts/ingest/*` stays untouched).
- Remove the PDF extraction pipeline (`scripts/pdf/*` stays untouched).
- Scrape **Trendlyne** under any circumstance (master plan §A binding).
- Bypass captcha / login / anti-bot protections on any source.
- Add DB / Workers / cron / GMP production integration **before** source probes pass.
- Build a broad scraper before slice 6A.1 probe results are reviewed and accepted.
- Fake any field value.
- Overwrite any official-source `live` value with an aggregator or broker value.
- Promote any field at LOW confidence.
- Stage PDF binaries or full-text dumps.
- Touch `ipo-financials.json` (OnEMI's HIGH-confidence financials are final).
- Touch `ipo-pdf-extraction-audit.json` (PDF audit stays scoped to PDF work).
- Modify `scripts/ingest/source-audit.ts` semantics beyond adding the new tag rollups.
- Mutate non-OnEMI rows except where the operator-approved precedence rules permit gap-fill.

### 9.2 Phase 6A IS allowed to

- Re-run Chittorgarh probes (P-25b, P-26b) with refined selectors — bounded, OnEMI + Bagmane REIT + 1 auto-selected third IPO only, no production scrape.
- Add `'Chittorgarh'` to `SourceTag` and `'aggregator'` + `'broker_reference'` to `DataState` — **slice 6A.2 only**, with explicit operator approval.
- Extend `SourceMix.totals` with `chittorgarh: number` and `broker_reference: number` — slice 6A.3 only.
- Add small additive UI changes per §8 — each slice's UI delta is a separate approval.
- Fast-fill production snapshots per §2 precedence rules — slice 6A.2 only.
- Write conflict-audit artifacts (`phase-6A-conflicts.json`) — slice 6A.3.
- Probe broker pages (Zerodha / Upstox) for narrative gap-fill — slice 6A.4 + 6A.5.

---

## 10. Implementation slices + Acceptance gate + Gate 2 implementation prompt

### 10.1 Implementation slices

Each slice is its own planning doc + Gate 2 implementation pair. Slice gates cascade — later slices cannot start until earlier slices accept.

| Slice | Scope | Depends on | Cannot proceed without |
|---|---|---|---|
| **6A.1** | Chittorgarh probe retune (P-25b / P-26b) — no snapshot writes; no type changes; no UI; no ingestion | Phase 6A Gate 1 (this plan) accepted | Operator approval of §10.3 prompt |
| **6A.2** | Chittorgarh fast-fill for master / documents / subscription / listing-performance — adds `SourceTag.Chittorgarh` + `DataState.aggregator` + `SourceMix.totals.chittorgarh` + UI source-pill / state-badge tones; writes per-field audit rows | 6A.1 accepted with precision ≥ 0.80 (or ≥ 0.90 on narrow set per §5) AND operator approval of a separate Phase 6A.2 planning doc | 6A.1 + 6A.2 planning approvals |
| **6A.3** | Source precedence audit (`phase-6A-conflicts.json`) + UI conflict indicator | 6A.2 accepted | 6A.3 planning approval |
| **6A.4** | Broker-reference probe (refine P-27 / P-28 selectors for narrative fields) | 6A.2 + 6A.3 accepted | 6A.4 planning approval |
| **6A.5** | Optional broker-reference narrative fill into `ipo-narrative.json` for `company_overview` / `strengths` / `risks` / `objectives` | 6A.4 accepted | 6A.5 planning approval |

**No slice may proceed without explicit operator approval of its own planning doc.** This is the same gated pattern Phase 5B / 5B.1 / 5B.X / 5B.2 used.

### 10.2 Acceptance gate (for slice 6A.1)

Slice 6A.1 implementation can be accepted only if ALL hold post-run:

1. ✅ `scripts/probes/P-25b-chittorgarh-retune.ts` + `scripts/probes/P-26b-chittorgarh-extract-retune.ts` exist + typecheck-clean.
2. ✅ Both probes run from a GitHub Actions runner (the existing `probes.yml` workflow) — no sandbox-only execution.
3. ✅ Exactly 3 IPO detail pages re-fetched: OnEMI Technology + Bagmane REIT + the automatically-selected third IPO (current/open via the §5.1 selection rule, with the recent/listed fallback documented in the status doc if applicable); per-IPO rendered HTML committed under `phase-0/broker-pages/`.
4. ✅ Per-IPO refined-selector extraction JSON committed under `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-extracted-retuned.json`.
5. ✅ **Precision metric** computed verbatim from the 10-field set used in P-26 + the 5 newly-tuned fields (open/close/listing dates, registrar, brlms). Precision target: **≥ 0.80 on the full 10-field set OR ≥ 0.90 on the narrow 5-field gap-fill set** (`open_date`, `close_date`, `listing_date`, `price_band`, `lot_size`). If neither threshold met, recommendation: RETUNE or HOLD.
6. ✅ Layout-stability comparison: diff the 2026-05-22 snapshot vs the 6A.1-snapshot of Bagmane REIT detail page; the new probes' working selectors should match both snapshots, or the layout-drift signal is documented.
7. ✅ Anti-bot / captcha posture: no challenge detected in any of the 3 probe runs; confirmation that single-GET-per-hour rate keeps the source comfortable.
8. ✅ ToS / robots.txt posture: a one-line note in the status doc confirming Chittorgarh's robots.txt permits the probed paths AND single-request polling honors any rate-limit guidance.
9. ✅ `phase-6A-1-status.md` records: precision breakdown, per-field outcome, layout-stability finding, ToS posture, recommendation (PROCEED / RETUNE / HOLD), and the IPO #3 selection result (slug + URL + fallback-used flag).
10. ✅ **NO production snapshot mutation**. `git diff src/data/snapshots/` after the probe run is empty.
11. ✅ **NO type changes**. `git diff src/types/source.ts` is empty.
12. ✅ **NO UI changes**. `git diff src/components/` is empty.
13. ✅ **NO ingestion changes**. `git diff scripts/ingest/` is empty.
14. ✅ **NO workflow changes**. `git diff .github/workflows/` is empty. The existing `probes.yml` dispatcher routes `probe=P-25b` / `probe=P-26b` / `group=K` inputs to the registry without code change. If a workflow change is found to be absolutely required at implementation time, the executor stops and asks for separate operator approval before modifying the workflow — it is NOT pre-approved scope.
15. ✅ `npm run typecheck` + `npm run build` green.

### 10.3 Implementation prompt for Phase 6A slice 6A.1 (Gate 2)

> Use this prompt verbatim when launching the slice 6A.1 execution pass. Implementation must not start until the operator explicitly approves this prompt as a separate, post-Gate-1 decision.

```
Phase 6A slice 6A.1 — Chittorgarh probe retune (no production scrape;
no snapshot writes; no type changes; no UI changes; no ingestion).

In-scope file changes:
  - scripts/probes/P-25b-chittorgarh-retune.ts (NEW; refined accessibility
    probe mirroring P-25, OnEMI + Bagmane REIT + 1 auto-selected IPO)
  - scripts/probes/P-26b-chittorgarh-extract-retune.ts (NEW; refined
    selector extraction mirroring P-26 with added label patterns for
    open_date, close_date, listing_date, registrar, brlms)
  - scripts/probes/lib/types.ts (add 'P-25b', 'P-26b' to a new PROBE_GROUPS
    entry 'K' — additive only)
  - scripts/probes/run.ts (register the two new probes in REGISTRY +
    extend default-order array)
  - phase-0/broker-pages/chittorgarh-list-rendered-v2.html (refreshed
    list page; auto-generated by P-25b)
  - phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html
    (per-IPO HTML; auto-generated by P-25b)
  - phase-0/broker-pages/chittorgarh-detail-{1,2,3}-extracted-retuned.json
    (per-IPO field extraction; auto-generated by P-26b)
  - phase-0/source-probe-results.json (P-25b + P-26b rows added by the
    existing reporter)
  - phase-0/source-probe-report.md (re-rendered by the existing reporter)
  - phase-6A-1-status.md (NEW; end-of-slice report with precision
    breakdown + recommendation)

Out of scope (HARD):
  - src/data/snapshots/* (do NOT mutate any production snapshot)
  - src/types/source.ts (do NOT extend; type changes are slice 6A.2)
  - src/types/ipo.ts / src/types/snapshot.ts (do NOT extend)
  - scripts/ingest/* (do NOT touch)
  - All UI files (src/components, src/pages, src/lib)
  - .github/workflows/* — slice 6A.1 must NOT touch any workflow file.
    The existing probes.yml dispatcher accepts `probe=P-25b` / `probe=P-26b`
    / `group=K` inputs and routes to the registry without code change.
    If a workflow change turns out to be absolutely required at
    implementation time, the executor MUST stop and ask for separate
    operator approval before modifying the workflow — this is not
    pre-approved scope.
  - PDF extraction pipeline (scripts/pdf/*)
  - Phase 5B / 5B.1 / 5B.X / 5B.2 artifacts (untouched)
  - Trendlyne (NEVER scraped)
  - Any login / captcha / stealth / proxy / fingerprint-spoof access
  - Any production scrape of Chittorgarh data into snapshots
  - LLM inference of any kind
  - PDF binaries or full-text dumps committed (existing CI guards apply)
  - Multi-IPO production scaling

Probe behavior (both P-25b and P-26b):
  - 3 IPO URLs are determined by the §5.1 selection rule:
      * IPO #1 = OnEMI Technology (fixed slug)
      * IPO #2 = Bagmane REIT (fixed slug)
      * IPO #3 = AUTOMATIC: extractor reads the cached Chittorgarh
        mainboard + SME list pages from phase-0/broker-pages/ and picks
        the first currently-open IPO with an accessible detail URL
        (HTTP 2xx, no challenge). If no current/open IPO is reachable,
        fall back to the most recently-listed IPO from the same lists.
        The selected slug + URL + fallback-used flag are written into
        phase-6A-1-status.md verbatim. NO operator input required.
  - OnEMI + Bagmane URLs land in scripts/probes/lib/types.ts as constants
    alongside the existing chittorgarh URL constants; IPO #3 is resolved
    at probe-run time, not hard-coded.
  - Single GET per page per run; desktop UA; 60s per-host timeout; no
    retries on challenge.
  - P-25b: static GET first; Playwright fallback only if static body
    < 10 KB or <noscript>-only. No stealth.
  - P-26b: refined label selectors. Add patterns for:
      * open_date: "IPO Open Date" / "Opening Date" / "Bid Open"
      * close_date: "IPO Close Date" / "Closing Date" / "Bid Close"
      * listing_date: "Listing Date" / "Tentative Listing"
      * registrar: "Registrar" / "Registrar to the Issue"
      * brlms: "Lead Manager(s)" / "Book Running Lead Manager"
    Use the existing P-26 table-parsing helper unchanged for the
    issue-size / price-band / lot-size selectors that already work.
  - Compute precision: # HIGH-confidence fields / # total candidate
    fields, per IPO + aggregate across 3 IPOs.
  - Write per-IPO extracted JSON + a roll-up precision summary into
    phase-0/source-probe-results.json (using the existing reporter
    helper).

Hard guardrails:
  1. OnEMI is one of the 3 sample IPOs (since OnEMI is Phase 6A's primary
     gap-fill target).
  2. No production snapshot mutation under any circumstance.
  3. No type / UI / workflow / ingest / pdf-pipeline change.
  4. typecheck + build pass before any commit.
  5. Stay on main; no feature branches.
  6. Bounded artifacts: rendered HTML capped at 150 KB by writeSample;
     screenshots optional ≤ 1 MB; no *.full.txt dumps.
  7. Phase 5C closure §Y.4 + §Y.9.1 rules apply: low-frequency polling,
     official-source-non-overwrite (moot here since no production
     writes), per-field audit, no silent promotion.

Verification order (binding):
  (a) Preflight: confirm phase-0/broker-pages/chittorgarh-detail-1-rendered.html
      + chittorgarh-detail-2-rendered.html exist (2026-05-22 P-25 baseline).
      Resolve IPO #3 automatically via the §5.1 selection rule by reading
      phase-0/broker-pages/chittorgarh-list-rendered.html + chittorgarh-sme-rendered.html;
      pick the first currently-open IPO with an accessible detail URL, or
      fall back to the most recently-listed IPO if none current/open are
      accessible; record the choice + fallback flag for the status doc.
      No operator input required.
  (b) Run: npm run probe -- --probe P-25b
  (c) Run: npm run probe -- --probe P-26b
  (d) Confirm phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html
      + chittorgarh-detail-{1,2,3}-extracted-retuned.json all exist.
  (e) Read the precision summary in
      phase-0/source-probe-results.json + the per-IPO extracted JSONs.
  (f) Confirm git diff src/data/snapshots/ is EMPTY.
      Confirm git diff src/types/ is EMPTY.
      Confirm git diff src/components / src/pages / src/lib is EMPTY.
      Confirm git diff scripts/ingest/ is EMPTY.
      Confirm git diff scripts/pdf/ is EMPTY (Phase 5B.2's narrow
      promoter fix at d197d11 is the last legitimate change there).
      Confirm git diff .github/workflows/ is EMPTY (no workflow change).
      Confirm no PDF binaries or full-text dumps staged.
  (g) npm run typecheck (probe additions must compile).
  (h) npm run build (dashboard still builds — no UI/type touches).
  (i) Write phase-6A-1-status.md with:
      - per-IPO precision (10-field set + narrow 5-field set)
      - per-field outcome (which of the 5 retuned anchors were extracted
        at HIGH on each of the 3 IPOs)
      - layout-stability diff vs 2026-05-22 baseline
      - anti-bot / captcha / ToS / robots.txt posture
      - IPO #3 selection result (slug + URL + fallback-used flag)
      - recommendation: PROCEED (precision met; ready for slice 6A.2
        planning) / RETUNE (precision close; selector adjustments
        proposed) / HOLD (precision well below gate; Phase 6A pause
        and reconsider strategy)
  (j) Commit + push to main.

After push:
  - STOP. Wait for operator review.
  - Do NOT start slice 6A.2 (which requires Chittorgarh fast-fill
    ingestion + type extensions) without explicit further approval of a
    separate Phase 6A.2 planning doc.
```

---

*End of Phase 6A Gate 1 planning document. Slice 6A.1 implementation requires separate explicit operator approval of §10.3 above. Slices 6A.2 / 6A.3 / 6A.4 / 6A.5 each their own planning + implementation gate pair after 6A.1 closes.*
