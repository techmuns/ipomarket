# OnEMI Listing-Performance Fill — Status

> **Mode**: implementation complete (Gate 2 of `phase-onemi-listing-performance-plan.md`). **Date**: 2026-05-25. **Branch**: `main`.
>
> **Outcome**: **clean safe no-write.** OnEMI could not be mapped to a *verified* official exchange identifier, so — exactly as the plan's hard gate requires — no `ipo-listing-performance.json` row was written and OnEMI's Recently Listed state remains **"listing data pending."** No manual/fake/partial data was introduced.

## 1. What ran

A new guarded, OnEMI-only promoter `scripts/pdf/promote/onemi-listing-performance.ts` was created and run:

```
[promote:onemi-listing-perf] preflight OK — onemi-technology-solutions listed, BSE, 2026-05-08, issue ₹171
[promote:onemi-listing-perf] HALT: no verified official mapping for OnEMI.
  → Add a VERIFIED BSE scripcode and/or NSE symbol to scripts/ingest/lib/symbol-map.ts,
    confirmed from an official BSE/NSE source (NOT the RHP download-id 378749).
  OnEMI listing performance stays PENDING. No row written.
exit code: 0
```

- **Master preflight passed**: OnEMI is present, `status: 'listed'`, `listing_exchange` includes `BSE`, `listing_date === '2026-05-08'`, `issue_price === price_band.high === 171`.
- **Mapping gate HALTed**: `bseScripcodeFor('onemi-technology-solutions')` and `nseSymbolFor('onemi-technology-solutions')` are both `null` (`scripts/ingest/lib/symbol-map.ts` is empty). With no verified official identifier, the promoter halted **before any network fetch** and wrote nothing.

## 2. Why the mapping could not be verified (failed-mapping reason)

The plan required an official BSE scripcode and/or NSE symbol confirmed from an official exchange source. None could be obtained:

- **OnEMI is synthetic seed data.** Like the other "listed" rows (Lumino Hyperscale, Greendale Cement), OnEMI is a fictional IPO in this mock dashboard. `symbol-map.ts`'s own comment notes these have **no real BSE scripcode / NSE symbol**. There is no tradable security to map.
- **`378749` is not a scripcode.** The only exchange-hosted number anywhere in the repo for OnEMI is `378749`, embedded in its RHP URL (`bseindia.com/corporates/download/378749/IPO%20Open/…`). That is a **document-attachment / corporate-filing download id**, explicitly *not* a tradable BSE equity scripcode — the plan forbids using it, and it was not used.
- **No NSE symbol exists** for OnEMI anywhere in the repo (`nse_symbol: null` in master).
- **Official endpoints are unreachable from this environment** (host-allowlist blocks `api.bseindia.com` / `nseindia.com`). Even with a candidate identifier, official verification/fetch would have to run where those endpoints are reachable.

Because fabricating or guessing a scripcode/symbol is forbidden, the only correct action was to halt and keep OnEMI pending.

## 3. Write gate (would-be behavior, for the record)

Had a verified mapping existed, the promoter would have fetched official data and written a row **only if both** of these were obtained (the tightened threshold):

- a real **listing-day** close (BSE weekly-history first element) → non-null `listing_gain_pct = ((listing_close − 171)/171)×100`, and
- a real **current** price (BSE latest close or NSE `lastPrice`) → non-null `current_gain_pct`.

A listing-day-only or current-only result HALTs (no partial row). This guarantees the Recently Listed charts never plot a null/NaN or a misleading `0` for OnEMI.

## 4. Files

| File | Change |
|---|---|
| `scripts/pdf/promote/onemi-listing-performance.ts` | NEW — guarded OnEMI-only listing-performance promoter (self-contained official BSE/NSE fetch; verified-mapping gate; listing-day+current write gate; byte-identity string-surgery insert) |
| `phase-onemi-listing-performance-status.md` | NEW — this report |

**Not changed** (per guardrails): `src/data/snapshots/ipo-listing-performance.json` (no row written), `scripts/ingest/lib/symbol-map.ts` (no unverified mapping added), `scripts/ingest/listing-performance.ts` (promoter is self-contained — it deliberately does **not** import that module, whose direct-invocation guard would otherwise auto-run the full ingest slice), `ipo-source-audit.json`, `ipo-master.json`, all other snapshots, workflows, cron, types, UI, Chittorgarh map.

## 5. Verification

- ✅ Promoter ran and HALTed cleanly at the mapping gate (exit 0); no row written.
- ✅ `src/data/snapshots/ipo-listing-performance.json` unchanged (git): greendale-cement + lumino-hyperscale byte-identical; OnEMI still absent.
- ✅ No other snapshot / `symbol-map.ts` / `listing-performance.ts` / workflow change (git): only the new promoter + this status doc are added.
- ✅ `npm run typecheck` green.
- ✅ `npm run build` green.
- ✅ Headless render (chromium-1194), 0 console + 0 page errors:
  - `/recently-listed` — OnEMI still present with `—` gains + **"listing data pending"**; the `Chittorgarh · 8 terms` chip intact; gain bar + fade scatter render unbroken (OnEMI not plotted, since it has no perf row).
  - `/ipo/onemi-technology-solutions` — renders cleanly with status `listed`.

## 6. To complete this later (separately gated)

If/when OnEMI (or a real future IPO) has a tradable listing:
1. Verify its BSE equity scripcode and/or NSE symbol against an official exchange source (BSE scrip master / NSE symbol master) — never the RHP download-id.
2. Add it to `scripts/ingest/lib/symbol-map.ts` with a comment citing the official source + date.
3. Re-run `npx tsx scripts/pdf/promote/onemi-listing-performance.ts` from an environment where `api.bseindia.com` / `nseindia.com` are reachable. It will fetch official prices and write the row iff both listing-day and current gains are real.
