# Phase 0 — Source Probe Report

Generated: 2026-05-22T03:06:37.631Z

## Status Summary

- GREEN: 3
- YELLOW: 0
- RED: 1

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-25 | Chittorgarh — IPO list + detail accessibility (Phase 5C) | GREEN | 200 | HTML | 249 | Run P-26 to evaluate field extraction precision against the captured HTML (detail_discovery_source=static). |
| P-26 | Chittorgarh — detail field extraction (Phase 5C.3 calibration) | RED | - | JSON | 20 | Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual. |
| P-27 | Zerodha — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4258 | Use as information-architecture benchmark only. Do NOT scrape for production data. |
| P-28 | Upstox — IPO detail refresh (Phase 5C, reference only) | GREEN | 200 | HTML | 4907 | Use as information-architecture benchmark only. Do NOT scrape for production data. |

## Per-probe detail

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
- Latency: 249 ms
- Ran at (UTC): 2026-05-22T03:06:27.327Z

> mainboard: static status=200 bytes=145883 | sme: static status=200 bytes=148146 | detail_urls_discovered=40 | detail_discovery_source=static | detail_urls_picked=2 | detail-1: static status=200 bytes=309225 | detail-2: static status=200 bytes=343417 | challenges_detected=false

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
    "https://www.chittorgarh.com/ipo/bagmane-reit/3090/",
    "https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/"
  ],
  "detail_titles": [
    "Bagmane REIT Date, Price, GMP, Review, Analysis &amp; Details",
    "OnEMI Technology IPO Date, Price, GMP, Review, Details"
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
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.official_pdf_links[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.lot_size[high], d2.official_pdf_links[high]
- Fields missing: d1.lot_size[missing], d1.open_date[missing], d1.close_date[missing], d1.listing_date[missing], d1.registrar[missing], d1.brlms[missing], d2.open_date[missing], d2.close_date[missing], d2.listing_date[missing], d2.registrar[missing], d2.brlms[missing]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Extraction precision below the §Y.9.1 threshold. Per the Phase 5C.3 acceptance gate, recommend NO for Chittorgarh ingestion and keep it reference-only / manual.
- Fallback: P-25 (re-run to refresh HTML)
- Latency: 20 ms
- Ran at (UTC): 2026-05-22T03:06:27.327Z

> details_extracted=2 | avg_precision=0.450 | official_pdf_links_on_allowlist=2 | official_pdf_links_off_allowlist=3 | d1: main=79604b tables=10 rows=53 | d2: main=95592b tables=13 rows=87

```
{
  "avg_precision_ratio": 0.45,
  "details": [
    {
      "index": 1,
      "source_url": "https://www.chittorgarh.com/ipo/bagmane-reit/3090/",
      "found_count": 4,
      "precision_ratio": 0.4,
      "tables_parsed": 10,
      "table_rows_parsed": 53
    },
    {
      "index": 2,
      "source_url": "https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/",
      "found_count": 5,
      "precision_ratio": 0.5,
      "tables_parsed": 13,
      "table_rows_parsed": 87
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
- Latency: 4258 ms
- Ran at (UTC): 2026-05-22T03:06:27.327Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=37896 | rendered_len=39280 | challenge=false | headings=11 | tables=4 | doc_links=2 | labels=17

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
- Latency: 4907 ms
- Ran at (UTC): 2026-05-22T03:06:27.327Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=222058 | rendered_len=267277 | challenge=false | headings=20 | tables=1 | doc_links=8 | labels=11

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
