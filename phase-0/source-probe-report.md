# Phase 0 — Source Probe Report

Generated: 2026-10-20T22:17:05.505Z

## Status Summary

- GREEN: 17
- YELLOW: 3
- RED: 15

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-01 | NSE — Current/Open IPOs | GREEN | 200 | JSON | 466 | Use as primary source for Live & Upcoming tab. |
| P-02 | NSE — Upcoming IPOs | GREEN | 200 | JSON | 104 | Use as primary for Upcoming/Pipeline tab. |
| P-03 | NSE — Past/Recent IPOs | GREEN | 200 | JSON | 84 | Use as primary for Recently Listed. |
| P-04 | NSE — Live Subscription | RED | 200 | JSON | 336 | Fall back to BSE bidding (P-07). |
| P-05 | NSE Emerge — SME IPOs | YELLOW | 200 | JSON | 1006 | Source reachable; 0 SME rows in current snapshot. |
| P-08 | SEBI — Public Issues Filings | GREEN | 200 | HTML | 1865 | Use as primary for Pipeline tab + DRHP master. |
| P-08b | SEBI — Processing Status | YELLOW | 200 | EMPTY | 344 | Endpoint reachable; show "no observations today" in Pipeline tab when empty. |
| P-09 | SEBI — DRHP PDF Download | GREEN | 200 | PDF | 2611 | PDF download pipeline viable; proceed to Phase 5 RHP parsing (P-17). |
| P-10 | NSE/BSE — DRHP Archive | RED | 200 | HTML | 11124 | Skip if SEBI (P-08) is GREEN. |
| P-15 | BSE — Historical OHLC (fallback) | RED | 403 | BLOCKED | 3260 | All historical attempts failed; Module 4 (Recently Listed) and Best/Worst leaderboards must defer to v1.5. |
| P-15b | NSE — Equity Quote | RED | 403 | BLOCKED | 36 | Fall back to BSE quote. |
| P-16 | Ticker mapping (NSE list symbol field) | GREEN | 200 | JSON | 29 | Deterministic mapping; no manual override file needed for v1. |
| P-06 | BSE — Mainboard Public Issues | RED | 200 | HTML | 594 | Skip; NSE primary covers this. |
| P-06b | BSE SME — Public Issues | RED | 0 | ERROR | 10487 | Skip if NSE Emerge is GREEN. |
| P-07 | BSE — Subscription / Cumulative Bid Details | RED | 200 | HTML | 409 | Rely on NSE only (P-04). |
| P-11 | Registrar resolution (from NSE list) | RED | 200 | JSON | 28 | Fall back to per-issue page scrape or manual seed. |
| P-12 | MUFG Intime (Link Intime) — landing | GREEN | 200 | HTML | 568 | Store URL as link-out; do not scrape per-PAN. |
| P-13 | KFintech — landing | GREEN | 200 | HTML | 61 | Store URL as link-out only. |
| P-14 | Bigshare — landing | GREEN | 200 | HTML | 944 | Store URL as link-out only. |
| P-14b | Maashitla — landing | GREEN | 200 | HTML | 725 | Store URL as link-out only. |
| P-17 | RHP PDF parsing — sample | YELLOW | 200 | EMPTY | 1225 | PDF discovery selector may have drifted. |
| P-18 | Anchor circular PDF parsing — sample | RED | 0 | BLOCKED | 193 | Cannot reach discovery page. |
| P-19 | GMP — IPOWatch | RED | 403 | BLOCKED | 83 | Skip; phase-6 feature flag stays off if all GMP probes fail. |
| P-20 | GMP — Chittorgarh | RED | 200 | HTML | 1209 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-21 | GMP — IPO Central | RED | 200 | HTML | 102 | Skip. |
| P-22 | GMP — InvestorGain | RED | 200 | HTML | 353 | Skip; Phase 6 stays off if all GMP probes fail. |
| P-23a | Broker IPO page — Zerodha (reference only) | GREEN | 200 | HTML | 5226 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-23b | Broker IPO page — Upstox (reference only) | GREEN | 200 | HTML | 5172 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-24 | Sector / industry classification (NSE + BSE) | RED | 403 | EMPTY | 505 | Sector unreachable from probed endpoints; manual sector-map.json required for v1. |
| P-25 | Chittorgarh — IPO list + detail accessibility (Phase 5C) | GREEN | 200 | HTML | 888 | Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static). |
| P-26 | Chittorgarh — detail field extraction (Phase 5C.3 calibration) | RED | - | JSON | 12 | Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual. |
| P-27 | Zerodha — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 3352 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-28 | Upstox — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4458 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 3146 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | GREEN | - | JSON | 21 | Precision met (full=0.85 narrow=1.00). Ready for Phase 6A.2 planning approval. |

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
- Latency: 466 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Total rows: 2, Active rows: 2

```
{
  "companyName": "Paras Healthcare Limited",
  "issueEndDate": "23-Oct-2026",
  "issuePrice": "Rs.660 to Rs.693",
  "issueSize": "12083331",
  "issueStartDate": "21-Oct-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "PARASHLTH"
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
- Latency: 104 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Total rows: 2, Forthcoming/upcoming rows: 0

```
{
  "companyName": "Paras Healthcare Limited",
  "issueEndDate": "23-Oct-2026",
  "issuePrice": "Rs.660 to Rs.693",
  "issueSize": "12083331",
  "issueStartDate": "21-Oct-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "PARASHLTH"
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
- Latency: 84 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Total rows: 2, Past/closed/listed rows: 0

```
{
  "companyName": "Paras Healthcare Limited",
  "issueEndDate": "23-Oct-2026",
  "issuePrice": "Rs.660 to Rs.693",
  "issueSize": "12083331",
  "issueStartDate": "21-Oct-2026",
  "series": "EQ",
  "status": "Active",
  "symbol": "PARASHLTH"
}
```

### P-04 — NSE — Live Subscription — RED

- URL: `https://www.nseindia.com/api/ipo-current-issue?symbol=PARASHLTH`
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
- Latency: 336 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Active candidate symbol: PARASHLTH · Top-level keys: 0, 1

```
[
  {
    "companyName": "Paras Healthcare Limited",
    "issueEndDate": "23-Oct-2026",
    "issuePrice": "Rs.660 to Rs.693",
    "issueSize": "12083331",
    "issueStartDate": "21-Oct-2026",
    "series": "EQ",
    "status": "Active",
    "symbol": "PARASHLTH",
    "category": "Total",
    "noOfSharesOffered": "0.0",
    "noOfTime": "0.00",
    "noOfsharesBid": "0.0",
    "srNo": null
  },
  {
    "companyName": "Jio Platforms Limited",
    "issueEndDate": "23-Oct-2026",
    "issuePrice": "Rs.1065 to Rs.1119",
    "issueSize": "197525934",
    "issueStartDate": "21-Oct-2026",
    "series": "EQ",
    "status": "Active",
    "symbol": "JPL",
    "category": "Total",
    "noOfSharesOffered": "0.0",
    "noOfTime": "0.00",
    "noOfsharesBid": "0.0",
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
- Latency: 1006 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
- Latency: 1865 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> [static-primary] static ok: tr=0, bytes=6035 (pdfs=0) ; [static-alt] static ok: tr=26, bytes=47137 (pdfs=21)

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
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/oct-2026/Paramotor%20Digital%20Technology%20Limited_DAP_p.pdf",
      "link_text": "Paramotor Digital Technology Limited - Draft Abridged Prospectus(UDRHP-I)",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/oct-2026/Soleos%20Energy%20Limited_Prospectus_p.pdf",
      "link_text": "Soleos Energy Limited - Draft Abridged Prospectus",
      "source": "static-alt"
    },
    {
      "url": "https://www.sebi.gov.in/sebi_data/commondocs/oct-2026/Grace%20Renewable%20Energy%20Limited%20DAP_p.pdf",
      "link_text": "Grace Renewable Energy Limited - Draft Abridged Prospectus",
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
- Latency: 344 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> static ok: tbody_rows=3, bytes=25899

```
{
  "winning_attempt": "static",
  "tbody_row_count": 3,
  "notes": "static ok: tbody_rows=3, bytes=25899"
}
```

### P-09 — SEBI — DRHP PDF Download — GREEN

- URL: `https://www.sebi.gov.in/sebi_data/commondocs/oct-2026/Paramotor%20Digital%20Technology%20Limited_DAP_p.pdf`
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
- Latency: 2611 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> discovery=sebi-publicissues-pdfs.json; pdf_url=ct-2026/Paramotor%20Digital%20Technology%20Limited_DAP_p.pdf; bytes=616869; page_count=14; pdf-parse=ok

```
{
  "url": "https://www.sebi.gov.in/sebi_data/commondocs/oct-2026/Paramotor%20Digital%20Technology%20Limited_DAP_p.pdf",
  "link_text": "Paramotor Digital Technology Limited - Draft Abridged Prospectus(UDRHP-I)",
  "bytes": 616869,
  "sha256": "d9f0adaefcb235dc…",
  "magic": "%PDF",
  "page_count": 14,
  "cover_text_first_200": "PARAMOTOR DIGITAL TECHNOLOGY LIMITED\nCorporate Identity Number: U74999MH2016PLC287408\nREGISTERED AND\nCONTACT PERSON EMAIL AND TELEPHONE WEBSITE\nCORPORATE OFFICE\nRegistered Office: 433, 4th Floor, Neha"
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
- Latency: 11124 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> primary status=200; secondary status=0; rows=0; pdf-refs=0

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, IPO News and more. Click here to stay updated and invest wisely!Get all the latest share market and India stock market news and updates on bseindia.com">
    <meta name="keywords" content="BSE SENSEX,…[truncated, total 14287 chars]
```

### P-15 — BSE — Historical OHLC (fallback) — RED

- URL: `https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=532540&flag=W&fromdate=&todate=&seriesid=`
- Method: GET (BSE official endpoint)
- Headers/cookies required: User-Agent, Referer, Origin
- Status code: 403
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: OHLC rows
- Parsing difficulty: Easy
- Anti-bot risk: Medium
- Legal/ToS risk: Low
- Update frequency: EOD daily
- Recommended action: All historical attempts failed; Module 4 (Recently Listed) and Best/Worst leaderboards must defer to v1.5.
- Fallback: P-15b (current quote only)
- Latency: 3260 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> [nse:RELIANCE] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22082 chars] ; [nse:TCS] NSE JSON parse failed: Unexpected token '<', "
<!DOCTYPE "... is not valid JSON; body starts: 
<!DOCTYPE html>
<html lang="en">
<head>
<meta content="noindex, nofollow" name=…[truncated, total 22082 chars] ; [bse:RELIANCE] BSE non-200 (status=403, err=) ; [bse:TCS] BSE non-200 (status=403, err=)

```
<HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47;api&#46;bseindia&#46;com&#47;BseIndiaAPI&#47;api&#47;StockReachGraph&#47;w&#63;" on this server.<P>
Reference&#32;&#35;18&#46;edc83017&#46;1792534584&#46;70c00486
…[truncated, total 420 chars]
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
- Latency: 36 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
Reference&#32;&#35;18&#46;9d721102&#46;1792534584&#46;7c2a7d34
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;9d721102&#46;1792534584&#46;7c2a7d34</P>
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
- Latency: 29 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> total=2, validSymbolPattern=2, rate=100%

```
{
  "Paras Healthcare Limited": "PARASHLTH",
  "Jio Platforms Limited": "JPL"
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
- Latency: 594 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> <tr> count: 0, total bytes: 14287

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 14287 chars]
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
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
- Latency: 409 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Bid-link markers found: 0, bytes: 14287

```
<!DOCTYPE html><html lang="en" data-critters-container=""><head>
    <meta charset="utf-8">
    <title>
      LIVE Stock/Share Market | Indian Stock/Share Market LIVE | BSE SENSEX | BSE (formerly Bombay Stock
      Exchange)
    </title>
    <meta name="description" content="BSE SENSEX - India's Index the World Tracks. Get live BSE SENSEX quotes. BSE Sensex Heat Map a great tool to track BSE SENSEX stocks. Gainers, losers, volume toppers in BSE SENSEX Stocks. Corporate announcements of BSE SENSEX stocks, Share Market Today | Share Market Live updates. Share Market Live Charts, News, Analysis, …[truncated, total 14287 chars]
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
- Latency: 28 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Issues=2, registrars resolved by name match=0

```
{
  "Paras Healthcare Limited": null,
  "Jio Platforms Limited": null
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
- Latency: 568 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
- Latency: 61 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
- Latency: 944 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

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
- Latency: 725 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> status=200

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maashitla Securities — Registrar & Share Transfer Agent</title>

    <!-- EnableStack accessibility widget.
         The config must be set before the widget script runs; it is themed to
         the site's own action colour (--primary-strong, #c22f48). Regenerate
         the bundled file with: …[truncated, total 1043 chars]
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
- Latency: 1225 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> No PDF URL discovered.

### P-18 — Anchor circular PDF parsing — sample — RED

- URL: `https://www.sebi.gov.in/filings/public-issues.html`
- Method: GET (discovery)
- Headers/cookies required: (none)
- Status code: 0
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: pdf url
- Parsing difficulty: Hard
- Anti-bot risk: Low
- Legal/ToS risk: Low
- Update frequency: Immutable
- Recommended action: Cannot reach discovery page.
- Fallback: manual
- Latency: 193 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> discovery status=0

### P-19 — GMP — IPOWatch — RED

- URL: `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 403
- Response type: BLOCKED
- Fields found: (none)
- Fields missing: gmp table
- Parsing difficulty: Medium
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily, updates intra-day
- Recommended action: Skip; phase-6 feature flag stays off if all GMP probes fail.
- Fallback: P-20
- Latency: 83 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> Non-200 (Cloudflare expected). status=403

```
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="content-security-policy" content="default-src &#39;none&#39;; script-src &#39;nonce-s640oOeyfU8AJAvULat2WP&#39; &#39;unsafe-eval&#39; https://challenges.cloudflare.com; script-s…[truncated, total 5806 chars]
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
- Latency: 1209 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> <tr> count: 0, bytes=103117

```
<!DOCTYPE html><html lang="en" class="inter_4a4f7444-module__UHjWDq__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" href="https://www.chittorgarh.net/images/ipo/report_ipo-allotment-status-check-date-process_23.png" as="image"/><link rel="preload" as="image" href="https://cdn-icons-png.flaticon.com/512/2332/2332091.png"/><link rel="stylesheet" hr…[truncated, total 103117 chars]
```

### P-21 — GMP — IPO Central — RED

- URL: `https://ipocentral.in/ipo-discussion/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: discussion markers
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily
- Recommended action: Skip.
- Fallback: P-22
- Latency: 102 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> <tr> count: 0, bytes=549849

```
<!doctype html >
<!--[if IE 8]><html class="ie8" lang="en"> <![endif]-->
<!--[if IE 9]><html class="ie9" lang="en"> <![endif]-->
<!--[if gt IE 8]><!--><html lang="en-US" prefix="og: https://ogp.me/ns#"> <!--<![endif]--><head><title>IPO GMP Today 2026 – Live Grey Market Premium &amp; Kostak Rates - IPO Central</title><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="pingback" href="https://ipocentral.in/xmlrpc.php" /> <script data-cfasync="fa…[truncated, total 549849 chars]
```

### P-22 — GMP — InvestorGain — RED

- URL: `https://www.investorgain.com/report/live-ipo-gmp/331/ipo/`
- Method: GET
- Headers/cookies required: User-Agent, Referer
- Status code: 200
- Response type: HTML
- Fields found: (none)
- Fields missing: gmp table
- Parsing difficulty: Medium
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Daily, intra-day
- Recommended action: Skip; Phase 6 stays off if all GMP probes fail.
- Fallback: none
- Latency: 353 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> <tr> count: 0, bytes=49270

```
<!DOCTYPE html><html lang="en" class="inter_a869fe2d-module__Nl2jCG__variable"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/a602256c9379a2b2.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/fe81322e39413244.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/chunks/635245f93e41a18e.css" data-precedence="next"/><link rel="stylesheet" href="/_next…[truncated, total 49270 chars]
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
- Latency: 5226 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=39921 | rendered_len=40740 | challenge=false | headings=18 | tables=4 | doc_links=3 | labels=17

```
{
  "title": "NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size",
  "headings_top10": [
    "Utilities",
    "Updates",
    "Education",
    "NFP Sampoorna Foods IPO",
    "NFP Sampoorna Foods IPO details",
    "Schedule of NFP Sampoorna Foods",
    "About NFP Sampoorna Foods",
    "Financials of NFP Sampoorna Foods",
    "Issue size",
    "Utilisation of proceeds"
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
  "doc_links_count": 3,
  "first_doc_links": [
    {
      "text": "Download prospectus (PDF)",
      "href": "https://www.sampoornanuts.com/_files/ugd/6fcc6d_c8c3f3a226754a24939a595f8242c6f4.pdf"
    },
    {
      "text": "Grievances Redressal Mechanism",
      "href": "https://zerodha-common.s3.ap-south-1.amazonaws.com/Downloads-and-resources/Smart%20ODR%20info.pdf"
    },
    {
      "text": "Project Jagrook by SEBI",
      "href": "https://zerodha-common.s3.ap-south-1.amazonaws.com/Downloads-and-resources/Project+Jagrook.pdf"
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
- Fields found: Price Band, Lot Size, Issue Size, Registrar, Allotment Date, Listing Date, Face Value, QIB, NII, Retail, Anchor, P/E, Revenue, PAT, Debt to Equity, Subscription, Subscribed
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Use as information-architecture benchmark only. Do NOT scrape for production data.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 5172 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=339212 | rendered_len=402192 | challenge=false | headings=26 | tables=2 | doc_links=13 | labels=17

```
{
  "title": "Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotment | Upstox",
  "headings_top10": [
    "Vegorama Punjabi Angithi IPO",
    "Vegorama Punjabi Angithi Limited IPO Details",
    "Vegorama Punjabi Angithi IPO Subscription Status",
    "Vegorama Punjabi Angithi IPO Timeline",
    "About Vegorama Punjabi Angithi Limited",
    "Vegorama Punjabi Angithi Limited Financials",
    "Checklist",
    "Objectives of Vegorama Punjabi Angithi Limited IPO",
    "Compare",
    "Vegorama Punjabi Angithi IPO Contact Details"
  ],
  "tables_count": 2,
  "labels_detected": [
    "Price Band",
    "Lot Size",
    "Issue Size",
    "Registrar",
    "Allotment Date",
    "Listing Date",
    "Face Value",
    "QIB",
    "NII",
    "Retail",
    "Anchor",
    "P/E",
    "Revenue",
    "PAT",
    "Debt to Equity",
    "Subscription",
    "Subscribed"
  ],
  "doc_links_count": 13,
  "first_doc_links": [
    {
      "text": "Jio Platforms IPO: RIL subsidiary gets ₹2.5 lakh crore demand for ₹8,110 crore anchor book3 min read",
      "href": "https://upstox.com/news/market-news/ipo/jio-platforms-ipo-ril-subsidiary-gets-2-5-lakh-crore-demand-for-8-110-crore-anchor-book/article-202076/"
    },
    {
      "text": "Sahajanand Medical Technologies IPO subscribed 10.75 times so far on Day 3: Check allotment date2 min read",
      "href": "https://upstox.com/news/market-news/ipo/sahajanand-medical-technologies-ipo-subscribed-2-05-times-so-far-on-day-3-check-allotment-date/article-202075/"
    },
    {
      "text": "Zetwerk Manufacturing IPO subscribed 2.75 times so far on Day 3; check allotment date and steps3 min read",
      "href": "https://upstox.com/news/market-news/ipo/zetwerk-manufacturing-ipo-subscribed-52-so-far-on-day-3-check-allotment-date-and-steps/article-202064/"
    },
    {
      "text": "Bonfiglioli Transmissions IPO subscribed 29.07 times so far on Day 3: Check allotment date and steps2 min read",
      "href": "https://upstox.com/news/market-news/ipo/bonfiglioli-transmissions-ipo-day-3-check-subscription-status-allotment-date-and-steps/article-202052/"
    },
    {
      "text": "Tonbo Imaging India IPO subscribed 115.59 times so far on Day 3: Check allotment date2 min read",
      "href": "https://upstox.com/news/market-news/ipo/tonbo-imaging-india-ipo-day-3-check-subscription-status-allotment-date-and-steps/article-202047/"
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
- Latency: 505 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> [NSE equity quote] NSE non-200 (status=403, err=); body starts: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 …[truncated, total 399 chars] ; [NSE IPO list] 2 IPOs; per-row keys: companyName, issueEndDate, issuePrice, issueSize, issueStartDate, series, status, symbol; sector fields: (none) ; [BSE IPO list] BSE HTML; sector-related words found: (none); bytes=14287

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
- Fields found: mainboard dashboard reachable, sme dashboard reachable, 55 detail URL(s) discovered, detail-1 reachable, detail-2 reachable
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static).
- Fallback: P-26 (field extraction off captured HTML)
- Latency: 888 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> mainboard: static status=200 bytes=131182 | sme: static status=200 bytes=154274 | detail_urls_discovered=55 | detail_discovery_source=static | detail_urls_picked=2 | detail-1: static status=200 bytes=249929 | detail-2: static status=200 bytes=246630 | challenges_detected=false

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
  "discovered_detail_count": 55,
  "picked_detail_urls": [
    "https://www.chittorgarh.com/ipo/bls-polymers-ipo/2559/",
    "https://www.chittorgarh.com/ipo/sfc-environmental-technologies-ipo/2070/"
  ],
  "detail_titles": [
    "BLS Polymers IPO Date, Price, GMP, Review, Details",
    "SFC Environmental Technologies IPO Date, Price, GMP, Details"
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
- Fields missing: d1.open_date[missing], d1.close_date[missing], d1.registrar[missing], d1.brlms[missing], d1.official_pdf_links[missing], d2.issue_size_cr[missing], d2.price_band[missing], d2.lot_size[missing], d2.open_date[missing], d2.close_date[missing], d2.registrar[missing], d2.brlms[missing], d2.official_pdf_links[rejected-low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.
- Fallback: P-25 (re-run to refresh HTML)
- Latency: 12 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> details_extracted=2 | avg_precision=0.350 | official_pdf_links_on_allowlist=0 | official_pdf_links_off_allowlist=1 | d1: main=61114b tables=11 rows=59 | d2: main=59676b tables=10 rows=56

```
{
  "avg_precision_ratio": 0.35,
  "details": [
    {
      "index": 1,
      "source_url": "https://www.chittorgarh.com/ipo/bls-polymers-ipo/2559/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 11,
      "table_rows_parsed": 59
    },
    {
      "index": 2,
      "source_url": "https://www.chittorgarh.com/ipo/sfc-environmental-technologies-ipo/2070/",
      "found_count": 2,
      "precision_ratio": 0.2,
      "tables_parsed": 10,
      "table_rows_parsed": 56
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
- Latency: 3352 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=39921 | rendered_len=40740 | challenge=false | headings=18 | tables=4 | doc_links=3 | labels=17

```
{
  "title": "NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size",
  "headings_top10": [
    "Utilities",
    "Updates",
    "Education",
    "NFP Sampoorna Foods IPO",
    "NFP Sampoorna Foods IPO details",
    "Schedule of NFP Sampoorna Foods",
    "About NFP Sampoorna Foods",
    "Financials of NFP Sampoorna Foods",
    "Issue size",
    "Utilisation of proceeds"
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
  "doc_links_count": 3,
  "first_doc_links": [
    {
      "text": "Download prospectus (PDF)",
      "href": "https://www.sampoornanuts.com/_files/ugd/6fcc6d_c8c3f3a226754a24939a595f8242c6f4.pdf"
    },
    {
      "text": "Grievances Redressal Mechanism",
      "href": "https://zerodha-common.s3.ap-south-1.amazonaws.com/Downloads-and-resources/Smart%20ODR%20info.pdf"
    },
    {
      "text": "Project Jagrook by SEBI",
      "href": "https://zerodha-common.s3.ap-south-1.amazonaws.com/Downloads-and-resources/Project+Jagrook.pdf"
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
- Fields found: Price Band, Lot Size, Issue Size, Registrar, Allotment Date, Listing Date, Face Value, QIB, NII, Retail, Anchor, P/E, Revenue, PAT, Debt to Equity, Subscription, Subscribed
- Fields missing: (none)
- Parsing difficulty: Hard
- Anti-bot risk: High
- Legal/ToS risk: Medium
- Update frequency: Per IPO lifecycle (open/close/listing)
- Recommended action: Use as information-architecture benchmark only. Do NOT scrape for production data.
- Fallback: Screenshots / PDF exports of the broker page provided by user
- Latency: 4458 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=339212 | rendered_len=402424 | challenge=false | headings=26 | tables=2 | doc_links=13 | labels=17

```
{
  "title": "Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotment | Upstox",
  "headings_top10": [
    "Vegorama Punjabi Angithi IPO",
    "Vegorama Punjabi Angithi Limited IPO Details",
    "Vegorama Punjabi Angithi IPO Subscription Status",
    "Vegorama Punjabi Angithi IPO Timeline",
    "About Vegorama Punjabi Angithi Limited",
    "Vegorama Punjabi Angithi Limited Financials",
    "Checklist",
    "Objectives of Vegorama Punjabi Angithi Limited IPO",
    "Compare",
    "Vegorama Punjabi Angithi IPO Contact Details"
  ],
  "tables_count": 2,
  "labels_detected": [
    "Price Band",
    "Lot Size",
    "Issue Size",
    "Registrar",
    "Allotment Date",
    "Listing Date",
    "Face Value",
    "QIB",
    "NII",
    "Retail",
    "Anchor",
    "P/E",
    "Revenue",
    "PAT",
    "Debt to Equity",
    "Subscription",
    "Subscribed"
  ],
  "doc_links_count": 13,
  "first_doc_links": [
    {
      "text": "Jio Platforms IPO: RIL subsidiary gets ₹2.5 lakh crore demand for ₹8,110 crore anchor book3 min read",
      "href": "https://upstox.com/news/market-news/ipo/jio-platforms-ipo-ril-subsidiary-gets-2-5-lakh-crore-demand-for-8-110-crore-anchor-book/article-202076/"
    },
    {
      "text": "Sahajanand Medical Technologies IPO subscribed 10.75 times so far on Day 3: Check allotment date2 min read",
      "href": "https://upstox.com/news/market-news/ipo/sahajanand-medical-technologies-ipo-subscribed-2-05-times-so-far-on-day-3-check-allotment-date/article-202075/"
    },
    {
      "text": "Zetwerk Manufacturing IPO subscribed 2.75 times so far on Day 3; check allotment date and steps3 min read",
      "href": "https://upstox.com/news/market-news/ipo/zetwerk-manufacturing-ipo-subscribed-52-so-far-on-day-3-check-allotment-date-and-steps/article-202064/"
    },
    {
      "text": "Bonfiglioli Transmissions IPO subscribed 29.07 times so far on Day 3: Check allotment date and steps2 min read",
      "href": "https://upstox.com/news/market-news/ipo/bonfiglioli-transmissions-ipo-day-3-check-subscription-status-allotment-date-and-steps/article-202052/"
    },
    {
      "text": "Tonbo Imaging India IPO subscribed 115.59 times so far on Day 3: Check allotment date2 min read",
      "href": "https://upstox.com/news/market-news/ipo/tonbo-imaging-india-ipo-day-3-check-subscription-status-allotment-date-and-steps/article-202047/"
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
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: fallback (tonbo-imaging-india-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 3146 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> third_ipo_status=fallback | third_ipo_slug=tonbo-imaging-india-ipo | third_ipo_reason="fallback (no current-open found): most-recently-listed end date "15 - 19 Oct" from list "mainboard"" | detail-1: static status=200 bytes=364544 | detail-2: static status=200 bytes=321334 | detail-3: static status=200 bytes=362818 | challenges_detected=false | robots_classification=allowed-prior-flag-was-over-match | robots_ipo_disallowed=false | robots: robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). /ipo/onemi-technology-ipo/2576/→allowed (no matching rule); /ipo/bagmane-reit/3090/→allowed (no matching rule); /ipo/m-r-maniveni-ipo/2627/→allowed (no matching rule)

```
{
  "third_ipo": {
    "slug": "tonbo-imaging-india-ipo",
    "url": "https://www.chittorgarh.com/ipo/tonbo-imaging-india-ipo/3215/",
    "status": "fallback",
    "reason": "fallback (no current-open found): most-recently-listed end date \"15 - 19 Oct\" from list \"mainboard\"",
    "date_text": "15 - 19 Oct",
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
      "title": "Tonbo Imaging India IPO Date, Price, GMP, Review, Details"
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
- Latency: 21 ms
- Ran at (UTC): 2026-10-20T22:16:03.002Z

> details_extracted=3 | avg_full=0.848 | avg_narrow=1.000 | pdf_on_allowlist=2 | pdf_off_allowlist=1 | third_ipo=tonbo-imaging-india-ipo(fallback) | d1:onemi-technology-ipo full=0.91 narrow=1.00 | d2:bagmane-reit full=0.82 narrow=1.00 | d3:tonbo-imaging-india-ipo full=0.82 narrow=1.00

```
{
  "avg_full": 0.848,
  "avg_narrow": 1,
  "third_ipo_selection": {
    "slug": "tonbo-imaging-india-ipo",
    "url": "https://www.chittorgarh.com/ipo/tonbo-imaging-india-ipo/3215/",
    "status": "fallback",
    "reason": "fallback (no current-open found): most-recently-listed end date \"15 - 19 Oct\" from list \"mainboard\"",
    "date_text": "15 - 19 Oct",
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
      "slug": "tonbo-imaging-india-ipo",
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
