# Phase 0 — Source Probe Report

Generated: 2026-08-08T11:41:47.296Z

## Status Summary

- GREEN: 17
- YELLOW: 7
- RED: 11

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | GREEN | 200 | JSON | 289 | Use as primary source for Live & Upcoming tab. |
| P-02 | NSE — Upcoming IPOs | GREEN | 200 | JSON | 261 | Use as primary for Upcoming/Pipeline tab. |
| P-03 | NSE — Past/Recent IPOs | GREEN | 200 | JSON | 31 | Use as primary for Recently Listed. |
| P-04 | NSE — Live Subscription | RED | 200 | JSON | 304 | Fall back to BSE bidding (P-07). |
| P-05 | NSE Emerge — SME IPOs | YELLOW | 200 | JSON | 681 | Source reachable; 0 SME rows in current snapshot. |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 3467 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 499 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | GREEN | 200 | PDF | 2863 | PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17). |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11180 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | GREEN | 200 | JSON | 3473 | NSE historical still blocked; use BSE historical as primary (official fallback). |
| P-15b | NSE — Equity Quote | RED | 403 | BLOCKED | 32 | Fall back to BSE quote. |
| P-16 | Ticker mapping (NSE list symbol field) | GREEN | 200 | JSON | 30 | Deterministic mapping; no manual override file needed for v1. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 617 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10487 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 475 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 34 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 1116 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 127 | Store URL as link-out only. |
| P-14 | Bigshare — landing | RED | 0 | BLOCKED | 10354 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 781 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 2039 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | YELLOW | 200 | EMPTY | 263 | PDF discovery selector may have drifted. |
| P-19 | GMP — IPOWatch | YELLOW | 200 | HTML | 1600 | Include in Phase 6 GMP averager. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 594 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | YELLOW | 200 | HTML | 355 | Include in Phase 6 GMP averager (lower weight given parsing difficulty). |
| P-22 | GMP — InvestorGain | YELLOW | 200 | HTML | 280 | Include in Phase 6 GMP averager. |
| P-23a | Broker IPO page — Zerodha (reference only) | GREEN | 200 | HTML | 4877 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-23b | Broker IPO page — Upstox (reference only) | GREEN | 200 | HTML | 5551 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-24 | Sector / industry classification (NSE + BSE) | RED | 403 | EMPTY | 400 | Sector unreachable from probed endpoints; manual sector-map.json required for v1. |
| P-25 | Chittorgarh — IPO list + detail accessibility (Phase 5C) | GREEN | 200 | HTML | 3136 | Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static). |
| P-26 | Chittorgarh — detail field extraction (Phase 5C.3 calibration) | RED | - | JSON | 15 | Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual. |
| P-27 | Zerodha — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4025 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-28 | Upstox — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4700 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 3277 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | GREEN | - | JSON | 25 | Precision met (full=0.85 narrow=1.00). Ready for Phase 6A.2 planning approval. |

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
- Latency: 289 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Total rows: 7, Active rows: 2

```
{
  "companyName": "Leap India Limited",
  "issueEndDate": "11-Aug-2026",
  "issuePrice": "Rs.151 to Rs.159",
  "issueSize": "114991735",
  "issueStartDate": "07-Aug-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "LEAP"
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
- Latency: 261 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Total rows: 7, Forthcoming/upcoming rows: 4

```
{
  "companyName": "Leap India Limited",
  "issueEndDate": "11-Aug-2026",
  "issuePrice": "Rs.151 to Rs.159",
  "issueSize": "114991735",
  "issueStartDate": "07-Aug-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "LEAP"
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
- Latency: 31 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Total rows: 7, Past/closed/listed rows: 1

```
{
  "companyName": "Leap India Limited",
  "issueEndDate": "11-Aug-2026",
  "issuePrice": "Rs.151 to Rs.159",
  "issueSize": "114991735",
  "issueStartDate": "07-Aug-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "LEAP"
}
```

### P-04 — NSE — Live Subscription — RED

- URL: `https://www.nseindia.com/api/ipo-current-issue?symbol=LEAP`
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
- Latency: 304 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Active candidate symbol: LEAP · Top-level keys: 0, 1, 2

```
[
  {
    "companyName": "Leap India Limited",
    "issueEndDate": "11-Aug-2026",
    "issuePrice": "Rs.151 to Rs.159",
    "issueSize": "114991735",
    "issueStartDate": "07-Aug-2026",
    "series": "EQ",
    "status": "Active",
    "symbol": "LEAP",
    "category": "Total",
    "noOfSharesOffered": "1.14991735E8",
    "noOfTime": "0.06138804671483564",
    "noOfsharesBid": "7059118.0",
    "srNo": null
  },
  {
    "companyName": "Technocraft Ventures Limited",
    "issueEndDate": "11-Aug-2026",
    "issuePrice": "Rs.200 to Rs.212",
    "issueSize": "8317190",
    "issueStartDate": "07-Aug-2026",
    "series": "EQ",
    "status": "Active",
    "symbol": "TECHNOCRAF",
    "category": "Total",
    "noOfSharesOffered": "8317190.0",
    "noOfTime": "2.2378615854633597",
    "noOfsharesBid":…[truncated, total 1161 chars]
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
- Latency: 681 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
- Latency: 3467 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> [static-primary] static ok: tr=0, bytes=6080 (pdfs=0) ; [static-alt] static ok: tr=26, bytes=46526 (pdfs=21)

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
      "pdfs_found": 21
    }
  ],
  "unique_pdf_count": 21,
  "first_3_pdfs": [
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/aug-2026/Encube%20Ethicals%20Limited%20-%20AP_p.pdf",
      "link_text": "Encube Ethicals Limited- Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/aug-2026/Advanced%20Sys-Tek%20Limited%20%20-%20DAP_p.pdf",
      "link_text": "Advanced Sys-Tek Limited- Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/aug-2026/Veritas%20Finance%20Limited%20-%20AP_p.pdf",
      "link_text": "Veritas Finance Limited - Abridged Prospectus",
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
- Latency: 499 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> static ok: tbody_rows=3, bytes=25899

```
{
  "winning_attempt": "static",
  "tbody_row_count": 3,
  "notes": "static ok: tbody_rows=3, bytes=25899"
}
```

### P-09 — SEBI — DRHP PDF Download — GREEN

- URL: `https://www.sebi.gov.in/sebi_data/commondocs/aug-2026/Encube%20Ethicals%20Limited%20-%20AP_p.pdf`
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
- Latency: 2863 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> discovery=sebi-publicissues-pdfs.json; pdf_url=mmondocs/aug-2026/Encube%20Ethicals%20Limited%20-%20AP_p.pdf; bytes=532589; page_count=14; pdf-parse=ok

```
{
  "url": "https://www.sebi.gov.in/sebi_data/commondocs/aug-2026/Encube%20Ethicals%20Limited%20-%20AP_p.pdf",
  "link_text": "Encube Ethicals Limited- Abridged Prospectus",
  "bytes": 532589,
  "sha256": "6e7d0a189ee7d2f2…",
  "magic": "%PDF",
  "page_count": 14,
  "cover_text_first_200": "ENCUBE ETHICALS LIMITED\nCorporate Identity Number: U24230MH1995PLC092485\nREGISTERED AND CORPORATE\nCONTACT PERSON EMAIL AND TELEPHONE WEBSITE\nOFF ICE\nEmail:\n803, B Wing, HDIL Kaledonia, Sahar Road,\nPar"
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
- Latency: 11180 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> primary status=200; secondary status=0; rows=0; pdf-refs=0

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, IPO News and more. Click here to stay updated and invest wisely!Get all the latest share market and India stock market news and updates on bseindia.com">
    <meta name="keywords" content="BSE SENSEX,…[truncated, total 13850 chars]
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
- Latency: 3473 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
<meta content="noindex, nofollow" name=…[truncated, total 22096 chars] ; [bse:RELIANCE] BSE rows=26479, fields=1

```
{
  "CurrDate": "Fri Aug 07 2026 16:01:18",
  "PrevClose": "1325",
  "LowVal": "1315",
  "HighVal": "1340",
  "Scripname": "RELIANCE",
  "CurrVal": "1331.55",
  "CurrTime": "16:01",
  "LowVol": "0",
  "HighVol": "100000",
  "Data": "[{\"dttm\":\"Fri Aug 07 2026 16:01:18\",\"vale1\":\"1331.55\",\"vole\":\"0\"},{\"dttm\":\"Fri Aug 07 2026 16:00:06\",\"vale1\":\"1331.55\",\"vole\":\"0\"},{\"dttm\":\"Fri Aug 07 2026 15:59:57\",\"vale1\":\"1331.55\",\"vole\":\"208\"},{\"dttm\":\"Fri Aug 07 2026 15:58:39\",\"vale1\":\"1331.55\",\"vole\":\"24\"},{\"dttm\":\"Fri Aug 07 2026 15:57:36\",\"vale1\":\"1331.55\",\"vole\":\"3\"},{\"dttm\":\"Fri Aug 07 2026 15:56:59\",\"vale1\":\"1331.55\",\"vole\":\"73\"},{\"dttm\":\"Fri Aug 07 2026 15:55:57\",\"vale1\":\"1331.55\",\"vole\":\"30\"},{\"dttm\":\"Fri Aug 07…[truncated, total 31431 chars]
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
- Latency: 32 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
Reference&#32;&#35;18&#46;66cfdb17&#46;1786189250&#46;40348673
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;66cfdb17&#46;1786189250&#46;40348673</P>
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
- Latency: 30 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> total=7, validSymbolPattern=7, rate=100%

```
{
  "Leap India Limited": "LEAP",
  "Technocraft Ventures Limited": "TECHNOCRAF",
  "Ardee Industries Limited": "ARDEE",
  "Milky Mist Dairy Food Limited": "MILKYMIST",
  "Dhoot Transmission Limited": "DHOOTTRANS",
  "Molbio Diagnostics Limited": "MOLBIO",
  "Fascinate Textiles Limited": "FASCINATE"
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
- Latency: 617 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> <tr> count: 0, total bytes: 13850

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 13850 chars]
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
- Latency: 10487 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
- Latency: 475 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Bid-link markers found: 0, bytes: 13850

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 13850 chars]
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
- Latency: 34 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> Issues=7, registrars resolved by name match=0

```
{
  "Leap India Limited": null,
  "Technocraft Ventures Limited": null,
  "Ardee Industries Limited": null,
  "Milky Mist Dairy Food Limited": null,
  "Dhoot Transmission Limited": null,
  "Molbio Diagnostics Limited": null,
  "Fascinate Textiles Limited": null
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
- Latency: 1116 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
<link rel="icon" type="image/png" href="ima…[truncated, total 37482 chars]
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
- Latency: 127 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> primary=200, secondary=(skipped)

```
<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="./licIPO.svg"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="The IPO Allottment Status Page"/><meta name="content-type" content="text/html"/><link rel="apple-touch-icon" href="./licIPO.svg"/><link rel="manifest" href="./manifest.json"/><title>IPO Allotment Status</title><script>document.onreadystatechange=function()…[truncated, total 1003 chars]
```

### P-14 — Bigshare — landing — RED

- URL: `https://www.bigshareonline.com/ipo_allotment.html`
- Method: GET
- Headers/cookies required: User-Agent
- Status code: 0
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: reachability
- Parsing difficulty: Easy
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Static landing
- Recommended action: Store URL as link-out only.
- Fallback: none
- Latency: 10354 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> status=0

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
- Latency: 781 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> status=200

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maashitla Securities — Registrar & Share Transfer Agent</title>
    <script type="module" crossorigin src="/assets/index-B17EYUiP.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-004r-q98.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>

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
- Latency: 2039 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
- Latency: 263 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

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
- Latency: 1600 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> <tr> count: 311, bytes=881540

```
<!doctype html>
<html lang="en-US">
<head><style>img.lazy{min-height:1px}</style><link href="https://ipowatch.in/wp-content/plugins/w3-total-cache/pub/js/lazyload.min.js" as="script">
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />

	<!-- This site is optimized with the Yoast SEO Premium p…[truncated, total 881540 chars]
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
- Latency: 594 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> <tr> count: 0, bytes=124311

```
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/zerodha_logo_small.gif"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/angel-broking-logo-small.png"/><link rel="preload" as="image" href="https://www.chittorgarh.net/images/ipo/kotak-neo-logo.j…[truncated, total 124311 chars]
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
- Latency: 355 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> <tr> count: 19, bytes=338290

```
<!doctype html >
<!--[if IE 8]><html class="ie8" lang="en"> <![endif]-->
<!--[if IE 9]><html class="ie9" lang="en"> <![endif]-->
<!--[if gt IE 8]><!--><html lang="en-US" prefix="og: https://ogp.me/ns#"> <!--<![endif]--><head><title>IPO GMP Today 2026 – Live Grey Market Premium &amp; Kostak Rates - IPO Central</title><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="pingback" href="https://ipocentral.in/xmlrpc.php" /> <script data-no-defer="1…[truncated, total 338290 chars]
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
- Latency: 280 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> <tr> count: 2, bytes=134120

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/192649c7fc70eb7a.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 134120 chars]
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
- Latency: 4877 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=38014 | rendered_len=38836 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

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
- Latency: 5551 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=235272 | rendered_len=279829 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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
- Latency: 400 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> [NSE equity quote] NSE non-200 (status=403, err=); body starts: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars] ; [NSE IPO list] 7 IPOs; per-row keys: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol; sector fields: (none) ; [BSE IPO list] BSE HTML; sector-related words found: (none); bytes=13850

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
- Latency: 3136 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> mainboard: static status=200 bytes=147387 | sme: static status=200 bytes=148677 | detail_urls_discovered=40 | detail_discovery_source=static | detail_urls_picked=2 | detail-1: static status=200 bytes=291907 | detail-2: static status=200 bytes=297553 | challenges_detected=false

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
    "https://www.chittorgarh.com/ipo/behari-lal-engineering-ipo/2659/",
    "https://www.chittorgarh.com/ipo/shiprocket-ipo/2450/"
  ],
  "detail_titles": [
    "Behari Lal Engineering IPO Date, Price, GMP, Details",
    "Shiprocket IPO Date, Price, GMP, Review, Analysis &amp; Details"
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
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.listing_date[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.lot_size[high], d2.listing_date[high]
- Fields missing: d1.open_date[missing], d1.close_date[missing], d1.registrar[missing], d1.brlms[missing], d1.official_pdf_links[rejected-low], d2.open_date[missing], d2.close_date[missing], d2.registrar[missing], d2.brlms[missing], d2.official_pdf_links[missing]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.
- Fallback: P-25 (re-run to refresh HTML)
- Latency: 15 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> details_extracted=2 | avg_precision=0.500 | official_pdf_links_on_allowlist=0 | official_pdf_links_off_allowlist=1 | d1: main=86789b tables=11 rows=72 | d2: main=88715b tables=12 rows=81

```
{
  "avg_precision_ratio": 0.5,
  "details": [
    {
      "index": 1,
      "source_url": "https://www.chittorgarh.com/ipo/behari-lal-engineering-ipo/2659/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 11,
      "table_rows_parsed": 72
    },
    {
      "index": 2,
      "source_url": "https://www.chittorgarh.com/ipo/shiprocket-ipo/2450/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 12,
      "table_rows_parsed": 81
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
- Latency: 4025 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=38014 | rendered_len=38836 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

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
- Latency: 4700 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=235272 | rendered_len=277871 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: current (leap-india-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 3277 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> third_ipo_status=current | third_ipo_slug=leap-india-ipo | third_ipo_reason="current-open: list "mainboard" row date range "07 - 11 Aug" covers today" | detail-1: static status=200 bytes=368054 | detail-2: static status=200 bytes=342058 | detail-3: static status=200 bytes=330446 | challenges_detected=false | robots_classification=allowed-prior-flag-was-over-match | robots_ipo_disallowed=false | robots: robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). /ipo/onemi-technology-ipo/2576/→allowed (no matching rule); /ipo/bagmane-reit/3090/→allowed (no matching rule); /ipo/m-r-maniveni-ipo/2627/→allowed (no matching rule)

```
{
  "third_ipo": {
    "slug": "leap-india-ipo",
    "url": "https://www.chittorgarh.com/ipo/leap-india-ipo/2583/",
    "status": "current",
    "reason": "current-open: list \"mainboard\" row date range \"07 - 11 Aug\" covers today",
    "date_text": "07 - 11 Aug",
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
      "title": "LEAP India IPO Date, Price, GMP, Review, Analysis &amp; Details"
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
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.face_value[high], d1.open_date[medium], d1.close_date[medium], d1.listing_date[high], d1.registrar[medium], d1.official_pdf_links[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.lot_size[high], d2.open_date[medium], d2.close_date[medium], d2.listing_date[high], d2.registrar[medium], d2.official_pdf_links[high], d3.company_name[high], d3.issue_size_cr[high], d3.price_band[high], d3.lot_size[high], d3.face_value[high], d3.open_date[medium], d3.close_date[medium], d3.listing_date[high], d3.registrar[medium]
- Fields missing: d1.brlms[missing], d2.face_value[missing], d2.brlms[missing], d3.brlms[missing], d3.official_pdf_links[low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Precision met (full=0.85 narrow=1.00). Ready for Phase 6A.2 planning approval.
- Fallback: P-25b (re-run to refresh HTML)
- Latency: 25 ms
- Ran at (UTC): 2026-08-08T11:40:26.970Z

> details_extracted=3 | avg_full=0.848 | avg_narrow=1.000 | pdf_on_allowlist=2 | pdf_off_allowlist=1 | third_ipo=leap-india-ipo(current) | d1:onemi-technology-ipo full=0.91 narrow=1.00 | d2:bagmane-reit full=0.82 narrow=1.00 | d3:leap-india-ipo full=0.82 narrow=1.00

```
{
  "avg_full": 0.848,
  "avg_narrow": 1,
  "third_ipo_selection": {
    "slug": "leap-india-ipo",
    "url": "https://www.chittorgarh.com/ipo/leap-india-ipo/2583/",
    "status": "current",
    "reason": "current-open: list \"mainboard\" row date range \"07 - 11 Aug\" covers today",
    "date_text": "07 - 11 Aug",
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
      "found_full": 9,
      "found_narrow": 5,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "lot_size",
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
      "slug": "leap-india-ipo",
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
