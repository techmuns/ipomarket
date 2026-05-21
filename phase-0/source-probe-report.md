# Phase 0 — Source Probe Report

Generated: 2026-05-21T02:02:30.908Z

## Status Summary

- GREEN: 10
- YELLOW: 11
- RED: 8

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | YELLOW | 200 | JSON | 469 | Source reachable but 0 rows in current snapshot. category=ipo appears to be mainboard-only; if today's only IPOs are SME, P-05 should satisfy the IPO-list-source gate. |
| P-02 | NSE — Upcoming IPOs | YELLOW | 200 | JSON | 340 | Source reachable but 0 upcoming rows in current snapshot. category=ipo is mainboard-only; SME pipeline lives in P-05. |
| P-03 | NSE — Past/Recent IPOs | YELLOW | 200 | JSON | 31 | Source reachable but 0 rows in current snapshot. category=ipo is mainboard-only; recently-listed SMEs require P-05. |
| P-04 | NSE — Live Subscription | YELLOW | - | EMPTY | 47 | No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run. |
| P-05 | NSE Emerge — SME IPOs | YELLOW | 200 | JSON | 1059 | Source reachable; 0 SME rows in current snapshot. |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 2164 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 369 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | GREEN | 200 | PDF | 3831 | PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17). |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11037 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | GREEN | 200 | JSON | 3867 | NSE historical still blocked; use BSE historical as primary (official fallback). |
| P-15b | NSE — Equity Quote | GREEN | 200 | JSON | 526 | Use as primary for current price. |
| P-16 | Ticker mapping (NSE list symbol field) | RED | 200 | JSON | 40 | Maintain a manual override file for IPOs whose symbol drifts post-listing. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 539 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10222 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 344 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 58 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 817 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 165 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 5555 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 1053 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 891 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 236 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 1756 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 1629 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | RED | 403 | BLOCKED | 33 | Skip. |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 119 | Include in Phase 6 GMP averager. |
| P-23a | Broker IPO page — Zerodha (reference only) | GREEN | 200 | HTML | 4248 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-23b | Broker IPO page — Upstox (reference only) | GREEN | 200 | HTML | 4520 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-24 | Sector / industry classification (NSE + BSE) | YELLOW | 200 | JSON | 1507 | Sector reachable for listed equities via NSE equity quote, but not exposed per-IPO before listing. Use the equity-quote sector once an IPO lists; create a small manual sector-map.json for pre-listing IPOs. |

## Per-probe detail

### P-01 — NSE — Current/Open IPOs — YELLOW

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: symbol, companyName, issueStartDate, issueEndDate, issuePrice, issueSize, status
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when an IPO opens/closes
- Recommended action: Source reachable but 0 rows in current snapshot. category=ipo appears to be mainboard-only; if today's only IPOs are SME, P-05 should satisfy the IPO-list-source gate.
- Fallback: P-05 (SME), P-06 (BSE)
- Latency: 469 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> source reachable but no rows in current snapshot.

```
[]
```

### P-02 — NSE — Upcoming IPOs — YELLOW

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
- Recommended action: Source reachable but 0 upcoming rows in current snapshot. category=ipo is mainboard-only; SME pipeline lives in P-05.
- Fallback: P-05 (SME), P-08b
- Latency: 340 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> source reachable but no rows in current snapshot.

```
[]
```

### P-03 — NSE — Past/Recent IPOs — YELLOW

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
- Recommended action: Source reachable but 0 rows in current snapshot. category=ipo is mainboard-only; recently-listed SMEs require P-05.
- Fallback: P-05 (SME), P-15
- Latency: 31 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> source reachable but no rows in current snapshot.

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
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> Active candidate symbol: (none currently open)

### P-05 — NSE Emerge — SME IPOs — YELLOW

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=sme`
- Method: GET (after cookie warm-up) — multi-candidate
- Headers/cookies required: User-Agent, Referer, warmed cookies, X-Requested-With (for JSON endpoints)
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: (empty array)
- Parsing difficulty: Medium
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Daily
- Recommended action: Source reachable; 0 SME rows in current snapshot.
- Fallback: P-06b
- Latency: 1059 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> [nse-api-category-sme] JSON ok: rows=0 ; [nse-api-category-sme-ipo] JSON ok: rows=0 ; [nse-www1-legacy] non-ok: status=0, err=fetch failed

```
{}
```

### P-08 — SEBI — Public Issues Filings — GREEN

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET (static) → GET (alt) → GET (detail pages) → Playwright
- Headers/cookies required: User-Agent, Referer, Chromium for JS render
- Status code: 200
- Response type: HTML
- Fields found: pdf urls, rows
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Updated whenever a DRHP/RHP/observation is filed
- Recommended action: Use as primary for Pipeline tab + DRHP master.
- Fallback: P-10
- Latency: 2164 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> [static-primary] static ok: tr=0, bytes=6080 (pdfs=0) ; [static-alt] static ok: tr=26, bytes=46183 (pdfs=19)

```
{
  "phases_summary": [
    {
      "phase": "static-primary",
      "tr_count": 0,
      "pdfs_found": 0
    },
    {
      "phase": "static-alt",
      "tr_count": 26,
      "pdfs_found": 19
    }
  ],
  "unique_pdf_count": 19,
  "first_3_pdfs": [
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Incred%20Holdings%20Limited-Abridged%20prospectus_p.pdf",
      "link_text": "Incred Holdings Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Online%20Instruments%20india%20Limite-AP_p.pdf",
      "link_text": "Online Instruments(India) Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Jindal%20Supreme%20India%20Limited%20-%20AP_p.pdf",
      "link_text": "Jindal Supreme (India) Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    }
  ],
  "detail_urls_found": 31
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
- Latency: 369 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> static ok: tbody_rows=2, bytes=25096

```
{
  "winning_attempt": "static",
  "tbody_row_count": 2,
  "notes": "static ok: tbody_rows=2, bytes=25096"
}
```

### P-09 — SEBI — DRHP PDF Download — GREEN

- URL: `https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Incred%20Holdings%20Limited-Abridged%20prospectus_p.pdf`
- Method: GET (binary) + pdf-parse.py (page-count)
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: PDF
- Fields found: %PDF magic, bytes, page_count
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Immutable once published
- Recommended action: PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17).
- Fallback: P-10
- Latency: 3831 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> discovery=sebi-publicissues-pdfs.json; pdf_url=2026/Incred%20Holdings%20Limited-Abridged%20prospectus_p.pdf; bytes=728221; page_count=13; pdf-parse=ok

```
{
  "url": "https://www.sebi.gov.in/sebi_data/commondocs/may-2026/Incred%20Holdings%20Limited-Abridged%20prospectus_p.pdf",
  "link_text": "Incred Holdings Limited - Draft Abridged Prospectus",
  "bytes": 728221,
  "sha256": "57ed9f25485f5467…",
  "magic": "%PDF",
  "page_count": 13,
  "cover_text_first_200": "(Please scan this QR code to view\nthe UDRHP-I and the Draft\nAbridged Prospectus)\nINCRED HOLDINGS LIMITED\nCORPORATE IDENTITY NUMBER: U67190MH2011PLC211738\nREGISTERED AND CONTACT PERSON EMAIL TELEPHONE "
}
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
- Latency: 11037 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 3867 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> [nse:RELIANCE] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22096 chars] ; [nse:TCS] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22096 chars] ; [bse:RELIANCE] BSE rows=26032, fields=1

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
- Latency: 526 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
    "industry":…[truncated, total 4653 chars]
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
- Latency: 40 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 539 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 10222 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 344 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 58 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 817 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
<link rel="icon" type="image/png" href="ima…[truncated, total 37480 chars]
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
- Latency: 165 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 5555 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 1053 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 891 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 236 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 1756 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> <tr> count: 290, bytes=812521

```
<!doctype html>
<html lang="en-US">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />

	<!-- This site is optimized with the Yoast SEO Premium plugin v27.6 (Yoast SEO v27.6) - https://yoast.com/product/yoast-seo-premium-wordpress/ -->
	<title>IPO GMP Today, Live IPO Grey Market Premiu…[truncated, total 812521 chars]
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
- Latency: 1629 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
- Latency: 33 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> Non-200. status=403

```
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="content-security-policy" content="default-src &#39;none&#39;; script-src &#39;nonce-unSxKKPfNasecmpME187jL&#39; &#39;unsafe-eval&#39; https://challenges.cloudflare.com; script-s…[truncated, total 5598 chars]
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
- Latency: 119 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> <tr> count: 2, bytes=128184

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/f7fa72dcdf4e461b.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 128184 chars]
```

### P-23a — Broker IPO page — Zerodha (reference only) — GREEN

- URL: `https://zerodha.com/ipo/440359/nfp-sampoorna-foods/`
- Method: Playwright/Chromium (headless, no stealth)
- Headers/cookies required: User-Agent (desktop Chrome), Locale en-IN
- Status code: 200
- Response type: HTML
- Fields found: Open Date, Close Date, Issue Open, Issue Close, Lot Size, Issue Size, Registrar, Fresh Issue, Allotment Date, Listing Date, NII, Retail, Anchor, Revenue, GMP, Grey Market, Subscription
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Use as information-architecture benchmark only. Do NOT scrape for production data.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 4248 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=37856 | rendered_len=39240 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

```
{
  "title": "NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size",
  "headings_top10": [
    "NFP Sampoorna Foods IPO",
    "NFP Sampoorna Foods IPO details",
    "Schedule of NFP Sampoorna Foods",
    "About NFP Sampoorna Foods",
    "Financials of NFP Sampoorna Foods",
    "Issue size",
    "Utilisation of proceeds",
    "Strengths",
    "Risks",
    "Allotment Status for NFP Sampoorna Foods"
  ],
  "tables_count": 4,
  "labels_detected": [
    "Open Date",
    "Close Date",
    "Issue Open",
    "Issue Close",
    "Lot Size",
    "Issue Size",
    "Registrar",
    "Fresh Issue",
    "Allotment Date",
    "Listing Date",
    "NII",
    "Retail",
    "Anchor",
    "Revenue",
    "GMP",
    "Grey Market",
    "Subscription"
  ],
  "doc_links_count": 2,
  "first_doc_links": [
    {
      "text": "Download prospectus (PDF)",
      "href": "https://www.sampoornanuts.com/_files/ugd/6fcc6d_c8c3f3a226754a24939a595f8242c6f4.pdf"
    },
    {
      "text": "Grievances Redressal Mechanism",
      "href": "https://zerodha-common.s3.ap-south-1.amazonaws.com/Downloads-and-resources/Smart%20ODR%20info.pdf"
    }
  ]
}
```

### P-23b — Broker IPO page — Upstox (reference only) — GREEN

- URL: `https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/`
- Method: Playwright/Chromium (headless, no stealth)
- Headers/cookies required: User-Agent (desktop Chrome), Locale en-IN
- Status code: 200
- Response type: HTML
- Fields found: Lot Size, Issue Size, QIB, NII, Retail, P/E, Revenue, PAT, Debt to Equity, Subscription, Subscribed
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Use as information-architecture benchmark only. Do NOT scrape for production data.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 4520 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=218095 | rendered_len=264531 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

```
{
  "title": "Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotment | Upstox",
  "headings_top10": [
    "Vegorama Punjabi Angithi IPO",
    "Vegorama Punjabi Angithi Limited IPO Details",
    "Checklist",
    "Performance",
    "Compare",
    "Objectives",
    "About Vegorama Punjabi Angithi Limited",
    "Vegorama Punjabi Angithi IPO Subscription Status",
    "Frequently asked questions",
    "How to invest in the Vegorama Punjabi Angithi IPO ?"
  ],
  "tables_count": 1,
  "labels_detected": [
    "Lot Size",
    "Issue Size",
    "QIB",
    "NII",
    "Retail",
    "P/E",
    "Revenue",
    "PAT",
    "Debt to Equity",
    "Subscription",
    "Subscribed"
  ],
  "doc_links_count": 8,
  "first_doc_links": [
    {
      "text": "Derivatives",
      "href": "https://assets.upstox.com/website/risk-disclosures/derivatives.pdf"
    },
    {
      "text": "Mutual Funds",
      "href": "https://assets.upstox.com/website/risk-disclosures/mutual-funds.pdf"
    },
    {
      "text": "Pledge of Securities",
      "href": "https://assets.upstox.com/website/risk-disclosures/pledge-of-securities.pdf"
    },
    {
      "text": "Unauthorized Trading",
      "href": "https://assets.upstox.com/website/risk-disclosures/unauthorized-trading.pdf"
    },
    {
      "text": "Third Party Products",
      "href": "https://assets.upstox.com/website/risk-disclosures/third-party-products.pdf"
    }
  ]
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
- Latency: 1507 ms
- Ran at (UTC): 2026-05-21T02:01:29.376Z

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
