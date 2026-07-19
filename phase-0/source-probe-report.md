# Phase 0 — Source Probe Report

Generated: 2026-07-19T12:09:53.703Z

## Status Summary

- GREEN: 18
- YELLOW: 7
- RED: 10

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | GREEN | 200 | JSON | 251 | Use as primary source for Live & Upcoming tab. |
| P-02 | NSE — Upcoming IPOs | GREEN | 200 | JSON | 280 | Use as primary for Upcoming/Pipeline tab. |
| P-03 | NSE — Past/Recent IPOs | GREEN | 200 | JSON | 30 | Use as primary for Recently Listed. |
| P-04 | NSE — Live Subscription | RED | 200 | JSON | 20283 | Fall back to BSE bidding (P-07). |
| P-05 | NSE Emerge — SME IPOs | YELLOW | 200 | JSON | 40819 | Source reachable; 0 SME rows in current snapshot. |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 2240 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 383 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | GREEN | 200 | PDF | 2712 | PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17). |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11074 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | GREEN | 200 | JSON | 81368 | NSE historical still blocked; use BSE historical as primary (official fallback). |
| P-15b | NSE — Equity Quote | RED | 403 | BLOCKED | 39 | Fall back to BSE quote. |
| P-16 | Ticker mapping (NSE list symbol field) | GREEN | 200 | JSON | 20242 | Deterministic mapping; no manual override file needed for v1. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 945 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10159 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 301 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 245 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 444 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 90 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 5274 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 1244 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 984 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 252 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 2331 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 1218 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | YELLOW | 200 | HTML | 346 | Include in Phase 6 GMP averager (lower weight given parsing difficulty). |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 402 | Include in Phase 6 GMP averager. |
| P-23a | Broker IPO page — Zerodha (reference only) | GREEN | 200 | HTML | 4791 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-23b | Broker IPO page — Upstox (reference only) | GREEN | 200 | HTML | 4478 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-24 | Sector / industry classification (NSE + BSE) | RED | 403 | EMPTY | 458 | Sector unreachable from probed endpoints; manual sector-map.json required for v1. |
| P-25 | Chittorgarh — IPO list + detail accessibility (Phase 5C) | GREEN | 200 | HTML | 3150 | Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static). |
| P-26 | Chittorgarh — detail field extraction (Phase 5C.3 calibration) | RED | - | JSON | 17 | Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual. |
| P-27 | Zerodha — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4692 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-28 | Upstox — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4330 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 2920 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | GREEN | - | JSON | 27 | Precision met (full=0.82 narrow=0.93). Ready for Phase 6A.2 planning approval. |

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
- Latency: 251 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> Total rows: 2, Active rows: 1

```
{
  "companyName": "Caliber Mining and Logistics Limited",
  "issueEndDate": "21-Jul-2026",
  "issuePrice": "Rs.402 to Rs.424",
  "issueSize": "7835821",
  "issueStartDate": "17-Jul-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "CMLL"
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
- Latency: 280 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> Total rows: 2, Forthcoming/upcoming rows: 1

```
{
  "companyName": "Caliber Mining and Logistics Limited",
  "issueEndDate": "21-Jul-2026",
  "issuePrice": "Rs.402 to Rs.424",
  "issueSize": "7835821",
  "issueStartDate": "17-Jul-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "CMLL"
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
- Latency: 30 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> Total rows: 2, Past/closed/listed rows: 0

```
{
  "companyName": "Caliber Mining and Logistics Limited",
  "issueEndDate": "21-Jul-2026",
  "issuePrice": "Rs.402 to Rs.424",
  "issueSize": "7835821",
  "issueStartDate": "17-Jul-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "CMLL"
}
```

### P-04 — NSE — Live Subscription — RED

- URL: `https://www.nseindia.com/api/ipo-current-issue?symbol=CMLL`
- Method: GET (after cookie warm-up + active-symbol discovery from P-01 endpoint)
- Headers/cookies required: User-Agent, Referer, X-Requested-With, warmed cookies
- Status code: 200
- Response type: JSON
- Fields found: (none)
- Fields missing: qib, nii, retail, employee, anchor, subscription
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: Updates every ~10 minutes during bidding window
- Recommended action: Fall back to BSE bidding (P-07).
- Fallback: P-07
- Latency: 20283 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> Active candidate symbol: CMLL · Top-level keys: 0

```
[
  {
    "companyName": "Caliber Mining and Logistics Limited",
    "issueEndDate": "21-Jul-2026",
    "issuePrice": "Rs.402 to Rs.424",
    "issueSize": "7835821",
    "issueStartDate": "17-Jul-2026",
    "series": "EQ",
    "status": "Active",
    "symbol": "CMLL",
    "category": "Total",
    "noOfSharesOffered": "7835821.0",
    "noOfTime": "0.7943609227418543",
    "noOfsharesBid": "6224470.0",
    "srNo": null
  }
]
```

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
- Latency: 40819 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 2240 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> [static-primary] static ok: tr=0, bytes=6080 (pdfs=0) ; [static-alt] static ok: tr=26, bytes=45993 (pdfs=19)

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
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/GNI%20INFRASTRUCTURE%20LIMITED%20-%20DA_p.pdf",
      "link_text": "GNI INFRASTRUCTURE LIMITED - Draft Abridged prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/Ratnadeep%20Retail%20Limited%20-%20DAP_p.pdf",
      "link_text": "Ratnadeep Retail Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/CULT.FIT%20Limited%20-%20AP_p.pdf",
      "link_text": "CULT.FIT LIMITED - Abridged Prospectus",
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
- Latency: 383 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> static ok: tbody_rows=3, bytes=25899

```
{
  "winning_attempt": "static",
  "tbody_row_count": 3,
  "notes": "static ok: tbody_rows=3, bytes=25899"
}
```

### P-09 — SEBI — DRHP PDF Download — GREEN

- URL: `https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/GNI%20INFRASTRUCTURE%20LIMITED%20-%20DA_p.pdf`
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
- Latency: 2712 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> discovery=sebi-publicissues-pdfs.json; pdf_url=ndocs/jul-2026/GNI%20INFRASTRUCTURE%20LIMITED%20-%20DA_p.pdf; bytes=437776; page_count=12; pdf-parse=ok

```
{
  "url": "https://www.sebi.gov.in/sebi_data/commondocs/jul-2026/GNI%20INFRASTRUCTURE%20LIMITED%20-%20DA_p.pdf",
  "link_text": "GNI INFRASTRUCTURE LIMITED - Draft Abridged prospectus",
  "bytes": 437776,
  "sha256": "698b35ab38dc1960…",
  "magic": "%PDF",
  "page_count": 12,
  "cover_text_first_200": "GNI INFRASTRUCTURE LIMITED\nCorporate Identity Number: U4210MH2007PLC173342\nREGISTERED AND CORPORATE OFFICE CONTACT PERSON EMAIL AND TELEPHONE WEBSITE\nC/O GN House, 3rd Floor, Gut No. 107, Plot No. 07,"
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
- Latency: 11074 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 81368 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> [nse:RELIANCE] NSE non-200 (status=0, err=This operation was aborted) ; [nse:TCS] NSE non-200 (status=0, err=This operation was aborted) ; [bse:RELIANCE] BSE rows=27159, fields=1

```
{
  "CurrDate": "Fri Jul 17 2026 16:01:22",
  "PrevClose": "1293",
  "LowVal": "1290",
  "HighVal": "1330",
  "Scripname": "RELIANCE",
  "CurrVal": "1326.50",
  "CurrTime": "16:01",
  "LowVol": "0",
  "HighVol": "100000",
  "Data": "[{\"dttm\":\"Fri Jul 17 2026 16:01:22\",\"vale1\":\"1326.50\",\"vole\":\"0\"},{\"dttm\":\"Fri Jul 17 2026 16:00:07\",\"vale1\":\"1326.50\",\"vole\":\"0\"},{\"dttm\":\"Fri Jul 17 2026 15:59:09\",\"vale1\":\"1326.50\",\"vole\":\"2\"},{\"dttm\":\"Fri Jul 17 2026 15:56:28\",\"vale1\":\"1326.50\",\"vole\":\"0\"},{\"dttm\":\"Fri Jul 17 2026 15:54:32\",\"vale1\":\"1326.50\",\"vole\":\"0\"},{\"dttm\":\"Fri Jul 17 2026 15:53:22\",\"vale1\":\"1326.50\",\"vole\":\"0\"},{\"dttm\":\"Fri Jul 17 2026 15:52:55\",\"vale1\":\"1326.50\",\"vole\":\"10\"},{\"dttm\":\"Fri Jul 17 202…[truncated, total 32231 chars]
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
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
Reference&#32;&#35;18&#46;73cfdb17&#46;1784462921&#46;702954a2
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;73cfdb17&#46;1784462921&#46;702954a2</P>
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
- Latency: 20242 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> total=2, validSymbolPattern=2, rate=100%

```
{
  "Caliber Mining and Logistics Limited": "CMLL",
  "Metalic Technoforge Limited": "METALIC"
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
- Latency: 945 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 10159 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 301 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 245 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> Issues=2, registrars resolved by name match=0

```
{
  "Caliber Mining and Logistics Limited": null,
  "Metalic Technoforge Limited": null
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
- Latency: 444 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
<link rel="icon" type="image/png" href="ima…[truncated, total 37479 chars]
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
- Latency: 90 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 5274 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 1244 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 984 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 252 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 2331 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> <tr> count: 299, bytes=831256

```
<!doctype html>
<html lang="en-US">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />

	<!-- This site is optimized with the Yoast SEO Premium plugin v28.0 (Yoast SEO v28.0) - https://yoast.com/product/yoast-seo-premium-wordpress/ -->
	<title>IPO GMP Today, Live IPO Grey Market Premiu…[truncated, total 831256 chars]
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
- Latency: 1218 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> <tr> count: 0, bytes=124891

```
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/paytrm-money-logo-small-25x25.jpg"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/fyers-logo-small.png"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/home.png"/><link …[truncated, total 124891 chars]
```

### P-21 — GMP — IPO Central — YELLOW

- URL: `https://ipocentral.in/ipo-discussion/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: discussion / table markers
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily
- Recommended action: Include in Phase 6 GMP averager (lower weight given parsing difficulty).
- Fallback: P-22
- Latency: 346 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> <tr> count: 15, bytes=344422

```
<!doctype html >
<!--[if IE 8]><html class="ie8" lang="en"> <![endif]-->
<!--[if IE 9]><html class="ie9" lang="en"> <![endif]-->
<!--[if gt IE 8]><!--><html lang="en-US" prefix="og: https://ogp.me/ns#"> <!--<![endif]--><head><title>IPO GMP 2026 - IPO Grey Market Premium, Latest GMP &amp; Kostak - IPO Central</title><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="pingback" href="https://ipocentral.in/xmlrpc.php" /> <script data-no-defer="1"…[truncated, total 344422 chars]
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
- Latency: 402 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> <tr> count: 2, bytes=138702

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/61cfed3faacec249.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 138702 chars]
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
- Latency: 4791 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 4478 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=225612 | rendered_len=267044 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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
- Latency: 458 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 3150 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> mainboard: static status=200 bytes=147706 | sme: static status=200 bytes=146969 | detail_urls_discovered=40 | detail_discovery_source=static | detail_urls_picked=2 | detail-1: static status=200 bytes=295040 | detail-2: static status=200 bytes=287300 | challenges_detected=false

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
    "https://www.chittorgarh.com/ipo/xtranet-technologies-ipo/2688/",
    "https://www.chittorgarh.com/ipo/indo-mim-ipo/2682/"
  ],
  "detail_titles": [
    "Xtranet Technologies IPO Date, Price, GMP, Review, Details",
    "Indo-MIM IPO Date, Price, GMP, Review, Analysis &amp; Details"
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
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.listing_date[high], d2.company_name[high], d2.listing_date[high]
- Fields missing: d1.open_date[missing], d1.close_date[missing], d1.registrar[missing], d1.brlms[missing], d1.official_pdf_links[rejected-low], d2.issue_size_cr[missing], d2.price_band[missing], d2.lot_size[missing], d2.open_date[missing], d2.close_date[missing], d2.registrar[missing], d2.brlms[missing], d2.official_pdf_links[rejected-low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.
- Fallback: P-25 (re-run to refresh HTML)
- Latency: 17 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> details_extracted=2 | avg_precision=0.350 | official_pdf_links_on_allowlist=0 | official_pdf_links_off_allowlist=2 | d1: main=88165b tables=10 rows=65 | d2: main=85974b tables=9 rows=62

```
{
  "avg_precision_ratio": 0.35,
  "details": [
    {
      "index": 1,
      "source_url": "https://www.chittorgarh.com/ipo/xtranet-technologies-ipo/2688/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 10,
      "table_rows_parsed": 65
    },
    {
      "index": 2,
      "source_url": "https://www.chittorgarh.com/ipo/indo-mim-ipo/2682/",
      "found_count": 2,
      "precision_ratio": 0.2,
      "tables_parsed": 9,
      "table_rows_parsed": 62
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
- Latency: 4692 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

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
- Latency: 4330 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=225612 | rendered_len=265912 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: current (caliber-mining-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 2920 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> third_ipo_status=current | third_ipo_slug=caliber-mining-ipo | third_ipo_reason="current-open: list "mainboard" row date range "17 - 21 Jul" covers today" | detail-1: static status=200 bytes=352937 | detail-2: static status=200 bytes=329450 | detail-3: static status=200 bytes=299082 | challenges_detected=false | robots_classification=allowed-prior-flag-was-over-match | robots_ipo_disallowed=false | robots: robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). /ipo/onemi-technology-ipo/2576/→allowed (no matching rule); /ipo/bagmane-reit/3090/→allowed (no matching rule); /ipo/m-r-maniveni-ipo/2627/→allowed (no matching rule)

```
{
  "third_ipo": {
    "slug": "caliber-mining-ipo",
    "url": "https://www.chittorgarh.com/ipo/caliber-mining-ipo/1999/",
    "status": "current",
    "reason": "current-open: list \"mainboard\" row date range \"17 - 21 Jul\" covers today",
    "date_text": "17 - 21 Jul",
    "source_list": "mainboard"
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
      "title": "Caliber Mining IPO Date, Price, GMP, Review, Details"
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
- Latency: 27 ms
- Ran at (UTC): 2026-07-19T12:06:00.707Z

> details_extracted=3 | avg_full=0.818 | avg_narrow=0.933 | pdf_on_allowlist=2 | pdf_off_allowlist=1 | third_ipo=caliber-mining-ipo(current) | d1:onemi-technology-ipo full=0.91 narrow=1.00 | d2:bagmane-reit full=0.73 narrow=0.80 | d3:caliber-mining-ipo full=0.82 narrow=1.00

```
{
  "avg_full": 0.818,
  "avg_narrow": 0.933,
  "third_ipo_selection": {
    "slug": "caliber-mining-ipo",
    "url": "https://www.chittorgarh.com/ipo/caliber-mining-ipo/1999/",
    "status": "current",
    "reason": "current-open: list \"mainboard\" row date range \"17 - 21 Jul\" covers today",
    "date_text": "17 - 21 Jul",
    "source_list": "mainboard"
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
      "slug": "caliber-mining-ipo",
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
