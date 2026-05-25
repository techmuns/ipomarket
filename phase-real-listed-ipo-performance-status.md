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
