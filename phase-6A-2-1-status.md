# Phase 6A.2.1 — Chittorgarh Fast-fill Scale-up — Status (Gate 2 COMPLETE)

> **Date**: 2026-05-25
> **Plan**: `phase-6A-2-1-chittorgarh-scale-plan.md` (Gate 1, commit `6522000`)
> **Result**: Generalized map-driven promoter + explicit `chittorgarh-map.json` + P-26b `face_value` extractor + PriorityReadCard fold-in (commit `4e8e4a2`), then — after the operator's `group=K` re-probe (`334a70c`) — **`OnEMI.face_value` promoted to `1`** from the fresh post-change artifact. All 6 §5.1 guard checks passed. The 7 prior fields + all non-OnEMI rows + the 5 do-not-touch snapshots are byte-identical. typecheck + build green; OnEMI renders clean (Face value now "₹1"). Stayed on `main`.
>
> **All 11 steps of the §10 sequence are complete.** Infra (steps 1–6) shipped in `4e8e4a2`; `face_value` promotion (steps 7–11) completed after the CI re-probe.

---

## 1. Files changed

| File | Change |
|---|---|
| `scripts/pdf/promote/chittorgarh-map.json` | **NEW** — explicit map (`version 6A.2.1`); **1 row, OnEMI `active`**; `allowed_fields` = the 7 proven + `face_value`. |
| `scripts/pdf/promote/chittorgarh-fastfill.ts` | **NEW** — map-driven, multi-IPO, **per-field-idempotent** promoter. Per-IPO §6 preflight; conflict-safe; never creates IPOs; audit create-or-append; atomic writes. |
| `scripts/pdf/promote/onemi-chittorgarh-fastfill.ts` | **DELETED** — superseded by the generalized promoter (single code path). |
| `scripts/probes/P-26b-chittorgarh-extract-retune.ts` | Added `'face_value'` to `EXPECTED_FIELDS` (denominator 10→11), `looksLikeFaceValue`, `extractFaceValue(tables)`, wired into `extractOne` + `per_detail` summary. |
| `src/components/ipo/PriorityReadCard.tsx` | Added `chittorgarh` to local `MIX_COLORS` + `MIX_LABELS` (+ `?? 0` guards for the optional key). The 5-second triage card's source-mix strip now shows the Chittorgarh contribution. |
| `phase-6A-2-1-status.md` | **NEW** — this report. |

**Infra commit `4e8e4a2` changed no snapshot data** (the promoter found nothing new against the pre-change artifacts). **Follow-up `face_value` commit** changes exactly two snapshots:

| File | Change (follow-up commit) |
|---|---|
| `src/data/snapshots/ipo-master.json` | OnEMI `face_value`: `null → 1`; `generated_at_utc` bumped. 10 non-OnEMI rows + `timelines` + `source_meta` byte-identical. |
| `src/data/snapshots/ipo-source-audit.json` | OnEMI entry: `face_value` row appended (`source: Chittorgarh`, `state: aggregator`, `fetched_at_utc: 2026-05-25T03:27:10.550Z`); the 7 prior fields byte-identical; `source_mix.chittorgarh` stays 100. 10 non-OnEMI entries byte-identical. |

`ipo-documents.json` / `ipo-financials.json` / `ipo-narrative.json` / `ipo-subscriptions.json` / `ipo-listing-performance.json` untouched. No `.github/workflows/*` / cron / `scripts/ingest/*` change. No PDF binaries / full-text dumps.

## 2. Map rows

| production_ipo_id | chittorgarh_slug / id | status | allowed_fields |
|---|---|---|---|
| `onemi-technology-solutions` | `onemi-technology-ipo` / `2576` | **active** | price_band, issue_size_cr, lot_size, open_date, close_date, listing_date, registrar, face_value |

- Active rows: **1** (OnEMI). Inactive: 0.
- Bagmane REIT + M R Maniveni (probe samples) are **not** in the map and **not** in `ipo-master.json` — no IPO creation from Chittorgarh.

## 3. Promoter run against current (pre-change) artifacts — fields promoted / skipped

Global preflight PASSED — robots `allowed-prior-flag-was-over-match`; precision full 0.833 / narrow 0.933; artifact ts `2026-05-24T20:15:41.590Z` (age ~0.3d).

| Field | Outcome | Reason |
|---|---|---|
| price_band | skipped (idempotent) | already in OnEMI source-audit |
| issue_size_cr | skipped (idempotent) | already in OnEMI source-audit |
| lot_size | skipped (idempotent) | already in OnEMI source-audit |
| open_date | skipped (idempotent) | already in OnEMI source-audit |
| close_date | skipped (idempotent) | already in OnEMI source-audit |
| listing_date | skipped (idempotent) | already in OnEMI source-audit |
| registrar | skipped (idempotent) | already in OnEMI source-audit |
| **face_value** | **skipped (left null)** | **artifact has no `face_value` key (pre-change/absent) — §5.1 guard. No fake.** |

**Total promoted: 0.** Re-run is byte-identical (idempotent no-op confirmed). No conflicts.

## 4. `face_value` artifact status (§5.1 guard) — all 6 checks PASSED → PROMOTED

The operator reran `phase-0-probes group=K`, committing fresh post-change artifacts (`334a70c`, "phase-0: refresh probe artifacts (2026-05-25T03:27Z)"). The §5.1 guard was re-verified against them:

| # | Guard check | Result |
|---|---|---|
| 1 | Artifact generated **after** the P-26b extractor change? | ✅ Artifact `generated_at_utc = 2026-05-25T03:27:10.550Z` (commit `334a70c` @ `03:27:16Z`) postdates infra commit `4e8e4a2` (@ `03:10:28Z`); the per-detail artifact now carries a `face_value` key (the post-change structural signal). |
| 2 | OnEMI mapping exact | ✅ `picked_detail_urls` slug `onemi-technology-ipo` → index 1; url `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/`; id `2576`; per-detail `source_url`/`slug` match. |
| 3 | Preflight (robots / precision / freshness) | ✅ robots `allowed-prior-flag-was-over-match`; precision full **0.818 ≥ 0.80** (gate via full; OnEMI per-detail full 0.909 / narrow 1.0); ts present + fresh (~9 min old at run). |
| 4 | `fields.face_value` exists | ✅ present. |
| 5 | `face_value` confidence HIGH/MEDIUM | ✅ **high**. |
| 6 | `raw_value → normalized_value` valid | ✅ `raw="₹ 1 per share"` → `normalized=1`. |

**`face_value` PROMOTED:** `OnEMI.face_value = 1` (master) + audit row appended (`source: Chittorgarh`, `state: aggregator`, `fetched_at_utc: 2026-05-25T03:27:10.550Z`). raw `₹ 1 per share` → normalized `1`, confidence **high**.

**Note (precision variance):** the fresh run's avg narrow-5 dipped to 0.867 (was 0.933) — probe variance on the Bagmane/Maniveni sample IPOs; OnEMI's own per-detail stayed full 0.909 / narrow 1.0, and the gate passed via full 0.818 ≥ 0.80. No effect on OnEMI's fields.

**Note (probe-results artifact):** the `group=K`-only CI run rewrote `phase-0/source-probe-results.json` / `source-status-summary.json` to the K-group probes only (the runner's `writeResults` writes just the run's results). This is the existing group-scoped harness behavior and does **not** affect the dashboard — `src/data/snapshots/source-health.json` is rebuilt by the separate ingest workflow, not the probe workflow, and was untouched by this pull.

## 5. Validation evidence

- **Extractor (local, reverted):** ran P-26b locally against the committed rendered HTML → OnEMI `face_value` = `"₹ 1 per share"` HIGH (`table[0].row[2] label="Face Value"`); new avg precision **full 0.818 / narrow 0.933** (both pass the gate; narrow unchanged). Then `git checkout -- phase-0/` restored the pre-change artifacts (committed artifacts have **no** `face_value` key).
- **Full face_value promotion path (local end-to-end, reverted):** regenerated artifacts with the extractor, ran the generalized promoter → promoted **only** `face_value` (`master.face_value null→1`); the 7 existing fields idempotently skipped. Byte-identity verified: all 10 non-OnEMI master rows + `timelines` + `source_meta` identical; OnEMI's 7 existing audit fields byte-identical with `face_value` appended last (its own fetched_at_utc); `source_mix.chittorgarh` stays 100; all 10 non-OnEMI audit entries + `ipo-documents.json` identical; re-run = 0 promoted (idempotent). Then `git checkout -- phase-0/ src/data/snapshots/` restored the pre-change state (OnEMI `face_value` null, 7 audit fields). **This proves step 10 will work once the post-change artifact lands.**
- **Promotion (real, committed):** after the `group=K` re-probe (`334a70c`), ran the generalized promoter against the fresh post-change artifacts → promoted **only** `face_value` (`master.face_value null→1`); the 7 prior fields idempotently skipped. Byte-identity re-verified: 10 non-OnEMI master rows + `timelines` + `source_meta` identical; OnEMI's 7 prior audit fields byte-identical with `face_value` appended last; `source_mix.chittorgarh` stays 100; 10 non-OnEMI audit entries + the 5 do-not-touch snapshots identical.
- **typecheck + build:** green (both before and after promotion).
- **Render (final):** `/ipo/onemi-technology-solutions` HTTP 200, 0 console/page errors. Issue terms now shows **Face value "₹1"** alongside the Chittorgarh chip + price band ₹162–₹171 / lot 87 / min ₹14,877 / issue size ₹926; PriorityReadCard "Source mix" shows **"Chittorgarh 100%"**; Source-audit panel shows the orange Chittorgarh bar (100%); registrar KFin Technologies Ltd.

## 6. Guardrails held

- Explicit map only (no fuzzy matching). OnEMI the only `active` row.
- No new IPO created from Chittorgarh (promoter skips any map row absent from `ipo-master.json`).
- Official / non-null values never overwritten (conflict-safe; 0 conflicts).
- HIGH/MEDIUM only; LOW/missing/pre-change `face_value` stays null; no fake values.
- `face_value` NOT promoted from a pre-existing artifact (§5.1 structural + temporal guard).
- Deferred/blocked untouched: BRLMs, GMP, subscription, sector, financials, narrative, listing performance.
- Do-not-touch snapshots clean; no workflow/cron/`scripts/ingest`/broker-scrape/JS-render/PDF-binary/full-text-dump. Stayed on `main`.

## 7. Sequence complete (steps 7–11 done)

1. ✅ Operator reran `phase-0-probes group=K` → fresh post-change artifacts on `main` (`334a70c`).
2. ✅ Pulled `main`; confirmed the new OnEMI artifact postdates the extractor change, carries `face_value` at HIGH, maps to `onemi-technology-ipo`/`2576`, passes robots/precision/freshness (§4).
3. ✅ Ran `npx tsx scripts/pdf/promote/chittorgarh-fastfill.ts` → promoted `OnEMI.face_value = 1` (master) + appended the `face_value` audit row. Committed as a follow-up.
4. n/a — no gate failed; `face_value` promoted, not skipped.

**Phase 6A.2.1 is complete.** OnEMI now carries all 8 Chittorgarh-sourced fields (7 from 6A.2 + `face_value`). The map-driven promoter is in place for future IPOs (append an `active` row to `chittorgarh-map.json` after probing the IPO's Chittorgarh page — each a reviewed edit, no code change). No new map rows / IPOs / probe targets added without separate approval.
