# Phase 5A.2 — Candidate Discovery Source Strategy (planning only)

> **Mode**: planning. No code, no implementation.
>
> **Date**: 2026-05-22
>
> **Predecessors**: `phase-5-pdf-intelligence-plan.md`, `phase-5A-status.md`, `phase-5A.1-status.md`, `phase-0/source-probe-report.md`, `phase-0/broker-pages/broker-page-benchmark-report.md`.
>
> **Trigger**: Phase 5A.1 accepted. `discover.ts` now sweeps SEBI `smid=10/11/12` and merges with `ipo-documents.json`, but **no full DRHP/RHP/Final Offer Document candidate survives the doc-type filter** (`smid=11/12` return 0 PDFs via static GET; `smid=10` carries only Abridged Prospectuses). Phase 5B remains blocked until a real full-document candidate is available.
>
> **Scope discipline**: no Phase 5B; no UI; no DB; no Workers; no cron; no GMP; no LLM; no Zerodha/Upstox production usage; `src/data/snapshots/ipo-documents.json` remains immutable.
>
> **Source policy (carried forward, non-negotiable)**:
> - **Official NSE / BSE / SEBI is the production data backbone.**
> - **Zerodha and Upstox stay reference-only** unless explicitly approved otherwise.
> - **Chittorgarh** can be evaluated as fallback / reference, but never silently treated as official.
> - If a non-official source is ever surfaced, every field carries **`source` label + `fetched_at_utc` + `confidence`**.
> - Broker / aggregator pages may be used **only to discover links to official PDFs**, not to replace official data.
> - **Manually curated official PDF URLs** are an allowed fallback if clearly labelled and source-audited.

---

## 1. What Phase 5A.1 actually proved

| Surface | Result | Implication |
|---|---|---|
| SEBI `smid=10` (Abridged Prospectus subsection) | 19 PDFs discovered via cached P-08 seed; **all** rejected as `Draft Abridged Prospectus` | Subsection is the wrong shelf — only abridged docs live here. |
| SEBI `smid=11` (Red Herring Documents filed with ROC) | HTTP 200, `ok: true`, **count: 0** | Static GET returns empty body shell; either no current filings OR JS-rendered table same as Kendo Grid on `smid=10`. Unknown without Playwright probe. |
| SEBI `smid=12` (Final Offer Documents filed with ROC) | HTTP 200, `ok: true`, **count: 0** | Same as `smid=11`. |
| `ipo-documents.json` SEBI rows | 7 total → 5 DAP-rejected, 1 RHP (`vegorama-punjabi-angithi`) fetch-failed (likely stale May 2026 commondoc), 1 InCred Abridged | Even the curated production snapshot has no live full DRHP/RHP URL to feed Phase 5B. |
| InCred cover heuristic | `anchors_matched: 5/8`, `manual_review_required: true` | Cover heuristic improvements landed; **but cover-page heuristics aren't the blocker — candidate supply is.** |

**Therefore**: Phase 5A.2's only job is to *increase candidate supply of full DRHP / RHP / Final Offer Document PDFs into the existing `discover.ts` pool*, without violating the source policy.

---

## 2. Source-by-source evaluation

For each source: what it provides, can it yield a full PDF URL, anti-bot risk, legal / ToS risk, stability, recommended role, dashboard label.

### 2.1 Official sources

#### 2.1.1 SEBI Playwright fallback for `smid=11` / `smid=12`

| Dimension | Assessment |
|---|---|
| What it can provide | Listing of Red Herring Prospectuses and Final Offer Documents filed with ROC, hosted by SEBI itself. If populated, the link table directly hands us full PDF URLs in the same `sebi.gov.in/sebi_data/commondocs/...` namespace. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes if populated.** Existing P-09 proves SEBI `commondocs` URLs download cleanly once known. |
| Legal / ToS risk | **Low.** SEBI is the regulator and the disclosure source of record. Public filings page. Same risk profile as P-08, which is already GREEN. |
| Anti-bot risk | **Low–medium.** P-08 already hit a Kendo-Grid render gap on `smid=10` and recovered via the "alt URL" pattern; the same family of grids likely applies to `smid=11/12`. Playwright + the existing P-08 helper chain handles this. |
| Stability risk | **Medium.** SEBI redesigns are rare but disruptive; URL/sid/ssid/smid scheme has held for years. |
| Recommended role | **Production primary** if it yields data; **silently OK** to drop if empty. Same trust tier as `smid=10`. |
| Dashboard label | `SEBI Filings (smid=11)` / `SEBI Filings (smid=12)` — no special UI treatment, same as today's SEBI rows. |

**Cost note**: Cheapest possible add — reuse P-08's existing Playwright fallback path (already battle-tested) and point it at the new `smid` values. The infrastructure exists; this is a configuration / wiring change.

**Risk of empty result**: Non-trivial. If the pages are genuinely empty right now (SEBI may simply have no current filings in those categories), Playwright will return 0 too. The Playwright probe must distinguish *empty page* from *JS-blocked page* so we can record the difference truthfully in `sebi-candidates.json`.

#### 2.1.2 NSE — DRHP / RHP / Offer Documents

| Dimension | Assessment |
|---|---|
| What it can provide | `nseindia.com/companies-listing/corporate-filings-offer-documents` exposes per-issue DRHP, RHP, Final Prospectus, Anchor allocation, and Basis of Allotment PDFs hosted at `nsearchives.nseindia.com/.../*.pdf`. Most authoritative single shelf for full DRHPs across NSE-listed issues. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes — the strongest single yield surface available.** Full text, hundreds of pages, hosted directly by NSE. |
| Legal / ToS risk | **Medium-low.** Corporate-filings disclosures are public by regulation. NSE's general ToS prohibits "data scraping" of *market data*; offer documents sit in a corporate-disclosures bucket whose status is murkier — but in practice the same files are downloaded thousands of times daily by retail investors. **Recommend treating as low-risk but flagging in the planning record so the user can object.** |
| Anti-bot risk | **High.** NSE is the most aggressive anti-bot site we touch. Akamai / Cloudflare with rotating challenge cookies (`bm_sv`, `nsit`, `nseappid`). Requires Playwright + pre-warm cookie session (visit homepage first, then navigate to filings page, then fetch JSON/HTML). P-15b proved this is solvable for the equity quote endpoint, so the pattern is in-house. |
| Stability risk | **Medium.** NSE redesigns front-end periodically; archive PDF URLs themselves persist once published. |
| Recommended role | **Production primary** for NSE-track issues — once the access pattern is built, this is the right backbone. |
| Dashboard label | `NSE Offer Documents` — first-class official source. |

**Cost note**: Highest-effort addition. Requires the full session-warm pattern, a probe of the offer-documents endpoint structure (POST vs GET, JSON vs HTML, payload shape), and Playwright execution in CI. Likely 1–2 days of careful engineering.

#### 2.1.3 BSE — DRHP / RHP / Offer Documents

| Dimension | Assessment |
|---|---|
| What it can provide | `bseindia.com/markets/PublicIssues/DRHP.aspx` lists DRHPs; `displayIPO.aspx` and `ListingCentre/ipo_dropdown.aspx` give per-issue offer documents. PDFs hosted at `bseindia.com/downloads1/...`. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes.** BSE hosts the same class of full-text PDFs that NSE does. |
| Legal / ToS risk | **Low.** Same regulatory-disclosure regime as NSE; BSE's ToS posture is materially looser. |
| Anti-bot risk | **Medium.** ASP.NET WebForms backend, hydration-after-load. **P-10 already probed `DRHP.aspx` via static GET and returned `RED` (no rows, no PDF links visible without JS render).** The fix is Playwright + waiting for hydration, same pattern as SEBI. Anti-bot itself is gentler than NSE — no Akamai cookie wall. |
| Stability risk | **Low–medium.** BSE pages have been stable for years; URL scheme persistent. |
| Recommended role | **Production primary** alongside NSE. Easier first target than NSE. |
| Dashboard label | `BSE Offer Documents` — first-class official source. |

**Cost note**: Medium effort. P-10's RED status tells us static GET doesn't work but doesn't tell us the JS-rendered version is hostile — it tells us we never tried. A Playwright re-probe of `DRHP.aspx` is the right first move.

#### 2.1.4 BSE SME — DRHP / RHP pages

| Dimension | Assessment |
|---|---|
| What it can provide | `bsesme.com` lists SME issues' DRHPs and RHPs (separate from mainboard BSE pages). Critical because Phase 5A.1's discovery pool is dominated by SME DAPs from `smid=10` — corresponding full SME DRHPs likely live here, not on the BSE mainboard surface. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes** for SME-track issues. |
| Legal / ToS risk | **Low** (same as BSE). |
| Anti-bot risk | **Low.** `bsesme.com` is much lighter-protected than `bseindia.com`. Mostly static-friendly. |
| Stability risk | **Low.** Stable URL structure. |
| Recommended role | **Production primary for SME issues.** Complements NSE Emerge for SME-track coverage. |
| Dashboard label | `BSE SME Offer Documents` — first-class official source. |

**Cost note**: Low-medium effort. Probably the highest yield-per-effort target given that most current `discover.ts` candidates are SME-class DAPs whose full counterparts live on BSE SME.

#### 2.1.5 Exchange circulars / new-issue pages

| Dimension | Assessment |
|---|---|
| What it can provide | NSE `nseindia.com/resources/exchange-communication-circulars` and BSE `bseindia.com/markets/MarketInfo/DispNoticesNCirculars.aspx` publish listing approvals, in-principle approvals, issue announcements. Sometimes link to the actual DRHP/RHP PDF; more often they just announce dates and ISIN. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Indirect** — generally yes for *some* circulars (listing approval often includes the prospectus), no for others. Lower yield-per-fetch than 2.1.2 or 2.1.3. |
| Legal / ToS risk | **Low.** Regulatory disclosure surface. |
| Anti-bot risk | **Medium** (NSE) / **low** (BSE). |
| Stability risk | **Low.** Long-standing endpoints. |
| Recommended role | **Supporting signal source** — primarily useful for issue *status / timing*, secondarily as a way to surface PDFs we missed via 2.1.2 / 2.1.3. **Not a primary PDF discovery target.** |
| Dashboard label | `NSE Circulars` / `BSE Circulars` — used as a timing-signal annotation, not as the document source. |

**Cost note**: Defer. Better ROI to nail 2.1.2 / 2.1.3 first.

### 2.2 Broker / reference sources

#### 2.2.1 Zerodha IPO pages

| Dimension | Assessment |
|---|---|
| What it can provide | Per-issue summary (price band, lot size, schedule, allotment status), 1-paragraph "About" copy, **"Download prospectus (PDF)" link** — proven by P-23a artifact (`phase-0/broker-pages/zerodha-text.txt`). |
| Full DRHP / RHP / Final Offer PDF URLs? | **Indirect — yes, as a discovery hint.** The "Download prospectus" link on Zerodha pages typically resolves to a *Zerodha-hosted mirror* of the SEBI/NSE/BSE PDF. Whether the URL is the official-source URL or a Zerodha CDN mirror needs per-page inspection — but if it's an official URL we can use it to seed `discover.ts`; if it's a mirror, we can't use Zerodha's hosting directly but the *filename and issue-name pairing* still helps us look up the official PDF elsewhere. |
| Legal / ToS risk | **Medium.** Zerodha's website terms have a general "no automated access" clause. P-23a was sanctioned by master plan §B/§C as a reference-only one-shot benchmark, not as a recurring scrape. **Per user directive: stays reference-only unless explicitly approved otherwise.** |
| Anti-bot risk | **None observed.** P-23a confirmed server-rendered, no Cloudflare / Datadome / challenge, accessible from GitHub Actions runner with a plain GET. |
| Stability risk | **Medium.** Zerodha redesigns periodically; URL pattern `zerodha.com/ipo/<id>/<slug>/` has held for several years. |
| Recommended role | **Reference-only** (per source policy). **Could** be used in a future phase strictly as a *URL-discovery aid* — never as a data substitute. |
| Dashboard label | If ever used: `Discovered via Zerodha (reference only)` with `source: 'zerodha'` + `fetched_at_utc` + `confidence: 'reference'` — and the actual data field must still cite an official source. |

#### 2.2.2 Upstox IPO pages

| Dimension | Assessment |
|---|---|
| What it can provide | Richer per-issue page than Zerodha — schedule, key dates, FAQ, registrar name, lot size, financials snippets. P-23b confirmed all of this present in SSR HTML. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Indirect — same as Zerodha**, with similar mirror-vs-official ambiguity. |
| Legal / ToS risk | **Medium.** Same broker-marketing-ToS concerns. Per user directive: **stays reference-only**. |
| Anti-bot risk | **None observed.** P-23b confirmed SSR-with-hydration, no challenge. |
| Stability risk | **Medium.** |
| Recommended role | **Reference-only** (per source policy). |
| Dashboard label | Same treatment as 2.2.1 if ever surfaced: `Discovered via Upstox (reference only)`. |

#### 2.2.3 Chittorgarh IPO pages

| Dimension | Assessment |
|---|---|
| What it can provide | The deepest retail-investor aggregator on Indian IPOs. Per-issue pages at `chittorgarh.com/ipo/<slug>/<id>/` carry: issue meta, schedule, DRHP link, RHP link, Anchor PDF link, allotment status link, GMP history, day-by-day subscription numbers, registrar details, lead manager details, and historical archive coverage going back years. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes — and typically pointing at the *official* SEBI / NSE / BSE PDF URL**, not a Chittorgarh mirror. This is materially better than the broker pages for our purposes: when Chittorgarh surfaces a DRHP link, the href usually resolves to `sebi.gov.in/sebi_data/...` or `nsearchives.nseindia.com/...`. **This makes Chittorgarh the highest-yield URL-discovery aid we know of.** |
| Legal / ToS risk | **Medium.** Chittorgarh is an independent publisher (not the issuer, not the regulator). Site terms exist but enforcement against light, attributed, low-frequency polling is historically nil. Still, **the user directive is firm: not silently treated as official.** |
| Anti-bot risk | **Low.** Light Cloudflare in places, no aggressive challenge. Accessible from GitHub Actions runner. |
| Stability risk | **Low.** URL slug structure has been stable for 10+ years; one of the most stable surfaces in the IPO data ecosystem. |
| Recommended role | **Fallback discovery aid** — strictly to find *links to official PDFs* we couldn't reach via SEBI / NSE / BSE direct. Never the data of record. Any PDF URL discovered via Chittorgarh must be **re-verified** against the official source (same `host` family) before being added to the candidate pool. |
| Dashboard label | If ever surfaced: `Discovered via Chittorgarh (verified against official)`. If a Chittorgarh-surfaced URL fails official re-verification, it must not be promoted. |

**Important gap**: there is **no existing probe** for Chittorgarh in `phase-0/source-probe-results.json`. A small Phase 5A.2 probe ought to characterize one or two issue pages exactly the way P-23a/b characterized Zerodha and Upstox (HTTP status, render mode, anti-bot, field inventory) before this source is used for anything.

### 2.3 Manual curated official PDF URL seed

| Dimension | Assessment |
|---|---|
| What it can provide | A hand-maintained `phase-0/curated-official-pdfs.json` with N entries shaped `{ ipo_id, doc_kind, doc_url, source_host, curated_at_utc, verified_at_utc, notes }`. Entries pre-validated by human against the official source URL. |
| Full DRHP / RHP / Final Offer PDF URLs? | **Yes by construction.** |
| Legal / ToS risk | **None.** Curating public URLs is benign. |
| Anti-bot risk | **N/A** for the curation; download attempts still subject to whatever source-host policy applies. |
| Stability risk | **Medium-high.** URLs can rot if exchange archives are reorganized. Mitigated by recording `verified_at_utc` and re-checking on each parser run. |
| Recommended role | **Bootstrap / last-resort fallback.** Unblocks Phase 5B in days, not weeks. Should never be the *only* surface, but is the fastest path to a single end-to-end full-DRHP run. |
| Dashboard label | `Curated official URL (audited)` with `curated_at_utc` + `verified_at_utc` + `source_host` (e.g. `sebi.gov.in`, `nsearchives.nseindia.com`, `bseindia.com`). Must show a "manually curated" badge in the audit UI when used. |

**Cost note**: Lowest effort of any option. Requires human attention to pick 3–5 well-known recent full DRHPs, copy URLs, sha256, and record provenance. Does NOT mutate `ipo-documents.json`; lives in a separate file consumed by `discover.ts`.

---

## 3. Comparison matrix

| Source | Yield (full PDFs) | Effort | Bot risk | ToS risk | Stability | Recommended role |
|---|---|---|---|---|---|---|
| SEBI Playwright `smid=11/12` | Unknown (0 via static GET; may be empty page) | **Low** (reuse P-08 infra) | Low–med | Low | Med | Production primary (if data exists) |
| NSE Offer Documents | **High** | **High** (Akamai cookie wall) | High | Medium-low | Med | Production primary |
| BSE Offer Documents | **High** | Med (Playwright re-probe of P-10) | Med | Low | Low–med | Production primary |
| BSE SME Offer Documents | **High** (SME-track) | **Low–med** | Low | Low | Low | Production primary (SME track) |
| Exchange circulars | Low–med | Med | Med (NSE) / Low (BSE) | Low | Low | Supporting signal source |
| Zerodha | Indirect (URL hint) | Low | None | Med | Med | **Reference-only** (per policy) |
| Upstox | Indirect (URL hint) | Low | None | Med | Med | **Reference-only** (per policy) |
| Chittorgarh | Indirect → official URLs | **Low** | Low | Med | **Low** | Fallback URL-discovery aid (never data of record) |
| Manual curated seed | **High** | **Lowest** | N/A | None | Med-high (URL rot) | Bootstrap / last-resort fallback |

---

## 4. Recommended source priority order

1. **Manual curated official PDF URL seed** — unblock Phase 5B end-to-end *first*. Without at least one validated full DRHP in hand, every downstream parser improvement is theoretical. Cheapest, lowest risk, immediately auditable.
2. **BSE SME — Offer Documents** — highest yield-per-effort for the SME-dominated current candidate pool. Light bot protection. Same trust tier as SEBI.
3. **BSE Offer Documents (mainboard)** — Playwright re-probe of P-10's DRHP.aspx; medium effort, high yield, low ToS friction.
4. **SEBI Playwright `smid=11/12`** — cheap experiment to confirm whether those subsections are JS-blocked or genuinely empty. Either result is informative.
5. **NSE Offer Documents** — highest yield but highest effort. Defer until the easier official surfaces are exhausted.
6. **Exchange circulars (NSE / BSE)** — defer; treat as signal source for later phases.
7. **Chittorgarh** — characterize via a single probe (P-25 candidate), then evaluate as fallback URL-discovery aid. Never the data of record. Out of scope for Phase 5A.2 itself.
8. **Zerodha / Upstox** — reference-only. Already characterized by P-23a/b. No further work in Phase 5A.2.

---

## 5. Phase 5A.2 implementation options

| Option | Description | Effort | Yield | Risk | Verdict |
|---|---|---|---|---|---|
| **A** | SEBI Playwright `smid=11/12` only | Low | Unknown (may be 0) | Low | Useful but insufficient alone — Phase 5B still blocked if pages are empty. |
| **B** | Official exchange PDF discovery (NSE + BSE + BSE SME) | High (NSE full scope) / Medium (BSE + BSE SME only) | High | Medium (NSE bot wall) | Right long-term answer; too broad for one bounded pass. |
| **C** | Broker / Chittorgarh reference discovery | Low | Indirect | Med (ToS) | **Violates source policy if surfaced as data.** Useful only after officials are exhausted. Out of scope for 5A.2. |
| **D** | Manual curated official PDF URL seed | **Lowest** | High (immediate) | None | Unblocks Phase 5B today. Doesn't solve discovery; solves supply. |
| **Combined bounded pass** | **D + B-narrow (BSE SME + BSE mainboard via Playwright re-probe) + A (SEBI smid=11/12 via Playwright)** | Medium | High | Low–medium | **Recommended.** |

### Why the combined bounded pass

- **D** gives us a validated full DRHP in `discover.ts` within hours — Phase 5B can be tried end-to-end before the rest of 5A.2 ships.
- **B-narrow** (BSE + BSE SME only — *not* NSE) gets us a real discovery surface that complements `smid=10` exactly where the current pool is weakest (SME issues whose full DRHPs are on BSE SME, not on SEBI's commondocs shelf). Defers the NSE Akamai investment to a follow-up.
- **A** is a near-zero-cost extension of P-08's existing Playwright path; either confirms `smid=11/12` are empty (so we stop sending requests there) or yields more candidates.
- **C** and full **NSE** explicitly deferred. The user directive is firm; we should respect it and not bundle scope creep.

### What stays out of Phase 5A.2

- **Phase 5B** (full-document financial parsing) — separate gate. May be retried opportunistically once D lands a real PDF, but only as a smoke test, not as the Phase 5A.2 deliverable.
- **NSE Offer Documents discovery** — Phase 5A.3 candidate.
- **Chittorgarh discovery** — Phase 5A.3 candidate after a P-25-style probe.
- **Exchange circulars** — later.
- **Any UI work** — `ipo-pdf-extraction-audit.json` continues to be the only audit surface.
- **Any mutation of `src/data/snapshots/ipo-documents.json`** — §X.1 hard rule held.

---

## 6. Implementation prompt for the recommended Phase 5A.2 combined bounded pass

> **Use this prompt verbatim when launching the Phase 5A.2 implementation pass.** Implementation must not start until the user explicitly approves.

```
Phase 5A.2 — bounded candidate-supply pass.

Scope (all three sub-tasks, no more):
  D.  Manual curated official PDF URL seed.
  B1. BSE SME — DRHP / RHP / Offer Documents discovery (Playwright).
  B2. BSE mainboard — DRHP / RHP / Offer Documents discovery (Playwright re-probe of P-10's DRHP.aspx).
  A.  SEBI Playwright fallback for smid=11 and smid=12.

Out of scope (do NOT touch in this pass):
  - NSE Offer Documents discovery (Phase 5A.3 candidate).
  - Chittorgarh discovery (needs a P-25-style probe first).
  - Zerodha / Upstox (reference-only per source policy).
  - Phase 5B financial parsing (separate gate).
  - UI files (src/components, src/pages, src/lib).
  - src/data/snapshots/ipo-documents.json (immutable, §X.1).
  - Workers, cron, DB, GMP, LLM.

Files allowed to change:
  - phase-0/curated-official-pdfs.json (NEW; ~3-5 hand-picked entries, schema below).
  - scripts/pdf/discover.ts (extend candidate-pool union: ipo-documents.json
    ∪ sebi-candidates.json ∪ bse-sme-candidates.json ∪ bse-mainboard-candidates.json
    ∪ curated-official-pdfs.json; dedup by URL; preserve doc-type sort).
  - scripts/pdf/lib/types.ts (add CuratedOfficialPdf, BseSmeCandidate, BseMainboardCandidate; extend DiscoverySummary).
  - src/types/pdf-audit.ts (mirror, reference-only per §W.6.1).
  - scripts/probes/lib/sebi-pdf-extract.ts (extend Playwright path to accept smid arg; no behavior change for smid=10).
  - scripts/pdf/discover/bse-sme.ts (NEW; Playwright-driven, bounded to first page of results).
  - scripts/pdf/discover/bse-mainboard.ts (NEW; Playwright-driven, bounded to first page of DRHP.aspx).
  - scripts/pdf/discover/sebi-playwright.ts (NEW; thin wrapper that drives smid=11/12 via Playwright).
  - phase-0/pdf-extracts/bse-sme-candidates.json (auto-generated).
  - phase-0/pdf-extracts/bse-mainboard-candidates.json (auto-generated).
  - phase-0/pdf-extracts/sebi-candidates.json (extended with playwright-derived smid=11/12 entries).
  - phase-0/pdf-extracts/index.json (refreshed summary).
  - src/data/snapshots/ipo-pdf-extraction-audit.json (refreshed audit).
  - phase-5A.2-status.md (NEW; status report at the end).

Schema for phase-0/curated-official-pdfs.json:
  [
    {
      "ipo_id": "<slug from ipo-documents.json or a new well-known IPO>",
      "doc_kind": "DRHP" | "RHP" | "Final Offer Document" | "Prospectus",
      "doc_url": "<absolute URL, must resolve to sebi.gov.in OR nseindia.com/nsearchives.nseindia.com OR bseindia.com OR bsesme.com>",
      "source_host": "<host portion>",
      "curated_at_utc": "<ISO timestamp>",
      "verified_at_utc": "<ISO timestamp, by the human curator>",
      "notes": "<one-line provenance>"
    },
    ...
  ]

Hard requirements:
  1. NO mutation of src/data/snapshots/ipo-documents.json. CI diff must show 0 changes to that file.
  2. NO PDF binaries or full-text dumps committed. Existing pdf-binary CI guard must hold.
  3. Curated entries: only URLs resolving to one of the official hosts listed above. Anything else MUST be rejected at runtime with a clear audit entry.
  4. Every candidate row in sebi-candidates.json / bse-sme-candidates.json / bse-mainboard-candidates.json carries: url, link_text, doc_type, source (e.g. "sebi-smid-11-playwright", "bse-sme-static", "bse-mainboard-playwright"), discovered_at_utc.
  5. discover.ts: merged-pool dedup by URL (lowercase, trimmed); doc-type filter rejects "Draft Abridged Prospectus" up front (current behavior); preferred doc-type sort preserved (DRHP → RHP → Final Offer → Prospectus → unknown); curated entries get sort priority over discovered.
  6. Playwright runs in CI MUST set explicit timeouts (60s per page) and MUST tolerate "empty page" as a valid result (no failure, just count=0 with a "page was empty after JS render" note in the candidates file). This distinguishes "JS-blocked" from "page genuinely empty".
  7. typecheck + build still pass under the existing pdf-parse workflow.
  8. The status report (phase-5A.2-status.md) MUST include a before/after candidate-pool table, the curated entries' source_host audit, the BSE/SEBI Playwright result tables (count, latency, errors), and a frank Phase 5B viability call.

Definition of done:
  - Combined candidate pool contains AT LEAST ONE full-document candidate (page_count >= 200) surviving doc-type filter, sourced from EITHER curated seed OR BSE SME/mainboard OR SEBI smid=11/12 Playwright.
  - sebi-candidates.json shows smid=11/12 with either count > 0 (Playwright-derived) OR an explicit "page genuinely empty after JS render" annotation.
  - bse-sme-candidates.json and bse-mainboard-candidates.json exist as auto-generated files.
  - phase-0/curated-official-pdfs.json exists with ≥ 3 validated entries.
  - phase-5A.2-status.md documents the run.
  - CI workflow green; no PDF binaries committed; ipo-documents.json untouched.

Phase 5B remains gated. If a full-document candidate is now available, a one-off Phase 5B smoke test is permitted at the end of the pass but its output is NOT a Phase 5A.2 deliverable.
```

---

## 7. Decision required from user before implementation

1. Approve the recommended combined bounded pass (**D + B-narrow + A**), or pick a single-option subset (e.g. **D-only** for fastest unblock, or **A-only** for cheapest experiment).
2. Confirm the curated-seed host allow-list: `sebi.gov.in`, `nseindia.com`, `nsearchives.nseindia.com`, `bseindia.com`, `bsesme.com`. Any addition or removal is policy-level.
3. Confirm that the Phase 5B smoke test at the tail of 5A.2 is acceptable as a *non-deliverable diagnostic*, or that it should be deferred entirely.
4. Confirm that **Chittorgarh** characterization (as a P-25-style probe) is acceptable as a Phase 5A.3 follow-up — not bundled into 5A.2.

No code will be written until these four decisions land.
