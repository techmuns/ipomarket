# Phase 6A.1 — Chittorgarh Probe (COMPLETE; verdict: PROCEED to Phase 6A.2 planning)

> **Status**: COMPLETE. The robots-clarification `group=K` CI run (commit `cbd9015`, 2026-05-24T19:02Z) **definitively resolved the §13 HOLD**: `robots_posture.classification = "allowed-prior-flag-was-over-match"`. Chittorgarh's robots.txt **allows** `/ipo/<slug>/<id>/` detail pages for `User-agent: *`; the §13 flag was a false positive from the old loose matcher hitting the unrelated `Disallow: /ipo/ipo_discussions.asp` (discussion-forum) rule. With precision GREEN (full-10 **0.833**, narrow-5 **0.933**), reachability GREEN (static 200 ×3, no anti-bot), zero OnEMI conflict, and BRLM honestly static-unavailable, **all gates pass. Verdict: PROCEED to Phase 6A.2 planning.** See §15.
>
> **Phase 6A.2 is NOT started here.** PROCEED authorizes *drafting a Phase 6A.2 planning doc* — which itself needs separate operator approval before any ingestion implementation.
>
> **Date**: 2026-05-24 (scaffold → pre-retune CI → retune → post-retune CI HOLD → robots clarification → PROCEED, all 2026-05-24)
>
> **Predecessor chain**: Gate 1 `45be7bb` → scaffold `17169de` → pre-retune CI `7cbb13b` → retune `0568132` → post-retune CI `a8ca150`/`8f193ce` → robots-clarification `2bfd0d9` → authoritative robots CI `cbd9015`.

---

## 1. CI run summary

| Probe | Status | Outcome |
|---|---|---|
| **P-25b** | **GREEN** | All 3 detail pages reached via static GET, HTTP 200, no anti-bot challenge. OnEMI 343 KB · Bagmane 309 KB · M R Maniveni 280 KB. |
| **P-26b** | **RED (on gate)** | 3 IPOs extracted. full-10 avg = **0.567**, narrow-5 avg = **0.40**. Below the GREEN gate (full≥0.80 OR narrow≥0.90) and the YELLOW gate (full≥0.60 OR narrow≥0.80). The probe's auto-message defaulted to "HOLD"; the human verdict below is **RETUNE** (see §6 root-cause). |

The 8-file CI commit-back touched **only `phase-0/`**. No production snapshot, type, UI, ingest, PDF-pipeline, or workflow file changed (verified §8).

---

## 2. Did P-25b reach Chittorgarh from GitHub Actions?

**Yes — GREEN.** All 3 detail pages returned static HTTP 200 with no Cloudflare / Datadome / captcha challenge:

```json
"details": [
  { "index": 1, "url": ".../onemi-technology-ipo/2576/", "mode": "static", "status": 200, "bytes": 343417, "challenge_detected": false },
  { "index": 2, "url": ".../bagmane-reit/3090/",        "mode": "static", "status": 200, "bytes": 309225, "challenge_detected": false },
  { "index": 3, "url": ".../m-r-maniveni-ipo/2627/",     "mode": "static", "status": 200, "bytes": 280440, "challenge_detected": false }
]
```

GitHub Actions egress reaches Chittorgarh cleanly via plain static GET (no Playwright fallback needed). This confirms §10.2 acceptance-gate items 2 + 7 (CI-reachable, no anti-bot).

---

## 3. Third-IPO auto-selection — which, and why

```json
"third_ipo_selection": {
  "slug": "m-r-maniveni-ipo",
  "url": "https://www.chittorgarh.com/ipo/m-r-maniveni-ipo/2627/",
  "status": "current",
  "reason": "current-open: list \"sme\" row date range \"22 - 26 May\" covers today",
  "date_text": "22 - 26 May",
  "source_list": "sme"
}
```

The §5.1 selection rule fired cleanly: it read the cached `chittorgarh-sme-rendered.html`, parsed the "22 - 26 May" date range, found it covers the CI run date (well, the cached list's date semantics — the probe used today's UTC date at run time), and selected **M R Maniveni Foods** (SME) as a `current`-open IPO. No operator input was required, no fallback was needed.

---

## 4. Per-IPO extraction outcome

| Field | OnEMI | Bagmane REIT | M R Maniveni |
|---|---|---|---|
| `company_name` | HIGH | HIGH | HIGH |
| `issue_size_cr` | HIGH | HIGH | HIGH |
| `price_band` | HIGH | HIGH | HIGH |
| `lot_size` | HIGH | — missing | HIGH |
| `open_date` | — missing | — missing | — missing |
| `close_date` | — missing | — missing | — missing |
| `listing_date` | — missing | — missing | HIGH |
| `registrar` | MEDIUM | MEDIUM | MEDIUM |
| `brlms` | — missing | — missing | — missing |
| `official_pdf_links` | HIGH | HIGH | low (off-allowlist only) |
| **full-10** | **0.6** | **0.5** | **0.6** |
| **narrow-5** | **0.4** | **0.2** | **0.6** |

Extracted values (HIGH/MEDIUM):

| IPO | issue_size | price_band | lot_size | registrar |
|---|---|---|---|---|
| OnEMI | `5,41,47,390 shares (agg. up to ₹ 926 Cr)` | `₹162 to ₹171` | `87 Shares` | `Kfin Technologies Ltd` |
| Bagmane | `34,05,00,000 shares (agg. up to ₹ 3,405 Cr)` | `₹95.00 to ₹100.00` | — | `Kfin Technologies Ltd` |
| M R Maniveni | `52,00,000 shares (agg. up to ₹ 27 Cr)` | `₹51 to ₹52` | `2,000 Shares` | `Bigshare Services Pvt.Ltd. +91-22-… <` (needs trailing-contact trim) |

**Reliable fields (HIGH/MEDIUM on all or most IPOs)**: `company_name`, `issue_size_cr`, `price_band` (HIGH × 3); `registrar` (MEDIUM × 3, the Chittorgarh-specific `class="registrar-name"` fallback worked); `lot_size` (HIGH × 2/3 — Bagmane is a REIT, no retail lot).

**Weak fields**: `open_date` / `close_date` (0/3), `listing_date` (1/3), `brlms` (0/3).

---

## 5. Cross-validation vs repo truth (OnEMI)

OnEMI is the only probed IPO present in the repo's snapshots, so it's the only conflict-check target. Result: **0 conflicts; 1 positive cross-validation; the rest pure gap-fill.**

| Field | Repo truth | Chittorgarh | Verdict |
|---|---|---|---|
| RHP document URL | `bseindia.com/corporates/download/378749/IPO%20Open/6RedHerring…pdf` (documents.docs[0].url) | `official_pdf_links` on-allowlist = **the exact same BSE URL** | **MATCH** — strong cross-validation |
| `price_band` | `null` (master) | `₹162 to ₹171` | gap-fill (no conflict) |
| `issue_size_cr` | `null` (master) | `₹926 Cr` | gap-fill (no conflict) |
| `lot_size` | `null` (master) | `87 Shares` | gap-fill (no conflict) |
| `registrar` | `null` (documents) | `Kfin Technologies Ltd` | gap-fill (no conflict) |

Bagmane REIT + M R Maniveni are not tracked in the repo's `ipo-master.json`, so there's no repo truth to conflict with — they're pure characterization samples.

**Implication for fast-fill**: even at current precision, Chittorgarh would safely gap-fill 3 currently-null OnEMI master fields (`price_band`, `issue_size_cr`, `lot_size`) + 1 documents field (`registrar`) — all with zero conflict against official data, and with the RHP URL cross-validating the existing official link.

---

## 6. Root-cause of the narrow-5 miss (why RETUNE, not HOLD)

The narrow-5 set (`open_date`, `close_date`, `listing_date`, `price_band`, `lot_size`) scored 0.40 because the three date fields failed. **The dates ARE on the page** — the failure is a selector/validator mismatch, not data absence:

1. **`open_date` / `close_date`** — OnEMI's page carries `<td>…IPO Date…</td><td>30 Apr to 5 May, 2026</td>`. The `"IPO Date"` label matches, and the range-split produces `"30 Apr"` + `"5 May, 2026"`, but the date validators reject both:
   - `"30 Apr"` → no year → fails `DATE_RE_DAY_FIRST` (`\d{1,2}\s+Month\s+\d{4}`)
   - `"5 May, 2026"` → comma before year → fails the same regex
   **Fix**: relax the date validators to accept `"DD Mon"` (year inherited from the range tail) and `"DD Mon, YYYY"` (comma-tolerant).
2. **`listing_date`** — OnEMI + Bagmane use the label **`"Listed on"`** (→ `"Fri, …"`), which isn't in P-26b's patterns (`"Listing Date"` / `"Tentative Listing"`). M R Maniveni used `"Listing Date"` and matched (HIGH).
   **Fix**: add `"Listed on"` to the listing_date label patterns.
3. **`brlms`** — Chittorgarh's lead-manager section is JS-rendered and absent from the static HTML. **Not trivially fixable** via static parsing (would need a Playwright render of the BRLM block, or a different source). Acceptable to leave `brlms` as a non-fast-fill field (PDF cover extraction or manual remains the path).

Minor data-cleanup also surfaced (non-blocking): `company_name` retains `" IPO"` / `" Details"` suffixes; M R Maniveni `registrar` retains trailing contact info + a stray `<`; M R Maniveni `listing_date` value `"Mon, Jun 1, 2026 T"` has a truncated `" Tentative"` tail.

**Conclusion**: access is GREEN, 4 fields are already promotable, and the narrow-5 gap is 3 precise, low-risk selector/validator fixes. This is a **RETUNE**, not a HOLD — Chittorgarh is clearly viable as a fast-fill source.

---

## 7. Precision + threshold evaluation

| Metric | Value | GREEN gate | YELLOW gate | Result |
|---|---|---|---|---|
| full-10 avg | 0.567 | ≥ 0.80 | ≥ 0.60 | below both |
| narrow-5 avg | 0.40 | ≥ 0.90 | ≥ 0.80 | below both |

Mechanically RED per §10.2 item 5. The planning doc maps "neither threshold met" → "RETUNE or HOLD". Given the §6 root-cause (fixable, not structural), the verdict is **RETUNE**.

**Projected post-retune**: fixing the 3 date issues would plausibly lift `open_date` + `close_date` to MEDIUM on all 3 (the "IPO Date" range is present on each) and `listing_date` to HIGH on OnEMI + Bagmane (the "Listed on" label is present). That would take narrow-5 from 0.40 toward ~0.80–1.00 and full-10 from 0.567 toward ~0.75–0.85 — at or above the GREEN gate. A retune pass (Phase 6A.1.1) should confirm before any 6A.2 ingestion.

---

## 8. robots / ToS / access posture

- **Access**: GREEN. Static GET, HTTP 200, no Cloudflare/Datadome/captcha on any of the 3 pages from GitHub Actions egress. Single request per page, desktop UA, 60s per-host timeout, no retry on challenge — honoring §Y.4 rule 7.
- **ToS / legal risk**: Medium (per the Phase 5C `broker-aggregator-source-plan.md` §Y.4 classification). Mitigation is unchanged: gap-fill-only, never overwrite official, source-labeled in the UI, low-frequency polling.
- **robots.txt**: P-25b does **not** currently fetch/check `chittorgarh.com/robots.txt`. **Follow-up for the retune pass**: add a one-time robots.txt fetch + a note in the status doc confirming the `/ipo/<slug>/<id>/` paths are permitted and any crawl-delay is honored. This is a documentation gap, not an access failure.

---

## 9. Do-not-touch verification (CI commit range `17169de..d7475da`)

| Path | Status |
|---|---|
| `src/data/snapshots/*` | ✅ untouched |
| `src/types/*` | ✅ untouched |
| `src/components/`, `src/pages/`, `src/lib/` | ✅ untouched |
| `scripts/ingest/` | ✅ untouched |
| `scripts/pdf/` | ✅ untouched |
| `.github/workflows/` | ✅ untouched |
| PDF binaries / `*.full.txt` dumps | ✅ none staged |

The CI commit-back touched only `phase-0/` artifacts (probe HTML, extracted JSON, summary, source-probe-results/report/status-summary). Verified via `git diff --name-only 17169de..d7475da | grep -v '^phase-0/'` → empty.

**Note (pre-existing, not introduced by 6A.1)**: the scheduled probe reporter does a full-rewrite of `source-probe-results.json` per dispatch, so the `group=K` run left only the P-25b + P-26b rows in that file. This is existing reporter behavior; the per-probe `phase-0/broker-pages/*-v2.json` + `*-extracted-retuned.json` artifacts are the authoritative Phase 6A.1 outputs and are intact.

---

## 10. Acceptance-gate items (§10.2) — final state

| # | Gate | Status |
|---|---|---|
| 1 | `P-25b` + `P-26b` exist + typecheck-clean | ✅ PASS |
| 2 | Both probes run from GH Actions | ✅ PASS (group=K) |
| 3 | Exactly 3 IPO detail pages re-fetched (OnEMI + Bagmane + auto) | ✅ PASS (all 3 static 200) |
| 4 | Per-IPO refined-selector JSON written | ✅ PASS (`chittorgarh-detail-{1,2,3}-extracted-retuned.json`) |
| 5 | Precision ≥ 0.80 full OR ≥ 0.90 narrow | ❌ NOT MET (full 0.567, narrow 0.40) → RETUNE |
| 6 | Layout-stability comparison | ⚠️ Partial — v2 HTML captured cleanly; the new probes' working selectors (issue_size/price_band/registrar) matched both the 2026-05-22 baseline and the CI snapshot. The date selectors are the documented gap (§6), not a drift. |
| 7 | Anti-bot / captcha posture | ✅ PASS (no challenge on any fetch) |
| 8 | ToS / robots.txt note | ⚠️ Partial — access posture documented; robots.txt fetch deferred to retune pass (§8) |
| 9 | `phase-6A-1-status.md` records all of the above | ✅ PASS (this doc) |
| 10 | NO production snapshot mutation | ✅ PASS |
| 11 | NO type changes | ✅ PASS |
| 12 | NO UI changes | ✅ PASS |
| 13 | NO ingestion changes | ✅ PASS |
| 14 | NO workflow changes | ✅ PASS |
| 15 | `npm run typecheck` + `npm run build` green | ✅ PASS (scaffold commit) |

**13 PASS · 2 partial (layout-stability + robots, both documented) · 1 NOT MET (precision gate → RETUNE).**

---

## 11. Final verdict: **RETUNE**

Chittorgarh is **viable** as a fast-fill source — reachable from CI with no anti-bot, and 4 fields (`issue_size_cr`, `price_band`, `lot_size`, `registrar`) already extract reliably with zero conflict against official OnEMI data (and the RHP URL cross-validates). But the narrow-5 gap-fill set — the strategic core of Phase 6A — is dragged to 0.40 by the three date fields, which fail on a **fixable** selector/validator mismatch, not data absence.

**Recommended next step (NOT started in this turn): a small Phase 6A.1.1 retune pass** that:
1. Relaxes the date validators to accept `"DD Mon"` (no year) + `"DD Mon, YYYY"` (comma) and inherits the year from the range tail when the start side omits it.
2. Adds `"Listed on"` to the `listing_date` label patterns (alongside the existing `"Listing Date"` / `"Tentative Listing"`).
3. Trims trailing contact-info from the `registrar` value + the `" Tentative"`/`" T"` tail from `listing_date` + the `" IPO"`/`" Details"` suffix from `company_name`.
4. Adds a one-time `robots.txt` fetch + posture note (§8 follow-up).
5. Re-runs `group=K` and re-measures. **If narrow-5 ≥ 0.90 OR full-10 ≥ 0.80 → PROCEED to Phase 6A.2 planning.**

Phase 6A.1.1 (the retune) is itself a separate, separately-approved implementation pass. This turn does **not** implement it.

**Phase 6A.2 (Chittorgarh fast-fill ingestion + type extensions + UI changes) does NOT begin** without (a) a successful retune lifting precision to the GREEN gate, and (b) a separate Phase 6A.2 planning doc + explicit operator approval.

*(§1–§11 above record the pre-retune CI run. §12 below records the shipped Phase 6A.1.1 retune.)*

---

## 12. Phase 6A.1.1 retune — shipped (probe-code only); local validation GREEN; awaiting CI re-run

### 12.1 What changed (only the two probe files)

| File | Change |
|---|---|
| `scripts/probes/P-26b-chittorgarh-extract-retune.ts` | (1) **Flexible date parser** `parseFlexibleDate()` — handles `5 May, 2026` (comma), `30 Apr` (no year, inherited), `Mon, Jun 1, 2026 T` (weekday prefix + truncated trailing text), US month-first, ISO; normalizes to ISO; start-of-^ anchored but tolerant of trailing junk (no `$`). (2) **Range handling** in `extractDate()` — splits `30 Apr to 5 May, 2026` / `5 to 7 May, 2026`, parses the end first to learn the year, inherits year (cross-month) **and month** (same-month bare-day start) into the start. (3) **`"Listed on"`** added to `listing_date` label patterns. (4) **`cleanRegistrarName()`** trims contact/address/email/phone/url tail (keeps `Pvt. Ltd.` suffixes). (5) **BRLM** marked `static-unavailable` with explicit reason — JS-rendered, not a parse failure, not a RED-forcer. |
| `scripts/probes/P-25b-chittorgarh-retune.ts` | **`checkRobots()`** — one-shot `robots.txt` GET (60s, no retry), parses the `User-agent: *` block for `/ipo/` Disallow + Crawl-delay, records a posture note in the summary + `ProbeResult.notes`. Posture note only; never gates status. |

No production snapshot, type, UI, ingest, PDF-pipeline, or workflow file touched (§12.4).

### 12.2 Local validation (against the real CI HTML on `main`, P-26b is disk-read)

`npm run probe -- --probe P-26b` against `phase-0/broker-pages/chittorgarh-detail-{1,2,3}-rendered-v2.html` (the 2026-05-24 CI capture):

| Metric | Pre-retune | Post-retune | GREEN gate |
|---|---|---|---|
| full-10 avg | 0.567 | **0.833** | ≥ 0.80 ✅ |
| narrow-5 avg | 0.40 | **0.933** | ≥ 0.90 ✅ |

| IPO | full | narrow | open_date | close_date | listing_date | registrar | still missing |
|---|---|---|---|---|---|---|---|
| OnEMI | 0.9 | 1.0 | `2026-04-30` (M) | `2026-05-05` (M) | `2026-05-08` (H) | `Kfin Technologies Ltd.` (M) | brlms |
| Bagmane REIT | 0.8 | 0.8 | `2026-05-05` (M) | `2026-05-07` (M) | `2026-05-14` (H) | `Kfin Technologies Ltd.` (M) | lot_size (REIT), brlms |
| M R Maniveni | 0.8 | 1.0 | `2026-05-22` (M) | `2026-05-26` (M) | `2026-06-01` (H) | `Bigshare Services Pvt.Ltd.` (M) | brlms |

The 4 retune targets all landed:
- **Dates**: open/close now parse via range-split + ISO + year/month inheritance (cross-month `30 Apr to 5 May, 2026` and same-month `5 to 7 May, 2026` both work).
- **`Listed on`**: listing_date now HIGH on all 3 (was 1/3).
- **Registrar cleanup**: `"Bigshare Services Pvt.Ltd. +91-22-… <"` → `"Bigshare Services Pvt.Ltd."`.
- **BRLM**: the only remaining miss across all 3 — correctly recorded as `static-unavailable` (JS-rendered), not a parse failure. brlms is excluded from narrow-5, so it doesn't block the gap-fill gate; it only caps full-10 at 0.9 max.

### 12.3 Confidence + zero-conflict reminder

All promoted date/registrar fields are MEDIUM (range-split / class-fallback) except `listing_date` which is HIGH (direct label). No LOW value is promoted. For OnEMI (the only repo-tracked IPO), every Chittorgarh value remains pure gap-fill against currently-null repo fields — **still zero conflict** vs official data; the RHP URL still cross-validates.

### 12.4 Do-not-touch verification (this retune)

```
git status --short  →  only:
  M scripts/probes/P-25b-chittorgarh-retune.ts
  M scripts/probes/P-26b-chittorgarh-extract-retune.ts
  M phase-6A-1-status.md
```
- `src/data/snapshots/*` untouched · `src/types/*` untouched · UI untouched · `scripts/ingest/*` untouched · `scripts/pdf/*` untouched · `.github/workflows/*` untouched.
- The sandbox P-26b validation runs did a full-rewrite of `phase-0/source-probe-*` + regenerated the `*-v2` artifacts; those were **reverted** (`git checkout -- phase-0/`) so CI regenerates them authoritatively on the re-dispatch.
- `npm run typecheck` + `npm run build` green. No PDF binaries / full-text dumps.

### 12.5 robots / ToS posture

`P-25b` now fetches `https://www.chittorgarh.com/robots.txt` once per run and records whether `/ipo/` is Disallow'd for `User-agent: *` + any Crawl-delay, into the summary + notes. This closes the §8 follow-up. (The actual posture string will appear in the CI re-run's `chittorgarh-fields-v2.json.robots_posture` + the `P-25b` notes — the sandbox can't reach Chittorgarh to populate it locally.)

### 12.6 Verdict + next step

The retune **locally clears the GREEN gate** (full 0.833 ≥ 0.80, narrow 0.933 ≥ 0.90) against the real CI HTML. But per the operator's binding instruction, **PROCEED to Phase 6A.2 is NOT declared from a local run.**

**Next step (operator action)**: re-run the existing `phase-0-probes` workflow with `group=K`. The CI re-run will:
- Re-fetch the 3 IPOs (the auto-selected third IPO may differ if Chittorgarh's lists changed since 2026-05-24).
- Produce authoritative P-25b (incl. robots posture) + P-26b precision numbers.
- Commit the refreshed `phase-0/broker-pages/*-v2` artifacts back to `main`.

After that CI run, I will pull `main`, inspect the fresh numbers, and only then state the final verdict:
- **PROCEED to Phase 6A.2 planning** if CI confirms full-10 ≥ 0.80 OR narrow-5 ≥ 0.90, OR
- **RETUNE again / HOLD** if fresh HTML regresses the metrics.

**Phase 6A.2 (Chittorgarh fast-fill ingestion + type extensions + UI changes) does NOT begin** without (a) CI-confirmed GREEN, and (b) a separate Phase 6A.2 planning doc + explicit operator approval.

*(§12 above records the retune as shipped + locally validated. §13 below records the authoritative post-retune CI run and the final verdict.)*

---

## 13. Authoritative post-retune CI result (`group=K`, commit `a8ca150`) + final verdict: HOLD

### 13.1 P-25b — reachability + anti-bot + robots posture

| Check | Result |
|---|---|
| Reachability | **GREEN.** All 3 detail pages static HTTP 200 from GitHub Actions (OnEMI 343 KB, Bagmane 309 KB, M R Maniveni 280 KB). No Playwright fallback needed. |
| Anti-bot / captcha | **None.** `challenge_detected: false` on every fetch. |
| Third-IPO auto-selection | `m-r-maniveni-ipo` (SME), `status: current`, reason: list "sme" row date range "22 - 26 May" covers today. §5.1 rule fired cleanly, no fallback. |
| **robots.txt posture** | **`ipo_path_disallowed_for_star: true`** — `"robots.txt: /ipo/ appears Disallow'd for user-agent * — REVIEW before any production polling"`. robots.txt fetched cleanly (status 200); no Crawl-delay directive parsed. |

### 13.2 P-26b — precision (authoritative; matches local validation exactly)

| Metric | Value | GREEN gate | Result |
|---|---|---|---|
| full-10 avg | **0.833** | ≥ 0.80 | ✅ met |
| narrow-5 avg | **0.933** | ≥ 0.90 | ✅ met |

| IPO | full | narrow | HIGH | MEDIUM | missing |
|---|---|---|---|---|---|
| OnEMI | 0.9 | 1.0 | company_name, issue_size_cr, price_band, lot_size, listing_date, official_pdf_links | open_date, close_date, registrar | brlms |
| Bagmane REIT | 0.8 | 0.8 | company_name, issue_size_cr, price_band, listing_date, official_pdf_links | open_date, close_date, registrar | lot_size (REIT), brlms |
| M R Maniveni | 0.8 | 1.0 | company_name, issue_size_cr, price_band, lot_size, listing_date | open_date, close_date, registrar | brlms |

OnEMI extracted values: open `2026-04-30` (M), close `2026-05-05` (M), listing `2026-05-08` (H), registrar `Kfin Technologies Ltd.` (M), price `₹162 to ₹171` (H), issue `₹926 Cr` (H), lot `87 Shares` (H). All ISO-normalized; registrar contact-tail trimmed; "Listed on" label resolved listing_date. The retune fully closed the date/listing/registrar gap.

### 13.3 OnEMI conflicts vs repo truth

**Zero conflicts.** OnEMI's repo master fields (`price_band`, `issue_size_cr`, `lot_size`, `open_date`, …) are all `null`; repo documents `registrar` is `null` — so every Chittorgarh value is pure gap-fill. Chittorgarh's `official_pdf_links` on-allowlist = `bseindia.com/corporates/download/378749/IPO%20Open/6RedHerring…pdf` = **the exact repo `documents.docs[0].url`** → positive cross-validation, no disagreement.

### 13.4 BRLM — static-unavailable, not faked

`brlms` is the only missing field on all 3 IPOs. Recorded as `method: "static-unavailable"`, `value: null`, with the explicit reason that Chittorgarh's lead-manager block is JS-rendered and absent from static HTML. **No BRLM value was fabricated**, and no JS/stealth render was used to force it (out of §Y.4 scope). brlms is excluded from narrow-5, so it doesn't block the gap-fill gate — it only caps full-10.

### 13.5 CI scope — clean

Commit range `0568132..a8ca150` touched **only `phase-0/`** (8 broker-page artifacts + 3 source-probe files). Verified: no `src/`, no `scripts/ingest/`, no `scripts/pdf/`, no `.github/workflows/`, no schema, no PDF binaries, no `*.full.txt` dumps.

### 13.6 The robots.txt finding — why it forces HOLD (and the parser caveat)

**On the precision axis alone, this is a PROCEED** (full 0.833 / narrow 0.933, CI-confirmed, stable). **But Phase 6A.2's entire purpose is to POLL Chittorgarh `/ipo/<slug>/<id>/` pages on a schedule in production.** If `robots.txt` disallows `/ipo/` for generic crawlers, that production polling would violate the site's stated crawler policy — exactly the "access risk too high" HOLD trigger, and inconsistent with the master-plan ToS discipline (and Phase 5C §Y.4 rule 7: "no anti-bot circumvention", "honour robots/ToS"). Extraction accuracy does not excuse crawling a disallowed path.

**Parser caveat (disclosed, not hidden)**: P-25b's `checkRobots()` matcher (`scripts/probes/P-25b-chittorgarh-retune.ts:313`) is:
```ts
(p) => p !== '' && ('/ipo/'.startsWith(p) || p === '/' || p.startsWith('/ipo'))
```
The third clause `p.startsWith('/ipo')` is a **loose over-matcher**: a robots rule like `Disallow: /ipo_dashboard.asp` or `Disallow: /ipostatus` (legacy/dynamic endpoints) would set the flag `true` even though it does NOT actually cover the `/ipo/<slug>/<id>/` detail pages (correct robots semantics is *URL-path*-startsWith-*rule*, not *rule*-startsWith-`/ipo`). The probe did **not** record which Disallow line matched, so from the stored artifact alone I **cannot** definitively classify this as:
- **(A) genuine** — a rule like `Disallow: /ipo`, `Disallow: /ipo/`, or `Disallow: /` that truly covers the detail pages, vs
- **(B) over-match** — a `/ipo…`-prefixed sub-path rule that my matcher wrongly treated as covering `/ipo/`.

Either way, an **unresolved** robots-disallow signal on the exact production-poll path is sufficient to HOLD. We do not proceed to ingestion on an unverified ToS posture.

### 13.7 Final verdict — **HOLD** (Phase 6A.2 blocked pending robots clarification)

| Axis | State |
|---|---|
| Reachability (CI) | GREEN — no anti-bot, static 200 ×3 |
| Extraction precision | GREEN — full 0.833, narrow 0.933 (PROCEED-ready; **no further selector retune needed**) |
| Field provenance / conflicts | Clean — zero OnEMI conflict, RHP URL cross-validates, BRLM honestly static-unavailable |
| **Access / ToS (robots.txt)** | **RED-flag / unresolved** — `/ipo/` Disallow for `*` flagged; possibly genuine, possibly a parser over-match; **must be definitively verified** |
| **Overall** | **HOLD** — the ToS/access gate overrides the precision PROCEED |

### 13.8 Recommended next step (separate, separately-approved; NOT done in this turn)

A tiny **robots-clarification follow-up** to definitively classify (A) vs (B):
1. In `P-25b checkRobots()`, replace the loose `p.startsWith('/ipo')` clause with correct robots prefix-matching against a representative detail path (`'/ipo/onemi-technology-ipo/2576/'.startsWith(p)`), and **record the exact matching Disallow line(s)** + the full `User-agent: *` block (bounded) into `chittorgarh-fields-v2.json` so the posture is auditable, not just a boolean.
2. Re-run `group=K`. Inspect the raw rule.
   - If `/ipo/<slug>/<id>/` detail pages are **allowed** (the flag was an over-match) → flip to **PROCEED to Phase 6A.2 planning** (precision is already GREEN).
   - If genuinely **disallowed** → Chittorgarh production ingestion is **off the table**; Chittorgarh stays reference-only/manual (Phase 5C closure stands), and the fast-fill strategy falls back to official sources + manual for the gap fields.

**Phase 6A.2 does NOT begin** under any reading until (a) the robots posture is definitively cleared AND (b) a separate Phase 6A.2 planning doc is approved. This turn implements nothing — it records the authoritative CI result and the HOLD verdict only.

*(§13 records the authoritative post-retune CI + the HOLD verdict. §14 below records the Phase 6A.1.2 robots-clarification pass — the matcher fix is shipped; the verdict stays HOLD pending the CI re-run that will classify the real robots.txt.)*

---

## 14. Phase 6A.1.2 — robots-clarification pass (matcher fixed; verdict stays HOLD pending CI)

### 14.1 What changed (P-25b only)

`scripts/probes/P-25b-chittorgarh-retune.ts` — `checkRobots()` rewritten to use **correct robots prefix-matching semantics** (the de-facto Google spec) instead of the loose `p.startsWith('/ipo')` test that produced the §13 ambiguity:

- **`robotsPathMatches(pattern, urlPath)`** — a rule matches when the URL path starts with the rule path; supports `*` (any-sequence) and trailing `$` (end-anchor).
- **`parseRobots(body)`** — groups directives by `User-agent`, collecting both Allow and Disallow rules + Crawl-delay; isolates the `*` group (named-bot blocks are correctly ignored for a generic UA).
- **`evaluatePath(group, urlPath)`** — longest-match wins; an Allow ties-break over an equally-specific Disallow (least-restrictive).
- **Tested against the 3 real detail paths** (`/ipo/onemi-technology-ipo/2576/`, `/ipo/bagmane-reit/3090/`, `/ipo/m-r-maniveni-ipo/2627/`).
- **Records the exact matching directive line** per path (user-agent block, directive type, directive path, raw line) + the `*` group's full Disallow list (bounded to 50) into `chittorgarh-fields-v2.json.robots_posture`.
- **Reproduces the old loose flag** alongside the correct result, so the artifact states definitively whether the §13 flag was a genuine disallow or an over-match.
- **`classification`** field, one of:
  - `genuine-ipo-detail-disallow` — a Disallow truly covers `/ipo/<slug>/<id>/`
  - `allowed-prior-flag-was-over-match` — correct matcher = allowed, but the old loose flag fired (confirms §13 was a false positive)
  - `allowed-no-applicable-disallow` — allowed, no `/ipo`-ish rule at all
  - `unknown` — robots.txt not fetched (e.g. sandbox 403)

`ProbeResult.notes` now carries `robots_classification` + `robots_ipo_disallowed` + the descriptive note. **No change to reachability or extraction logic. P-26b untouched.**

### 14.2 Local validation

- `npm run typecheck` + `npm run build` — green.
- **Matcher unit-test (10 scenarios)** — the algorithm was copied to a throwaway harness and asserted against synthetic robots.txt inputs. **10/10 passed**, including the cases that decide the §13 question:

| Scenario | Correct matcher | Old loose matcher would say |
|---|---|---|
| `Disallow: /ipo_dashboard.asp` | **allowed** ✅ | disallowed (over-match) |
| `Disallow: /ipostatus` | **allowed** ✅ | disallowed (over-match) |
| `Disallow: /ipo/` | disallowed ✅ | disallowed |
| `Disallow: /ipo` | disallowed ✅ | disallowed |
| `Disallow: /` (blanket) | disallowed ✅ | disallowed |
| `Disallow: /ipo/` + `Allow: /ipo/onemi…/` | **allowed** (tie-break) ✅ | disallowed |
| `Disallow: /*?` (wildcard, no `?` in path) | allowed ✅ | n/a |
| named-bot block, `*` clean | allowed ✅ | n/a |

  The two over-match rows confirm the fix: a `/ipo_dashboard.asp`-style rule no longer falsely flags the detail pages.
- **Sandbox P-25b run** — sandbox 403's Chittorgarh (host-allowlist), so robots.txt can't be fetched here; `checkRobots()` degrades gracefully to `fetched:false, status:403, classification:'unknown'` with a clear note. No crash; valid `ProbeResult` emitted. The authoritative classification can only come from CI.

### 14.3 Do-not-touch verification

```
git status --short → only:
  M scripts/probes/P-25b-chittorgarh-retune.ts
  M phase-6A-1-status.md
```
`src/data/snapshots/*` untouched · `src/types/*` untouched · UI untouched · `scripts/ingest/*` untouched · `scripts/pdf/*` untouched · `.github/workflows/*` untouched · `P-26b` untouched · no PDF binaries / full-text dumps. The sandbox P-25b run full-rewrote `phase-0/source-probe-*`; that was reverted (`git checkout -- phase-0/`) so CI regenerates authoritatively.

### 14.4 Verdict — stays **HOLD** pending the CI re-run

The matcher is now correct, but the **authoritative classification requires Chittorgarh's real robots.txt**, which only CI can fetch. The verdict therefore stays **HOLD** until the `group=K` re-run produces `chittorgarh-fields-v2.json.robots_posture.classification`.

**Operator action**: re-run the existing `phase-0-probes` workflow with `group=K`. Then I pull `main` and read the classification:

| CI `classification` | Final verdict |
|---|---|
| `allowed-prior-flag-was-over-match` OR `allowed-no-applicable-disallow` | **PROCEED to Phase 6A.2 planning** — robots permits the `/ipo/<slug>/<id>/` detail pages; the §13 flag was an over-match; precision already GREEN (full 0.833 / narrow 0.933). Phase 6A.2 still needs its own planning doc + approval. |
| `genuine-ipo-detail-disallow` | **Keep HOLD** — Chittorgarh genuinely disallows the detail pages for `*`. Chittorgarh stays **reference/manual-only** (Phase 5C closure stands); the fast-fill strategy falls back to official sources + manual for the gap fields. No scheduled Chittorgarh polling. |

This turn ships only the matcher fix + this status update. **Phase 6A.2 is not started**, and won't begin until (a) the CI classification clears the robots question favorably AND (b) a separate Phase 6A.2 planning doc is approved.

*(§14 records the robots-matcher fix. §15 below records the authoritative robots CI classification and the final PROCEED verdict.)*

---

## 15. Authoritative robots classification (`group=K`, commit `cbd9015`) + final verdict: PROCEED

### 15.1 robots.txt — definitively ALLOWED (the §13 HOLD was a false positive)

```json
"robots_posture": {
  "fetched": true,
  "status": 200,
  "ipo_path_disallowed_for_star": false,
  "crawl_delay_seconds": null,
  "star_group_disallow_rules": ["/ipo/ipo_discussions.asp"],
  "per_path": [
    { "tested_path": "/ipo/onemi-technology-ipo/2576/", "decision": "allowed", "matched_rule": null },
    { "tested_path": "/ipo/bagmane-reit/3090/",        "decision": "allowed", "matched_rule": null },
    { "tested_path": "/ipo/m-r-maniveni-ipo/2627/",     "decision": "allowed", "matched_rule": null }
  ],
  "prior_loose_flag": true,
  "classification": "allowed-prior-flag-was-over-match"
}
```

- **The only `/ipo`-area Disallow for `User-agent: *` is `Disallow: /ipo/ipo_discussions.asp`** — the discussion-forum endpoint, NOT the IPO detail pages. We never scrape that path.
- **Correct matcher**: none of the 3 real detail paths start with `/ipo/ipo_discussions.asp`, so all three resolve to `decision: "allowed"`, `matched_rule: null` (no applicable rule).
- **`prior_loose_flag: true`** confirms the §13 flag fired from the old `p.startsWith('/ipo')` test matching `/ipo/ipo_discussions.asp`; **`classification: "allowed-prior-flag-was-over-match"`** confirms it was a false positive.
- No `Crawl-delay` directive for `*`.

The §13 robots/ToS HOLD is **lifted**: Chittorgarh's stated crawler policy permits the `/ipo/<slug>/<id>/` detail pages for generic user-agents.

### 15.2 All other gates (re-confirmed this run)

| Gate | Result |
|---|---|
| P-25b reachability | **GREEN** — OnEMI / Bagmane / M R Maniveni all static HTTP 200, `challenge_detected: false`. |
| Anti-bot / captcha | **None.** |
| robots.txt | **ALLOWED** for `/ipo/<slug>/<id/>` (§15.1). |
| P-26b full-10 | **0.833** (≥ 0.80) — stable across all 3 CI runs. |
| P-26b narrow-5 | **0.933** (≥ 0.90) — stable. |
| P-25b / P-26b status | both **GREEN** in `source-probe-results.json`. |
| OnEMI conflicts | **zero** — repo master fields all `null` ⇒ pure gap-fill; RHP URL cross-validates. |
| BRLM | `static-unavailable` ×3 — **not faked** (JS-rendered; excluded from narrow-5). |
| CI changed-file scope | `2bfd0d9..cbd9015` touched **only `phase-0/`**; no PDFs, no full-text dumps, no src/ingest/pdf/workflow/schema. |

### 15.3 Final verdict — **PROCEED to Phase 6A.2 planning**

Per the operator's verdict rules, `classification = allowed-prior-flag-was-over-match` ⇒ **PROCEED**. Every gate is now satisfied:

- ✅ Reachable from CI, no anti-bot
- ✅ robots.txt permits the detail pages (HOLD lifted)
- ✅ Precision GREEN (full 0.833 / narrow 0.933), stable across 3 runs
- ✅ Zero conflict against official OnEMI data; RHP URL cross-validates
- ✅ BRLM honestly static-unavailable; no fake values
- ✅ Auto third-IPO selection works (`m-r-maniveni-ipo`, current-open SME)

### 15.4 What PROCEED authorizes — and what it does NOT

**Authorizes**: drafting a **Phase 6A.2 planning doc** (the Chittorgarh fast-fill ingestion design — type extensions `SourceTag.Chittorgarh` + `DataState.aggregator`/`broker_reference`, `SourceMix.totals.chittorgarh`, UI source-pill/state-badge tones, the gap-fill merge into `ipo-master`/`ipo-documents`/`ipo-subscriptions`/`ipo-listing-performance`, conflict audit, per-field provenance).

**Does NOT authorize**: any Phase 6A.2 implementation. Per the master-plan slice-gate model, Phase 6A.2 requires its own planning doc **and** a separate explicit operator approval before code lands.

**Constraints the Phase 6A.2 plan must carry forward** (from this probe's findings + the standing guardrails):
1. **Gap-fill only, never overwrite official** — Chittorgarh values fill `null` fields; official `live` (NSE/BSE/SEBI/RHP) is never replaced.
2. **Per-field provenance + source-labeling** — every Chittorgarh value carries `source: 'Chittorgarh'`, `state: 'aggregator'`, `confidence`, `url`, `fetched_at_utc`; visibly labeled in the UI.
3. **Promote only HIGH/MEDIUM** — the probe's confidence tiers gate promotion; LOW stays null.
4. **BRLM stays PDF-cover / manual** — Chittorgarh's BRLM block is JS-rendered (static-unavailable); do NOT attempt JS/stealth recovery.
5. **Honor robots.txt** — the `/ipo/ipo_discussions.asp` forum path stays off-limits; only `/ipo/<slug>/<id>/` detail pages are fetched; no `Crawl-delay` observed but keep low-frequency polling (single GET per page, no aggressive crawl).
6. **No anti-bot circumvention, no broker scraping in this lane** (Zerodha/Upstox remain Phase 6A.4+ reference-only).

### 15.5 Recommended next step

Draft `phase-6A-2-chittorgarh-fastfill-plan.md` (Gate-1 planning doc) for operator review. No ingestion code, no snapshot mutation, no type/UI change until that plan is approved.

*End of Phase 6A.1 — COMPLETE. robots clarified (detail pages ALLOWED; §13 flag was an over-match), precision GREEN, all gates pass. Verdict: PROCEED to Phase 6A.2 planning (separate planning doc + approval still required before any 6A.2 implementation).*
