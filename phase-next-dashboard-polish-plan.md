# Next Dashboard Polish — Surface the OnEMI Source-Backed Data (planning only)

> **Mode**: planning. No code edits. No snapshot mutations. No UI change. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §8 implementation prompt below.
>
> **Date**: 2026-05-25
>
> **Predecessors**: `phase-6A-2-1-status.md` (Phase 6A.2.1 complete — OnEMI fully source-backed: 8 Chittorgarh issue-term fields + RHP financials), `phase-6A-2-chittorgarh-fastfill-plan.md`, `phase-5B1-status.md` (OnEMI RHP financials), master plan §GG.
>
> **Trigger**: OnEMI Technology Solutions is now the dashboard's only fully source-backed IPO. Use that data to improve investor-facing clarity. Two operator decisions are locked in: (1) **re-derive OnEMI's stale `upcoming` status to `listed`** (its verified listing_date 2026-05-08 is ~17 days past) as an OnEMI-only guarded correction; (2) add a **compact "completeness + dominant-source" chip** (e.g. `Chittorgarh · 8 terms`) computed only from existing snapshot/audit data.
>
> **Scope discipline (binding)**: no new sources; no broadened Chittorgarh scraping; no new map rows; no GMP; no PDF-parser expansion; no database; no workflow change; no cron; no broad UI redesign; no new source logic. Status correction is **OnEMI-only** (no status engine). The only snapshot write is OnEMI's `status` in `ipo-master.json`. Stay on `main`.
>
> **Two-gate execution**: Gate 1 = this planning doc only (no code). Gate 2 = the implementation pass described in §8, requires separate explicit operator approval. Gate 2 MUST NOT start in the same turn as Gate 1.

---

## 1. OnEMI status correction (re-derive to `listed`; OnEMI-only, guarded)

OnEMI's `status` is a stale `upcoming` (a Phase 5B.X conservative default set when dates were null). Its now-verified Chittorgarh dates (open 2026-04-30, close 2026-05-05, **listing 2026-05-08**) show it has listed. Correct it — **OnEMI only**, do not build a status engine, do not touch other rows.

- **New guarded script** `scripts/pdf/promote/onemi-status-correct.ts` (mirrors the established guarded-promoter pattern — string-surgery, atomic, idempotent). Preflight: OnEMI present in `ipo-master.json`; current `status === 'upcoming'`; `listing_date` present AND in the past. Then flip ONLY the OnEMI row's `"status": "upcoming"` → `"status": "listed"` + bump `generated_at_utc`. HALT (no write) if preflight fails; idempotent no-op if already `listed`.
- **Byte-identity**: every non-OnEMI master row + `timelines` + `source_meta` stays byte-identical (verified via `json.dumps(sort_keys=True)`).
- Consequence: OnEMI drops off `/open` (filters `status==='open'|'upcoming'`) and becomes eligible for `/recently-listed` (§2) + shows as `listed` on `/screener` + its detail hero badge.
- Status-doc note required (the stale-status correction rationale, keyed to the verified listing date).

## 2. Recently Listed — graceful degradation for listed-without-perf

**Critical finding:** `src/pages/RecentlyListed.tsx:12-17` filters `master.ipos` by **presence in `listingPerformance.by_ipo`**, NOT by `status`. OnEMI has no listing-performance row (and `ipo-listing-performance.json` is do-not-touch + we have no listing-day OHLC). So after the status flip OnEMI would vanish from Open *and* never appear on Recently Listed. Fix — contained, not a redesign:

- **Table only** (`RecentlyListed.tsx` listings table, ~lines 81-97): change its source from "master filtered by perf-presence" to "master filtered by `status==='listed'`", left-joining perf (`Snapshots.listingPerformance.by_ipo[id]` may be undefined). Render gain/price columns with `perf?.field ?? '—'` and a small "listing data pending" hint for rows lacking perf. greendale + lumino (have perf) render unchanged; OnEMI renders with "—" gains + the hint.
- **Charts unchanged** (`ListingGainBar.tsx`, `FadeScatter.tsx`): keep their existing `.filter((ipo) => listingPerformance.by_ipo[ipo.id])` so OnEMI (no gains) is NOT plotted — avoids NaN/0 distortion.
- This is honest: OnEMI shows as a recently-listed IPO whose post-listing price data we don't have yet, not as a fake gain.

## 3. OnEMI detail page polish

1. **Prominence** — surface 2 source-backed issue terms in `src/components/ipo/HeroHeader.tsx` (currently shows dates + min-investment): add **price band** + **issue size** to the hero stat area. Plain values (no source chip in the hero — the IssueTermsGrid card below carries the single source chip; keeps Chittorgarh "not too loud").
2. **Chittorgarh badge restraint** — `IssueTermsGrid.tsx` already shows ONE header `SourceAuditChip` ("Chittorgarh · aggregator", orange). Keep exactly one chip; **do NOT** add per-row source badges (that would be too loud). No change needed beyond confirming the single-chip treatment.
3. **RHP financials kept distinct** — `FinancialsChart.tsx:52` already renders an `<SourceAuditChip source="RHP" state={fin.state} />` (fuchsia RHP pill), so financials are already visually distinct from the orange Chittorgarh issue terms. Strengthen the *explanation* in §5 (the panel explainer), not the chips.
4. **Richer analyst read / TL;DR** — `PriorityReadCard.tsx` `composeAnalystSentence` (lines ~226-249) currently uses only demand/subscription/nextDate/source-mix. Add a mechanical **issue-terms clause** built from `ipo.price_band` + `ipo.issue_size_cr` + `ipo.lot_size` + `minInvestment(ipo)` (reuse `src/lib/derive.ts:minInvestment`), e.g. *"₹926 Cr mainboard at ₹162–171, lot 87 (₹14,877); demand signal pending; listed 17 days ago; sourced via Chittorgarh."* Factual only, no judgment. Render `—`-safe when terms are null.

## 4. Screener / Open / Recently-Listed — compact completeness + source chip

- **New helper** `src/lib/derive.ts` → `dataCompleteness(ipo, audit): { source: 'Chittorgarh'|'Official'|'Manual'|'Sparse'; terms: number; tone }`. `terms` = the IPO's `ipo-source-audit` field count when an audit entry exists, else the count of non-null economic fields (`price_band, lot_size, issue_size_cr, open_date, close_date, listing_date, face_value`). `source` = dominant `source_mix` bucket mapped to a label (NSE/BSE/SEBI/RHP → **Official**; chittorgarh → **Chittorgarh**; manual/derived → **Manual**); `terms <= 1` → **Sparse**. No new data, no source logic — pure read of existing snapshots.
- **New tiny component** `src/components/ipo/CompletenessChip.tsx` → renders `"{source} · {terms} terms"` reusing the existing `Badge`/`SourcePill` tones (Chittorgarh→orange, Official→emerald, Manual→violet, Sparse→slate). Compact, single chip.
- **Wire into 3 surfaces** (the chip works wherever it's placed): `IpoCard.tsx` header badge row (`/open`); `Screener.tsx` row (inline under the company name, or a compact trailing column); the `RecentlyListed.tsx` table company cell. OnEMI renders **`Chittorgarh · 8 terms`** → naturally the best-filled example on Recently Listed + Screener (data-driven, not hardcoded).

## 5. Source audit clarity (no new source logic)

- **Rewrite the `SourceAuditPanel.tsx` explainer** (lines ~74-76) to explicitly state the split: *issue terms here are gap-filled from the Chittorgarh aggregator (the mix bar covers issue-term provenance); the official RHP-derived financials are shown on the Analysis tab and carry their own RHP source label.* Pure copy — no new audit rows, no financials added to `source_mix` (that would be "new source logic", out of scope). This resolves the "100% Chittorgarh understates the RHP financials" confusion without changing data.
- Optional one-line caption near the source-mix bar reinforcing the same.

## 6. Guardrails (binding)

- No new Chittorgarh map rows; no new scraping; no GMP; no PDF-parser expansion; no database; no workflow change; no cron; no broad UI redesign; stay on `main`.
- No new data sources or source logic (the completeness chip + explainer read only existing snapshots/audit; financials are NOT added to `source_mix`).
- Status correction is **OnEMI-only**; do not touch other rows or build a status engine.
- Do not mutate `ipo-documents.json`, `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `ipo-listing-performance.json`, or `scripts/ingest/*`. The only snapshot write is OnEMI's `status` in `ipo-master.json`.
- Reuse existing components/helpers: `Badge`, `SourcePill`, `StateBadge`, `SourceAuditChip`, `minInvestment` — don't re-implement.

## 7. Acceptance gate (for Gate 2)

1. OnEMI `status` `upcoming → listed` in `ipo-master.json`; all non-OnEMI master rows + `timelines` + `source_meta` byte-identical; guarded script idempotent.
2. OnEMI no longer on `/open`; renders on `/recently-listed` (table, with "—" gains + "listing data pending") and `/screener` (as `listed`); `/open` "Upcoming" section still renders (4 cards, no empty-state regression).
3. Recently-Listed charts (`ListingGainBar`, `FadeScatter`) unchanged — OnEMI not plotted (no gains); greendale + lumino unchanged.
4. `dataCompleteness` + `CompletenessChip` compute from existing data only; OnEMI shows `Chittorgarh · 8 terms`; other IPOs show sensible `Official/Manual/Sparse · N terms`; no crash on IPOs without an audit entry.
5. Detail page: hero shows price band + issue size; IssueTermsGrid keeps its single Chittorgarh chip; FinancialsChart keeps its RHP chip; analyst read includes the issue-terms clause; SourceAuditPanel explainer states the Chittorgarh-vs-RHP split.
6. `npm run typecheck` + `npm run build` green; `/ipo/onemi-technology-solutions`, `/recently-listed`, `/screener`, `/open` all render with 0 console/page errors.
7. No mutation of the do-not-touch snapshots / workflows / ingest; no new sources/scraping/map rows; stayed on `main`.
8. `phase-next-dashboard-polish-status.md` records: the stale-status correction (with the verified-listing-date rationale), files changed, the completeness-chip behavior, and render confirmation.

## 8. Gate 2 implementation prompt (ready-to-paste)

> Use verbatim when launching the Gate 2 pass. Do not start until the operator approves this prompt as a separate, post-Gate-1 decision.

```
Next dashboard polish — surface OnEMI source-backed data (no new sources, no redesign).

In-scope file changes:
  - scripts/pdf/promote/onemi-status-correct.ts (NEW; OnEMI-only guarded status flip
    upcoming→listed: preflight status==='upcoming' + listing_date present & past; string-surgery;
    atomic; idempotent; byte-identity of all other rows)
  - src/data/snapshots/ipo-master.json (OnEMI status upcoming→listed + generated_at_utc; nothing else)
  - src/lib/derive.ts (ADD dataCompleteness(ipo, audit) helper)
  - src/components/ipo/CompletenessChip.tsx (NEW tiny chip: "{source} · {terms} terms")
  - src/components/ipo/IpoCard.tsx (render CompletenessChip in header badge row)
  - src/pages/Screener.tsx (render CompletenessChip per row, compact)
  - src/pages/RecentlyListed.tsx (table: filter status==='listed' left-joining perf; gains/prices
    perf?.x ?? '—' + "listing data pending" hint; render CompletenessChip; charts UNCHANGED/perf-only)
  - src/components/ipo/HeroHeader.tsx (surface price band + issue size; no source chip in hero)
  - src/components/ipo/PriorityReadCard.tsx (composeAnalystSentence: prepend a mechanical issue-terms
    clause from price_band/issue_size_cr/lot_size/minInvestment; —-safe)
  - src/components/ipo/SourceAuditPanel.tsx (rewrite explainer: Chittorgarh issue-terms vs official RHP
    financials split; no new audit rows, no source_mix change)
  - phase-next-dashboard-polish-status.md (NEW status report)

Out of scope (HARD):
  - ipo-documents.json / ipo-financials.json / ipo-narrative.json / ipo-subscriptions.json /
    ipo-listing-performance.json (do NOT mutate)
  - non-OnEMI master rows; the broader status engine (OnEMI-only correction)
  - chittorgarh-map.json (no new rows); any new scraping / probe targets / GMP / PDF parser work
  - source_mix changes / adding financials to the audit (no new source logic)
  - scripts/ingest/* ; .github/workflows/* ; cron ; database ; broad UI redesign
  - Trendlyne / Zerodha / Upstox scraping ; JS render / stealth / captcha / proxy
  - new charts ; per-row source badges in IssueTermsGrid (keep the single header chip)

Behaviour notes:
  - dataCompleteness: terms = audit field count (if audit entry) else non-null economic-field count;
    source = dominant source_mix bucket → Official(NSE/BSE/SEBI/RHP) / Chittorgarh / Manual; terms<=1 → Sparse.
  - CompletenessChip reuses Badge/SourcePill tones (Chittorgarh orange, Official emerald, Manual violet,
    Sparse slate). OnEMI → "Chittorgarh · 8 terms".
  - RecentlyListed charts keep perf-only filter (OnEMI not plotted); only the table tolerates listed-without-perf.

Verification order (binding):
  (a) npx tsx scripts/pdf/promote/onemi-status-correct.ts  → OnEMI status upcoming→listed.
  (b) git diff + json.dumps(sort_keys=True): only OnEMI status changed; all other master rows +
      timelines + source_meta byte-identical; the 5 do-not-touch snapshots untouched.
  (c) Re-run the status script → idempotent no-op.
  (d) npm run typecheck ; npm run build.
  (e) Local headless render (chromium 1194 at /opt/pw-browsers): /ipo/onemi-technology-solutions,
      /recently-listed, /screener, /open — all HTTP 200, 0 console/page errors. Confirm OnEMI:
      off /open; on /recently-listed table with "—" gains + "listing data pending"; "Chittorgarh · 8 terms"
      chip on Screener + Recently-Listed; hero shows price band + issue size; analyst read has the
      issue-terms clause; SourceAuditPanel explainer states the Chittorgarh-vs-RHP split.
  (f) Write phase-next-dashboard-polish-status.md (status correction rationale + files + render).
  (g) Commit + push to main.

After push: STOP and report. Do not start any further pass without separate approval.
```

---

## Exit criterion

**Gate 1 (this doc) closes** when: `phase-next-dashboard-polish-plan.md` exists at repo root (mirrors master plan §GG), committed + pushed to `main`; no code/snapshot/UI change; `npm run typecheck` + `npm run build` green at the doc-only commit; operator asked to separately approve the §8 implementation prompt.

**Gate 2 closes** when: all §7 acceptance items pass; OnEMI is corrected to `listed` and renders cleanly on Recently Listed (table, no fake gains) + Screener + its detail page with the prominence/analyst-read/source-audit polish + the `Chittorgarh · 8 terms` chip; `phase-next-dashboard-polish-status.md` records the correction + render confirmation; no out-of-scope change.
