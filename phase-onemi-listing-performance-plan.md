# OnEMI Listing-Performance Fill — Official Exchange Data Only (planning only)

> **Mode**: planning. No code edits, no snapshot mutations, no workflow change. **This document is the Gate 1 deliverable — it does not authorise Gate 2 (implementation).** Gate 2 requires separate explicit operator approval of the §9 prompt below.
>
> **Date**: 2026-05-25
>
> **Predecessors**: `phase-next-dashboard-polish-status.md` (OnEMI corrected to `listed`; Recently Listed tolerates listed-without-perf — shows `—` + "listing data pending"), master plan §HH.
>
> **Trigger**: OnEMI now shows `—` gains on Recently Listed because it has no `ipo-listing-performance.json` row. Attempt to replace that pending state with **real listing/current gains from official exchange data only** — but **only if** OnEMI can be mapped to a verified official exchange identifier. If not, the honest terminal state is "pending stays" (no manual/fake data).

## Critical reality (shapes the whole plan)

- OnEMI is a **synthetic/fictional IPO** in this mock dashboard. `scripts/ingest/lib/symbol-map.ts` is empty and its own comment notes every "listed" master row is synthetic seed with **no real BSE scripcode / NSE symbol**. OnEMI is the same — so a real official mapping likely **does not exist**.
- The `378749` embedded in OnEMI's RHP URL (`bseindia.com/corporates/download/378749/IPO%20Open/…`) is a **document-attachment / corporate-filing download id — NOT a tradable BSE equity scripcode.** It must NOT be used as the scripcode.
- This sandbox/CI **cannot reach** `api.bseindia.com` / `nseindia.com` (host-allowlist 403, established project-wide). Any official fetch must run where those endpoints are reachable (operator machine / network-permitted CI).
- Therefore the **expected, acceptable outcome** of Gate 2 is most likely: mapping unverifiable and/or fetch blocked → **HALT, write nothing, listing stays pending.** This plan treats that as the guardrail succeeding, not a failure.

## Two-gate execution

| Gate | Scope | Approval |
|---|---|---|
| **Gate 1 — Planning doc only** (this turn) | Create + commit + push this doc. NO code/snapshot/type/workflow change. | ExitPlanMode approval of this plan |
| **Gate 2 — Implementation** | Execute the §9 prompt: a guarded OnEMI-only listing-performance promoter that fetches official BSE/NSE data and writes ONE row **iff** a verified mapping yields a real listing-day price (and current price); else HALT. Write `phase-onemi-listing-performance-status.md`. | Separate explicit operator approval of the §9 prompt |

Gate 2 MUST NOT start in the same turn as Gate 1.

## 1. Objective

- Map `onemi-technology-solutions` to a **verified** official listed identifier (BSE equity scripcode and/or NSE symbol).
- Fetch official listing-day / current price data from the exchange endpoints already wired in the repo.
- Add ONE OnEMI row to `src/data/snapshots/ipo-listing-performance.json` **only if** the mapping is verified AND a real official listing-day price (plus current price) is returned.
- Compute `listing_gain_pct` / `current_gain_pct` from issue price (₹171 upper band) + the official listing-day / current prices, so Recently Listed shows real gains instead of `—`.
- **Reuse the existing official-fetch machinery** — do not invent new endpoints or parsers.

## 2. Mapping preflight (the verification gate — binding)

Before writing ANY data, the promoter must have evidence for ALL of:
- production id = `onemi-technology-solutions` (present in `ipo-master.json`);
- company name = "OnEMI Technology Solutions";
- `status === 'listed'`; `listing_exchange` includes `BSE`; `listing_date === '2026-05-08'`; `issue_price === price_band.high === 171`;
- a **verified** official identifier: a BSE equity scripcode in `BSE_SCRIPCODES['onemi-technology-solutions']` and/or an NSE symbol in `NSE_SYMBOLS['onemi-technology-solutions']` (`scripts/ingest/lib/symbol-map.ts`).

**Verification standard (binding):** the scripcode/symbol must be confirmed against an **official exchange source** (BSE security/scrip master or the BSE stock-quote page for the security; NSE symbol master) — NOT the `378749` document-download id, NOT Chittorgarh, NOT a broker page, NOT a guess. The operator populates `symbol-map.ts` only after that confirmation, with a comment citing the official source + date.

**If no verified mapping exists → HALT.** Print the exact instruction (add a verified entry to `symbol-map.ts`) and exit 0 without writing. Listing data stays pending. Because OnEMI is synthetic, this is the most likely outcome and is fully acceptable.

## 3. Allowed sources (binding)

1. **BSE official** historical OHLC — `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode={code}&flag=W&fromdate=&todate=&seriesid=` (the endpoint already used by `scripts/ingest/listing-performance.ts:63`), **iff** a verified BSE scripcode.
2. **NSE official** current quote — `https://www.nseindia.com/api/quote-equity?symbol={symbol}` (already used at `listing-performance.ts:103`), **iff** a verified NSE symbol.
3. Existing official metadata already in the repo (master `price_band.high` for issue price; `listing_date`) may be used for cross-check / issue price.
4. **Forbidden**: Chittorgarh, broker sites (Zerodha/Upstox), GMP sites, manual web guesses, any fabricated price. No JS render / stealth / proxy.

## 4. Candidate output (only if verified + real listing-day + current prices fetched)

Add/replace the OnEMI key in `src/data/snapshots/ipo-listing-performance.json` `by_ipo`, mirroring the existing row shape (`ListingPerformance`, `src/types/ipo.ts:147-161`; the ingest writer also adds an optional `fetched_at_utc` key — `listing-performance.ts:43`):

```jsonc
"onemi-technology-solutions": {
  "ipo_id": "onemi-technology-solutions",
  "state": "live",
  "issue_price": 171,                 // price_band.high (cross-checked vs master)
  "listing_open":  <BSE listing-week open (history FIRST element)>,
  "listing_high":  <BSE max high over history>,
  "listing_low":   <BSE min low over history>,
  "listing_close": <BSE listing-week close (history FIRST element) — the listing-day price>,
  "current_price": <BSE latest close (history LAST element) or NSE lastPrice>,
  "listing_gain_pct":  ((listing_close - 171)/171)*100,   // REQUIRED non-null to write
  "current_gain_pct":  ((current_price - 171)/171)*100,   // REQUIRED non-null to write
  "listing_date": "2026-05-08",
  "source": "BSE",                    // or "NSE" if only the NSE quote resolved
  "fetched_at_utc": "<ISO at fetch>"  // schema-optional provenance the ingest already writes
}
```

- **Listing-day vs current (binding):** map the **listing-day** price from the listing-week data point (FIRST element of the BSE weekly history — `first.open` / its close), and the **current** price from the LATEST element (`last.close`) or the NSE quote. Do not conflate them (the existing slice's `last.close`-as-`listing_close` shortcut is the *current* close, not the listing-day close — Gate 2 must take the listing-day value from the first element).
- **Write rule (binding, tightened):** write the row **only if an official listing-day price is obtained AND `listing_gain_pct` is non-null** (computed from the official listing-day close vs issue price 171). **Additionally require a non-null `current_gain_pct`** — because the Recently Listed charts coerce a null `current_gain_pct` to `0` (`p.current_gain_pct ?? 0` in `ListingGainBar`/`FadeScatter`), which would plot a misleading "faded to issue price" point rather than skipping it; per "prefer the safer option if there is any chart risk", a row therefore needs **both** gains real and non-null (both are derivable from a single BSE weekly-history fetch: first element → listing-day, last element → current).
  - **If the listing-day price cannot be fetched → HALT, write nothing, pending remains.**
  - **If only a current price is available (no listing-day data) → HALT** (do NOT write a current-only/partial row); record the current-price attempt in the status doc only.
  - Never write a null-gain row, never set `source: 'manual'`, never fabricate. This keeps every plotted point valid (no null/NaN, no misleading 0).
- Gain math + issue-price source reuse `listing-performance.ts:212-216` exactly.
- The schema's only per-row provenance is `source` (+ the optional `fetched_at_utc`); there is **no** `source_url` field — do not add one (no schema redesign). Full provenance (endpoint, scripcode/symbol, fetch time, raw values) goes in `phase-onemi-listing-performance-status.md`.

## 5. Source-audit decision (recommend DEFER)

The `ipo-source-audit.json` schema **does** support adding a per-field price-provenance row (OnEMI's `fields[]` + the `bse`/`nse` `source_mix` buckets exist). **Recommendation: DO NOT append in this pass.** Rationale:
- The listing-performance row's own `source` + `fetched_at_utc` is the canonical provenance for price data; the SourceAuditPanel mix is about **issue-term/field construction**, which listing performance is not.
- Appending would shift OnEMI's `source_mix` from `chittorgarh:100` to e.g. `chittorgarh:80 / bse:20` and bump the `CompletenessChip` from `Chittorgarh · 8 terms` → `10 terms` — for marginal gain — and would require either the global `recomputeSourceMix` (which rewrites **every** IPO's mix, violating OnEMI-only) or a bespoke OnEMI-scoped inline recompute.
- Keeping it out preserves the OnEMI-only + non-OnEMI-byte-identical guarantee and the stable chip. If the operator later wants price provenance in the panel, do it as a separate, explicitly-approved OnEMI-only append with an inline (not global) mix recompute. **No source-audit redesign here.**

## 6. Guardrails (binding)

- **OnEMI only.** No non-OnEMI `ipo-listing-performance.json` rows changed (greendale-cement, lumino-hyperscale byte-identical).
- No fake/manual/guessed price data; no null-gain row; `source` is never `'manual'` for OnEMI here.
- No Chittorgarh; no broker scraping; no GMP.
- No `ipo-source-audit.json` change (per §5); no other snapshot changed (`ipo-master.json`, `ipo-documents.json`, `ipo-financials.json`, `ipo-narrative.json`, `ipo-subscriptions.json` untouched).
- No `.github/workflows/*` change; no cron; no database; no PDF-parser expansion; no UI redesign; no type changes (the row uses the existing `ListingPerformance` shape + the already-written optional `fetched_at_utc`). Stay on `main`.
- Reuse the existing official endpoints + gain math + merge/atomic-write helpers; do not invent new sources.

## 7. UI expectation

**No UI redesign required.** Verified by exploration: Recently Listed's table already iterates `status==='listed'` and left-joins perf; `ListingGainBar` + `FadeScatter` filter by perf-presence; all three read the precomputed `listing_gain_pct` / `current_gain_pct` fields directly. So **once the OnEMI row exists with both gains non-null, gains appear automatically** in the table AND both charts, and the "listing data pending" hint disappears — zero component changes. The `/ipo/onemi-technology-solutions` detail page is unaffected. The tightened write rule (both gains non-null) means **no null-safety fix is required**; if one is somehow needed, document it and keep scope minimal.

## 8. Acceptance gate / verification (for Gate 2)

1. **Mapping evidence**: a verified BSE scripcode and/or NSE symbol for OnEMI is present in `symbol-map.ts` with an official-source citation; the `378749` download-id was NOT used.
2. **Conditional write**: OnEMI row added to `ipo-listing-performance.json` **iff** the mapping verified AND a real official listing-day price AND current price fetched; otherwise no write + a clear "pending preserved" report (acceptable terminal state).
3. **OnEMI-only**: greendale-cement + lumino-hyperscale rows JSON-semantically byte-identical pre/post (`json.dumps(sort_keys=True)`); only the OnEMI key + `generated_at_utc` + `source_meta` change.
4. **No fabrication + listing-day gate**: if written, every numeric field traces to BSE/NSE; `source ∈ {BSE,NSE}`; `state: 'live'`; **`listing_gain_pct` is non-null and equals `((official listing-day close − 171)/171)*100`**, and **`current_gain_pct` is non-null** and equals the analogous math from the official current price. No partial/current-only row exists.
5. **Untouched**: `ipo-source-audit.json` + all other snapshots + workflows + types unchanged.
6. `npm run typecheck` + `npm run build` green.
7. Headless render (chromium-1194): if a row was written, `/recently-listed` shows OnEMI with **real** listing AND current gains (no `—`, no "listing data pending") in the table, and OnEMI plots in the gain bar + fade scatter with **valid, non-null** values (no null/NaN, no misleading `0`); if no row (pending), `/recently-listed` still renders OnEMI with `—` + pending hint and the charts are unbroken (OnEMI not plotted). `/ipo/onemi-technology-solutions` renders cleanly either way. 0 console/page errors.
8. `phase-onemi-listing-performance-status.md` records: the mapping evidence (or why verification failed), the endpoint(s) hit + raw values, the written row (or the pending decision), and byte-identity confirmation.

## 9. Gate 2 implementation prompt (ready-to-paste)

> Use verbatim when launching the Gate 2 pass. Do not start until the operator approves this prompt as a separate, post-Gate-1 decision.

```
OnEMI listing-performance fill — official BSE/NSE data only, OnEMI-only, write iff verified.

In-scope file changes:
  - scripts/ingest/lib/symbol-map.ts (operator adds a VERIFIED OnEMI mapping —
    BSE_SCRIPCODES["onemi-technology-solutions"] and/or NSE_SYMBOLS[...], with a
    comment citing the official BSE/NSE source + date. NOT the 378749 download-id.)
  - scripts/ingest/listing-performance.ts (add `export` to fetchBseHistorical +
    fetchNseQuote so the promoter reuses them — additive, no behavior change)
  - scripts/pdf/promote/onemi-listing-performance.ts (NEW; guarded OnEMI-only promoter)
  - src/data/snapshots/ipo-listing-performance.json (ADD the OnEMI row IFF verified +
    real listing-day + current prices; else untouched)
  - phase-onemi-listing-performance-status.md (NEW — end-of-pass report)

Out of scope (HARD):
  - ipo-source-audit.json (do NOT append; per §5 — no global recompute, no chip shift)
  - ipo-master.json / ipo-documents.json / ipo-financials.json / ipo-narrative.json /
    ipo-subscriptions.json (do NOT mutate)
  - the existing greendale-cement / lumino-hyperscale listing rows (byte-identical)
  - src/types/* (use the existing ListingPerformance shape; the optional fetched_at_utc
    key the ingest already writes is fine)
  - src/components/** / src/pages/** (no UI change; gains surface automatically)
  - Chittorgarh / Zerodha / Upstox / GMP / any non-official source; no manual/fake price
  - .github/workflows/* ; cron ; database ; PDF parser ; broad UI redesign
  - any IPO other than OnEMI

Promoter behaviour (scripts/pdf/promote/onemi-listing-performance.ts):
  - Hard-code IPO_ID = 'onemi-technology-solutions'.
  - Read ipo-master.json; preflight: OnEMI present, status==='listed',
    listing_exchange includes 'BSE', listing_date==='2026-05-08',
    issue_price = price_band.high (=== 171). HALT on any mismatch.
  - Mapping gate: scripcode = bseScripcodeFor(IPO_ID); symbol = nseSymbolFor(IPO_ID).
    If BOTH null → HALT (exit 0), print "no verified mapping — add a verified BSE
    scripcode / NSE symbol to symbol-map.ts (official source only; NOT the RHP
    download-id 378749)". Listing stays pending. (Expected outcome for a synthetic IPO.)
  - Fetch official only: if scripcode → fetchBseHistorical(scripcode) (BSE StockReachGraph);
    if symbol → fetchNseQuote(symbol) (NSE quote-equity). Reuse the exported helpers.
  - Require LISTING-DAY data (tightened): map listing_open/listing_close from the BSE
    weekly-history FIRST element (listing week) and current_price from the LAST element
    (or NSE quote) — do NOT use last.close as the listing-day close. A write requires a
    real official listing-day close (=> listing_gain_pct non-null) AND a real current
    price (=> current_gain_pct non-null), since the charts coerce a null current_gain_pct
    to 0 (misleading). Both are obtainable from one BSE history fetch.
      * If the listing-day price cannot be fetched → HALT, write nothing, print
        "no official listing-day price — listing stays pending".
      * If only a current price is available (no listing-day data) → HALT (do NOT write a
        current-only/partial row); record the current-price attempt in the status doc only.
      * NO manual fallback, NO null-gain row, NEVER source:'manual', NEVER fabricate.
  - Compute issue_price=171; listing_gain_pct = ((listing_close-171)/171)*100 and
    current_gain_pct = ((current_price-171)/171)*100 (mirror listing-performance.ts:212-216).
    Both must be non-null for the write to proceed.
  - Read ipo-listing-performance.json; string-surgery insert/replace ONLY the OnEMI key
    in by_ipo (greendale/lumino byte-identical), set state:'live', source:'BSE'|'NSE',
    fetched_at_utc, bump generated_at_utc + source_meta. Atomic .tmp+rename. Idempotent.

Verification order (binding):
  (a) Confirm a verified mapping is in symbol-map.ts (or accept the HALT/pending path).
  (b) npx tsx scripts/pdf/promote/onemi-listing-performance.ts
      (HALT + write nothing is an ACCEPTABLE terminal outcome — report it; do not force a write.)
  (c) If written: git diff + json.dumps(sort_keys=True) — only the OnEMI key + generated_at_utc
      + source_meta changed; greendale + lumino byte-identical; no other snapshot touched.
  (d) Confirm ipo-source-audit.json + ipo-master.json + the other snapshots untouched.
  (e) npm run typecheck ; npm run build.
  (f) Headless render (chromium 1194 at /opt/pw-browsers): /recently-listed shows OnEMI with
      real listing AND current gains (if written) OR with "—" + pending hint (if not); charts
      unbroken (no null/NaN/0 plotted); /ipo/onemi-technology-solutions renders. 0 console/page errors.
  (g) Write phase-onemi-listing-performance-status.md (mapping evidence or failure reason;
      endpoints + raw values; written row or pending decision; byte-identity).
  (h) Commit + push to main.

After push: STOP and report. Do not append source-audit, add other IPOs, or change workflows
without separate approval.
```

## Exit criterion

**Gate 1 (this doc) closes** when: `phase-onemi-listing-performance-plan.md` exists at repo root (mirrors master plan §HH), committed + pushed to `main`; no code/snapshot/type/workflow change; `npm run typecheck` + `npm run build` green at the doc-only commit; operator asked to separately approve the §9 prompt.

**Gate 2 closes** when: a verified OnEMI mapping was either found (→ official fetch → one `state:'live'` row with real, non-null listing AND current gains, greendale/lumino byte-identical, Recently Listed shows real gains) **or** could not be verified / returned no listing-day price (→ no write, listing stays pending — an acceptable terminal state); `phase-onemi-listing-performance-status.md` records the outcome with evidence; no out-of-scope change.
