# Phase 0 — Source Probe Report

Generated: 2026-05-20T16:19:30.565Z

## Status Summary

- GREEN: 9
- YELLOW: 6
- RED: 11

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | GREEN | 200 | JSON | 527 | Use as primary source for Live & Upcoming tab. |
| P-02 | NSE — Upcoming IPOs | GREEN | 200 | JSON | 48 | Use as primary for Pipeline tab. |
| P-03 | NSE — Past/Recent IPOs | GREEN | 200 | JSON | 39 | Use as primary for Recently Listed. |
| P-04 | NSE — Live Subscription | YELLOW | - | EMPTY | 45 | No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run. |
| P-05 | NSE Emerge — SME IPOs | RED | 0 | ERROR | 108 | Fall back to BSE SME (P-06b). |
| P-08 | SEBI — Public Issues Filings | RED | 200 | HTML | 957 | Block — use NSE/BSE DRHP archives (P-10) as fallback. |
| P-08b | SEBI — Processing Status | RED | 200 | HTML | 338 | Pipeline tab ships without status field. |
| P-09 | SEBI — DRHP PDF Download | YELLOW | 200 | EMPTY | 227 | No PDF URL discovered in HTML; selector may have drifted. |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11098 | Skip if SEBI (P-08) is GREEN. |
| P-15 | NSE — Historical OHLC | RED | 200 | EMPTY | 413 | Fall back to BSE historical. |
| P-15b | NSE — Equity Quote | GREEN | 200 | JSON | 345 | Use as primary for current price. |
| P-16 | Ticker mapping (NSE list symbol field) | GREEN | 200 | JSON | 281 | Deterministic mapping; no manual override file needed for v1. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 638 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10485 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 493 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 29 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 1456 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 118 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 5034 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 1133 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 949 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 232 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 1738 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 1359 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | RED | 403 | BLOCKED | 85 | Skip. |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 862 | Include in Phase 6 GMP averager. |

## Per-probe detail

### P-01 — NSE — Current/Open IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up of https://www.nseindia.com/)
- Headers/cookies required: User-Agent (browser-like), Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: symbol, companyName, issueStartDate, issueEndDate, issueSize, issuePrice, lotSize, priceBand, series, status
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when an IPO opens/closes; intra-day stable
- Recommended action: Use as primary source for Live & Upcoming tab.
- Fallback: P-06
- Latency: 527 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Total rows: 2, Active rows: 0

```
{
  "symbol": "QLINE",
  "companyName": "Q-Line Biotech Limited",
  "issueStartDate": "21-May-2026",
  "issueEndDate": "25-May-2026",
  "issueSize": "4472000",
  "issuePrice": "Rs.326 to Rs.343",
  "lotSize": "400",
  "priceBand": "Rs.326 to Rs.343",
  "series": "SME",
  "status": "Forthcoming"
}
```

### P-02 — NSE — Upcoming IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: symbol, companyName, issueStartDate, issueEndDate, issueSize, issuePrice, lotSize, priceBand, series, status
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when issues are announced
- Recommended action: Use as primary for Pipeline tab.
- Fallback: P-08b
- Latency: 48 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Forthcoming rows: 2

```
[
  {
    "symbol": "QLINE",
    "companyName": "Q-Line Biotech Limited",
    "issueStartDate": "21-May-2026",
    "issueEndDate": "25-May-2026",
    "issueSize": "4472000",
    "issuePrice": "Rs.326 to Rs.343",
    "lotSize": "400",
    "priceBand": "Rs.326 to Rs.343",
    "series": "SME",
    "status": "Forthcoming"
  },
  {
    "symbol": "BMLL",
    "companyName": "Bio Medica Laboratories Limited",
    "issueStartDate": "21-May-2026",
    "issueEndDate": "25-May-2026",
    "issueSize": "3772000",
    "issuePrice": "Rs.132 to Rs.139",
    "lotSize": "1000",
    "priceBand": "Rs.132 to Rs.139",
    "series": "SME",
    "status": "Forthcoming"
  }
]
```

### P-03 — NSE — Past/Recent IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: symbol, companyName, issueStartDate, issueEndDate, issueSize, issuePrice, lotSize, priceBand, series, status
- Fields missing: listingDate
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated on listing
- Recommended action: Use as primary for Recently Listed.
- Fallback: P-15
- Latency: 39 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Past/closed rows: 0

```
[
  {
    "symbol": "QLINE",
    "companyName": "Q-Line Biotech Limited",
    "issueStartDate": "21-May-2026",
    "issueEndDate": "25-May-2026",
    "issueSize": "4472000",
    "issuePrice": "Rs.326 to Rs.343",
    "lotSize": "400",
    "priceBand": "Rs.326 to Rs.343",
    "series": "SME",
    "status": "Forthcoming"
  },
  {
    "symbol": "BMLL",
    "companyName": "Bio Medica Laboratories Limited",
    "issueStartDate": "21-May-2026",
    "issueEndDate": "25-May-2026",
    "issueSize": "3772000",
    "issuePrice": "Rs.132 to Rs.139",
    "lotSize": "1000",
    "priceBand": "Rs.132 to Rs.139",
    "series": "SME",
    "status": "Forthcoming"
  }
]
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
- Latency: 45 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 108 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Network error: fetch failed

### P-08 — SEBI — Public Issues Filings — RED

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: rows, pdf links
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Updated whenever a DRHP/RHP/observation is filed
- Recommended action: Block — use NSE/BSE DRHP archives (P-10) as fallback.
- Fallback: P-10
- Latency: 957 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> <tr> count: 0, .pdf occurrences: 0, bytes: 6080

```
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="lang" content="en" />
	<title>SEBI | Filings - Public Issues</title>
    <meta name="title" content="SEBI | Filings - Public Issues" />
    <meta name="description" content="Securities and Exchange Board of India is made for protect the interests of investors in securities and to promote the development of, and to regulate the securities market and for matters connected therewith or incidental thereto" />
    <meta name="keywords" content="Securities and Exchange Board of India, SEBI" />
	<link rel="shortcut icon" href="../images/icons/sebi-icon.png" type="text/css" media="all" />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
	<link rel="stylesheet" href="../fonts/fonts…[truncated, total 6080 chars]
```

### P-08b — SEBI — Processing Status — RED

- URL: `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=14&smid=8`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: status rows
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Updated on filing/observation status changes
- Recommended action: Pipeline tab ships without status field.
- Fallback: P-08
- Latency: 338 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> <tr> count: 3, bytes: 25140

```









<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="utf-8"/>
        
        <title>SEBI | Processing Status</title>
        <meta http-equiv="X-UA-Compatible" content="IE=11,chrome=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="lang" content="en" />
        <meta name="title" content = "SEBI | Processing Status" />
        <meta name="description" content = "Securities and Exchange Board of India is made for protect the interests of investors in securities and to promote the development of, and to regulate the securities market and for matters connected therewith or incidental thereto" />
        <meta name="keywords" content = "Securities and Exchange Board of India, SEBI" />
        <link rel="short…[truncated, total 25140 chars]
```

### P-09 — SEBI — DRHP PDF Download — YELLOW

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET (discovery) + GET (download)
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: EMPTY
- Fields found: (none)
- Fields missing: pdf url
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: PDFs are immutable
- Recommended action: No PDF URL discovered in HTML; selector may have drifted.
- Fallback: P-10
- Latency: 227 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> No <a href=...pdf> matched.

```
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="lang" content="en" />
	<title>SEBI | Filings - Public Issues</title>
    <meta name="title" content="SEBI | Filings - Public Issues" />
    <meta name="description" content="Securities and Exchange Board of India is made for protect the interests of investors in securities and to promote the development of, and to regul…[truncated, total 6080 chars]
```

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
- Latency: 11098 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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

### P-15 — NSE — Historical OHLC — RED

- URL: `https://www.nseindia.com/api/historical/cm/equity?symbol=RELIANCE&series=[%22EQ%22]&from=06-May-2026&to=20-May-2026`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: EMPTY
- Fields found: (none)
- Fields missing: OHLC rows
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: EOD daily
- Recommended action: Fall back to BSE historical.
- Fallback: P-15b
- Latency: 413 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON

```

<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name="robots"/>
    <meta charset="UTF-8">
    <title>NSE India</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            color: #000000;
        }
        .header {
            display: flex;
            align-items: center;
            padding: 20px 20px 0px 50px;
        }
        .logo {
            w…[truncated, total 22095 chars]
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
- Latency: 345 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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

### P-16 — Ticker mapping (NSE list symbol field) — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (reuses P-01) + regex
- Headers/cookies required: User-Agent, Referer, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: symbol
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Matches NSE list
- Recommended action: Deterministic mapping; no manual override file needed for v1.
- Fallback: none
- Latency: 281 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> total=2, validSymbolPattern=2, rate=100%

```
{
  "Q-Line Biotech Limited": "QLINE",
  "Bio Medica Laboratories Limited": "BMLL"
}
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
- Latency: 638 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 10485 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 493 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 29 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Issues=2, registrars resolved by name match=0

```
{
  "Q-Line Biotech Limited": null,
  "Bio Medica Laboratories Limited": null
}
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
- Latency: 1456 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 118 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 5034 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 1133 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 949 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 232 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 1738 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

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
- Latency: 1359 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> <tr> count: 0, bytes=123881

```
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/zerodha_logo_small.gif"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/angel-broking-logo-small.png"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/kotak_securities…[truncated, total 123881 chars]
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
- Latency: 85 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> Non-200. status=403

```
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="content-security-policy" content="default-src &#39;none&#39;; script-src &#39;nonce-PH8RFXSxpGruKAxU0QBX2Z&#39; &#39;unsafe-eval&#39; https://challenges.cloudflare.com; script-s…[truncated, total 5598 chars]
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
- Latency: 862 ms
- Ran at (UTC): 2026-05-20T16:18:48.348Z

> <tr> count: 2, bytes=129044

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/f7fa72dcdf4e461b.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 129044 chars]
```
