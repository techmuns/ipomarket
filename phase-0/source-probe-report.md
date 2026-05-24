# Phase 0 — Source Probe Report

Generated: 2026-05-24T16:43:31.082Z

## Status Summary

- GREEN: 1
- YELLOW: 0
- RED: 1

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 1186 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | RED | - | JSON | 26 | Precision below thresholds (full=0.57 narrow=0.40). HOLD Phase 6A; reconsider strategy. |

## Per-probe detail

### P-25b — Chittorgarh — detail-page accessibility retune (Phase 6A.1) — GREEN

- URL: `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/ + https://www.chittorgarh.com/ipo/bagmane-reit/3090/ + auto-selected third IPO`
- Method: GET static → Playwright fallback (no retry within pass); 3 IPOs probed per pass (2 fixed + 1 auto)
- Headers/cookies required: User-Agent (desktop Chrome), Referer
- Status code: 200
- Response type: HTML
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: current (m-r-maniveni-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 1186 ms
- Ran at (UTC): 2026-05-24T16:43:29.829Z

> third_ipo_status=current | third_ipo_slug=m-r-maniveni-ipo | third_ipo_reason="current-open: list "sme" row date range "22 - 26 May" covers today" | detail-1: static status=200 bytes=343417 | detail-2: static status=200 bytes=309225 | detail-3: static status=200 bytes=280440 | challenges_detected=false

```
{
  "third_ipo": {
    "slug": "m-r-maniveni-ipo",
    "url": "https://www.chittorgarh.com/ipo/m-r-maniveni-ipo/2627/",
    "status": "current",
    "reason": "current-open: list \"sme\" row date range \"22 - 26 May\" covers today",
    "date_text": "22 - 26 May",
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
      "title": "M R Maniveni IPO Date, Price, GMP, Review, Details"
    }
  ],
  "challenges_detected": false
}
```

### P-26b — Chittorgarh — detail field extraction retune (Phase 6A.1) — RED

- URL: `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html (on disk)`
- Method: disk read (no network) — extracts from P-25b captured HTML via table-aware parser + §10.3 patterns + Chittorgarh-specific helpers
- Headers/cookies required: (none)
- Status code: (no response)
- Response type: JSON
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.registrar[medium], d1.official_pdf_links[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.registrar[medium], d2.official_pdf_links[high], d3.company_name[high], d3.issue_size_cr[high], d3.price_band[high], d3.lot_size[high], d3.listing_date[high], d3.registrar[medium]
- Fields missing: d1.open_date[missing], d1.close_date[missing], d1.listing_date[missing], d1.brlms[missing], d2.lot_size[missing], d2.open_date[missing], d2.close_date[missing], d2.listing_date[missing], d2.brlms[missing], d3.open_date[missing], d3.close_date[missing], d3.brlms[missing], d3.official_pdf_links[low]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Precision below thresholds (full=0.57 narrow=0.40). HOLD Phase 6A; reconsider strategy.
- Fallback: P-25b (re-run to refresh HTML)
- Latency: 26 ms
- Ran at (UTC): 2026-05-24T16:43:29.829Z

> details_extracted=3 | avg_full=0.567 | avg_narrow=0.400 | pdf_on_allowlist=2 | pdf_off_allowlist=4 | third_ipo=m-r-maniveni-ipo(current) | d1:onemi-technology-ipo full=0.60 narrow=0.40 | d2:bagmane-reit full=0.50 narrow=0.20 | d3:m-r-maniveni-ipo full=0.60 narrow=0.60

```
{
  "avg_full": 0.567,
  "avg_narrow": 0.4,
  "third_ipo_selection": {
    "slug": "m-r-maniveni-ipo",
    "url": "https://www.chittorgarh.com/ipo/m-r-maniveni-ipo/2627/",
    "status": "current",
    "reason": "current-open: list \"sme\" row date range \"22 - 26 May\" covers today",
    "date_text": "22 - 26 May",
    "source_list": "sme"
  },
  "per_detail": [
    {
      "index": 1,
      "slug": "onemi-technology-ipo",
      "found_full": 6,
      "found_narrow": 2,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "lot_size",
        "official_pdf_links"
      ],
      "medium": [
        "registrar"
      ],
      "low": []
    },
    {
      "index": 2,
      "slug": "bagmane-reit",
      "found_full": 5,
      "found_narrow": 1,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "official_pdf_links"
      ],
      "medium": [
        "registrar"
      ],
      "low": []
    },
    {
      "index": 3,
      "slug": "m-r-maniveni-ipo",
      "found_full": 6,
      "found_narrow": 3,
      "high": [
        "company_name",
        "issue_size_cr",
        "price_band",
        "lot_size",
        "listing_date"
      ],
      "medium": [
        "registrar"
      ],
      "low": [
        "official_pdf_links"
      ]
    }
  ]
}
```
