# Phase 6A.1 — Chittorgarh Probe Retune (Phase 6A.1.1 retune shipped; awaiting CI re-run)

> **Status**: The Phase 6A.1.1 retune is shipped (probe-code only). Validated **locally against the real CI-captured HTML** already on `main` (the 2026-05-24 `group=K` run): full-10 **0.833** (≥ 0.80 GREEN gate) and narrow-5 **0.933** (≥ 0.90 GREEN gate). **This is a local validation, not the authoritative result — PROCEED to Phase 6A.2 is NOT declared until the operator re-runs the `group=K` workflow and the fresh CI numbers are inspected.** See §12 for the retune detail.
>
> **Prior run (pre-retune)**: the `group=K` CI run committed at `d7475da` (2026-05-24T16:43Z) returned P-25b GREEN (Chittorgarh reachable from GitHub Actions, no anti-bot) and P-26b RED-on-gate (full=0.567, narrow=0.40), root-caused to a fixable date-validator + label mismatch (§6). §1–§11 below record that prior run unchanged.
>
> **Date**: 2026-05-24 (scaffold 2026-05-22; prior-CI results + RETUNE verdict 2026-05-24; Phase 6A.1.1 retune 2026-05-24)
>
> **Predecessor**: `phase-6A-aggregator-fastfill-plan.md` (Gate 1) at `45be7bb`; scaffold at `17169de`; prior-CI status at `7cbb13b`.

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

*End of Phase 6A.1 status — Phase 6A.1.1 retune shipped, local validation GREEN, awaiting operator's `group=K` CI re-run for the authoritative verdict.*
