# Phase 0 — Source Probe Report

Generated: 2026-05-20T18:27:20.891Z

## Status Summary

- GREEN: 0
- YELLOW: 0
- RED: 2

| Probe | Source | Status | Code | Type | Latency (ms) | Recommendation |
|---|---|---|---|---|---|---|
| P-23a | Broker IPO page — Zerodha (reference only) | RED | 200 | ERROR | 4138 | Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference. |
| P-23b | Broker IPO page — Upstox (reference only) | RED | 200 | ERROR | 4729 | Blocked from GH Actions runner. Use screenshots/PDF exports as IA reference. |

## Per-probe detail

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
- Latency: 4138 ms
- Ran at (UTC): 2026-05-20T18:27:10.882Z

> final_url=https://zerodha.com/ipo/440359/nfp-sampoorna-foods/ | title=NFP Sampoorna Foods IPO: Check IPO date, Price range & Lot size | render_mode=server-rendered | raw_len=38058 | rendered_len=39442 | challenge=false | headings=0 | tables=0 | doc_links=0 | labels=0 | error=extractFields: page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:302:30), <anonymous>:1:21)
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
- Latency: 4729 ms
- Ran at (UTC): 2026-05-20T18:27:10.882Z

> final_url=https://upstox.com/ipo/vegorama-punjabi-angithi-limited-ipo/ | title=Vegorama Punjabi Angithi Limited IPO - Check IPO Date, Details, Price & Allotmen | render_mode=server-rendered | raw_len=218103 | rendered_len=262774 | challenge=false | headings=0 | tables=0 | doc_links=0 | labels=0 | error=extractFields: page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:302:30), <anonymous>:1:21)
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
