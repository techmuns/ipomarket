# Phase 0 — Source Probe Report

Generated: 2026-07-07T06:55:52.980Z

## Status Summary

- GREEN: 18
- YELLOW: 7
- RED: 10

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | GREEN | 200 | JSON | 265 | Use as primary source for Live & Upcoming tab. |
| P-02 | NSE — Upcoming IPOs | GREEN | 200 | JSON | 22 | Use as primary for Upcoming/Pipeline tab. |
| P-03 | NSE — Past/Recent IPOs | GREEN | 200 | JSON | 27 | Use as primary for Recently Listed. |
| P-04 | NSE — Live Subscription | YELLOW | - | EMPTY | 20 | No currently open IPO discovered; re-run during an active issue window. Endpoint not validated this run. |
| P-05 | NSE Emerge — SME IPOs | YELLOW | 200 | JSON | 987 | Source reachable; 0 SME rows in current snapshot. |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 2299 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 329 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | GREEN | 200 | PDF | 2710 | PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17). |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11212 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | GREEN | 200 | JSON | 4619 | NSE historical still blocked; use BSE historical as primary (official fallback). |
| P-15b | NSE — Equity Quote | RED | 403 | BLOCKED | 39 | Fall back to BSE quote. |
| P-16 | Ticker mapping (NSE list symbol field) | GREEN | 200 | JSON | 328 | Deterministic mapping; no manual override file needed for v1. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 643 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10135 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 345 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 35 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 405 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 118 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 4809 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 1089 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 924 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 242 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 1605 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 569 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | RED | 403 | BLOCKED | 72 | Skip. |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 128 | Include in Phase 6 GMP averager. |
| P-23a | Broker IPO page — Zerodha (reference only) | GREEN | 200 | HTML | 5140 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-23b | Broker IPO page — Upstox (reference only) | GREEN | 200 | HTML | 4517 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-24 | Sector / industry classification (NSE + BSE) | RED | 403 | EMPTY | 1405 | Sector unreachable from probed endpoints; manual sector-map.json required for v1. |
| P-25 | Chittorgarh — IPO list + detail accessibility (Phase 5C) | GREEN | 200 | HTML | 713 | Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static). |
| P-26 | Chittorgarh — detail field extraction (Phase 5C.3 calibration) | RED | - | JSON | 17 | Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual. |
| P-27 | Zerodha — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 3530 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-28 | Upstox — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4684 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 103 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | GREEN | - | JSON | 28 | Precision met (full=0.82 narrow=0.93). Ready for Phase 6A.2 planning approval. |

## Per-probe detail

### P-01 — NSE — Current/Open IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when an IPO opens/closes
- Recommended action: Use as primary source for Live & Upcoming tab.
- Fallback: P-06
- Latency: 265 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Total rows: 2, Active rows: 0

```
{
  "companyName": "Kusumgar Limited",
  "issueEndDate": "10-Jul-2026",
  "issuePrice": "Rs.398 to Rs.419",
  "issueSize": "16341209",
  "issueStartDate": "08-Jul-2026",
  "series": "EQ",
  "status": "Forthcoming",
  "symbol": "KUSUMGAR"
}
```

### P-02 — NSE — Upcoming IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol
- Fields missing: (none)
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated when issues are announced
- Recommended action: Use as primary for Upcoming/Pipeline tab.
- Fallback: P-08b
- Latency: 22 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Total rows: 2, Forthcoming/upcoming rows: 2

```
{
  "companyName": "Kusumgar Limited",
  "issueEndDate": "10-Jul-2026",
  "issuePrice": "Rs.398 to Rs.419",
  "issueSize": "16341209",
  "issueStartDate": "08-Jul-2026",
  "series": "EQ",
  "status": "Forthcoming",
  "symbol": "KUSUMGAR"
}
```

### P-03 — NSE — Past/Recent IPOs — GREEN

- URL: `https://www.nseindia.com/api/all-upcoming-issues?category=ipo`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol
- Fields missing: listingDate
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updated on listing
- Recommended action: Use as primary for Recently Listed.
- Fallback: P-15
- Latency: 27 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Total rows: 2, Past/closed/listed rows: 0

```
{
  "companyName": "Kusumgar Limited",
  "issueEndDate": "10-Jul-2026",
  "issuePrice": "Rs.398 to Rs.419",
  "issueSize": "16341209",
  "issueStartDate": "08-Jul-2026",
  "series": "EQ",
  "status": "Forthcoming",
  "symbol": "KUSUMGAR"
}
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
- Latency: 20 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 987 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 2299 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> [static-primary] static ok: tr=0, bytes=6080 (pdfs=0) ; [static-alt] static ok: tr=26, bytes=44332 (pdfs=15)

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
      "pdfs_found": 15
    }
  ],
  "unique_pdf_count": 15,
  "first_3_pdfs": [
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/Pragyawan%20Technologies%20Limited%20-%20Abriged_p.PDF",
      "link_text": "Pragyawan Technologies Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/GLOBAL%20-%20DAP_p.pdf",
      "link_text": "ESWARI GLOBAL METAL INDUSTRIES LIMITED_Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/REIL%20Abridged_p.pdf",
      "link_text": "Renfra Energy India Limited_Draft Abridged Prospectus",
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
- Latency: 329 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> static ok: tbody_rows=3, bytes=25899

```
{
  "winning_attempt": "static",
  "tbody_row_count": 3,
  "notes": "static ok: tbody_rows=3, bytes=25899"
}
```

### P-09 — SEBI — DRHP PDF Download — GREEN

- URL: `https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/Pragyawan%20Technologies%20Limited%20-%20Abriged_p.PDF`
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
- Latency: 2710 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> discovery=sebi-publicissues-pdfs.json; pdf_url=-2026/Pragyawan%20Technologies%20Limited%20-%20Abriged_p.PDF; bytes=497025; page_count=10; pdf-parse=ok

```
{
  "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/Pragyawan%20Technologies%20Limited%20-%20Abriged_p.PDF",
  "link_text": "Pragyawan Technologies Limited - Draft Abridged Prospectus",
  "bytes": 497025,
  "sha256": "e068a918ef1433dc…",
  "magic": "%PDF",
  "page_count": 10,
  "cover_text_first_200": "PRAGYAWAN TECHNOLOGIES LIMITED\nCORPORATE IDENTITY NUMBER: U29292DL2011PLC222502\nREGISTERED OFFICE CORPORATE OFFICE CONTACT PERSON EMAIL AND TELEPHONE WEBSITE\nFlat No. 2, 2nd Floor, Plot B 132, Sector "
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
- Latency: 11212 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 4619 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> [nse:RELIANCE] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22095 chars] ; [nse:TCS] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22095 chars] ; [bse:RELIANCE] BSE rows=12838, fields=1

```
{
  "CurrDate": "Tue Jul 07 2026 12:24:59",
  "PrevClose": "1321.4",
  "LowVal": "1310",
  "HighVal": "1330",
  "Scripname": "RELIANCE",
  "CurrVal": "1313.95",
  "CurrTime": "12:24",
  "LowVol": "0",
  "HighVol": "25000",
  "Data": "[{\"dttm\":\"Tue Jul 07 2026 12:24:59\",\"vale1\":\"1313.95\",\"vole\":\"32\"},{\"dttm\":\"Tue Jul 07 2026 12:23:59\",\"vale1\":\"1315.00\",\"vole\":\"866\"},{\"dttm\":\"Tue Jul 07 2026 12:22:59\",\"vale1\":\"1314.60\",\"vole\":\"941\"},{\"dttm\":\"Tue Jul 07 2026 12:21:59\",\"vale1\":\"1315.45\",\"vole\":\"2206\"},{\"dttm\":\"Tue Jul 07 2026 12:20:59\",\"vale1\":\"1313.85\",\"vole\":\"1806\"},{\"dttm\":\"Tue Jul 07 2026 12:19:59\",\"vale1\":\"1313.30\",\"vole\":\"661\"},{\"dttm\":\"Tue Jul 07 2026 12:18:59\",\"vale1\":\"1312.60\",\"vole\":\"1990\"},{\"dttm\":…[truncated, total 15355 chars]
```

### P-15b — NSE — Equity Quote — RED

- URL: `https://www.nseindia.com/api/quote-equity?symbol=RELIANCE`
- Method: GET (after cookie warm-up)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 403
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: priceInfo
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Near real-time during market hours
- Recommended action: Fall back to BSE quote.
- Fallback: none
- Latency: 39 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Non-200. First bytes: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47;www&#46;nseindia&#46;com&#47;api&#47;quote&#45;equity&#63;" on …[truncated, total 399 chars]

```
<HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47;www&#46;nseindia&#46;com&#47;api&#47;quote&#45;equity&#63;" on this server.<P>
Reference&#32;&#35;18&#46;464e4e68&#46;1783407308&#46;691d87eb
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;464e4e68&#46;1783407308&#46;691d87eb</P>
</BODY>
</HTML>

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
- Latency: 328 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> total=2, validSymbolPattern=2, rate=100%

```
{
  "Kusumgar Limited": "KUSUMGAR",
  "Happy Steels Limited": "HAPPY"
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
- Latency: 643 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 10135 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 345 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 35 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Issues=2, registrars resolved by name match=0

```
{
  "Kusumgar Limited": null,
  "Happy Steels Limited": null
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
- Latency: 405 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 4809 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 1089 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
    <link rel="shortcut icon" href="https://cdn.maashitla.com/img/favicon.ico" type="image/x-icon" />…[truncated, total 55245 chars]
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
- Latency: 924 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 242 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

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
- Latency: 1605 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> <tr> count: 297, bytes=823055

```
<!doctype html>
<html lang="en-US">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />

	<!-- This site is optimized with the Yoast SEO Premium plugin v27.9 (Yoast SEO v27.9) - https://yoast.com/product/yoast-seo-premium-wordpress/ -->
	<title>IPO GMP Today, Live IPO Grey Market Premiu…[truncated, total 823055 chars]
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
- Latency: 569 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> <tr> count: 0, bytes=124166

```
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/zerodha_logo_small.gif"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/angel-broking-logo-small.png"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/kotak-neo-logo.j…[truncated, total 124166 chars]
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
- Latency: 72 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> Non-200. status=403

```
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="content-security-policy" content="default-src &#39;none&#39;; script-src &#39;nonce-r1RwmKN7uIoiXjdCU9d1Qr&#39; &#39;unsafe-eval&#39; https://challenges.cloudflare.com; script-s…[truncated, total 5747 chars]
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
- Latency: 128 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> <tr> count: 2, bytes=135888

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/c21684714b57cbdb.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 135888 chars]
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
- Latency: 5140 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=37991 | rendered_len=38813 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

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
- Latency: 4517 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=225612 | rendered_len=268088 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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

### P-24 — Sector / industry classification (NSE + BSE) — RED

- URL: `https://www.nseindia.com/api/quote-equity?symbol=RELIANCE ; https://www.nseindia.com/api/all-upcoming-issues?category=ipo ; https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=p`
- Method: GET (3 endpoints)
- Headers/cookies required: User-Agent, Referer, X-Requested-With (NSE)
- Status code: 403
- Response type: EMPTY
- Fields found: (none)
- Fields missing: pre-IPO sector / industry per-IPO
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Slow-changing (industry codes rarely change per company)
- Recommended action: Sector unreachable from probed endpoints; manual sector-map.json required for v1.
- Fallback: phase-0/samples/sector-manual-map.json (curated)
- Latency: 1405 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> [NSE equity quote] NSE non-200 (status=403, err=); body starts: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars] ; [NSE IPO list] 2 IPOs; per-row keys: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol; sector fields: (none) ; [BSE IPO list] BSE HTML; sector-related words found: (none); bytes=12565

```
{
  "sector_reachable": {
    "listed_equity": false,
    "pre_ipo": false
  },
  "manual_map_needed": true,
  "nse_equity_sector_fields": [],
  "nse_ipo_sector_fields": [],
  "bse_ipo_sector_fields": []
}
```

### P-25 — Chittorgarh — IPO list + detail accessibility (Phase 5C) — GREEN

- URL: `https://www.chittorgarh.com/ipo/ipo_dashboard.asp + https://www.chittorgarh.com/ipo/ipo_dashboard.asp?a=sme`
- Method: GET static → Playwright fallback (no retry within pass); two dashboards probed per pass
- Headers/cookies required: User-Agent (desktop Chrome), Referer
- Status code: 200
- Response type: HTML
- Fields found: mainboard dashboard reachable, sme dashboard reachable, 40 detail URL(s) discovered, detail-1 reachable, detail-2 reachable
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static).
- Fallback: P-26 (field extraction off captured HTML)
- Latency: 713 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> mainboard: static status=200 bytes=147282 | sme: static status=200 bytes=148925 | detail_urls_discovered=40 | detail_discovery_source=static | detail_urls_picked=2 | detail-1: static status=200 bytes=238690 | detail-2: static status=200 bytes=257504 | challenges_detected=false

```
{
  "dashboard_titles": [
    {
      "kind": "mainboard",
      "title": "Mainboard IPO Dashboard (Main board IPO at BSE and NSE)"
    },
    {
      "kind": "sme",
      "title": "SME IPO Dashboard (SME IPO at BSE SME and NSE Emerge)"
    }
  ],
  "discovered_detail_count": 40,
  "picked_detail_urls": [
    "https://www.chittorgarh.com/ipo/sbi-funds-management-ipo/2949/",
    "https://www.chittorgarh.com/ipo/laser-power-infra-ipo/2654/"
  ],
  "detail_titles": [
    "SBI Funds Management IPO Date, Price, GMP, Review, Details",
    "Laser Power &amp; Infra IPO Date, Price, GMP, Review, Details"
  ],
  "challenges_detected": false,
  "diagnostics_first_hrefs_per_dashboard": null
}
```

### P-26 — Chittorgarh — detail field extraction (Phase 5C.3 calibration) — RED

- URL: `phase-0/broker-pages/chittorgarh-detail-*-rendered.html (on disk)`
- Method: disk read (no network) — extracts from P-25 captured HTML via table-aware parser
- Headers/cookies required: (none)
- Status code: (no response)
- Response type: JSON
- Fields found: d1.company_name[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.lot_size[high], d2.listing_date[high]
- Fields missing: d1.issue_size_cr[rejected-low], d1.price_band[missing], d1.lot_size[missing], d1.open_date[missing], d1.close_date[missing], d1.listing_date[rejected-low], d1.registrar[missing], d1.brlms[missing], d1.official_pdf_links[missing], d2.open_date[missing], d2.close_date[missing], d2.registrar[missing], d2.brlms[missing], d2.official_pdf_links[rejected-low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.
- Fallback: P-25 (re-run to refresh HTML)
- Latency: 17 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> details_extracted=2 | avg_precision=0.300 | official_pdf_links_on_allowlist=0 | official_pdf_links_off_allowlist=1 | d1: main=72733b tables=7 rows=33 | d2: main=78896b tables=9 rows=51

```
{
  "avg_precision_ratio": 0.3,
  "details": [
    {
      "index": 1,
      "source_url": "https://www.chittorgarh.com/ipo/sbi-funds-management-ipo/2949/",
      "found_count": 1,
      "precision_ratio": 0.1,
      "tables_parsed": 7,
      "table_rows_parsed": 33
    },
    {
      "index": 2,
      "source_url": "https://www.chittorgarh.com/ipo/laser-power-infra-ipo/2654/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 9,
      "table_rows_parsed": 51
    }
  ]
}
```

### P-27 — Zerodha — IPO detail refresh (Phase 5C, reference only) — GREEN

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
- Latency: 3530 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=37991 | rendered_len=38813 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

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

### P-28 — Upstox — IPO detail refresh (Phase 5C, reference only) — GREEN

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
- Latency: 4684 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=225612 | rendered_len=267411 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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

### P-25b — Chittorgarh — detail-page accessibility retune (Phase 6A.1) — GREEN

- URL: `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/ + https://www.chittorgarh.com/ipo/bagmane-reit/3090/ + auto-selected third IPO`
- Method: GET static → Playwright fallback (no retry within pass); 3 IPOs probed per pass (2 fixed + 1 auto)
- Headers/cookies required: User-Agent (desktop Chrome), Referer
- Status code: 200
- Response type: HTML
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: fallback (ic-electricals-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 103 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> third_ipo_status=fallback | third_ipo_slug=ic-electricals-ipo | third_ipo_reason="fallback (no current-open found): most-recently-listed end date "03 - 07 Jul" from list "sme"" | detail-1: static status=200 bytes=352679 | detail-2: static status=200 bytes=329189 | detail-3: static status=200 bytes=313963 | challenges_detected=false | robots_classification=allowed-prior-flag-was-over-match | robots_ipo_disallowed=false | robots: robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). /ipo/onemi-technology-ipo/2576/→allowed (no matching rule); /ipo/bagmane-reit/3090/→allowed (no matching rule); /ipo/m-r-maniveni-ipo/2627/→allowed (no matching rule)

```
{
  "third_ipo": {
    "slug": "ic-electricals-ipo",
    "url": "https://www.chittorgarh.com/ipo/ic-electricals-ipo/2754/",
    "status": "fallback",
    "reason": "fallback (no current-open found): most-recently-listed end date \"03 - 07 Jul\" from list \"sme\"",
    "date_text": "03 - 07 Jul",
    "source_list": "sme"
  },
  "detail_titles": [
    {
      "index": 1,
      "title": "OnEMI Technology IPO Date, Price, GMP, Review, Details"
    },
    {
      "index": 2,
      "title": "Bagmane REIT Date, Price, GMP, Review, Analysis &amp; Details"
    },
    {
      "index": 3,
      "title": "IC Electricals IPO Date, Price, GMP, Review, Details"
    }
  ],
  "challenges_detected": false
}
```

### P-26b — Chittorgarh — detail field extraction retune (Phase 6A.1) — GREEN

- URL: `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html (on disk)`
- Method: disk read (no network) — extracts from P-25b captured HTML via table-aware parser + §10.3 patterns + Chittorgarh-specific helpers
- Headers/cookies required: (none)
- Status code: (no response)
- Response type: JSON
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.face_value[high], d1.open_date[medium], d1.close_date[medium], d1.listing_date[high], d1.registrar[medium], d1.official_pdf_links[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.open_date[medium], d2.close_date[medium], d2.listing_date[high], d2.registrar[medium], d2.official_pdf_links[high], d3.company_name[high], d3.issue_size_cr[high], d3.price_band[high], d3.lot_size[high], d3.face_value[high], d3.open_date[medium], d3.close_date[medium], d3.listing_date[high], d3.registrar[medium]
- Fields missing: d1.brlms[missing], d2.lot_size[missing], d2.face_value[missing], d2.brlms[missing], d3.brlms[missing], d3.official_pdf_links[low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Precision met (full=0.82 narrow=0.93). Ready for Phase 6A.2 planning approval.
- Fallback: P-25b (re-run to refresh HTML)
- Latency: 28 ms
- Ran at (UTC): 2026-07-07T06:54:45.673Z

> details_extracted=3 | avg_full=0.818 | avg_narrow=0.933 | pdf_on_allowlist=2 | pdf_off_allowlist=1 | third_ipo=ic-electricals-ipo(fallback) | d1:onemi-technology-ipo full=0.91 narrow=1.00 | d2:bagmane-reit full=0.73 narrow=0.80 | d3:ic-electricals-ipo full=0.82 narrow=1.00

```
{
  "avg_full": 0.818,
  "avg_narrow": 0.933,
  "third_ipo_selection": {
    "slug": "ic-electricals-ipo",
    "url": "https://www.chittorgarh.com/ipo/ic-electricals-ipo/2754/",
    "status": "fallback",
    "reason": "fallback (no current-open found): most-recently-listed end date \"03 - 07 Jul\" from list \"sme\"",
    "date_text": "03 - 07 Jul",
    "source_list": "sme"
  },
  "per_detail": [
    {
      "index": 1,
      "slug": "onemi-technology-ipo",
      "found_full": 10,
      "found_narrow": 5,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "lot_size",
        "face_value",
        "listing_date",
        "official_pdf_links"
      ],
      "medium": [
        "open_date",
        "close_date",
        "registrar"
      ],
      "low": []
    },
    {
      "index": 2,
      "slug": "bagmane-reit",
      "found_full": 8,
      "found_narrow": 4,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "listing_date",
        "official_pdf_links"
      ],
      "medium": [
        "open_date",
        "close_date",
        "registrar"
      ],
      "low": []
    },
    {
      "index": 3,
      "slug": "ic-electricals-ipo",
      "found_full": 9,
      "found_narrow": 5,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "lot_size",
        "face_value",
        "listing_date"
      ],
      "medium": [
        "open_date",
        "close_date",
        "registrar"
      ],
      "low": [
        "official_pdf_links"
      ]
    }
  ]
}
```
