# One Real Listed IPO → Listing Performance — Bounded Source Ladder (planning only)

> **Mode**: planning. No code edits, no snapshot mutations, no workflow change. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §15 prompt below **and** of the specific verified IPO.
>
> **Date**: 2026-05-25
>
> **Predecessors**: `phase-onemi-listing-performance-status.md` (OnEMI fill correctly halted → safe no-write, because OnEMI is synthetic / not verifiably tradeable), master plan §II.
>
> **Trigger**: prove the Recently Listed workflow end-to-end with ONE real, already-listed IPO — official symbol/scripcode mapping → issue price → listing-day price/gain → current price/gain → `listing_gain_pct` + `current_gain_pct` → table + charts render — with the row clearly source-labeled.

## Operator direction (binding) — bounded source ladder, not official-only

Do NOT endlessly retry official sources. Official BSE/NSE remains **first** priority, but after a **bounded** official attempt fails (fetch/network/endpoint), move to **Chittorgarh**, then to a **brokerage/public IPO page**. Each fallback is clearly labeled and is **never** presented as official.

## Critical reality (shapes the whole plan)

- **No existing master row qualifies.** `ipo-master.json` has 11 rows; the 3 `status:'listed'` rows (greendale-cement, lumino-hyperscale, onemi-technology-solutions) are **all synthetic seed** (explicit "synthetic seed" taglines; `scripts/ingest/lib/symbol-map.ts` header confirms; `source_meta` shows no NSE/BSE ingest). So this pass **adds one operator-verified real listed IPO** (a new master row), which requires **separate approval**.
- **All listing-performance values must come from a real fetch** (official OR public aggregator). Hand-entering prices/gains is "manual price data" and is forbidden at every rung.
- This sandbox/CI **cannot reach** `api.bseindia.com` / `nseindia.com` (host-allowlist 403), and likely not the live aggregator pages either. The fetch must run where those hosts are reachable (operator machine / network-permitted CI). Chittorgarh was proven GREEN from GitHub Actions previously, so **the ladder has a real chance of writing a labeled row when run from CI**; in the sandbox the ladder HALTs through every rung and writes nothing (acceptable terminal outcome).
- **Reuse base**: `scripts/pdf/promote/onemi-listing-performance.ts` (strict both-sides gate + official BSE/NSE fetch helpers + byte-identity insert — hardcoded to OnEMI; **generalize** it), `scripts/pdf/promote/onemi-master.ts` (guarded add-one-row splice; its `EXPECTED_EXISTING_IPOS=10` guard is stale — a fresh add expects **11**), `scripts/ingest/lib/symbol-map.ts` (empty; add a verified mapping only if the official rung is used), `scripts/ingest/listing-performance.ts` (official endpoints; writes partial rows on fetch-failure → why the strict promoter is preferred), the Chittorgarh extraction approach + `chittorgarh-map.json`, and the existing `SourceTag` values `'Chittorgarh'`/`'Broker-ref'` + `DataState` value `'aggregator'`. `RecentlyListed.tsx` + `ListingGainBar`/`FadeScatter` auto-render a listed row + perf row with both gains — **no UI change**.

## Two-gate execution

| Gate | Scope | Approval |
|---|---|---|
| **Gate 1 — Planning doc only** (this turn) | Create + commit + push this doc. NO code/snapshot/workflow change. | ExitPlanMode approval of this plan |
| **Gate 2 — Implementation** | Build the generic tooling; on operator-supplied **verified real-IPO spec** (separately approved) add ONE master row + (if official) symbol-map entry; run the **bounded source ladder** (official → Chittorgarh → broker) in a reachable env and write ONE clearly-labeled perf row iff BOTH sides come from a single rung; write `phase-real-listed-ipo-performance-status.md`. | Separate explicit operator approval of the §15 prompt **and** of the specific verified IPO |

Gate 2 MUST NOT start in the same turn as Gate 1.

## 1. Objective

Prove the full Recently Listed path with ONE real listed IPO: resolve listing-day price-or-gain + current price-or-gain from the **highest-priority available source** in the ladder → `listing_gain_pct` + `current_gain_pct` → table + charts render, with the row **clearly source-labeled** (official vs aggregator vs broker). Since no existing master row qualifies, **add one carefully-reviewed real listed IPO** (new master row) — **separately approved** before any master mutation. One IPO only; no broad backfill; no OnEMI fallback; no fake/manual prices.

## 2. Candidate selection preflight (binding — the verification gate)

Keep the one-IPO-only scope. Prefer a real listed IPO already in the dashboard if one qualifies (none currently do — all listed rows are synthetic); otherwise plan ONE carefully-reviewed real listed IPO seed, **separately approved** before adding a new master row.

The operator supplies + verifies a spec for the chosen IPO:
- `company_name`, production `ipo_id`/`slug`, `segment` (mainboard/SME);
- **listing_date**, **issue_price** (RHP/exchange final issue price), **listing_exchange** (NSE and/or BSE) — issue-term facts verified from official sources (same standard as existing master rows);
- **for the official rung:** official **BSE scripcode** and/or **NSE symbol**, with **evidence the identifier belongs to the company** (BSE quote page / NSE symbol master showing the company name). **Forbidden as identifiers:** PDF/RHP download ids (e.g. OnEMI's `378749`), document ids, broker ids, Chittorgarh ids, or any guess.
- **for the fallback rungs:** the IPO's **Chittorgarh detail URL** (slug + id) and/or a **broker/public IPO page URL** (e.g. Zerodha/Upstox) where listing-day + current performance are publicly visible.

If neither an official identifier nor any public fallback URL can be verified for the company → **HALT, add nothing.**

## 3. Source priority ladder (binding — operator point 1)

For listing-performance data, attempt sources strictly in this order; stop at the first rung that yields BOTH sides (§6):

1. **Official BSE/NSE** — `state: 'live'`, `source: 'BSE'` or `'NSE'`. Highest trust.
2. **Chittorgarh** — only if the IPO's Chittorgarh page/report exposes listing-day + current performance. `state: 'aggregator'`, `source: 'Chittorgarh'`.
3. **Broker / public IPO page** (Zerodha/Upstox/etc.) — only if Chittorgarh is unavailable or incomplete. `state: 'aggregator'`, `source: 'Broker-ref'`.

Each rung is bounded (§4), gated by the fallback rules (§5) and the strict write threshold (§6). A higher rung that succeeds short-circuits the lower rungs.

## 4. Bounded official attempts (binding — operator point 2)

Do NOT retry official fetches indefinitely. The official rung is a **single bounded pass**:
- try the verified **BSE scripcode** once (via `fetchBseHistorical`, which already has its own internal timeout/retry — do not wrap it in a new retry loop), if available;
- try the verified **NSE symbol** once (via `fetchNseQuote`), if available;
- if both fail due to fetch/network/endpoint/parse issues (or no verified identifier exists) → **stop official attempts immediately, record the official failure reason** (per-rung HTTP status / error) for the status doc, and move to the Chittorgarh rung.

No indefinite loops, no escalating backoff beyond what the existing helper already does, no re-queue.

## 5. Fallback rules (binding — operator point 3)

Chittorgarh / broker data may be used for the row **only if ALL** hold:
- the source is **public, non-login, non-paywalled**;
- **no captcha / stealth / proxy bypass**, no fingerprint spoofing (single GET / one bounded render of a public, robots-allowed page — Chittorgarh `/ipo/<slug>/<id>/` is allowed);
- the value is **clearly visible and parseable** on the page (not inferred, not reconstructed);
- **both** listing-day price/gain **and** current price/gain are available or safely derivable (§6);
- the **source URL + `fetched_at_utc`** are recorded;
- the row is **clearly labeled** Chittorgarh or Broker-ref / aggregator — **never** official (§7).

If a fallback rung cannot meet all of these → move to the next rung; if no rung qualifies → **HALT, write nothing** (target stays pending).

## 6. Write threshold (binding, strict — operator point 4)

Write the perf row **only if BOTH sides are available from the SELECTED source**:
- **listing-day**: a listing-day price (→ compute `listing_gain_pct = ((listing_close − issue_price)/issue_price)×100`) **OR** a directly-published listing gain %, AND
- **current**: a current/latest price (→ compute `current_gain_pct` analogously) **OR** a directly-published current gain %.

Handling:
- **Source gives prices** → compute the gains from the verified `issue_price`.
- **Source gives gains directly** → store the **raw source value** (the literal string/number as shown) AND the **normalized computed/display value** (the numeric `*_gain_pct`), both with provenance recorded in the status doc.
- **Source gives only one side** → **do NOT write the row** (fall through to the next rung, or pending).

**Never write**: a partial row (one side only), a fake/manual/null-gain row, or any row with NaN/null `listing_gain_pct` or `current_gain_pct`. Do not mix rungs within one row — both sides must come from the same selected source. (The Recently Listed charts coerce a null `current_gain_pct` to `0`, so a partial row would plot a misleading point — hence both-sides-or-nothing.)

## 7. Source labeling (binding — operator point 5)

The written row is labeled by the rung that produced it:
- **Official** → `source: 'BSE'` or `'NSE'`, `state: 'live'`.
- **Chittorgarh** → `source: 'Chittorgarh'`, `state: 'aggregator'`.
- **Broker / public page** → `source: 'Broker-ref'`, `state: 'aggregator'` (the existing `DataState` value). **Do NOT add a `'broker_reference'` `DataState`** in this pass — it is not in the schema; using it would be a type change. A distinct broker state would be a separate approved schema extension.

**Do not pretend fallback data is official.** Gate 2 must verify the `ListingPerformance` row's `source`/`state` fields accept `'Chittorgarh'`/`'Broker-ref'`/`'aggregator'` (they should — `source: SourceTag` + `state: DataState` already carry these). If a field is typed as a narrower union that does not accept them, a **minimal additive widening** of that row union is permitted (clean + additive); if it cannot be done cleanly, HALT and report rather than mislabel.

## 8. Conflict handling (binding — operator point 6)

If official data later becomes available and differs from a previously-written fallback value:
- the **official value wins** (overwrite the row with the official value + `source: 'BSE'/'NSE'` + `state: 'live'`);
- the **fallback value stays in the status doc / audit as secondary evidence** (raw value + URL + fetched_at + the discrepancy);
- **never silently overwrite an official value with a fallback value** — fallback only fills when official is absent. Within a single Gate 2 run the ladder already enforces this (official rung runs first); the rule also binds any future refresh.

## 9. Output row (only if all gates pass)

Add/update exactly ONE key in `src/data/snapshots/ipo-listing-performance.json` `by_ipo`, mirroring the existing `ListingPerformance` shape (`src/types/ipo.ts:147-161`) + the optional `fetched_at_utc` the ingest already writes:
`ipo_id, state, issue_price, listing_open, listing_high, listing_low, listing_close, current_price, listing_gain_pct, current_gain_pct, listing_date, source, fetched_at_utc`. `source`/`state` per §7. Prices are populated when the source gives prices; when the source gives only gains directly, the price fields may be `null` (the table shows `—` for those columns) but **both `*_gain_pct` are non-null** — that satisfies the charts and the §6 threshold. The schema has **no** `source_url` field; do not add one (no schema redesign) — the source URL + raw values live in the status doc. The matching master row is added (status `listed`, operator-verified issue terms) via a guarded splice; an official scripcode/symbol (only if the official rung succeeded) is added to `symbol-map.ts`.

## 10. Source audit (recommend DEFER)

Same reasoning as the OnEMI pass: the `ipo-source-audit.json` schema *could* hold a price-provenance field, but appending shifts the target's `source_mix` + completeness chip and would require the global `recomputeSourceMix` (touches every IPO) or a bespoke inline recompute. The perf row's own `source` + `fetched_at_utc` is the canonical price provenance, and the status doc carries the URL + raw values. **Defer** the audit append unless it is provably safe + narrow (per the guardrail "no source-audit mutation unless the existing schema supports it cleanly"); **no source-audit schema change** in this pass.

## 11. UI expectation

**No UI redesign / no UI change.** Verified: Recently Listed filters `status==='listed'` + left-joins perf and reads precomputed `listing_gain_pct`/`current_gain_pct`; the gain bar + fade scatter filter by perf-presence and read the same fields. So the new real listed master row + its perf row (both gains non-null) auto-render in the table AND both charts regardless of rung, and `/ipo/<slug>` renders from the master/detail data. The both-gains rule means no null-safety fix is needed. (The existing source-pill/chip components already render `Chittorgarh` + `Broker-ref` tones, so the row's source label displays with no component change.)

## 12. Guardrails (binding — operator point 8)

One IPO only · **official-first, bounded** (not official-only; not indefinite) · fallback only Chittorgarh then broker, under the §5 public/non-login rules · no Trendlyne scraping · no login/captcha/stealth/proxy bypass · no fake/manual/partial/null-gain prices · no broad listing-performance backfill (only the target + the new master row; all other listing-perf + master rows byte-identical) · no `ipo-source-audit.json` change unless the schema supports it cleanly (per §10 — defer) · no other snapshot mutation · no new workflow · no cron · no database · no UI redesign · no PDF-parser expansion · stay on `main`. The new master row is added **only** after separate approval of the specific verified IPO.

## 13. Acceptance / verification (for Gate 2)

1. Ladder followed in order: official attempted first (bounded); fallback only if official failed; broker only if Chittorgarh failed/incomplete. The status doc shows which rung produced the row.
2. Mapping/identity evidence captured: official scripcode/symbol with company-ownership proof (if official used), and/or the public Chittorgarh/broker URL (if a fallback used); no document/PDF/broker/Chittorgarh **id** used as an official identifier.
3. Exactly ONE intended perf row added/updated (+ ONE new master row + at most ONE symbol-map entry when official succeeded); **all non-target listing-perf rows + all pre-existing master rows byte-identical** (`json.dumps(sort_keys=True)`).
4. No unrelated snapshot changed; `ipo-source-audit.json` untouched.
5. If written: `source` + `state` match the rung (§7); **both** `listing_gain_pct` and `current_gain_pct` non-null; gains equal the computed math (from prices + issue price) or the normalized direct-gain value; no partial/fake/null-price row.
6. `npm run typecheck` + `npm run build` green.
7. Headless render (chromium-1194), 0 console/page errors: `/recently-listed` shows the target IPO with **real** listing AND current gains (correctly source-labeled) and plots it in the gain bar + fade scatter with valid (non-null/non-NaN) values; `/ipo/<target-slug>` renders.
8. If no rung qualified (sandbox unreachable / no verified spec / a rung gave only one side) → no write, target absent, existing rows untouched — documented as the acceptable HALT outcome.

## 14. Status doc requirements (binding — operator point 9)

`phase-real-listed-ipo-performance-status.md` must report:
- **official source attempts made** (BSE scripcode tried? NSE symbol tried?);
- **why official fetch succeeded or failed** (per-rung HTTP status / error / "no verified identifier");
- **whether fallback was used**, and which rung (Chittorgarh / Broker-ref);
- **fallback source URL** if used (+ robots-allowed confirmation);
- **raw listing/current values** as shown by the selected source;
- **computed `listing_gain_pct` + `current_gain_pct`** (and, for direct-gain sources, the raw → normalized mapping);
- **exact source label + state** written to the row;
- **files changed**;
- **confirmation that no partial / fake / null-price row was written** + byte-identity confirmation for all other rows.

## 15. Gate 2 implementation prompt (ready-to-paste)

> Use verbatim when launching the Gate 2 pass. Do not start until the operator approves this prompt AND supplies/approves the specific verified real-IPO spec (separate decisions, post-Gate-1).

```
Add ONE real listed IPO to listing performance — bounded source ladder (official → Chittorgarh → broker), prove Recently Listed.

Operator must first supply a VERIFIED spec (separate approval): company_name, ipo_id/slug,
segment, listing_date, issue_price, listing_exchange; AND at least one usable source key:
official BSE scripcode and/or NSE symbol (with company-ownership evidence — NOT a
PDF/document/broker/Chittorgarh id), and/or a public Chittorgarh detail URL, and/or a public
broker IPO-page URL. No spec / no usable source → HALT, add nothing.

In-scope file changes:
  - scripts/pdf/promote/listed-ipo-performance.ts (NEW; GENERALIZE onemi-listing-performance.ts —
    take ipo_id from argv; read issue_price/listing_date/listing_exchange from the master row;
    implement the BOUNDED SOURCE LADDER below; strict both-sides write gate; byte-identity
    string-surgery insert keyed by ipo_id; source/state label per the rung that produced the row.)
  - scripts/pdf/promote/add-listed-ipo.ts (NEW; guarded spec-driven add of ONE status:'listed'
    master row — mirror onemi-master.ts splice; count guard expects current 11 rows; refuse if
    the id already exists; bump generated_at_utc; all existing rows byte-identical) OR a single
    reviewed master edit if the operator prefers (separately approved either way).
  - scripts/ingest/lib/symbol-map.ts (add the VERIFIED BSE scripcode and/or NSE symbol ONLY if the
    official rung is used, with a comment citing the official source + date).
  - src/data/snapshots/ipo-master.json (the ONE new listed row; nothing else).
  - src/data/snapshots/ipo-listing-performance.json (the ONE new perf row IFF both sides from the
    selected rung; else untouched).
  - phase-real-listed-ipo-performance-status.md (NEW status report per §14).

Bounded source ladder (stop at the first rung that yields BOTH sides):
  1. OFFICIAL (bounded — one pass, no indefinite retry):
     - if a verified BSE scripcode: fetchBseHistorical(scripcode) (first element = listing-day,
       last = current).
     - if a verified NSE symbol: fetchNseQuote(symbol) (current).
     - on both failing (HTTP/network/parse) OR no verified identifier → record the official
       failure reason and FALL THROUGH. Reuse the existing helpers (export them); do NOT add a
       new retry loop.
     - label: source='BSE'|'NSE', state='live'.
  2. CHITTORGARH (only if official did not produce both sides): fetch the public Chittorgarh
     detail URL (robots-allowed /ipo/<slug>/<id>/ only; single GET or one bounded public render;
     no login/captcha/stealth/proxy). Extract clearly-visible listing-day + current price/gain.
     - label: source='Chittorgarh', state='aggregator'.
  3. BROKER/PUBLIC (only if Chittorgarh unavailable/incomplete): fetch the public broker IPO page
     (no login/captcha/stealth/proxy). Extract clearly-visible listing-day + current price/gain.
     - label: source='Broker-ref', state='aggregator'.

Write threshold (strict — same at every rung):
  - Need BOTH listing-day (price→compute gain, or direct gain) AND current (price→compute gain,
    or direct gain) from the SAME selected source. Source gives prices → compute gains from
    issue_price. Source gives gains directly → store raw value (status doc) + normalized numeric
    *_gain_pct (row). Only one side → do NOT write; fall through / pending.
  - Never write a partial / fake / manual / null-gain / mixed-rung row.

Out of scope (HARD):
  - ipo-source-audit.json (do NOT append unless schema supports cleanly; default DEFER) ; any other snapshot
  - non-target listing-perf rows + all pre-existing master rows (byte-identical)
  - OnEMI fallback ; Trendlyne ; GMP ; manual/fabricated prices ; broad backfill
  - login/captcha/stealth/proxy/fingerprint bypass on ANY source
  - DataState 'broker_reference' (NOT in schema; use 'aggregator' for broker) ; no other type change
    unless a minimal additive widening of the ListingPerformance source/state union is strictly
    required to accept Chittorgarh/Broker-ref/aggregator (clean + additive only; else HALT + report)
  - src/components/** ; src/pages/** (no UI change — auto-render)
  - .github/workflows/* ; cron ; database ; PDF parser ; UI redesign ; any IPO beyond the target

Verification order (binding):
  (a) Confirm the verified spec (official identifier with ownership proof and/or public fallback URLs); else HALT.
  (b) Add the master row (add-listed-ipo or reviewed edit) + symbol-map entry (only if official rung will be used).
  (c) npx tsx scripts/pdf/promote/listed-ipo-performance.ts <ipo_id>
      (runs the ladder; HALT + no write is acceptable if every rung is unreachable/incomplete — report which rung failed and why.)
  (d) git + json.dumps(sort_keys=True): exactly one new master row + one new perf row + (<=1) symbol-map
      entry; all other master + listing-perf rows byte-identical; ipo-source-audit.json + other snapshots untouched.
  (e) npm run typecheck ; npm run build.
  (f) Headless render (chromium 1194 at /opt/pw-browsers): /recently-listed shows the target with
      real listing AND current gains (correctly source-labeled) + plots it in both charts (valid values);
      /ipo/<slug> renders. 0 console/page errors.
  (g) Write phase-real-listed-ipo-performance-status.md per §14 (official attempts + failure reason;
      fallback used + URL; raw values; computed gains + raw->normalized; source label/state; files changed;
      no-partial/fake/null confirmation; byte-identity).
  (h) Commit + push to main (only if hard gates pass, or a clean safe no-write status commit).

After push: STOP and report. Do not add more IPOs, append source-audit, extend DataState, or change
workflows without separate approval.
```

## 16. Exit criterion

**Gate 1 (this doc) closes** when: `phase-real-listed-ipo-performance-plan.md` exists at repo root (mirrors master plan §II — bounded source ladder + labeling + conflict handling + status-doc requirements + the §15 Gate 2 prompt), committed + pushed to `main`; no code/snapshot/workflow change; `npm run typecheck` + `npm run build` green at the doc-only commit; operator asked to separately approve the §15 prompt + the specific verified IPO.

**Gate 2 closes** when: a real listed IPO was added (ONE master row + ≤1 symbol-map entry + ONE perf row whose BOTH gains came from a single ladder rung, correctly labeled official/Chittorgarh/Broker-ref; all other rows byte-identical; Recently Listed shows real gains + charts plot it; detail page renders) **or** no rung qualified (→ no write, nothing added — an acceptable HALT); `phase-real-listed-ipo-performance-status.md` records the ladder outcome with evidence; no out-of-scope change.
