# Phase 6A.2.1 — Chittorgarh Fast-fill Scale-up — Status (Gate 2, code + infra shipped)

> **Date**: 2026-05-25
> **Plan**: `phase-6A-2-1-chittorgarh-scale-plan.md` (Gate 1, commit `6522000`)
> **Result**: Generalized map-driven promoter + explicit `chittorgarh-map.json` + P-26b `face_value` extractor + PriorityReadCard fold-in shipped. The promoter is a **clean idempotent no-op** against the current (pre-change) artifacts — **`face_value` is NOT promoted** (pre-change artifact carries no `face_value` key, per the §5.1 guard). No snapshot data changed. typecheck + build green, route renders clean. Stayed on `main`.
>
> **This is steps 1–6 of the §10 sequence.** Steps 7–11 (rerun `group=K` → confirm post-change artifact → promote `face_value`) are a **follow-up** that begins only after the operator reruns the probe workflow.

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

**No snapshot data changed** in this commit. `ipo-master.json` / `ipo-documents.json` / `ipo-source-audit.json` are byte-identical to `HEAD` (the promoter found nothing new to promote). `ipo-financials.json` / `ipo-narrative.json` / `ipo-subscriptions.json` / `ipo-listing-performance.json` untouched. No `.github/workflows/*` / cron / `scripts/ingest/*` change. No PDF binaries / full-text dumps.

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

## 4. `face_value` artifact status (§5.1 guard)

| Item | Value |
|---|---|
| Was the **committed** artifact generated after the P-26b `face_value` extractor change? | **No** — the committed `chittorgarh-detail-1-extracted-retuned.json` (from CI commit `4b5adc7`) predates this change and carries **no `face_value` key**. |
| Committed artifact timestamp / commit ref | `generated_at_utc = 2026-05-24T20:15:41.590Z` · produced by `4b5adc7` ("phase-0: refresh probe artifacts"). |
| `face_value` promoted or skipped (this commit)? | **Skipped — left `null`.** Reason: pre-change artifact (no `face_value` key). Structurally unpromotable per the §5.1 hard gate. |
| `raw_value → normalized_value + confidence` (if promoted) | Not promoted in this commit. **Local validation only** (reverted, not committed): the new extractor reads OnEMI's "Face Value" row as `raw="₹ 1 per share"` → `normalized=1` at **HIGH** confidence. The committed artifacts remain pre-change; this value reaches `main` only via the operator's CI `group=K` re-probe (steps 7–11). |

## 5. Validation evidence

- **Extractor (local, reverted):** ran P-26b locally against the committed rendered HTML → OnEMI `face_value` = `"₹ 1 per share"` HIGH (`table[0].row[2] label="Face Value"`); new avg precision **full 0.818 / narrow 0.933** (both pass the gate; narrow unchanged). Then `git checkout -- phase-0/` restored the pre-change artifacts (committed artifacts have **no** `face_value` key).
- **Full face_value promotion path (local end-to-end, reverted):** regenerated artifacts with the extractor, ran the generalized promoter → promoted **only** `face_value` (`master.face_value null→1`); the 7 existing fields idempotently skipped. Byte-identity verified: all 10 non-OnEMI master rows + `timelines` + `source_meta` identical; OnEMI's 7 existing audit fields byte-identical with `face_value` appended last (its own fetched_at_utc); `source_mix.chittorgarh` stays 100; all 10 non-OnEMI audit entries + `ipo-documents.json` identical; re-run = 0 promoted (idempotent). Then `git checkout -- phase-0/ src/data/snapshots/` restored the pre-change state (OnEMI `face_value` null, 7 audit fields). **This proves step 10 will work once the post-change artifact lands.**
- **typecheck + build:** green.
- **Render:** `/ipo/onemi-technology-solutions` HTTP 200, 0 console/page errors. The PriorityReadCard "Source mix" cell now shows **"Chittorgarh 100%"** (was "—/No source audit"); Issue terms shows the Chittorgarh chip + price band ₹162–₹171 / lot 87 / min ₹14,877; `face_value` shows "—" (null, pre-change). `/`, `/open`, `/source-health` also clean.

## 6. Guardrails held

- Explicit map only (no fuzzy matching). OnEMI the only `active` row.
- No new IPO created from Chittorgarh (promoter skips any map row absent from `ipo-master.json`).
- Official / non-null values never overwritten (conflict-safe; 0 conflicts).
- HIGH/MEDIUM only; LOW/missing/pre-change `face_value` stays null; no fake values.
- `face_value` NOT promoted from a pre-existing artifact (§5.1 structural + temporal guard).
- Deferred/blocked untouched: BRLMs, GMP, subscription, sector, financials, narrative, listing performance.
- Do-not-touch snapshots clean; no workflow/cron/`scripts/ingest`/broker-scrape/JS-render/PDF-binary/full-text-dump. Stayed on `main`.

## 7. Next step (operator action — steps 7–11)

To land `face_value`:
1. **Rerun the existing `phase-0-probes` workflow with `group=K`** (no workflow change). This regenerates the Chittorgarh artifacts with the new P-26b extractor and commits them to `main`.
2. I pull `main`, confirm the new OnEMI artifact: was generated **after** the extractor change (carries a `face_value` key), has valid `generated_at_utc`, maps to `onemi-technology-ipo` / `2576`, contains `face_value` at HIGH/MEDIUM, and passes the robots/precision/freshness preflight.
3. **Only then** re-run `npx tsx scripts/pdf/promote/chittorgarh-fastfill.ts` → promotes `OnEMI.face_value = 1` (master) + appends the `face_value` audit row. Commit as a follow-up.
4. If any `face_value` gate fails (missing / stale / pre-change / LOW / absent), `face_value` stays `null` and the reason is recorded here. No fake.

**Question for the operator:** rerun `phase-0-probes` with `group=K` now so I can complete the `face_value` promotion (steps 7–11)? No new map rows / IPOs / probe targets will be added without separate approval.
