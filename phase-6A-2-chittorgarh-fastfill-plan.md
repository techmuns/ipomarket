# Phase 6A.2 — Chittorgarh Fast-fill Ingestion (planning only)

> **Mode**: planning. No code edits. No snapshot mutations. No type changes. No UI changes. No workflow changes. No probe runs. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §11 implementation prompt below.
>
> **Date**: 2026-05-24
>
> **Predecessors**: `phase-6A-aggregator-fastfill-plan.md` (Phase 6A umbrella, slice-gate model), `phase-6A-1-status.md` (Phase 6A.1 closed PROCEED at commit `313760d`), `phase-5C-closure.md` (Chittorgarh rejected as primary; reference-only — this slice is the approved production-ingest gate that re-opens it under stricter precedence), `broker-aggregator-source-plan.md` (§Y.4 source policy + §Y.9.1 production gate), Phase 5B.1 / 5B.X / 5B.2 status docs (string-surgery promoter + artifact-to-snapshot bridge precedent), master plan §EE.
>
> **Trigger**: Phase 6A.1 closed PROCEED. Chittorgarh's robots.txt **allows** `/ipo/<slug>/<id>/` detail pages for `User-agent: *` (the only `/ipo`-area Disallow is `/ipo/ipo_discussions.asp`, the forum). P-25b reachability GREEN (static 200 ×3, no anti-bot). P-26b precision GREEN: full-10 **0.833**, narrow-5 **0.933**, stable across 3 CI runs. OnEMI shows zero conflict vs repo truth and Chittorgarh's `official_pdf_links` cross-validates the repo's BSE RHP URL. BRLM is static-unavailable (JS-rendered) and must not be faked. Phase 6A.2 builds the **production fast-fill ingestion layer**: read the proven P-26b extraction artifact for OnEMI, normalize raw strings to typed values, fill **only the null** issue-term fields in `ipo-master.json` + `ipo-documents.json` with full per-field Chittorgarh provenance and zero official-overwrite. This is the §DD slice 6A.2; it implements the §DD.5-flagged type extensions (now that the production-ingest gate is approved).
>
> **Scope discipline (binding)**:
> - **OnEMI only.** OnEMI is the only Chittorgarh-probed IPO that exists in `ipo-master.json`; Bagmane REIT + M R Maniveni were probe samples and are NOT tracked in the repo's master.
> - **Fill only `null`/unavailable fields.** Never replace an official or non-null value.
> - **Promote only HIGH/MEDIUM-confidence values.** LOW-confidence values are never promoted.
> - **Every filled field is source-labeled Chittorgarh + auditable.**
> - **Deferred / blocked (stay null):** `face_value`, GMP/Kostak/subject-to-sauda, subscription, sector, BRLMs (static-unavailable — no JS render, no fake), financials, narrative, strengths, risks, objectives, recommendations.
> - **No mutation** of `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `ipo-listing-performance.json`, or OnEMI's RHP financial values.
> - **No Trendlyne under any circumstance** (master plan §A). No Zerodha/Upstox/broker scraping (reference-only; slice 6A.4+).
> - **No login / captcha bypass / stealth / fingerprint spoofing / proxy rotation. No JS rendering** (the promoter reads a committed static-extraction artifact).
> - **No `.github/workflows/*` change. No cron** (workflow_dispatch / manual first).
> - **No PDF binaries or full-text dumps committed.**
> - Stay on `main`.
>
> **Two-gate execution**: Gate 1 = this planning doc only (no code). Gate 2 = the implementation pass described in §11, requires separate explicit operator approval. Gate 2 MUST NOT start in the same turn as Gate 1.

---

## 1. Objective

Use Chittorgarh as **first-priority fast-fill for MISSING IPO metadata, only after official sources**:

- **Never replace** an official/source-backed value.
- Fill **only `null`/unavailable** fields.
- Every filled field is **source-labeled Chittorgarh + auditable** (per-field provenance in `ipo-source-audit.json`, visible via the existing `SourceAuditPanel`).
- Conflicts (official value exists and differs) are **reported in the audit/status, never silently overwritten**.

This is the production fast-fill ingestion layer for the §DD Phase 6A pivot: the dashboard's enrichment strategy shifts from PDF-first/slow to aggregator-backed gap-fill/fast, while official sources stay the highest-priority feed.

## 2. Source precedence (binding, per field)

For every field, evaluated in order:

1. **Official/source-backed repo value wins** — if the field is non-null in `ipo-master.json` / `ipo-documents.json` (regardless of its `source`), Chittorgarh does NOT touch it.
2. **Else Chittorgarh HIGH/MEDIUM** may fill the null field, tagged `source: 'Chittorgarh', state: 'aggregator'`.
3. **Else manual/null remains.**
4. **Conflicts** (non-null existing value + a differing Chittorgarh value) → logged to `phase-6A-2-status.md` + an audit `note`; the existing value is preserved. For OnEMI specifically there are **zero conflicts** (all candidate fields are null), but the merger logic is conflict-safe for future IPOs.

LOW-confidence Chittorgarh values are never promoted.

## 3. Candidate fields for 6A.2

**Included** (P-26b extracts these at HIGH/MEDIUM for OnEMI; all currently null in repo):

| Field | Target snapshot | OnEMI confidence | Raw → typed normalization needed |
|---|---|---|---|
| `price_band` | ipo-master | HIGH (`₹162 to ₹171`) | parse `₹A to ₹B` → `{ low, high }` |
| `issue_size_cr` | ipo-master | HIGH (`…agg. up to ₹ 926 Cr`) | regex `₹\s*([\d,]+(?:\.\d+)?)\s*Cr` → number (926) |
| `lot_size` | ipo-master | HIGH (`87 Shares`) | regex `([\d,]+)\s*Shares?` → number (87) |
| `open_date` | ipo-master | MEDIUM (`2026-04-30`, ISO) | already ISO |
| `close_date` | ipo-master | MEDIUM (`2026-05-05`, ISO) | already ISO |
| `listing_date` | ipo-master | HIGH (`2026-05-08`, ISO) | already ISO |
| `registrar` | ipo-documents | MEDIUM (`Kfin Technologies Ltd.`) | `{ name, portal_url: null }` |

**Deferred / blocked:**

- **`face_value`** — present in static HTML for OnEMI (`₹1per share`) but **P-26b does not extract it** (not in `EXPECTED_FIELDS`). Including it requires a tiny extractor extension (add a "Face Value" label selector + ₹-parse) + a re-probe to confirm HIGH/MEDIUM. **Defer to a fast-follow slice 6A.2.1** to keep the first cut to fields the artifacts already support.
- **GMP / Kostak / subject-to-sauda** — **not in the static HTML** (only `<meta>` description text + outbound links to investorgain). Not cleanly extractable without JS. **Defer** (Phase 6 GMP module owns this).
- **subscription** — present in static HTML only for **closed** IPOs (OnEMI/Bagmane historical); the **current-open** IPO (M R Maniveni) has **no** subscription table yet. Historical Chittorgarh subscription would conflict with the official NSE subscription pipeline (`scripts/ingest/subscriptions.ts`). **Defer** — too messy + conflict-prone for a first cut.
- **BRLMs** — static-unavailable (JS-rendered). **Blocked**; no fake-fill, no JS render.
- **sector** — not extracted by P-26b. **Defer.**
- **financials / strengths / risks / objectives / narrative / recommendations** — **blocked** (out of the fast-fill lane entirely).

## 4. Target snapshots

| Snapshot | Write | Rule |
|---|---|---|
| `src/data/snapshots/ipo-master.json` | OnEMI row: fill null `price_band`, `issue_size_cr`, `lot_size`, `open_date`, `close_date`, `listing_date` | only null fields; row-level `state` stays `manual`; 10 existing rows + timelines[] + source_meta byte-identical |
| `src/data/snapshots/ipo-documents.json` | OnEMI row: fill null `registrar` (`{ name, portal_url: null }`); `brlms` stays `[]` | only null fields; existing `docs[]` (the BSE RHP) untouched; 10 non-OnEMI rows byte-identical |
| `src/data/snapshots/ipo-source-audit.json` | **Add** an OnEMI entry (currently absent): `fields[]` rows for each Chittorgarh-filled field (`source: 'Chittorgarh', state: 'aggregator', url, fetched_at_utc`) + `source_mix` incl. the new `chittorgarh` bucket | additive; existing IPO audit entries untouched |

**Do NOT mutate**: `ipo-financials.json`, `ipo-narrative.json`, OnEMI's official RHP financial values, any non-null official field, `ipo-subscriptions.json` (subscription deferred), `ipo-listing-performance.json`.

## 5. Data model / provenance

Every Chittorgarh-filled field is traceable via the `ipo-source-audit.json` `fields[]` entry + the `phase-6A-2-status.md` report. Per-field record carries:

| Attribute | Where |
|---|---|
| `source_label: 'Chittorgarh'` | audit `fields[].source` (new `SourceTag`) |
| `source_url` | audit `fields[].url` (the Chittorgarh detail URL) |
| `fetched_at_utc` | audit `fields[].fetched_at_utc` (from the probe artifact's capture time) |
| `state: 'aggregator'` | audit `fields[].state` (new `DataState`) |
| `raw_label` / `raw_value` / `normalized_value` | recorded in `phase-6A-2-status.md` + the promoter's side log (the probe artifact already stores `method` + `source_snippet` with the raw) |
| `confidence` | gating only (HIGH/MEDIUM promote); recorded in the status doc |
| `conflict` flag | only if an official value exists and differs (none for OnEMI) — logged to status |

**Smallest schema extension** (`src/types/source.ts` + `src/types/ipo.ts`):

- `SourceTag` += `'Chittorgarh'`
- `DataState` += `'aggregator'` (NOTE: `'broker_reference'` is reserved for slice 6A.4; add **only** `'aggregator'` now to keep the extension minimal — defer `'broker_reference'` to 6A.4)
- `IpoSourceAudit.source_mix` += `chittorgarh: number`
- `SourceMix.totals` (in `src/types/source.ts`) += `chittorgarh: number`

These are exactly the §DD.5 deferred extensions; 6A.2 is the approved production-ingest gate that implements them. Using the existing `'live'` state for Chittorgarh data is **rejected** — it would mislabel aggregator data as official-grade, violating the trust contract.

## 6. Ingestion design

**Artifact-to-snapshot bridge** (mirrors Phase 5B.1; no new network code in the promoter):

| Script | Role |
|---|---|
| Discovery / extraction | **Reuse the existing P-25b + P-26b probes** unchanged. The probe workflow (`probes.yml` / `phase-0-probes`, cron + dispatch) keeps `phase-0/broker-pages/chittorgarh-detail-<onemi-index>-extracted-retuned.json` + `chittorgarh-fields-v2.json` fresh on `main`. **6A.2 does NOT re-fetch Chittorgarh** — it reads the committed artifact. |
| `scripts/pdf/promote/onemi-chittorgarh-fastfill.ts` (NEW) | OnEMI-only promoter. (1) Read `chittorgarh-fields-v2.json`, find OnEMI by Chittorgarh slug (`onemi-technology-ipo`) → its detail index. (2) Read that `chittorgarh-detail-N-extracted-retuned.json`. (3) Normalize raw strings → typed (price_band `{low,high}`, issue_size_cr number, lot_size number; dates already ISO; registrar clean string). (4) Read `ipo-master.json` + `ipo-documents.json` + `ipo-source-audit.json` via `readJsonOrNull`. (5) Preflight (see §6.1): OnEMI present in master + documents; each candidate field is null; confidence is HIGH/MEDIUM. (6) Fill ONLY null fields via string-surgery splice (mirror `scripts/pdf/promote/onemi.ts` + `onemi-master.ts`). (7) Write per-field audit entries to `ipo-source-audit.json`. (8) Atomic write. Idempotent (re-run = no-op since fields now non-null). |
| Source-audit | Extend `scripts/ingest/source-audit.ts` `recomputeSourceMix()` with one `else if (source === 'Chittorgarh')` bucket — OR write the OnEMI audit entry directly in the promoter (OnEMI isn't in the audit yet). **Recommend**: promoter writes the OnEMI audit entry directly; the existing rebuild picks up the `chittorgarh` bucket via the new condition. |
| Status writer | `phase-6A-2-status.md` — per-field raw→normalized table, confidence, conflicts (none expected), provenance, byte-identity confirmation. |

**Explicit OnEMI mapping** (the production ipo_id differs from the Chittorgarh slug): `{ production_ipo_id: 'onemi-technology-solutions', chittorgarh_slug: 'onemi-technology-ipo', chittorgarh_id: '2576', detail_url: 'https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/' }`. For scaling this becomes a small map (like `scripts/ingest/lib/symbol-map.ts`).

**Safe-merge rules** (binding, same as Phase 2 safe-merge / Phase 5B.1): read-existing-first; never wipe rows; never overwrite official or non-null fields; atomic writes (`.tmp`+rename); idempotent; robots-respecting (only `/ipo/<slug>/<id>/`, never `/ipo/ipo_discussions.asp`); low-frequency (the promoter reads a committed artifact, so zero live requests — the probe workflow owns polling cadence).

### 6.1 Artifact freshness + provenance preflight (binding)

Because 6A.2 is an **artifact-to-snapshot bridge** (it trusts the committed probe artifacts rather than re-fetching), the promoter MUST validate the artifacts before writing ANY snapshot. If any check fails, the promoter **HALTs, writes nothing**, and prints the failing check. The checks, in order:

1. **Artifacts exist** —
   - `phase-0/broker-pages/chittorgarh-fields-v2.json`
   - `phase-0/broker-pages/chittorgarh-extraction-summary-v2.json`
   - the OnEMI per-detail artifact `phase-0/broker-pages/chittorgarh-detail-<index>-extracted-retuned.json`, where `<index>` is resolved by finding the `picked_detail_urls[]` entry in `chittorgarh-fields-v2.json` whose `slug === 'onemi-technology-ipo'`. HALT if the slug isn't found or the resolved file is missing.

2. **Artifacts came from a successful post-retune / post-robots `group=K` run** —
   - `chittorgarh-fields-v2.json.robots_posture.classification` ∈ { `'allowed-prior-flag-was-over-match'`, `'allowed-no-applicable-disallow'` }. HALT on `'genuine-ipo-detail-disallow'` or `'unknown'`.
   - `chittorgarh-extraction-summary-v2.json` precision still satisfies the accepted gate: `average_precision_ratio_full >= 0.80` **OR** `average_precision_ratio_narrow >= 0.90`. HALT otherwise. (Also re-confirm the OnEMI per-detail `precision_ratio_*` is consistent — a sanity guard against a stale summary.)

3. **OnEMI artifact matches the expected mapping** — verify all of:
   - production_ipo_id = `onemi-technology-solutions` (the row the promoter will write)
   - chittorgarh_slug = `onemi-technology-ipo`
   - chittorgarh_id = `2576`
   - detail_url = `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/` (the resolved `picked_detail_urls[].url` and the per-detail artifact's `source_url` must both equal this). HALT on any mismatch (guards against the auto-selector or list layout having shifted OnEMI's slug/id).

4. **Usable provenance** — for the artifact overall and for **every field about to be promoted**:
   - `generated_at_utc` (summary) / `captured_at_utc` (fields-v2) / per-field timestamp is present;
   - `source_url` present (the Chittorgarh detail URL);
   - `raw_value` (the extractor's `source_snippet` / raw) **and** a successfully `normalized_value` are both available for each promoted field;
   - `confidence` is HIGH or MEDIUM for each promoted field.
   Any field failing this is **dropped from the promotion set** (left null), not promoted at reduced rigor; if that empties the promotion set, the promoter HALTs with "no promotable fields after provenance preflight".

5. **Freshness guard** — derive the artifact age from the newest available timestamp (`chittorgarh-extraction-summary-v2.json.generated_at_utc`, falling back to `chittorgarh-fields-v2.json.captured_at_utc`). If that timestamp is **missing/undated** OR **older than 7 days** relative to the run time, the promoter **HALTs** and prints: "Chittorgarh artifacts are stale/undated (age = …); re-run `phase-0-probes` with `group=K` before fast-fill." **Never promote from stale or undated artifacts.**

These checks are cheap (pure reads of already-committed JSON) and run before the existing safe-merge preflight (OnEMI present in master + documents; candidate fields null). The promoter only proceeds to string-surgery once both preflights pass.

## 7. Scope for first implementation — **OnEMI only**

**Recommended first cut: OnEMI only.** Rationale:

- OnEMI is the **only** Chittorgarh-probed IPO that exists in `ipo-master.json`. Bagmane REIT + M R Maniveni were probe samples and are **not** tracked in the repo's master.
- Filling Bagmane/Maniveni would require **new master rows** (a Phase-5B.X-style master-linkage change), which pollutes the master with probe-sample IPOs and is out of the fast-fill lane.
- OnEMI-only is tiny, idempotent, reversible (revert = delete the filled values + the audit entry), and exercises the full pipeline end-to-end.

**Scaling after acceptance** (later slice 6A.2.1): generalize the promoter to iterate `ipo-master.json` IPOs that have an entry in an explicit `chittorgarh-map` (production_ipo_id ↔ slug/id), filling each one's null fields. **Unmatched Chittorgarh IPOs are never auto-added to master** — master rows are created only via the separate, gated master-linkage process (Phase 5B.X pattern), never by the fast-fill promoter. This keeps master clean.

## 8. UI impact (minimal, additive — reuse existing components)

The existing `SourceAuditPanel` (already on the IPO detail page) is the authoritative per-field provenance display. Minimal additive changes so it renders Chittorgarh correctly:

1. `src/components/chrome/SourcePill.tsx` — add `'Chittorgarh'` to the `STYLES` map (1 line; suggested orange/peach tone, clearly aggregator-flavored).
2. `src/components/chrome/StateBadge.tsx` — add an `'aggregator'` tone + label (DataState extension; ~3 lines).
3. `src/components/ipo/SourceAuditPanel.tsx` — add `chittorgarh` to `MIX_COLORS` + `MIX_LABELS` (2 lines) so the per-IPO source-mix bar shows the Chittorgarh slice.
4. `src/components/ipo/IssueTermsGrid.tsx` — **required correctness fix**: the header `SourceAuditChip` currently hardcodes `source = segment === 'sme' ? 'BSE' : 'NSE'`. For OnEMI (mainboard) that would **mislabel** Chittorgarh-filled terms as "NSE". Change it to read the dominant issue-terms source from the IPO's `ipo-source-audit.json` entry (fall back to the segment heuristic only when no audit entry exists). This is small but required — mislabeling aggregator data as official violates the trust contract.

No redesign. No new components. `SourceAuditChip` + `FreshnessChip` work unchanged once `SourcePill` knows `'Chittorgarh'`.

## 9. Guardrails (binding)

Phase 6A.2 must NOT:

- Scrape Trendlyne; scrape Zerodha/Upstox/any broker (those are 6A.4+ reference-only).
- Bypass captcha/login/stealth/proxy; render JS; recover BRLMs by any means.
- Fake any value (BRLM stays `[]`; deferred fields stay null).
- Overwrite any official or non-null field.
- Promote LOW-confidence values.
- Mutate `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `ipo-listing-performance.json`, or OnEMI's RHP financials.
- Commit PDF binaries or full-text dumps.
- Touch `.github/workflows/*` (no new workflow; the promoter runs via `npm run` locally or is added to an existing dispatch only with separate approval) — **no cron**; workflow_dispatch/manual first.
- Change the existing NSE/BSE/SEBI ingest in `scripts/ingest/*` (only an additive `chittorgarh` bucket in `source-audit.ts`'s mix recompute is allowed).
- Leave `main`.

Phase 6A.2 IS allowed to: add `'Chittorgarh'` to `SourceTag`; add `'aggregator'` to `DataState`; add `chittorgarh` to the source-mix totals; create the OnEMI-only promoter under `scripts/pdf/promote/`; add the OnEMI `ipo-source-audit.json` entry; make the 4 minimal UI additive changes (§8); fill OnEMI's null fields in master + documents.

## 10. Acceptance gate (for Gate 2)

Implementation accepted only if ALL hold:

0. **Artifact freshness + provenance preflight passed** (§6.1): the Chittorgarh artifacts exist + resolve OnEMI by slug; robots classification is an `allowed-*` value; P-26b precision still meets the gate (full-10 ≥ 0.80 OR narrow-5 ≥ 0.90); the OnEMI mapping (production_ipo_id / slug / id / detail_url) matches; every promoted field has source_url + timestamp + raw + normalized + HIGH/MEDIUM confidence; the artifact timestamp is present and ≤ 7 days old. If any failed, the promoter HALTed and wrote nothing (an acceptable terminal outcome — re-run `group=K`, then retry).
1. Only null/unavailable OnEMI fields filled (`price_band`, `issue_size_cr`, `lot_size`, `open_date`, `close_date`, `listing_date` in master; `registrar` in documents).
2. Official values untouched; the 10 existing master rows + 10 existing documents rows byte-identical (JSON-semantic).
3. Chittorgarh values visibly source-labeled — `ipo-source-audit.json` OnEMI entry tags each field `source: 'Chittorgarh', state: 'aggregator'`; `SourceAuditPanel` renders the Chittorgarh slice; `IssueTermsGrid` chip no longer mislabels.
4. Every filled field has provenance (source_url + fetched_at_utc + confidence + raw→normalized) recorded in `phase-6A-2-status.md`.
5. Conflicts reported, not overwritten (none expected for OnEMI; logic verified conflict-safe).
6. BRLM stays `[]`; deferred fields (face_value, GMP, subscription, sector) stay null.
7. `ipo-financials.json` / `ipo-narrative.json` / `ipo-subscriptions.json` / `ipo-listing-performance.json` untouched.
8. `npm run typecheck` + `npm run build` green.
9. `/ipo/onemi-technology-solutions` still renders (now showing the Chittorgarh-filled issue terms + Chittorgarh source labels); no console/render errors.
10. No unrelated snapshot/code change; no robots/ToS violation; no PDF binaries/full-text dumps; stay on `main`.

## 11. Gate 2 implementation prompt (ready-to-paste)

> Use verbatim when launching the Phase 6A.2 Gate 2 pass. Do not start until the operator approves this prompt as a separate, post-Gate-1 decision.

```
Phase 6A.2 — Chittorgarh fast-fill ingestion (OnEMI only; gap-fill; no official overwrite).

In-scope file changes:
  - src/types/source.ts (SourceTag += 'Chittorgarh'; DataState += 'aggregator'; SourceMix.totals += chittorgarh)
  - src/types/ipo.ts (IpoSourceAudit.source_mix += chittorgarh: number)
  - scripts/pdf/promote/onemi-chittorgarh-fastfill.ts (NEW; OnEMI-only artifact-to-snapshot bridge + string-surgery promoter)
  - src/data/snapshots/ipo-master.json (OnEMI row: fill null price_band, issue_size_cr, lot_size, open_date, close_date, listing_date; 10 existing rows + timelines[] + source_meta byte-identical)
  - src/data/snapshots/ipo-documents.json (OnEMI row: fill null registrar; brlms stays []; 10 non-OnEMI rows byte-identical)
  - src/data/snapshots/ipo-source-audit.json (ADD OnEMI entry: per-field Chittorgarh audit rows + chittorgarh mix bucket)
  - scripts/ingest/source-audit.ts (recomputeSourceMix: add one `else if (source === 'Chittorgarh')` bucket; no other change)
  - src/components/chrome/SourcePill.tsx (+ 'Chittorgarh' STYLES entry)
  - src/components/chrome/StateBadge.tsx (+ 'aggregator' tone/label)
  - src/components/ipo/SourceAuditPanel.tsx (+ chittorgarh to MIX_COLORS + MIX_LABELS)
  - src/components/ipo/IssueTermsGrid.tsx (header chip: read dominant issue-terms source from ipo-source-audit instead of hardcoding NSE/BSE; fall back to segment heuristic when no audit entry)
  - phase-6A-2-status.md (NEW; per-field raw→normalized + provenance + byte-identity report)

Out of scope (HARD):
  - ipo-financials.json / ipo-narrative.json / ipo-subscriptions.json / ipo-listing-performance.json (do NOT mutate)
  - OnEMI RHP financial values; any non-null official field
  - the 10 existing master rows / 10 existing documents rows
  - BRLMs (stays []; no JS/stealth recovery), face_value, GMP, subscription, sector (all deferred → stay null)
  - DataState += 'broker_reference' (defer to 6A.4)
  - existing NSE/BSE/SEBI ingest in scripts/ingest/* (only the additive chittorgarh bucket in source-audit.ts)
  - .github/workflows/* (no new workflow; no cron); Trendlyne; Zerodha/Upstox/broker scraping; captcha/login/stealth/proxy; JS rendering; PDF binaries/full-text dumps
  - any IPO other than OnEMI (Bagmane/Maniveni are NOT added to master)

Promoter behavior (scripts/pdf/promote/onemi-chittorgarh-fastfill.ts):
  - Hard-code the OnEMI mapping: production_ipo_id='onemi-technology-solutions',
    chittorgarh_slug='onemi-technology-ipo', chittorgarh_id='2576',
    detail_url='https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/'.
  - ARTIFACT FRESHNESS + PROVENANCE PREFLIGHT (binding, per §6.1) — run
    BEFORE any snapshot read/write; HALT + write nothing on any failure:
      1. Exist: chittorgarh-fields-v2.json + chittorgarh-extraction-summary-v2.json
         + the OnEMI per-detail artifact resolved by finding the
         picked_detail_urls[] entry whose slug === 'onemi-technology-ipo'
         → chittorgarh-detail-<index>-extracted-retuned.json. HALT if the
         slug isn't found or the resolved file is missing.
      2. Post-retune/post-robots group=K run:
         - fields-v2.json.robots_posture.classification ∈
           {'allowed-prior-flag-was-over-match','allowed-no-applicable-disallow'}.
           HALT on 'genuine-ipo-detail-disallow' or 'unknown'.
         - extraction-summary-v2.json: average_precision_ratio_full >= 0.80
           OR average_precision_ratio_narrow >= 0.90. HALT otherwise.
      3. OnEMI mapping match: the resolved picked_detail_urls[].url AND the
         per-detail artifact's source_url BOTH equal the hard-coded detail_url;
         slug='onemi-technology-ipo'; id='2576'. HALT on any mismatch.
      4. Usable provenance (artifact-level + per promoted field): a present
         generated_at_utc/captured_at_utc/fetched_at_utc; source_url present;
         raw_value (source_snippet) AND a successful normalized_value for each
         promoted field; confidence HIGH/MEDIUM for each. A field missing any
         of these is DROPPED from the promotion set (left null), not promoted
         at reduced rigor. If the set empties → HALT.
      5. Freshness guard: artifact age from the newest of
         extraction-summary-v2.generated_at_utc (fallback fields-v2.captured_at_utc).
         If missing/undated OR older than 7 days → HALT and print
         "stale/undated; re-run phase-0-probes group=K". Never promote stale.
  - Normalize raw → typed: price_band "₹A to ₹B" → {low:A, high:B}; issue_size_cr "...₹ N Cr" → number N; lot_size "N Shares" → number N; open/close/listing already ISO; registrar clean string → {name, portal_url:null}.
  - Promote ONLY fields whose extracted confidence is HIGH or MEDIUM AND whose normalization succeeds AND whose current repo value is null.
  - Read ipo-master.json + ipo-documents.json + ipo-source-audit.json via readJsonOrNull. Safe-merge preflight: OnEMI present in master+documents; candidate fields null. HALT (write nothing) on any preflight failure or conflict (non-null existing value differing from Chittorgarh) — log the conflict to the status doc.
  - String-surgery splice the filled fields into the OnEMI rows (mirror scripts/pdf/promote/onemi.ts + onemi-master.ts — preserve all other rows byte-identical; only OnEMI row + generated_at_utc change). Atomic .tmp+rename.
  - Add the OnEMI ipo-source-audit.json entry: one fields[] row per filled field {field, source:'Chittorgarh', state:'aggregator', url:<chittorgarh detail url>, fetched_at_utc:<artifact capture time>} + source_mix with the chittorgarh bucket.
  - Idempotent: re-run is a no-op (fields now non-null).
  - Print a per-field raw→normalized summary for the status doc.

Hard guardrails:
  1. OnEMI only. No iteration over other ipo_ids.
  2. Fill only null fields; never overwrite official/non-null.
  3. Only HIGH/MEDIUM confidence; LOW or missing stays null.
  4. BRLMs stays []; deferred fields stay null; no fake values.
  5. Existing rows byte-identical (excepting generated_at_utc).
  6. typecheck + build pass; /ipo/onemi-technology-solutions renders cleanly.
  7. Stay on main; no cron; no workflow change.

Verification order (binding):
  (a) npx tsx scripts/pdf/promote/onemi-chittorgarh-fastfill.ts
      (the artifact freshness + provenance preflight per §6.1 runs first;
       if it HALTs — stale/undated artifacts, robots not allowed-*, precision
       below gate, mapping mismatch, or missing provenance — STOP, write
       nothing, and report the failing check; if stale, ask the operator to
       re-run phase-0-probes group=K before retrying)
  (b) Diff ipo-master.json: only OnEMI row's 6 null fields filled + generated_at_utc; 10 rows + timelines + source_meta byte-identical (json.dumps(sort_keys=True)).
  (c) Diff ipo-documents.json: only OnEMI registrar filled; brlms still []; docs[] untouched; 10 rows byte-identical.
  (d) Diff ipo-source-audit.json: only the new OnEMI entry added.
  (e) Confirm ipo-financials.json / ipo-narrative.json / ipo-subscriptions.json / ipo-listing-performance.json untouched.
  (f) npm run typecheck; npm run build.
  (g) Local render check of /ipo/onemi-technology-solutions (preview + headless): issue terms now show price band / issue size / lot size / dates; SourceAuditPanel shows a Chittorgarh slice; IssueTermsGrid chip shows Chittorgarh (not NSE); no console/render errors.
  (h) Write phase-6A-2-status.md, which MUST report:
        - the artifact freshness + provenance preflight result (pass, with the
          values it checked)
        - artifact generated_at_utc (+ captured_at_utc) and the computed age
        - the source-probe commit/run reference if available (e.g. the latest
          phase-0 refresh commit on main that produced the artifacts)
        - robots_posture.classification
        - P-26b precision numbers (average_precision_ratio_full + _narrow,
          and OnEMI's per-detail ratios)
        - the exact OnEMI artifact path used
          (phase-0/broker-pages/chittorgarh-detail-<index>-extracted-retuned.json)
        - per-field raw_value → normalized_value + confidence
        - conflicts (expected: none for OnEMI)
        - byte-identity confirmations for the untouched rows/snapshots
        - the operator question about scaling to a chittorgarh-map in 6A.2.1
  (i) Commit + push to main.

After push:
  - STOP. Wait for operator review.
  - Do NOT start 6A.2.1 (multi-IPO scaling) or 6A.2.1-face_value (extractor extension) without separate approval.
```

---

## Exit criterion

**Gate 1 (this doc) closes** when:
1. `phase-6A-2-chittorgarh-fastfill-plan.md` exists at repo root (mirrors master plan §EE, renumbered 1–11), committed + pushed to `main`.
2. No code change. No snapshot mutation. No type/UI/workflow change. No probe run.
3. `npm run typecheck` + `npm run build` green at the doc-only commit.
4. Operator is asked to separately approve the §11 implementation prompt before Gate 2 begins.

**Gate 2 closes** when (only after the operator separately approves §11):
1. All §10 acceptance items pass.
2. `phase-6A-2-status.md` records the per-field provenance + the §6.1 preflight result.
3. OnEMI's `/ipo/onemi-technology-solutions` renders the Chittorgarh-filled terms with correct source labels.
4. No follow-up slice (6A.2.1 multi-IPO scaling / face_value extractor extension) started without separate approval.
