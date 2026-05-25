# Phase 0 — Source Probe Report

Generated: 2026-05-25T03:27:14.713Z

## Status Summary

- GREEN: 2
- YELLOW: 0
- RED: 0

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-25b | Chittorgarh — detail-page accessibility retune (Phase 6A.1) | GREEN | 200 | HTML | 4087 | All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision. |
| P-26b | Chittorgarh — detail field extraction retune (Phase 6A.1) | GREEN | - | JSON | 28 | Precision met (full=0.82 narrow=0.87). Ready for Phase 6A.2 planning approval. |

## Per-probe detail

### P-25b — Chittorgarh — detail-page accessibility retune (Phase 6A.1) — GREEN

- URL: `https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/ + https://www.chittorgarh.com/ipo/bagmane-reit/3090/ + auto-selected third IPO`
- Method: GET static → Playwright fallback (no retry within pass); 3 IPOs probed per pass (2 fixed + 1 auto)
- Headers/cookies required: User-Agent (desktop Chrome), Referer
- Status code: 200
- Response type: HTML
- Fields found: detail-1 reachable (static), detail-2 reachable (static), detail-3 reachable (static), third IPO selection: current (yaashvi-jewellers-ipo)
- Fields missing: (none)
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: Daily (manual editor maintained)
- Recommended action: All 3 detail pages captured cleanly. Run P-26b to evaluate per-field extraction precision.
- Fallback: P-26b (field extraction off captured HTML)
- Latency: 4087 ms
- Ran at (UTC): 2026-05-25T03:27:10.550Z

> third_ipo_status=current | third_ipo_slug=yaashvi-jewellers-ipo | third_ipo_reason="current-open: list "sme" row date range "25 - 27 May" covers today" | detail-1: static status=200 bytes=343417 | detail-2: static status=200 bytes=309225 | detail-3: static status=200 bytes=272099 | challenges_detected=false | robots_classification=allowed-prior-flag-was-over-match | robots_ipo_disallowed=false | robots: robots.txt: detail paths ALLOWED for *; the Phase 6A.1.1 flag was an OVER-MATCH (loose p.startsWith('/ipo') hit an unrelated rule). /ipo/onemi-technology-ipo/2576/→allowed (no matching rule); /ipo/bagmane-reit/3090/→allowed (no matching rule); /ipo/m-r-maniveni-ipo/2627/→allowed (no matching rule)

```
{
  "third_ipo": {
    "slug": "yaashvi-jewellers-ipo",
    "url": "https://www.chittorgarh.com/ipo/yaashvi-jewellers-ipo/2820/",
    "status": "current",
    "reason": "current-open: list \"sme\" row date range \"25 - 27 May\" covers today",
    "date_text": "25 - 27 May",
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
      "title": "Yaashvi Jewellers IPO Date, Price, GMP, Review, Details"
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
- Fields found: d1.company_name[high], d1.issue_size_cr[high], d1.price_band[high], d1.lot_size[high], d1.face_value[high], d1.open_date[medium], d1.close_date[medium], d1.listing_date[high], d1.registrar[medium], d1.official_pdf_links[high], d2.company_name[high], d2.issue_size_cr[high], d2.price_band[high], d2.open_date[medium], d2.close_date[medium], d2.listing_date[high], d2.registrar[medium], d2.official_pdf_links[high], d3.company_name[high], d3.issue_size_cr[high], d3.lot_size[high], d3.face_value[high], d3.open_date[medium], d3.close_date[medium], d3.listing_date[high], d3.registrar[medium], d3.official_pdf_links[high]
- Fields missing: d1.brlms[missing], d2.lot_size[missing], d2.face_value[missing], d2.brlms[missing], d3.price_band[missing], d3.brlms[missing]
- Parsing difficulty: Medium
- Anti-bot risk: Low
- Legal/ToS risk: Medium
- Update frequency: N/A — operates on disk
- Recommended action: Precision met (full=0.82 narrow=0.87). Ready for Phase 6A.2 planning approval.
- Fallback: P-25b (re-run to refresh HTML)
- Latency: 28 ms
- Ran at (UTC): 2026-05-25T03:27:10.550Z

> details_extracted=3 | avg_full=0.818 | avg_narrow=0.867 | pdf_on_allowlist=3 | pdf_off_allowlist=4 | third_ipo=yaashvi-jewellers-ipo(current) | d1:onemi-technology-ipo full=0.91 narrow=1.00 | d2:bagmane-reit full=0.73 narrow=0.80 | d3:yaashvi-jewellers-ipo full=0.82 narrow=0.80

```
{
  "avg_full": 0.818,
  "avg_narrow": 0.867,
  "third_ipo_selection": {
    "slug": "yaashvi-jewellers-ipo",
    "url": "https://www.chittorgarh.com/ipo/yaashvi-jewellers-ipo/2820/",
    "status": "current",
    "reason": "current-open: list \"sme\" row date range \"25 - 27 May\" covers today",
    "date_text": "25 - 27 May",
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
      "slug": "yaashvi-jewellers-ipo",
      "found_full": 9,
      "found_narrow": 4,
      "high": [
        "company_name",
        "issue_size_cr",
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
    }
  ]
}
```
