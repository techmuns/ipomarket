# Phase 0 — Source Probe Report

Generated: 2026-05-20T19:11:34.289Z

## Status Summary

- GREEN: 7
- YELLOW: 8
- RED: 14

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | (uncaught error) | RED | - | ERROR | 0 | Debug probe harness error. |
| P-02 | NSE — Upcoming IPOs | RED | 200 | JSON | 342 | Pair with SEBI Processing Status (P-08b). |
| P-03 | NSE — Past/Recent IPOs | RED | 200 | JSON | 96 | Fall back to NSE historical (P-15). |
| P-04 | NSE — Live Subscription | YELLOW | - | EMPTY | 47 | No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run. |
| P-05 | NSE Emerge — SME IPOs | RED | 0 | ERROR | 347 | Fall back to BSE SME (P-06b). |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 3700 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 411 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | YELLOW | - | EMPTY | 0 | P-08 produced no PDF URLs; re-run after P-08 GREEN. Fallback = P-10 exchange-side DRHP. |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11061 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | GREEN | 200 | JSON | 5409 | NSE historical still blocked; use BSE historical as primary (official fallback). |
| P-15b | NSE — Equity Quote | GREEN | 200 | JSON | 518 | Use as primary for current price. |
| P-16 | Ticker mapping (NSE list symbol field) | RED | 200 | JSON | 52 | Maintain a manual override file for IPOs whose symbol drifts post-listing. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 710 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10090 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 457 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 77 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 903 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 198 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 5113 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 1307 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 2065 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 250 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 2030 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 746 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | RED | 403 | BLOCKED | 116 | Skip. |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 147 | Include in Phase 6 GMP averager. |
| P-23a | Broker IPO page — Zerodha (reference only) | RED | 200 | ERROR | 5137 | Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference. |
| P-23b | Broker IPO page — Upstox (reference only) | RED | 200 | ERROR | 5134 | Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference. |
| P-24 | Sector / industry classification (NSE + BSE) | YELLOW | 200 | JSON | 1834 | Sector reachable for listed equities via NSE equity quote, but not exposed per-IPO before listing. Use the equity-quote sector once an IPO lists; create a small manual sector-map.json for pre-listing IPOs. |

## Per-probe detail

### P-01 — (uncaught error) — RED

- URL: ``
- Method: 
- Headers/cookies required: (none)
- Status code: (no response)
- Response type: ERROR
- Fields found: (none)
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: 
- Recommended action: Debug probe harness error.
- Fallback: none
- Latency: 0 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Uncaught error: Cannot read properties of undefined (reading 'length')

```
TypeError: Cannot read properties of undefined (reading 'length')
    at truncate (/home/runner/work/ipomarket/ipomarket/scripts/probes/lib/http.ts:189:9)
    at Module.probe (/home/runner/work/ipomarket/ipomarket/scripts/probes/P-01-nse-current.ts:85:9)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async main (/home/runner/work/ipomarket/ipomarket/scripts/probes/run.ts:105:22)
```

### P-02 — NSE — Upcoming IPOs — RED

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: symbol, companyName, issueStartDate, issueEndDate
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when issues are announced
- Recommended action: Pair with SEBI Processing Status (P-08b).
- Fallback: P-08b
- Latency: 342 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Forthcoming rows: 0

```
[]
```

### P-03 — NSE — Past/Recent IPOs — RED

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: symbol, companyName, listingDate
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated on listing
- Recommended action: Fall back to NSE historical (P-15).
- Fallback: P-15
- Latency: 96 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Past/closed rows: 0

```
[]
```

### P-04 — NSE — Live Subscription — YELLOW

- URL: `https://www.nseindia.com/api/ipo-current-issue?symbol=<no-active-ipo>`
- Method: GET (after cookie warm-up + active-symbol discovery)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: (no response)
- Response type: EMPTY
- Fields found: (none)
- Fields missing: qib, nii_big, nii_small, retail, employee, anchor
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updates every ~10 minutes during bidding window
- Recommended action: No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run.
- Fallback: P-07
- Latency: 47 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Active candidate symbol: (none currently open)

### P-05 — NSE Emerge — SME IPOs — RED

- URL: `https://www1.nseindia.com/emerge/live_market/content/live_watch/ipo/sme_ipo.htm`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, warmed cookies
- Status code: 0
- Response type: ERROR
- Fields found: (none)
- Fields missing: issue rows
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Daily
- Recommended action: Fall back to BSE SME (P-06b).
- Fallback: P-06b
- Latency: 347 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Network error: fetch failed

### P-08 — SEBI — Public Issues Filings — GREEN

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET → alt GET → Playwright/Chromium
- Headers/cookies required: User-Agent, Referer, Chromium for JS render
- Status code: 200
- Response type: HTML
- Fields found: rows
- Fields missing: pdf urls
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Updated whenever a DRHP/RHP/observation is filed
- Recommended action: Use as primary for Pipeline tab + DRHP master.
- Fallback: P-10
- Latency: 3700 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> static ok: tr=0, pdfs=0, bytes=6080 ; static ok: tr=26, pdfs=0, bytes=46183

```
{
  "winning_attempt": "static-alt",
  "rows": 26,
  "pdf_count": 0,
  "first_5_pdfs": []
}
```

### P-08b — SEBI — Processing Status — YELLOW

- URL: `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=14&smid=8`
- Method: GET → Playwright/Chromium
- Headers/cookies required: User-Agent, Referer, Chromium for JS render
- Status code: 200
- Response type: EMPTY
- Fields found: tbody data rows
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Updated on filing/observation status changes
- Recommended action: Endpoint reachable; show "no observations today" in Pipeline tab when empty.
- Fallback: P-08
- Latency: 411 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> static ok: tbody_rows=2, bytes=25096

```
{
  "winning_attempt": "static",
  "tbody_row_count": 2,
  "notes": "static ok: tbody_rows=2, bytes=25096"
}
```

### P-09 — SEBI — DRHP PDF Download — YELLOW

- URL: `(no URL — depends on P-08)`
- Method: GET (binary)
- Headers/cookies required: User-Agent, Referer
- Status code: (no response)
- Response type: EMPTY
- Fields found: (none)
- Fields missing: pdf url from P-08 discovery
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Immutable once published
- Recommended action: P-08 produced no PDF URLs; re-run after P-08 GREEN. Fallback = P-10 exchange-side DRHP.
- Fallback: P-10
- Latency: 0 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> No discovery file at sebi-publicissues-pdfs.json, or it had zero PDFs (P-08 must run first).

### P-10 — NSE/BSE — DRHP Archive — RED

- URL: `https://www.bseindia.com/markets/PublicIssues/DRHP.aspx`
- Method: GET (primary, then secondary)
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: rows, pdf links
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated with DRHP filings
- Recommended action: Skip if SEBI (P-08) is GREEN.
- Fallback: P-08
- Latency: 11061 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> primary status=200; secondary status=0; rows=0; pdf-refs=0

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, IPO News and more. Click here to stay updated and invest wisely!Get all the latest share market and India stock market news and updates on bseindia.com">
    <meta name="keywords" content="BSE SENSEX,…[truncated, total 12565 chars]
```

### P-15 — BSE — Historical OHLC (fallback) — GREEN

- URL: `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=500325&flag=W&fromdate=&todate=&seriesid=`
- Method: GET (BSE official endpoint)
- Headers/cookies required: User-Agent, Referer, Origin
- Status code: 200
- Response type: JSON
- Fields found: f1
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: EOD daily
- Recommended action: NSE historical still blocked; use BSE historical as primary (official fallback).
- Fallback: P-15b (current quote only)
- Latency: 5409 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> [nse:RELIANCE] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22098 chars] ; [nse:TCS] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22098 chars] ; [bse:RELIANCE] BSE rows=26032, fields=1

```
{
  "CurrDate": "Wed May 20 2026 16:01:37",
  "PrevClose": "1322.3",
  "LowVal": "1300",
  "HighVal": "1380",
  "Scripname": "RELIANCE",
  "CurrVal": "1359.75",
  "CurrTime": "16:01",
  "LowVol": "0",
  "HighVol": "75000",
  "Data": "[{\"dttm\":\"Wed May 20 2026 16:01:37\",\"vale1\":\"1359.75\",\"vole\":\"0\"},{\"dttm\":\"Wed May 20 2026 16:00:07\",\"vale1\":\"1359.75\",\"vole\":\"0\"},{\"dttm\":\"Wed May 20 2026 15:57:28\",\"vale1\":\"1359.75\",\"vole\":\"0\"},{\"dttm\":\"Wed May 20 2026 15:55:22\",\"vale1\":\"1359.75\",\"vole\":\"4\"},{\"dttm\":\"Wed May 20 2026 15:48:18\",\"vale1\":\"1359.75\",\"vole\":\"0\"},{\"dttm\":\"Wed May 20 2026 15:47:53\",\"vale1\":\"1359.75\",\"vole\":\"10\"},{\"dttm\":\"Wed May 20 2026 15:42:50\",\"vale1\":\"1359.75\",\"vole\":\"0\"},{\"dttm\":\"Wed May 20 20…[truncated, total 30901 chars]
```

### P-15b — NSE — Equity Quote — GREEN

- URL: `https://www.nseindia.com/api/quote-equity?symbol=RELIANCE`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: info, metadata, securityInfo, sddDetails, currentMarketType, priceInfo, industryInfo, preOpenMarket
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Near real-time during market hours
- Recommended action: Use as primary for current price.
- Fallback: none
- Latency: 518 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Top-level keys: info, metadata, securityInfo, sddDetails, currentMarketType, priceInfo, industryInfo, preOpenMarket

```
{
  "info": {
    "symbol": "RELIANCE",
    "companyName": "Reliance Industries Limited",
    "industry": "Refineries & Marketing",
    "activeSeries": [
      "EQ",
      "T0"
    ],
    "debtSeries": [],
    "isFNOSec": true,
    "isCASec": false,
    "isSLBSec": true,
    "isDebtSec": false,
    "isSuspended": false,
    "tempSuspendedSeries": [],
    "isETFSec": false,
    "isDelisted": false,
    "isin": "INE002A01018",
    "slb_isin": "INE002A01018",
    "listingDate": "1995-11-29",
    "isMunicipalBond": false,
    "isHybridSymbol": false,
    "segment": "EQUITY",
    "isTop10": false,
    "identifier": "RELIANCEEQN"
  },
  "metadata": {
    "series": "EQ",
    "symbol": "RELIANCE",
    "isin": "INE002A01018",
    "status": "Listed",
    "listingDate": "29-Nov-1995",
    "industry":…[truncated, total 4663 chars]
```

### P-16 — Ticker mapping (NSE list symbol field) — RED

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (reuses P-01) + regex
- Headers/cookies required: User-Agent, Referer, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: symbol
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Matches NSE list
- Recommended action: Maintain a manual override file for IPOs whose symbol drifts post-listing.
- Fallback: none
- Latency: 52 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> total=0, validSymbolPattern=0, rate=0%

```
{}
```

### P-06 — BSE — Mainboard Public Issues — RED

- URL: `https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=p`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: issue rows
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated with public issue lifecycle
- Recommended action: Skip; NSE primary covers this.
- Fallback: P-01
- Latency: 710 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> <tr> count: 0, total bytes: 12565

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 12565 chars]
```

### P-06b — BSE SME — Public Issues — RED

- URL: `https://www.bsesme.com/PublicIssues/PublicIssues.aspx?id=1`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 0
- Response type: ERROR
- Fields found: (none)
- Fields missing: issue rows
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated with SME public issue lifecycle
- Recommended action: Skip if NSE Emerge is GREEN.
- Fallback: P-05
- Latency: 10090 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Network error: fetch failed

### P-07 — BSE — Subscription / Cumulative Bid Details — RED

- URL: `https://www.bseindia.com/publicissue`
- Method: GET landing; per-issue bid URL requires drill-down
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: bid-detail markers
- Parsing difficulty: Hard
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Intra-day during bidding window
- Recommended action: Rely on NSE only (P-04).
- Fallback: P-04
- Latency: 457 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Bid-link markers found: 0, bytes: 12565

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 12565 chars]
```

### P-11 — Registrar resolution (from NSE list) — RED

- URL: `derived from P-01 endpoint`
- Method: GET (reuses P-01 data) + name-substring match
- Headers/cookies required: User-Agent, Referer, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: registrar field
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Matches NSE list cadence
- Recommended action: Fall back to per-issue page scrape or manual seed.
- Fallback: P-12
- Latency: 77 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Issues=0, registrars resolved by name match=0

```
{}
```

### P-12 — MUFG Intime (Link Intime) — landing — GREEN

- URL: `https://in.mpms.mufg.com/Initial_Offer/public-issues.html`
- Method: GET
- Headers/cookies required: User-Agent
- Status code: 200
- Response type: HTML
- Fields found: landing page reachable
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Static landing; per-issue lookup is form-based (do not scrape)
- Recommended action: Store URL as link-out; do not scrape per-PAN.
- Fallback: none
- Latency: 903 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> primary=200, legacy=(skipped)

```
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="description" content="Link Intime" />
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="ima…[truncated, total 37481 chars]
```

### P-13 — KFintech — landing — GREEN

- URL: `https://ipostatus.kfintech.com/`
- Method: GET
- Headers/cookies required: User-Agent
- Status code: 200
- Response type: HTML
- Fields found: landing page reachable
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Static landing
- Recommended action: Store URL as link-out only.
- Fallback: none
- Latency: 198 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> primary=200, secondary=(skipped)

```
<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="./licIPO.svg"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="The IPO Allottment Status Page"/><meta name="content-type" content="text/html"/><link rel="apple-touch-icon" href="./licIPO.svg"/><link rel="manifest" href="./manifest.json"/><title>IPO Allotment Status</title><script>document.onreadystatechange=function()…[truncated, total 1003 chars]
```

### P-14 — Bigshare — landing — GREEN

- URL: `https://www.bigshareonline.com/ipo_allotment.html`
- Method: GET
- Headers/cookies required: User-Agent
- Status code: 200
- Response type: HTML
- Fields found: landing page reachable
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Static landing
- Recommended action: Store URL as link-out only.
- Fallback: none
- Latency: 5113 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> status=200

```

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Big Share Online</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,40…[truncated, total 12217 chars]
```

### P-14b — Maashitla — landing — GREEN

- URL: `https://maashitla.com/allotment-status/public-issues`
- Method: GET
- Headers/cookies required: User-Agent
- Status code: 200
- Response type: HTML
- Fields found: landing page reachable
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Static landing
- Recommended action: Store URL as link-out only.
- Fallback: none
- Latency: 1307 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> status=200

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>Public Issues -  Maashitla Securities Pvt. Limited</title>

    <meta name="keywords" content="HTML5 Template" />
    <meta name="description" content="Maashitla Securities Pvt. Limited">
    <meta name="author" content="maashitla.com">

    <!-- Favicon -->
    <link rel="shortcut icon" href="https://cdn.maashitla.com/img/favicon.ico" type="image/x-icon" />…[truncated, total 55920 chars]
```

### P-17 — RHP PDF parsing — sample — YELLOW

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET (discovery)
- Headers/cookies required: (none)
- Status code: 200
- Response type: EMPTY
- Fields found: (none)
- Fields missing: pdf url
- Parsing difficulty: Hard
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Immutable
- Recommended action: PDF discovery selector may have drifted.
- Fallback: manual
- Latency: 2065 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> No PDF URL discovered.

### P-18 — Anchor circular PDF parsing — sample — YELLOW

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET (discovery)
- Headers/cookies required: (none)
- Status code: 200
- Response type: EMPTY
- Fields found: (none)
- Fields missing: pdf url
- Parsing difficulty: Hard
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Immutable
- Recommended action: PDF discovery selector may have drifted.
- Fallback: manual
- Latency: 250 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> No PDF URL discovered.

### P-19 — GMP — IPOWatch — YELLOW

- URL: `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: gmp table rows
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily, updates intra-day
- Recommended action: Include in Phase 6 GMP averager.
- Fallback: P-20
- Latency: 2030 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> <tr> count: 290, bytes=812004

```
<!doctype html>
<html lang="en-US">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />

	<!-- This site is optimized with the Yoast SEO Premium plugin v27.6 (Yoast SEO v27.6) - https://yoast.com/product/yoast-seo-premium-wordpress/ -->
	<title>IPO GMP Today, Live IPO Grey Market Premiu…[truncated, total 812004 chars]
```

### P-20 — GMP — Chittorgarh — RED

- URL: `https://www.chittorgarh.com/report/ipo-grey-market-premium-kostak-rates/24/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: gmp table
- Parsing difficulty: Medium
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily
- Recommended action: Skip; Phase 6 stays off if all GMP probes fail.
- Fallback: P-21
- Latency: 746 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> <tr> count: 0, bytes=124593

```
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/paytrm-money-logo-small-25x25.jpg"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/fyers-logo-small.png"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/home.png"/><link …[truncated, total 124593 chars]
```

### P-21 — GMP — IPO Central — RED

- URL: `https://ipocentral.in/ipo-discussion/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 403
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: discussion markers
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily
- Recommended action: Skip.
- Fallback: P-22
- Latency: 116 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> Non-200. status=403

```
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="content-security-policy" content="default-src &#39;none&#39;; script-src &#39;nonce-q5Zo1VZ2B4XFwlZlfRuFAl&#39; &#39;unsafe-eval&#39; https://challenges.cloudflare.com; script-s…[truncated, total 5598 chars]
```

### P-22 — GMP — InvestorGain — YELLOW

- URL: `https://www.investorgain.com/report/live-ipo-gmp/331/ipo/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: gmp table rows
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily, intra-day
- Recommended action: Include in Phase 6 GMP averager.
- Fallback: none
- Latency: 147 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> <tr> count: 2, bytes=129044

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/f7fa72dcdf4e461b.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 129044 chars]
```

### P-23a — Broker IPO page — Zerodha (reference only) — RED

- URL: `https://zerodha.com/ipo/440359/nfp-sampoorna-foods/`
- Method: Playwright/Chromium (headless, no stealth)
- Headers/cookies required: User-Agent (desktop Chrome), Locale en-IN
- Status code: 200
- Response type: ERROR
- Fields found: (none)
- Fields missing: (navigation error)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 5137 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=37836 | rendered_len=39220 | challenge=false | headings=0 | tables=0 | doc_links=0 | labels=0 | error=extractFields: page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:302:30), <anonymous>:1:83)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

```
{
  "title": "NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size",
  "headings_top10": [],
  "tables_count": 0,
  "labels_detected": [],
  "doc_links_count": 0,
  "first_doc_links": []
}
```

### P-23b — Broker IPO page — Upstox (reference only) — RED

- URL: `https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/`
- Method: Playwright/Chromium (headless, no stealth)
- Headers/cookies required: User-Agent (desktop Chrome), Locale en-IN
- Status code: 200
- Response type: ERROR
- Fields found: (none)
- Fields missing: (navigation error)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 5134 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=218103 | rendered_len=264155 | challenge=false | headings=0 | tables=0 | doc_links=0 | labels=0 | error=extractFields: page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:302:30), <anonymous>:1:83)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

```
{
  "title": "Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotment | Upstox",
  "headings_top10": [],
  "tables_count": 0,
  "labels_detected": [],
  "doc_links_count": 0,
  "first_doc_links": []
}
```

### P-24 — Sector / industry classification (NSE + BSE) — YELLOW

- URL: `https://www.nseindia.com/api/quote-equity?symbol=RELIANCE ; https://www.nseindia.com/api/all-upcoming-issues?category=ipo ; https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=p`
- Method: GET (3 endpoints)
- Headers/cookies required: User-Agent, Referer, X-Requested-With (NSE)
- Status code: 200
- Response type: JSON
- Fields found: nse-equity:info.industry, nse-equity:metadata.industry, nse-equity:metadata.pdSectorPe, nse-equity:metadata.pdSectorInd, nse-equity:metadata.pdSectorIndAll, nse-equity:industryInfo, nse-equity:industryInfo.macro, nse-equity:industryInfo.sector, nse-equity:industryInfo.industry, nse-equity:industryInfo.basicIndustry
- Fields missing: pre-IPO sector / industry per-IPO
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Slow-changing (industry codes rarely change per company)
- Recommended action: Sector reachable for listed equities via NSE equity quote, but not exposed per-IPO before listing. Use the equity-quote sector once an IPO lists; create a small manual sector-map.json for pre-listing IPOs.
- Fallback: phase-0/samples/sector-manual-map.json (curated)
- Latency: 1834 ms
- Ran at (UTC): 2026-05-20T19:10:29.299Z

> [NSE equity quote] top-level keys: info, metadata, securityInfo, sddDetails, currentMarketType, priceInfo, industryInfo, preOpenMarket; sector fields: info.industry, metadata.industry, metadata.pdSectorPe, metadata.pdSectorInd, metadata.pdSectorIndAll, industryInfo, industryInfo.macro, industryInfo.sector, industryInfo.industry, industryInfo.basicIndustry ; [NSE IPO list] NSE IPO list returned 0 items ; [BSE IPO list] BSE HTML; sector-related words found: (none); bytes=12565

```
{
  "sector_reachable": {
    "listed_equity": true,
    "pre_ipo": false
  },
  "manual_map_needed": true,
  "nse_equity_sector_fields": [
    "info.industry",
    "metadata.industry",
    "metadata.pdSectorPe",
    "metadata.pdSectorInd",
    "metadata.pdSectorIndAll",
    "industryInfo",
    "industryInfo.macro",
    "industryInfo.sector",
    "industryInfo.industry",
    "industryInfo.basicIndustry"
  ],
  "nse_ipo_sector_fields": [],
  "bse_ipo_sector_fields": []
}
```
