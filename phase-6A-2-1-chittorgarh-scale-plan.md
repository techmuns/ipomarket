# Phase 6A.2.1 — Chittorgarh Fast-fill Scale-up (planning only)

> **Mode**: planning. No code edits. No snapshot mutations. No type changes. No UI changes. No workflow changes. No probe runs. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §10 implementation prompt below.
>
> **Date**: 2026-05-25
>
> **Predecessors**: `phase-6A-2-chittorgarh-fastfill-plan.md` + `phase-6A-2-status.md` (Phase 6A.2 accepted — OnEMI-only fast-fill, commit `5d41588`), `phase-6A-1-status.md` (P-25b/P-26b GREEN, robots allowed), `phase-6A-aggregator-fastfill-plan.md` (Phase 6A umbrella, slice-gate model), `broker-aggregator-source-plan.md` (§Y source policy + production gate), master plan §FF.
>
> **Trigger**: Phase 6A.2's OnEMI-only promoter (`scripts/pdf/promote/onemi-chittorgarh-fastfill.ts`) is hard-coded to one IPO. The pipeline works end-to-end; the next step is to make it **scale safely** via an explicit, reviewed mapping layer — not a broad crawler. Priority order: (1) generalize the promoter into a controlled multi-IPO mapping layer; (2) extend P-26b to extract `face_value` if it proves HIGH/MEDIUM on a re-probe; (3) a tiny cosmetic fold-in of the `chittorgarh` bucket into `PriorityReadCard`.
>
> **Scope discipline (binding)**:
> - **Explicit mapping file, not fuzzy matching.** Every Chittorgarh→production link is hand-listed in `chittorgarh-map.json` and reviewed.
> - **OnEMI is the only `active` mapping row.** No other production IPO has a committed Chittorgarh artifact; this slice ships the infrastructure + face_value extractor + PriorityReadCard fold-in.
> - **No new IPO creation from Chittorgarh.** Only fill existing dashboard IPO rows; never insert into `ipo-master.json`.
> - **Official sources stay primary.** Chittorgarh fills only `null`/unavailable fields; never overwrites official or non-null values; HIGH/MEDIUM only; no fake values.
> - **`face_value` is gated by a post-code-change artifact guard** (§5.1) — never promoted from a pre-existing artifact.
> - No BRLMs / GMP / subscription / sector / financials / narrative / listing-performance. No JS render / captcha / stealth / proxy. No `.github/workflows/*` change. No cron. No broker (Trendlyne/Zerodha/Upstox) scraping. No PDF binaries or full-text dumps. Stay on `main`.
>
> **Two-gate execution**: Gate 1 = this planning doc only (no code). Gate 2 = the implementation pass described in §10, requires separate explicit operator approval. Gate 2 MUST NOT start in the same turn as Gate 1.

---

## 1. Current baseline

- **Phase 6A.2 accepted.** OnEMI-only fast-fill populated: `price_band`, `issue_size_cr`, `lot_size`, `open_date`, `close_date`, `listing_date` (→ `ipo-master.json`) + `registrar` (→ `ipo-documents.json`); a new OnEMI `ipo-source-audit.json` entry (7 Chittorgarh/aggregator rows + `source_mix.chittorgarh = 100`).
- **Official / non-null fields were not overwritten** (conflict-safe merge; 0 conflicts for OnEMI).
- **Still deferred / null:** `BRLMs` (static-unavailable, JS-rendered — no fake), `face_value`, `GMP`, `subscription`, `sector`, `financials`, `narrative`.
- **Types + UI on `main`:** `SourceTag += 'Chittorgarh'`, `DataState += 'aggregator'`, source-mix `chittorgarh` bucket; SourcePill / StateBadge / Badge / SourceAuditPanel labels; `IssueTermsGrid` header-chip de-hardcode (reads dominant source from audit). `scripts/ingest/source-audit.ts` carries the dormant `chittorgarh` recompute bucket.
- **Probe artifacts on `main`** (refreshed by the `phase-0-probes` workflow, cron + dispatch): `chittorgarh-fields-v2.json`, `chittorgarh-extraction-summary-v2.json`, `chittorgarh-detail-{1,2,3}-extracted-retuned.json`. Only OnEMI (detail-1) maps to a production IPO; Bagmane (detail-2) + M R Maniveni (detail-3) are probe samples, **not** in `ipo-master.json`.

## 2. Multi-IPO mapping design

An **explicit mapping file** — not fuzzy/broad scraping. New file `scripts/pdf/promote/chittorgarh-map.json`:

```jsonc
{
  "version": "6A.2.1",
  "rows": [
    {
      "production_ipo_id": "onemi-technology-solutions",
      "production_slug": "onemi-technology-solutions",
      "chittorgarh_slug": "onemi-technology-ipo",
      "chittorgarh_id": "2576",
      "chittorgarh_detail_url": "https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/",
      "allowed_fields": ["price_band","issue_size_cr","lot_size","open_date","close_date","listing_date","registrar","face_value"],
      "status": "active",
      "notes": "Phase 6A.2 known-good control. face_value pending P-26b extractor proof + re-probe."
    }
  ]
}
```

Per-row fields (the operator's schema): `production_ipo_id`, `production_slug`, `chittorgarh_slug`, `chittorgarh_id`, `chittorgarh_detail_url`, `allowed_fields` (per-IPO whitelist, a subset of the §5 global set), `status` (`active` / `paused` / `manual_review`), `notes`.

**Generalized promoter** — new `scripts/pdf/promote/chittorgarh-fastfill.ts` (supersedes + replaces the OnEMI-only `onemi-chittorgarh-fastfill.ts`, which is deleted to keep a single code path). Behaviour:
- Reads `chittorgarh-map.json`. Processes only rows with `status: "active"` (skips `paused` / `manual_review` with a logged note).
- For each active row: run the §6 preflight **scoped to that IPO** (resolve its `chittorgarh_slug` in `picked_detail_urls` → per-detail artifact; verify the row's `chittorgarh_id` / `detail_url` match; plus the global robots + precision + freshness gates).
- **Per-field, incremental idempotency** (the key generalization vs the OnEMI-only per-IPO all-or-nothing guard): for each `allowed_field` whose production value is currently `null`/`[]` **and** not already recorded in that IPO's `ipo-source-audit` `fields[]`, extract → normalize → (HIGH/MEDIUM) → fill. Append a new audit row per newly-filled field; recompute that IPO's `source_mix` from its full `fields[]`. If the IPO has no audit entry yet, create one; if it exists, append. Already-filled fields are skipped (no-op). This lets OnEMI gain `face_value` later **without reverting** the existing 7 fields.
- **Never auto-create IPOs.** A map row whose `production_ipo_id` is absent from `ipo-master.json` is skipped with a `manual_review`-style log line — the promoter NEVER inserts a new master row (master rows come only from the separate, gated master-linkage process, Phase 5B.X pattern).
- Conflict-safe + string-surgery splice + atomic writes, all carried forward from `onemi-chittorgarh-fastfill.ts` (reuse its normalizers, preflight, and splice helpers).

Reuse: `scripts/ingest/lib/safeWrite.ts` (`readJsonOrNull`); the normalization + string-surgery + audit-splice logic already written in `onemi-chittorgarh-fastfill.ts` (lift into the generalized file, parameterized by the map row).

## 3. First scale targets

**OnEMI remains the sole `active` row.** Rationale (verified): the only Chittorgarh detail artifacts committed on `main` are OnEMI (detail-1), Bagmane (detail-2), M R Maniveni (detail-3). Of these, **only OnEMI is a production IPO** in `ipo-master.json`. Bagmane + Maniveni are **not** production rows and **must not** be inserted (no IPO creation from Chittorgarh — §8). No other existing production IPO has a committed Chittorgarh extraction artifact (mapping a new one would require adding it to the P-25b/P-26b probe target set — out of this slice).

Therefore Phase 6A.2.1 delivers the **mapping infrastructure + generalized promoter + face_value extractor + PriorityReadCard fold-in**, with **OnEMI as the only `active` mapping row**. Future production IPOs are added later by (a) probing their Chittorgarh page, then (b) appending an `active` row to `chittorgarh-map.json` — each a reviewed edit, no code change. The net data change in this slice is OnEMI gaining `face_value` (only if the re-probe proves it HIGH/MEDIUM); everything else is infrastructure that is a no-op against the current snapshot.

## 4. Fast-fill rules (carried forward from Phase 6A.2 — binding)

1. Official / source-backed repo values win — if a field is non-null in `ipo-master.json` / `ipo-documents.json`, Chittorgarh does NOT touch it.
2. Chittorgarh fills only `null`/unavailable fields.
3. Never overwrite an official or non-null value (conflict → log to audit/status, preserve existing).
4. HIGH/MEDIUM confidence only. LOW or missing → field stays null.
5. Conflicts go to the audit/status report, never a silent dashboard replacement.
6. No fake values, ever.

## 5. Fields in scope

**Allowed (global set; per-IPO subset via `allowed_fields`):**
- `price_band`, `issue_size_cr`, `lot_size`, `open_date`, `close_date`, `listing_date`, `registrar` (all proven in 6A.2).
- `face_value` — **only after** the P-26b extractor extension proves it at HIGH/MEDIUM on a re-probe (§5.1 guard + §6 freshness apply). Until a refreshed post-change artifact carries `face_value`, it stays null (no fake).

**Still deferred (unchanged):** BRLMs, GMP, subscription, sector, financials, narrative, listing performance, strengths/risks/objectives, and anything JS-rendered.

**`face_value` extractor extension (P-26b)** — `scripts/probes/P-26b-chittorgarh-extract-retune.ts`:
- Add `'face_value'` to `EXPECTED_FIELDS` (`P-26b-…:41`). Note: this shifts the full-precision denominator 10 → 11. The **narrow-5 gate (≥ 0.90) is unaffected** (`face_value` is not in `NARROW_FIELDS`), so the §6 precision gate still passes via narrow even if `face_value` doesn't extract for every sample IPO.
- Add `extractFaceValue(tables)` mirroring `extractLotSize` (`:349`): label patterns `/^\s*Face\s+Value(?:\s+Per\s+Share)?\s*$/i`, `/^\s*FV\s*$/i`; value via `findLabelValue` → parse `₹?\s*([\d,]+(?:\.\d+)?)`; validator `looksLikeFaceValue` (positive number, ≤ ~1000 — face values are small, typically 1/2/5/10). Confidence HIGH on a clean table-cell numeric match, else LOW/absent. OnEMI's page shows a "Face Value" row (value `₹1`); whether it lands HIGH/MEDIUM is confirmed only by the CI re-probe.
- Wire into `extractOne` (`:611` fields record) + the `per_detail` summary blocks.

### 5.1 `face_value` post-code-change artifact guard (binding)

`face_value` must **never** be promoted from a pre-existing artifact — i.e. one generated before P-26b learned to extract it. This is enforced two ways, and the determination is reported in the status doc:

1. **Structural (the hard gate):** a per-detail artifact produced by the *pre-change* P-26b has **no `face_value` key** in its `fields` object (only the post-change extractor writes that key). The generalized promoter fills `face_value` ONLY when `fields.face_value` exists **and** `found === true` **and** `confidence ∈ {high, medium}`. So a pre-change artifact structurally cannot promote `face_value` — there is no key to read. The seven 6A.2 fields are unaffected (they exist in both pre- and post-change artifacts).
2. **Temporal / commit provenance (the explicit audit):** the status doc records the refreshed artifact's `generated_at_utc` (from `chittorgarh-extraction-summary-v2.json`) **and** the `phase-0-probes` commit that produced it, so it is explicit and human-verifiable that the artifact was generated **after** the P-26b `face_value` code change (the artifact commit must postdate the code commit). The §6 freshness gate (≤ 7 days, present timestamp) also applies.

**Skip conditions for `face_value`** (leave the field `null`, record the reason in `phase-6A-2-1-status.md`, and still let the generalized-promoter infrastructure run as an idempotent no-op over OnEMI's already-filled fields): the refreshed artifact is **missing**, **stale** (> 7 days), **generated before the `face_value` extractor change** (no `face_value` key, or its timestamp/commit predates the code change), **LOW confidence**, or the **value is absent**. No fake, no guess.

## 6. Artifact freshness + provenance preflight (carried forward, now per-IPO)

Every active map row is gated before any write (HALT + write nothing for that row on failure):
1. **Artifacts exist** — `chittorgarh-fields-v2.json` + `chittorgarh-extraction-summary-v2.json` + the per-detail artifact resolved from the row's `chittorgarh_slug` via `picked_detail_urls[]`.
2. **Robots allowed** — `chittorgarh-fields-v2.json.robots_posture.classification` ∈ {`allowed-prior-flag-was-over-match`, `allowed-no-applicable-disallow`}.
3. **Precision gate** — `average_precision_ratio_full >= 0.80` OR `average_precision_ratio_narrow >= 0.90` (still carried by narrow after the `face_value` denominator shift).
4. **Per-IPO mapping match** — the row's `chittorgarh_slug` / `chittorgarh_id` / `chittorgarh_detail_url` equal the resolved `picked_detail_urls[].url` + the per-detail artifact `source_url`/`slug`.
5. **Freshness** — newest artifact timestamp (`generated_at_utc` / `captured_at_utc`) present and ≤ 7 days old; never promote stale/undated.

## 7. UI impact (no redesign)

Only the tiny `PriorityReadCard` fold-in (`src/components/ipo/PriorityReadCard.tsx`):
- Add `chittorgarh: 'bg-orange-500'` to its local `MIX_COLORS` (`:14`) and `chittorgarh: 'Chittorgarh'` to its local `MIX_LABELS` (`:24`). The card iterates its own keys, so this surfaces the Chittorgarh contribution in the 5-second triage card's source-mix strip + summary (currently OnEMI's strip is empty there because the card doesn't know the bucket). ~2 lines. No new visual system, no new component, no new colour (orange already used for Chittorgarh in SourcePill / StateBadge / SourceAuditPanel from 6A.2).

No other UI change. SourceAuditPanel + IssueTermsGrid already handle Chittorgarh (6A.2).

## 8. Guardrails (binding)

- No `.github/workflows/*` change unless separately approved. No cron.
- No Trendlyne. No Zerodha/Upstox/broker scraping (reference-only; slice 6A.4+).
- No JS rendering / captcha / stealth / proxy / fingerprint bypass.
- No PDF binaries or full-text dumps committed.
- **No new IPO creation from Chittorgarh** — only fill existing dashboard IPO rows; never insert into `ipo-master.json`.
- No broad crawler / fuzzy matching — only the explicit `chittorgarh-map.json` rows.
- No mutation of `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `ipo-listing-performance.json`.
- HIGH/MEDIUM only; LOW stays null; no fake values; official/non-null never overwritten.
- Stay on `main`.

## 9. Acceptance gate (for Gate 2)

Implementation accepted only if ALL hold:
1. `chittorgarh-map.json` is explicit + reviewed; only `active` rows processed; the schema matches §2.
2. Only mapped existing production IPOs are touched. Map rows whose `production_ipo_id` is absent from `ipo-master.json` are skipped (no insertion).
3. Non-mapped IPOs (and all non-OnEMI rows) remain byte-identical (JSON-semantic) across master / documents / source-audit.
4. Official / non-null fields preserved (conflict-safe; conflicts logged, not applied).
5. Per-field idempotency proven — a second run is a no-op; OnEMI's existing 7 fields are untouched; only genuinely-null allowed fields are filled. The generalized-promoter infrastructure is created + tested even when `face_value` is skipped (it runs as a clean no-op over OnEMI's already-filled fields).
6. `face_value` (per §5.1): promoted for OnEMI **only** from a **post-code-change, freshly re-probed** artifact that carries a `fields.face_value` entry at HIGH/MEDIUM. It is **never** promoted from a pre-existing/pre-change artifact. If the refreshed artifact is missing / stale / pre-change / LOW / value-absent, `face_value` stays `null` and the reason is recorded. No fake.
7. `npm run typecheck` + `npm run build` green.
8. `/ipo/onemi-technology-solutions` renders clean (0 console/page errors); the PriorityReadCard source-mix strip now shows the Chittorgarh contribution.
9. `phase-6A-2-1-status.md` reports, **per IPO**, every field promoted / skipped / conflicted, with provenance (source_url, raw_label, raw_value, normalized_value, confidence), plus the map rows processed/skipped and the byte-identity confirmations. For `face_value` specifically it records: (a) **whether the artifact was generated after the P-26b `face_value` extractor change**; (b) the artifact **timestamp + `phase-0-probes` commit reference**; (c) whether `face_value` was **promoted or skipped** (and the skip reason); (d) `raw_value → normalized_value + confidence` if promoted.
10. No workflow/cron/PDF-binary/full-text-dump; stayed on `main`.

## 10. Gate 2 implementation prompt (ready-to-paste)

> Use verbatim when launching the Phase 6A.2.1 Gate 2 pass. Do not start until the operator approves this prompt as a separate, post-Gate-1 decision.

```
Phase 6A.2.1 — Chittorgarh fast-fill scale-up (explicit multi-IPO map; face_value; PriorityReadCard fold-in).

In-scope file changes:
  - scripts/pdf/promote/chittorgarh-map.json (NEW; explicit map per §2; OnEMI the only active row)
  - scripts/pdf/promote/chittorgarh-fastfill.ts (NEW; map-driven generalized promoter; per-field
    incremental idempotency; reuses the normalizers/preflight/splice from onemi-chittorgarh-fastfill.ts)
  - scripts/pdf/promote/onemi-chittorgarh-fastfill.ts (DELETE; superseded by the generalized promoter)
  - scripts/probes/P-26b-chittorgarh-extract-retune.ts (add 'face_value' to EXPECTED_FIELDS + an
    extractFaceValue(tables) extractor + wire into extractOne + per_detail summary)
  - src/components/ipo/PriorityReadCard.tsx (+ chittorgarh to local MIX_COLORS + MIX_LABELS; ~2 lines)
  - src/data/snapshots/ipo-master.json (OnEMI row: face_value filled IFF a refreshed post-change artifact
    carries it HIGH/MEDIUM; else untouched)
  - src/data/snapshots/ipo-source-audit.json (OnEMI entry: append a face_value row IFF filled; recompute mix)
  - phase-6A-2-1-status.md (NEW; per-IPO promoted/skipped/conflicted + map rows processed)

Out of scope (HARD):
  - ipo-documents.json / ipo-financials.json / ipo-narrative.json / ipo-subscriptions.json /
    ipo-listing-performance.json (no mutation unless a NEW active map row legitimately gap-fills a null
    registrar in documents — none in this slice since OnEMI's registrar is already filled)
  - inserting ANY new IPO into ipo-master.json (no IPO creation from Chittorgarh)
  - any IPO without an active map row + a committed Chittorgarh extraction artifact
  - BRLMs, GMP, subscription, sector, financials, narrative, listing performance (deferred/null)
  - .github/workflows/* ; cron ; Trendlyne ; Zerodha/Upstox/broker scraping ; JS render / captcha /
    stealth / proxy ; PDF binaries or full-text dumps ; broad crawler / fuzzy matching
  - src/types/* (no type changes — SourceTag 'Chittorgarh' + DataState 'aggregator' already exist)

Promoter behaviour (scripts/pdf/promote/chittorgarh-fastfill.ts):
  - Read chittorgarh-map.json. For each row with status='active':
      * Resolve the row's chittorgarh_slug in chittorgarh-fields-v2.json picked_detail_urls[] → per-detail
        artifact chittorgarh-detail-<index>-extracted-retuned.json. Skip (log) if unresolved.
      * §6 preflight (per-IPO mapping match + global robots/precision/freshness). HALT that row on failure.
      * Confirm production_ipo_id exists in ipo-master.json. If absent → skip + log "no production row;
        not creating" (NEVER insert).
      * For each allowed_field currently null/[] in production AND not already in that IPO's source-audit
        fields[]: extract from the artifact, normalize (reuse 6A.2 normalizers; add face_value→number),
        require HIGH/MEDIUM, fill via string-surgery; append a source-audit row; recompute source_mix.
      * Already-filled fields → skip (no-op). Non-null official value differing from Chittorgarh → conflict,
        log, do not overwrite.
  - Atomic .tmp+rename writes; existing rows byte-identical; idempotent (re-run = no-op).

face_value post-code-change artifact guard (binding — §5.1):
  - face_value is NEVER promoted from a pre-existing artifact. The pre-change P-26b writes NO face_value
    key, so the promoter (which fills face_value only when fields.face_value exists + found + HIGH/MEDIUM)
    structurally cannot promote it from an old artifact.
  - Required ordered sequence before any face_value promotion:
      1. Modify scripts/probes/P-26b-chittorgarh-extract-retune.ts (add face_value extractor).
      2. npm run typecheck ; npm run build.
      3. Run the generalized promoter against the CURRENT (pre-change) artifacts → face_value NOT filled
         (no key); confirm the infra runs as an idempotent no-op over OnEMI's 7 already-filled fields and
         touches no other row. Commit + push the code (map + promoter + extractor + PriorityReadCard).
      4. Ask the operator to rerun the existing phase-0-probes workflow with group=K (no workflow change).
      5. Pull the CI-produced artifacts from main.
      6. Confirm the new OnEMI per-detail artifact contains fields.face_value at HIGH/MEDIUM AND its
         timestamp/commit postdates the P-26b change (the §5.1 temporal provenance check).
      7. ONLY THEN re-run the generalized promoter to fill OnEMI.face_value (a follow-up commit).
  - Skip (leave face_value null + record the reason in phase-6A-2-1-status.md, infra still created/tested):
    artifact missing / stale (>7d) / generated before the extractor change (no face_value key or older
    timestamp/commit) / LOW confidence / value absent. No fake.
  - phase-6A-2-1-status.md MUST record for face_value: (a) whether the artifact was generated AFTER the
    P-26b extractor change; (b) the artifact timestamp + phase-0-probes commit reference; (c) promoted or
    skipped (+ reason); (d) raw_value → normalized_value + confidence if promoted.

Verification order (binding):
  (a) npm run typecheck ; npm run build (after extractor + promoter + map + PriorityReadCard edits).
  (b) npx tsx scripts/pdf/promote/chittorgarh-fastfill.ts  (against CURRENT artifacts):
        expect — OnEMI's 7 existing fields skipped (already in audit); face_value NOT filled (artifact
        lacks the key yet); no other row touched; snapshots structurally unchanged.
  (c) git diff: confirm no non-OnEMI row changed; confirm the 5 do-not-touch snapshots clean; confirm
      ipo-master/source-audit unchanged (face_value not yet in artifact).
  (d) JSON-semantic identity check (json.dumps(sort_keys=True)) for every non-OnEMI row across the 3 snapshots.
  (e) Re-run the promoter → byte-identical (idempotency).
  (f) Local headless render of /ipo/onemi-technology-solutions (chromium 1194 at /opt/pw-browsers): HTTP 200,
      0 console/page errors; PriorityReadCard source-mix strip shows the Chittorgarh contribution.
  (g) Write phase-6A-2-1-status.md (per-IPO promoted/skipped/conflicted + provenance + map rows + byte-identity).
  (h) Commit + push to main.

After push:
  - STOP. Ask the operator to rerun phase-0-probes with group=K so a fresh post-change artifact is produced.
    Pull it, confirm fields.face_value is present at HIGH/MEDIUM AND the artifact postdates the P-26b change,
    and ONLY THEN re-run the promoter to fill OnEMI.face_value (a follow-up commit). If the artifact is
    missing/stale/pre-change/LOW/absent, leave face_value null and record the reason.
  - Do NOT add new map rows / new IPOs / new probe targets without separate approval.
```

---

## Exit criterion

**Gate 1 (this doc) closes** when:
1. `phase-6A-2-1-chittorgarh-scale-plan.md` exists at repo root (mirrors master plan §FF, renumbered 1–10 + Gate 2 prompt), committed + pushed to `main`.
2. No code change. No snapshot mutation. No type/UI/workflow change. No probe run.
3. `npm run typecheck` + `npm run build` green at the doc-only commit.
4. Operator is asked to separately approve the §10 implementation prompt before Gate 2 begins.

**Gate 2 closes** when (only after the operator separately approves §10):
1. All §9 acceptance items pass.
2. `phase-6A-2-1-status.md` records the per-IPO outcomes + map processing + the §5.1 `face_value` provenance determination.
3. OnEMI renders clean with the PriorityReadCard fold-in; `face_value` filled only if a post-change re-probe proved it HIGH/MEDIUM (else null with reason).
4. No new IPO / probe-target / workflow added without separate approval.
