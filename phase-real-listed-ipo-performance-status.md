# Real Listed IPO → Listing Performance — Status

> Implementation status for `phase-real-listed-ipo-performance-plan.md`. Records **Gate 2a (target selection, approved: Bajaj Housing Finance)** plus a **Gate 2b reachability check that found every ladder source blocked by this environment's network allowlist → no data written.** No master row, no symbol-map entry, no perf row. Completing the proof requires a network-permitted environment (see the Gate 2b section).

## Gate 2a — Target selection (2026-05-25)

**No snapshot rows were written in Gate 2a.** No `ipo-master.json` row, no `ipo-listing-performance.json` row, no `symbol-map.ts` entry, and the full promoter was **not** run. This section is a selection proposal only.

### Step 0 — current repo state (inspected)

- `src/data/snapshots/ipo-master.json`: **11 rows**; the only `status:'listed'` rows are `greendale-cement` (sme), `lumino-hyperscale` (mainboard), `onemi-technology-solutions` (mainboard) — **all synthetic seed** ("synthetic seed" taglines; OnEMI was a prior synthetic add; `source_meta` shows NSE ingest `empty`). The real-company-named rows (InCred Holdings, Jindal Supreme, Playsimple Games, Online Instruments, Punjab Carbonic) are `upcoming`/`open`, **not listed** → not eligible for a listing-performance proof.
- `src/data/snapshots/ipo-listing-performance.json`: only `greendale-cement` + `lumino-hyperscale` (both `state:'manual'`, synthetic). No real listed IPO has performance data.
- **Conclusion:** no existing listed real IPO qualifies; synthetic rows are not eligible. → A new, operator-verified real listed IPO must be added (separate approval, Gate 2b).

### Verification limitation (binding context)

This sandbox **cannot reach** `api.bseindia.com` / `nseindia.com` / `chittorgarh.com` (host-allowlist). So the candidate's identifiers below are drawn from **public record / model knowledge (cutoff Jan 2026)** and are **NOT live-verified here**. Every value tagged `[verify@2b]` MUST be confirmed against the official source at Gate 2b (run from a network-permitted environment) before it is written. No value here is written to any snapshot.

### Chosen target candidate (recommended)

**Bajaj Housing Finance Limited** — a marquee September-2024 mainboard IPO, dual-listed NSE+BSE.

| Field | Proposed value | Confidence |
|---|---|---|
| company_name | Bajaj Housing Finance Limited | high |
| ipo_id (proposal) | `bajaj-housing-finance` | n/a (slug convention) |
| slug (proposal) | `bajaj-housing-finance` | n/a |
| segment | mainboard | high |
| listing_exchange | `["NSE","BSE"]` | high |
| listing_date | 2024-09-16 `[verify@2b]` | high |
| issue_price | ₹70 (band ₹66–70, final ₹70) `[verify@2b]` | high |
| face_value | ₹10 `[verify@2b]` | high |
| NSE symbol | `BAJAJHFL` `[verify@2b]` | high |
| BSE scripcode | `544252` `[verify@2b]` | medium — must confirm against the BSE quote page |

### Why it was chosen

- **Real, abundantly public, and verifiable** — one of India's largest, most-documented 2024 listings; official BSE/NSE history + a Chittorgarh report + multiple broker pages all exist, so every rung of the source ladder has a real chance.
- **Dual-listed NSE+BSE** → maximizes the odds the **official** rung succeeds and gives a cross-checkable scripcode/symbol.
- **Dramatic, non-trivial listing gain** (listed ~₹150 vs ₹70 issue, ≈ +114% on debut), and it has continued trading since → **both** a striking listing-day gain **and** a meaningful current gain are available from a single source → an ideal end-to-end proof for the Recently Listed table + the gain-bar + fade-scatter charts.
- High personal confidence on the issue price / listing date / NSE symbol minimizes the chance of a wrong proposal (only the BSE scripcode + the exact fetched prices remain to be confirmed/fetched at Gate 2b).

### Official mapping evidence / official-attempt limitation

- Proposed official identifiers: NSE `BAJAJHFL`, BSE `544252` `[verify@2b]`. **Ownership proof to capture at Gate 2b**: the BSE quote page for scripcode `544252` and the NSE symbol master must both show "Bajaj Housing Finance" before the scripcode/symbol is written to `symbol-map.ts`. The RHP/document download id is **not** used as an identifier.
- Official-attempt limitation: cannot be exercised in this sandbox (BSE/NSE unreachable). The bounded official attempt (one `fetchBseHistorical` + one `fetchNseQuote`) runs at Gate 2b from a network-permitted environment.

### Chittorgarh fallback URL (rung 2)

`https://www.chittorgarh.com/ipo/bajaj-housing-finance-ltd-ipo/<id>/` — public, robots-allowed `/ipo/<slug>/<id>/` path. The exact numeric `<id>` is resolved at fetch time (via the known slug `bajaj-housing-finance-ltd-ipo`); the page exposes listing-day + current performance for direct extraction. `[verify@2b]`

### Broker / public fallback URL (rung 3, only if Chittorgarh fails/incomplete)

A public, non-login broker/aggregator IPO page, e.g. `https://groww.in/ipo/bajaj-housing-finance` or an Upstox IPO page — used only for clearly-visible listing-day + current price/gain. Exact path confirmed at fetch time. `[verify@2b]`

### Expected source rung likely to succeed

**Rung 1 (Official BSE/NSE)** is the most likely to succeed once run from a reachable env (verified scripcode + symbol, dual-listed). **Rung 2 (Chittorgarh)** is the strong, previously-proven-reachable fallback if the official endpoints are blocked/incomplete. Rung 3 (broker) only if both fail.

### Exact fields expected to be written later (Gate 2b, only if a rung yields BOTH sides)

- New `ipo-master.json` row (status `listed`): `id`/`slug` `bajaj-housing-finance`, `name`, `segment: mainboard`, `status: listed`, `listing_exchange: ["NSE","BSE"]`, `listing_date`, `price_band {low:66, high:70}`, `face_value: 10`, `nse_symbol: BAJAJHFL`, issue terms — all `[verify@2b]`. (Separate approval required.)
- `symbol-map.ts`: `BSE_SCRIPCODES['bajaj-housing-finance'] = '544252'` and/or `NSE_SYMBOLS['bajaj-housing-finance'] = 'BAJAJHFL'` — only if the official rung is used, with an official-source citation.
- New `ipo-listing-performance.json` row: `ipo_id`, `state` (`live` official / `aggregator` fallback), `issue_price: 70`, `listing_open`, `listing_high`, `listing_low`, `listing_close` (listing-day), `current_price` (latest), `listing_gain_pct`, `current_gain_pct`, `listing_date: 2024-09-16`, `source` (`BSE`/`NSE`/`Chittorgarh`/`Broker-ref`), `fetched_at_utc`. Both `*_gain_pct` must be non-null and come from the **same** rung, else no write.

### Alternatives (if you prefer a different profile)

- **Hyundai Motor India** (`HYUNDAI`, listed 2024-10-22, issue ₹1960) — India's largest IPO; listed ~flat/slightly below issue → a muted-listing example.
- **Ola Electric Mobility** (`OLAELEC`, listed 2024-08-09, issue ₹76) — another high-profile, volatile post-listing example.

### Gate 2a exit

Operator **approved Bajaj Housing Finance** as the Gate 2b target (subject to official/fallback verification; bounded ladder; write only if both sides from one rung with provenance; no fake/manual values).

## Gate 2b — official/fallback verification attempt (2026-05-25): BLOCKED, no write

Before any mutation, a **read-only reachability probe** (plain GET, no login/captcha/stealth/proxy/bypass) was run against all three ladder rungs from this environment:

| Rung | Host | Result |
|---|---|---|
| 1 — Official BSE | `api.bseindia.com` (StockReachGraph, scripcode 544252) | **HTTP 403** `x-deny-reason: host_not_allowed` |
| 1 — Official NSE | `nseindia.com` (quote-equity BAJAJHFL) | **HTTP 403** `host_not_allowed` |
| 2 — Chittorgarh | `chittorgarh.com` | **HTTP 403** `host_not_allowed` |
| 3 — Broker/public | `groww.in` (bajaj-housing-finance) | **HTTP 403** `host_not_allowed` |
| (contrast) | `registry.npmjs.org`, `github.com` | 200 / reachable |

**Finding:** this environment's egress allowlist blocks **every** ladder source (the 403s come from the network proxy — `x-deny-reason: host_not_allowed`, body "Host not in allowlist" — not from the sites' own servers). No rung can fetch listing-day or current data here.

**Outcome — HALT, no write (correct per the strict threshold):** since no rung is reachable, no rung can yield both listing-day + current values with provenance. Therefore:
- **No** `ipo-master.json` row added (Bajaj Housing Finance not inserted).
- **No** `symbol-map.ts` entry added (scripcode/symbol unverified — not fetched).
- **No** `ipo-listing-performance.json` row written.
- **No** fake/manual/guessed values substituted for the unreachable data.

**To complete the proof**, Gate 2b must run from a **network-permitted environment** where `api.bseindia.com` / `nseindia.com` / `chittorgarh.com` (and a broker page) are reachable — e.g. the operator's machine, or a CI job / Claude Code environment whose network policy allowlists those hosts. The §15 prompt in the plan doc is ready to paste there; the official rung should succeed for this dual-listed target, with Chittorgarh as the proven-reachable fallback.

**No snapshot rows, master rows, or symbol-map entries were written in this Gate 2b attempt.**

### Decision (operator, 2026-05-25)

Run Gate 2b in a **network-permitted environment**; **do not build partial tooling in this blocked sandbox** (it would still end in a no-write state, and the Chittorgarh/broker parsers can't be validated without reachable pages). No `ipo-master.json` / `ipo-listing-performance.json` / `symbol-map.ts` mutation here. Next action: run the ready-to-paste prompt below where the ladder sources are reachable.

### Ready-to-paste Gate 2b prompt (Bajaj Housing Finance — run in a network-permitted environment)

```
Gate 2b — Bajaj Housing Finance listing-performance proof (bounded source ladder). RUN ONLY in a
network-permitted environment where api.bseindia.com / nseindia.com / chittorgarh.com (and a public
broker IPO page) are reachable. Follows phase-real-listed-ipo-performance-plan.md §15. Stay on main.

TARGET (verify every [v] value against the cited official source BEFORE writing):
  company_name    : Bajaj Housing Finance Limited
  ipo_id / slug   : bajaj-housing-finance
  segment         : mainboard
  listing_exchange: ["NSE","BSE"]
  listing_date    : 2024-09-16          [v: BSE/NSE listing notice]
  issue_price     : 70  (band 66-70)    [v: RHP/exchange final issue price]
  face_value      : 10                  [v]
  NSE symbol      : BAJAJHFL            [v: NSE symbol master shows "Bajaj Housing Finance"]
  BSE scripcode   : 544252              [v: BSE quote page for 544252 shows "Bajaj Housing Finance" — NOT a doc/download id]
  Chittorgarh URL : https://www.chittorgarh.com/ipo/bajaj-housing-finance-ltd-ipo/<id>/   [v: resolve <id>]
  Broker URL      : https://groww.in/ipo/bajaj-housing-finance                            [v]

PREFLIGHT (HALT if it fails):
  - Confirm BSE scripcode 544252 AND/OR NSE symbol BAJAJHFL belong to Bajaj Housing Finance via the
    official BSE quote page / NSE symbol master (capture the URL). Never use an RHP/document/download id.
  - If neither official identifier verifies AND no public Chittorgarh/broker page is reachable → HALT, write nothing.

BOUNDED SOURCE LADDER (stop at the first rung that yields BOTH listing-day AND current):
  1. OFFICIAL (bounded — one pass, no indefinite retry):
       BSE: fetchBseHistorical(544252) — first element = listing-day (Sep 2024), last = current.
       NSE: fetchNseQuote(BAJAJHFL) — current.
       both fail / no verified id → record the reason, fall through.  label: source=BSE|NSE, state=live.
  2. CHITTORGARH (only if official incomplete): GET the public robots-allowed /ipo/<slug>/<id>/ page
       (single GET / one bounded render; no login/captcha/stealth/proxy). Extract clearly-visible
       listing-day + current price/gain.  label: source=Chittorgarh, state=aggregator.
  3. BROKER/PUBLIC (only if Chittorgarh incomplete): GET the public broker page (no bypass). Extract
       clearly-visible listing-day + current price/gain.  label: source=Broker-ref, state=aggregator.

WRITE THRESHOLD (strict, same at every rung):
  - Need BOTH listing-day (price→compute gain from issue 70, or direct gain) AND current (price→compute
    gain, or direct gain) from the SAME rung. Only one side → do NOT write; fall through / pending.
  - Source gives prices → gain = ((price-70)/70)*100. Source gives gains directly → store the raw value in
    the status doc + the normalized numeric *_gain_pct in the row.
  - NEVER write a partial / fake / manual / null-gain / mixed-rung row.

IMPLEMENT (in-scope only):
  - scripts/pdf/promote/listed-ipo-performance.ts (NEW; generalize onemi-listing-performance.ts — ipo_id
    from argv; read issue_price/listing_date/listing_exchange from the master row; bounded ladder above;
    strict gate; byte-identity string-surgery insert keyed by ipo_id; source/state per rung).
  - scripts/pdf/promote/add-listed-ipo.ts (NEW; guarded add of ONE status:listed master row for
    bajaj-housing-finance — mirror onemi-master.ts splice; count guard expects 11 existing rows → 12;
    refuse if id exists; bump generated_at_utc; all existing rows byte-identical) OR a reviewed master edit.
  - scripts/ingest/lib/symbol-map.ts (add BSE_SCRIPCODES['bajaj-housing-finance']='544252' and/or
    NSE_SYMBOLS['bajaj-housing-finance']='BAJAJHFL' — ONLY if the official rung is used + verified, with a
    comment citing the official source + date).
  - src/data/snapshots/ipo-master.json (ONE new listed row; nothing else).
  - src/data/snapshots/ipo-listing-performance.json (ONE new perf row IFF both sides from one rung; else untouched).
  - phase-real-listed-ipo-performance-status.md (append the Gate 2b result).

OUT OF SCOPE (HARD): ipo-source-audit.json (defer) ; other snapshots ; non-target rows + pre-existing master
  rows (byte-identical) ; OnEMI fallback ; Trendlyne ; GMP ; manual/fabricated prices ; broad backfill ;
  login/captcha/stealth/proxy bypass ; DataState 'broker_reference' (use 'aggregator') ; any type change beyond
  a minimal additive ListingPerformance source/state widening if strictly required ; src/components/** ;
  src/pages/** ; .github/workflows/* ; cron ; database ; UI redesign ; PDF parser ; any IPO beyond Bajaj Housing.

VERIFY: (a) identifier-ownership proof captured; (b) add master row + symbol-map (official only);
  (c) npx tsx scripts/pdf/promote/listed-ipo-performance.ts bajaj-housing-finance;
  (d) git + json.dumps(sort_keys=True): exactly one new master row + one new perf row + <=1 symbol-map entry;
      all other master + listing-perf rows byte-identical; ipo-source-audit.json + other snapshots untouched;
  (e) npm run typecheck ; npm run build;
  (f) headless render (chromium): /recently-listed shows Bajaj Housing Finance with real listing AND current
      gains (correctly source-labeled) + plotted in both charts (valid values); /ipo/bajaj-housing-finance renders; 0 errors;
  (g) append phase-real-listed-ipo-performance-status.md (official attempts + failure reason; fallback used + URL;
      raw values; computed gains + raw->normalized; source label/state; files changed; no-partial/fake/null
      confirmation; byte-identity);
  (h) commit + push to main (only if hard gates pass, or a clean safe no-write status commit).

After push: STOP and report. Do not add more IPOs, append source-audit, extend DataState, or change workflows.
```

### Gate 2b — GitHub Actions execution (setup committed, 2026-05-25)

Per operator decision, Gate 2b runs **inside GitHub Actions** (a network-permitted environment) rather than the blocked sandbox. The tooling + a manual workflow are committed; the actual fetch + snapshot writes happen **only when the operator runs the Action**. The run result (official attempts, fallback used, raw values, computed gains, source/state, files changed, no-partial/fake confirmation) is **appended to this doc automatically by the script in CI**.

**Committed in this pass (no snapshot mutated here):**
- `scripts/pdf/promote/add-listed-ipo.ts` — guarded, idempotent add of ONE `status:"listed"` master row for `bajaj-housing-finance` (count guard 11 → 12; refuses double-insert; existing rows byte-identical; atomic write).
- `scripts/pdf/promote/listed-ipo-performance.ts` — generalized from `onemi-listing-performance.ts`; takes `ipo_id` argv; runs the **bounded ladder** (official BSE/NSE → Chittorgarh → broker); writes ONE perf row **iff a single rung yields BOTH listing-day AND current**; official identifiers **verified at fetch time against the official company name** (HALTs the official rung on mismatch); byte-identity insert; appends the run result here.
- `scripts/ingest/lib/symbol-map.ts` — pinned `BSE_SCRIPCODES['bajaj-housing-finance']='544252'` + `NSE_SYMBOLS['bajaj-housing-finance']='BAJAJHFL'` (equity scripcode/symbol, NOT a document id; re-verified at fetch time).
- `src/types/ipo.ts` — minimal additive widening of `ListingPerformance.source` to include `'Chittorgarh' | 'Broker-ref'` (no UI consumer switches on this; `state` already supports `'aggregator'`).
- `.github/workflows/bajaj-listing-performance.yml` — **manual `workflow_dispatch` only, no cron**; pins the spec (₹70 / 2024-09-16 / BAJAJHFL / 544252); runs both scripts, then `typecheck` + `build`; commits master + perf + this status doc back to `main` only if those gates pass. Optional inputs `chittorgarh_url` / `broker_url` feed the fallback rungs if the official rung is incomplete.

**Verification at the setup commit:** `npm run typecheck` + `npm run build` green; no snapshot/master/perf mutation in this commit.

**Next action (operator):** run the GitHub Action **`bajaj-listing-performance`** (Actions tab → Run workflow on `main`). For Bajaj Housing Finance the official BSE rung (544252) should resolve identity + both prices directly; supply `chittorgarh_url` only if the official rung is unreachable from CI.

### Gate 2b run — bajaj-housing-finance — 2026-05-25T09:56:08.144Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE: scripcode 544252 name "?" did not match [bajaj,housing,finance]
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=false, listing_close=null, current=83.26) — falling through.
- CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.
- BROKER GET https://groww.in/ipo/bajaj-housing-finance: HTTP 404

Files changed by this script: none (perf snapshot untouched).

## Gate 2b — post-run verification (2026-05-25, pulled `main` @ b39f33c)

**Final acceptance: NOT MET — the listing-performance proof is INCOMPLETE.** The
CI Action exited green and committed, but the perf script **HALTed**: no
`ipo-listing-performance.json` row was written. The committed change is only the
master row (Bajaj as `status:listed`, "listing data pending") plus this status
doc. This is the documented *acceptable HALT* state (nothing fake written), but
it is **not** the end-to-end proof.

### Diff scope (verified by deep `sort_keys` compare vs the pre-run commit 78e4ba6)

- `ipo-master.json`: **+1 row** `bajaj-housing-finance`; all **11 pre-existing rows byte-identical**; `timelines` + `source_meta` identical. Row is correct: `status: listed`, `price_band.high = 70` (issue ₹70, band 66–70), `listing_date 2024-09-16`, `listing_exchange ["NSE","BSE"]`, `nse_symbol BAJAJHFL`.
- `ipo-listing-performance.json`: **byte-identical / unchanged — NO bajaj row** (this is the gap). `by_ipo` still = `{greendale-cement, lumino-hyperscale}`.
- **Untouched (confirmed identical):** `ipo-source-audit.json`, `ipo-financials.json`, `ipo-documents.json`, `ipo-narrative.json`, `ipo-subscriptions.json`, `sebi-pipeline.json`, `sector-map.json`, `source-health.json`; the OnEMI row; all non-target master rows. CI commit touched **0** workflow files (only the one manual `bajaj-listing-performance.yml` added earlier remains).

### Why it HALTed (CI ladder notes)

- **Official / BSE (scripcode 544252):** endpoint responded (BSE header LTP parsed → `current=83.26`), but my `fetchBseHeader` company-name field guesses returned `"?"` → **identity not verified** → rung correctly refused to trust the price. Separately `fetchBseHistorical` returned without a logged error yet `listing_close` parsed to `null` → its OHLC **field names don't match the real StockReachGraph weekly response** (these guesses were never validated against live BSE before — OnEMI always HALTed earlier).
- **Official / NSE (BAJAJHFL):** **HTTP 403 Access Denied** — NSE blocks GitHub Actions datacenter IPs.
- **Chittorgarh:** skipped — no `chittorgarh_url` input supplied (default is empty).
- **Broker:** `https://groww.in/ipo/bajaj-housing-finance` → **HTTP 404** (guessed path wrong).

So no single rung produced BOTH listing-day AND current with verified provenance → strict gate → no write. **No partial / fake / manual / null-gain / mixed-rung row was written** (confirmed: perf snapshot byte-identical).

### Gates + render (local, at b39f33c)

- `npm run typecheck` — **pass**; `npm run build` — **pass**.
- Headless chromium (chromium-1194) on `vite preview`:
  - `/recently-listed`: Bajaj Housing Finance **present** (listed 16 Sep 2024) but shows **"listing data pending"** with listing-close / current / listing-gain / current-gain all `—`. It is **NOT plotted** in the charts (no perf row). 0 console/page errors.
  - `/ipo/bajaj-housing-finance`: renders (`h1 = "Bajaj Housing Finance Limited"`, not-found absent). 0 console/page errors.

### Acceptance checklist

| Check | Status |
|---|---|
| master: one new `bajaj-housing-finance` row, pre-existing byte-identical, `status:listed`, issue/date/exchanges correct | ✅ |
| perf: one new row, both gains non-null, correct source/state, no partial/fake/null | ❌ **no perf row written** |
| status doc records attempts/fallbacks/values/gains/no-fake | ✅ (records HALT + reasons; no values because nothing fetched cleanly) |
| untouched: non-target rows, source-audit, OnEMI, UI, workflows | ✅ |
| typecheck + build | ✅ |
| Recently Listed shows Bajaj with **real** gains + charts plot it | ❌ shows "pending"; not plotted |
| no console/page errors | ✅ |

### Recommended next step (needs approval — not done in this verification pass)

The official BSE rung is **close** (544252 returned a live LTP). To complete the proof, fix the BSE response parsing then re-run the Action:
1. **Identity (robust):** verify ownership by scanning the **raw** BSE header response text for the company-name tokens (don't guess a single key), so 544252 → "Bajaj Housing Finance" verifies.
2. **Listing-day close:** correct `fetchBseHistorical`'s field extraction to the real StockReachGraph weekly shape (add a one-time CI debug dump of the first element's keys if needed).
3. Alternatively / additionally, re-run with a real **`chittorgarh_url`** input (rung 2) as the proven-reachable fallback.

Until then, Bajaj remains a real **listed** row in `master` with listing performance **pending** — honest, reversible, and consistent with OnEMI.

### Gate 2b — official BSE parsing fix (committed; awaiting re-run)

Root-caused the HALT and hardened `listed-ipo-performance.ts` (no fabricated data; official rung only):
- **Historical parse:** `StockReachGraph` returns `Data` as a JSON-encoded **string** — now double-parsed before indexing (this is why `listing_close` was `null` with no error). OHLC now read via a key-substring scan (`Close`/`vClose`/… robustly).
- **Identity:** verify ownership by scanning the **raw** BSE header body for the name tokens (`bajaj`+`housing`+`finance`) instead of guessing one key. Header LTP already returned a live price, so identity was the only blocker on that side.
- **Self-diagnostic:** if `listing_close` is still null (or identity still fails), the run now logs the raw header + first/last historical element shapes to the CI log, so any remaining mismatch is fixed exactly rather than guessed.
- Removed the guessed Groww default (404 noise); fallback rungs are operator-supplied via `chittorgarh_url` / `broker_url` inputs.

`typecheck` + `build` green at the fix commit; no snapshot mutated locally. **Next:** re-run the `bajaj-listing-performance` Action (official BSE should now verify identity + yield listing-day + current). If BSE historical still won't parse, the CI `[diag]` lines will reveal the exact shape; alternatively supply a real `chittorgarh_url`.

### Gate 2b run — bajaj-housing-finance — 2026-05-25T11:58:09.645Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).

### Gate 2b run — bajaj-housing-finance — 2026-05-25T12:42:27.320Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE historical: 0 pts; listing-week → date=no-date close=null; latest → date=no-date price=null; rawFirst={"dttm":"Mon May 25 2026 16:01:31","vale1":"83.31","vole":"0"}
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).

### Gate 2b run — bajaj-housing-finance — 2026-05-25T12:55:28.400Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE historical: 391 pts but nearest date 2026-05-25 is >14d from listing_date 2024-09-16 — not used (no listing_close).
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).

### Gate 2b run — bajaj-housing-finance — 2026-05-25T13:04:34.746Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE historical: nearest date 2026-05-25 is >14d from listing_date 2024-09-16 — no listing_close. 391 pts (391 dated, span 2026-05-25…2026-05-25); rawLast={"dttm":"Mon May 25 2026 09:15:59","vale1":"83.90","vole":"16638"}
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH: no URL (set CHITTORGARH_URL) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).

### Gate 2b — pivot to Chittorgarh fallback (operator-approved 2026-05-25)

Bounded official BSE/NSE attempts are **closed as incomplete** and recorded above:
- **BSE identity** ✓ (raw name-token match on `getScripHeaderData`) and **BSE current price** ✓ (LTP ₹83.31).
- **BSE listing-week close** ✗ — `StockReachGraph?flag=W` returns only **today's intraday minute bars** (run 89cc63d: 391 pts, span 2026-05-25…2026-05-25, oldest bar `09:15:59` vale1=83.90 vole=16638). It never reaches the 2024-09-16 listing week, so no official listing_close is obtainable from that endpoint. The ±14-day guard correctly blocked any write.
- **NSE** ✗ — HTTP 403 (IP-blocked in CI).

Per operator decision, stop spending reruns on undocumented BSE date-range behavior and proceed down the approved ladder to **rung 2 (Chittorgarh)**: resolve the public Bajaj Housing Finance IPO page inside the Action, extract **both** listing-day and current sides from that **single** rung, and write `source: Chittorgarh`, `state: aggregator` (explicitly NOT official/live) only if both sides parse. If Chittorgarh lacks either side, fall through to the broker/public rung under the same rules. No partial/fake/manual/null/mixed-rung row is ever written.

### Gate 2b run — bajaj-housing-finance — 2026-05-25T14:04:02.215Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE historical: nearest date 2026-05-25 is >14d from listing_date 2024-09-16 — no listing_close. 391 pts (391 dated, span 2026-05-25…2026-05-25); rawLast={"dttm":"Mon May 25 2026 09:15:59","vale1":"83.90","vole":"16638"}
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 395 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH resolve: unresolved: slug + 2 index page(s) yielded no /ipo/ link matching [bajaj,housing,finance]
- CHITTORGARH: no usable URL (provide chittorgarh_url) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).

### Gate 2b run — bajaj-housing-finance — 2026-05-25T17:20:34.989Z (GitHub Actions)

**Outcome:** HALT — no listing-performance row written. No single rung yielded BOTH listing-day AND current. The target stays a listed row with "listing data pending" (valid; no fake / partial / null-gain / mixed-rung row).

Issue price ₹70 · listing_date 2024-09-16.

Ladder notes:
- OFFICIAL/BSE historical: nearest date 2026-05-25 is >14d from listing_date 2024-09-16 — no listing_close. 391 pts (391 dated, span 2026-05-25…2026-05-25); rawLast={"dttm":"Mon May 25 2026 09:15:59","vale1":"83.90","vole":"16638"}
- OFFICIAL/NSE quote: NSE HTTP 403: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars]
- OFFICIAL: incomplete (identityOk=true, listing_close=null, current=83.31) — falling through.
- CHITTORGARH resolve: slug https://www.chittorgarh.com/ipo/bajaj-housing-finance-ipo/: HTTP 404, 10925B [NOT reachable]
- CHITTORGARH resolve: slug https://www.chittorgarh.com/ipo/bajaj-housing-finance-ltd-ipo/: HTTP 404, 10925B [NOT reachable]
- CHITTORGARH resolve: index https://www.chittorgarh.com/ipo/ipo_dashboard.asp: HTTP 200, 145883B, /ipo/ detail links=20
- CHITTORGARH resolve:    sample hrefs: https://www.chittorgarh.net/images/ipo/paytrm-money-logo-small-25x25.jpg | https://www.chittorgarh.net/images/ipo/fyers-logo-small.png | /ipo/ipo_dashboard.asp | /ipo/ipo_perf_tracker.asp | https://www.investorgain.com/report/live-ipo-gmp/331/ipo/ | /ipo/ipo_discussions.asp | /ipo/ipo_perf_tracker.asp | /ipo/ipo_dashboard.asp?a=sme | /ipo/ipo_perf_tracker.asp?exchange=sme | /ipo/ipo_discussions.asp
- CHITTORGARH resolve: index https://www.chittorgarh.com/ipo/ipo_dashboard.asp?a=sme: HTTP 200, 149738B, /ipo/ detail links=20
- CHITTORGARH resolve:    sample hrefs: https://www.chittorgarh.net/images/ipo/paytrm-money-logo-small-25x25.jpg | https://www.chittorgarh.net/images/ipo/fyers-logo-small.png | /ipo/ipo_dashboard.asp | /ipo/ipo_perf_tracker.asp | https://www.investorgain.com/report/live-ipo-gmp/331/ipo/ | /ipo/ipo_discussions.asp | /ipo/ipo_perf_tracker.asp | /ipo/ipo_dashboard.asp?a=sme | /ipo/ipo_perf_tracker.asp?exchange=sme | /ipo/ipo_discussions.asp
- CHITTORGARH resolve: index https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/82/: HTTP 200, 156173B, /ipo/ detail links=10
- CHITTORGARH resolve:    sample hrefs: https://www.chittorgarh.net/images/ipo/paytrm-money-logo-small-25x25.jpg | https://www.chittorgarh.net/images/ipo/fyers-logo-small.png | https://www.chittorgarh.net/images/ipo/ipo-in-india.jpg | /ipo/ipo_dashboard.asp | /ipo/ipo_perf_tracker.asp | https://www.investorgain.com/report/live-ipo-gmp/331/ipo/ | /ipo/ipo_discussions.asp | /ipo/ipo_perf_tracker.asp | /ipo/ipo_dashboard.asp?a=sme | /ipo/ipo_perf_tracker.asp?exchange=sme
- CHITTORGARH resolve: UNRESOLVED but Chittorgarh was REACHABLE — no slug redirect and no /ipo/<slug>/<id>/ link matched [bajaj,housing,finance]. Most likely the list pages render their IPO table client-side (XHR), or Bajaj is not on the scanned pages. Next: provide the exact chittorgarh_url, or move to the broker rung.
- CHITTORGARH: no usable URL (provide chittorgarh_url) — skipped.
- BROKER: no URL (set BROKER_URL) — skipped.

Files changed by this script: none (perf snapshot untouched).
