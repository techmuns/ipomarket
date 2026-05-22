# Phase 5B.X — Route Status (post-acceptance diagnostic)

> **Status**: Diagnostic. No code change required. `/ipo/onemi-technology-solutions` renders cleanly against the freshly-built `dist/` from commit `10a7ff5` (current `origin/main` HEAD).
>
> **Date**: 2026-05-22
>
> **Triggered by**: Operator report — "OnEMI is not discoverable at `/ipo/onemi-technology-solutions`. Other routes are working."

---

## 1. Root cause

**Not a code defect.** The code on `origin/main` (commit `10a7ff5`) is correct. `/ipo/onemi-technology-solutions` renders cleanly end-to-end with zero render-time errors against a fresh local production build.

The most likely cause of the operator-side symptom is one of:

1. **Cloudflare Pages deploy lag** — commit `10a7ff5` landed on `main` and triggers an auto-deploy; the deploy can take 30–90 seconds before all edge nodes serve the new bundle.
2. **Cloudflare CDN edge cache** serving a stale `index-*.js` bundle to the operator's IP / region while Cloudflare propagates. If the *old* bundle loads (which does not have OnEMI in `ipo-master.json`), `findIpoBySlug('onemi-technology-solutions')` returns `undefined` → `IpoDetail.tsx:24-35` renders the "IPO not found" branch, while other routes continue to look fine because the old data shape is still consistent for the 10 existing IPOs.
3. **Browser cache** — the operator's browser cached an old `index-*.js` bundle from before commit `10a7ff5`. Hard-refresh (Ctrl/Cmd-Shift-R) fixes this.

The discriminating evidence between these three: the bundle filename changed at commit `10a7ff5`. The latest local build emits `dist/assets/index-XQ0WGMLi.js`; the previous build emitted `dist/assets/index-BiJZ6REp.js`. If the operator's browser is loading the older filename, that confirms cause (2) or (3).

---

## 2. Diagnostic walkthrough

| # | Check | Result |
|---|---|---|
| 1 | `git log --oneline -3` shows `10a7ff5` on local `main` | ✅ |
| 2 | `git fetch origin && git diff --stat origin/main..HEAD` → empty | ✅ `origin/main` matches local HEAD |
| 3 | `src/data/snapshots/ipo-master.json` contains `slug: "onemi-technology-solutions"` | ✅ — verified via `node -e "..."` |
| 4 | `ipo-financials.json` and `ipo-documents.json` contain matching `by_ipo["onemi-technology-solutions"]` | ✅ |
| 5 | `dist/_redirects` has `/* /index.html 200` (SPA fallback for Cloudflare Pages) | ✅ |
| 6 | `npm run typecheck` | ✅ green |
| 7 | `npm run build` produces clean `dist/assets/index-XQ0WGMLi.js` | ✅ |
| 8 | `grep -c 'onemi-technology-solutions' dist/assets/index-*.js` | ✅ 6 hits (master + financials + documents + slug literal in router resolution + IpoCard link + Screener link) |
| 9 | Headless render against `npm run preview` on `127.0.0.1:5174` | ✅ |
| 10 | `/ipo/onemi-technology-solutions` → HTTP 200, `<h1>OnEMI Technology Solutions</h1>`, body contains "OnEMI" | ✅ |
| 11 | Per-tab render (About / Analysis / Subscription / Documents) on OnEMI page | ✅ all 4 tabs render |
| 12 | `9M FY 26` period text visible on Analysis tab → financials chart resolved | ✅ |
| 13 | RHP link visible on Documents tab → documents row resolved | ✅ |
| 14 | OnEMI also visible on `/open` (CompactCard branch for sparse upcoming IPOs) | ✅ |
| 15 | OnEMI also visible on `/screener` (default filters) | ✅ |
| 16 | Page errors / console errors during render | ✅ **0 / 0** across all routes |

The render check used `playwright@1.60` with `chromium-1194` (pre-installed at `/opt/pw-browsers/`) since Playwright's bundled Chromium 1223 wasn't reachable from the sandbox network.

---

## 3. Why is the code correct?

`IpoDetail.tsx:21-22` resolves the slug:

```ts
const { slug } = useParams();
const ipo = slug ? findIpoBySlug(slug) : undefined;
```

`findIpoBySlug` at `src/lib/loadSnapshots.ts:42-44`:

```ts
export function findIpoBySlug(slug: string) {
  return Snapshots.master.ipos.find((i) => i.slug === slug);
}
```

`Snapshots.master` is the import of `src/data/snapshots/ipo-master.json` (Vite's static JSON import). The freshly-built bundle contains the OnEMI row at index 10 of `ipos[]` with `slug: "onemi-technology-solutions"`. The `.find()` resolves to the OnEMI row.

The render path then walks:
- `HeroHeader(ipo)` — null-safe on `sector`, `tagline`, dates, listing_exchange (handles `[]` via `.join(' + ') || '—'`)
- `PriorityReadCard(ipo, sub, timeline, audit)` — handles undefined `sub`/`timeline`/`audit` (lines 41-46, 159-160, 207, 217)
- `IssueTermsGrid(ipo)` — uses `formatPriceBand(ipo.price_band?.low ?? null, ...)`, `formatCr(null)` returns `'—'`, `ipo.reservation` is wrapped in `{ipo.reservation && (...)}` so the null is skipped
- `FinancialsChart(fin)` — OnEMI's `fin` is present with 4 periods, renders Recharts bar chart cleanly
- `DocumentsList(docs)` — OnEMI has the single BSE RHP doc
- `SourceAuditPanel(audit)` — `audit` is undefined for OnEMI (Phase 5B.1 did NOT touch `ipo-source-audit.json`), component renders the "No source-audit record for this IPO yet" branch (line 26-40)
- `RegistrarBrlmCard(docs)` — `docs.registrar === null`, `docs.brlms === []`, renders both "not yet identified" fallback messages (lines 34-36, 49-51)
- `StrengthsCard / RisksCard / ObjectivesCard / PromoterCard / AnalystSignalPanel / QualityRiskChecklist` — all handle undefined `nar` and missing derived fields

Every component is null-tolerant for OnEMI's sparse field set. There is no crash to patch.

---

## 4. Files changed

**None.** No code change was made because no code defect exists.

The only artifact written in this diagnostic pass is `phase-5BX-route-status.md` (this document).

---

## 5. Does `/ipo/onemi-technology-solutions` now work?

**Locally: yes — confirmed via headless render against the freshly built `dist/`.**

**Live (Cloudflare Pages): pending operator re-test after one or more of**:
- Confirming the Cloudflare deploy for commit `10a7ff5` completed (Cloudflare → Workers & Pages → ipomarket-pages → Deployments — look for the `10a7ff5` row with status `Success`)
- Hard-refresh the browser at `https://ipomarket-pages.pages.dev/ipo/onemi-technology-solutions` (Ctrl/Cmd-Shift-R) to bust local cache
- Verify the loaded JS filename in the browser's DevTools Network tab is `index-XQ0WGMLi.js` (not the pre-`10a7ff5` filename)

If after both of those the route still 404s on Cloudflare, please send:
- The full URL the browser displays
- A screenshot of the served page
- A DevTools Network tab screenshot showing the served JS filename and HTTP status

That information will let us discriminate cleanly between "Cloudflare deploy stale" and "code regression I missed".

---

## 6. UI null-tolerance shim needed?

**No.** No UI shim was applied or required. Every component on the `/ipo/<slug>` render path was already null-safe before Phase 5B.X.

---

## 7. Fake fields added?

**No.** The OnEMI master row's 13 explicit-null fields remain explicit `null` exactly as committed at `10a7ff5`. No defaults were synthesised, no placeholder strings were substituted, no sector / dates / registrar / BRLMs / EPS / borrowings were guessed.

The 7 populated fields (`id`, `slug`, `name`, `segment`, `status`, `listing_exchange`, `state`) match the §3.3 classification from `phase-5BX-onemi-master-linkage-plan.md`:
- verified: `id`, `slug`, `name` (+ RHP/document linkage via the financials + documents rows landed by Phase 5B.1)
- inferred: `segment="mainboard"`, `listing_exchange=["BSE"]`
- conservative default: `status="upcoming"`, `state="manual"`

---

## 8. Conclusion + next step

The implementation is sound. No tiny in-scope fix is available because no code defect exists to fix.

**Recommended operator action**:

1. Wait ~60 seconds for Cloudflare auto-deploy of commit `10a7ff5` to complete (if it hasn't already).
2. Open `https://ipomarket-pages.pages.dev/ipo/onemi-technology-solutions` in an Incognito/Private window OR hard-refresh.
3. If the page still shows "IPO not found", report back with the served JS filename + a screenshot — that will let us discriminate between deploy lag and a real defect.

Until then, no code change to `main` is justified.

*End of route-status diagnostic.*
