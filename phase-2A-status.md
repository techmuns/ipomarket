# Phase 2A — SEBI Pipeline + Documents Bridge · Status Report

> **Date**: 2026-05-21
> **Scope**: artifact-to-snapshot bridge per `phase-2-plan.md` §9.
> **Branch**: `main`
> **Phase 2B/C/D/E**: not started, not scoped here.

---

## 1. What was built

| File | Purpose |
|---|---|
| `scripts/ingest/sebi-pipeline.ts` | Phase 2A bridge — reads probe artifact, transforms, writes 3 snapshot files |
| `scripts/ingest/lib/safeWrite.ts` | Atomic write helper (`writeFileSync` → `rename`) + null-safe JSON reader |
| `scripts/ingest/lib/merge.ts` | Generic `mergeByKey(existing, incoming, keyFn, combineFn)` with `MergeStats { added, updated, preserved }` |
| `scripts/ingest/lib/audit.ts` | Idempotent `appendAuditEntry()` on `(field, source, url)` triple |
| `scripts/ingest/lib/types.ts` | `ProbePdf` / `ProbeArtifact` / `SourceMeta` types (kept isolated from `src/types/`) |
| `.github/workflows/ingest.yml` | `workflow_dispatch`-only workflow — ingest → typecheck → build → commit-back with rebase + 3× retry |
| `package.json` | Added `"ingest:sebi": "tsx scripts/ingest/sebi-pipeline.ts"` and `"ingest": "npm run ingest:sebi"` |
| `phase-2A-status.md` | This report |

**Total: 7 new/modified files. No UI code touched. No database. No Workers. No external network.**

---

## 2. Verification results (local)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run ingest:sebi` (first run on existing snapshots) | ✅ +14 added · ~5 refreshed · =14 preserved · 5 IPOs matched · 4 DRHP docs added · 4 audit entries added |
| `npm run ingest:sebi` (second run — idempotency test) | ✅ **+0 added across all 3 snapshots** · only timestamp refreshes |
| `npm run build` | ✅ pass (21.85 s, bundle unchanged at 1.87 MB / 588 KB gzip) |

Idempotency is the key safety property — running the bridge repeatedly with the same probe artifact produces structurally identical snapshots (only `fetched_at_utc` and `generated_at_utc` change).

---

## 3. Snapshot impact (first ingest run)

### `src/data/snapshots/sebi-pipeline.json`
- **Before**: 19 hand-seeded entries (Phase 1 placeholders + 5 real entries copied from the probe artifact).
- **After**: **33 entries**.
  - **19** with `source: 'SEBI'` + `fetched_at_utc` — these are the real DRHP filings from the probe artifact (all 19).
  - **14** without `source` — these are the Phase-1 synthetic placeholders (`sebi-filing-6` through `sebi-filing-19` — Veritas Pharma, Brightway Energy, etc.) that were never in the SEBI artifact. They are **preserved** by safe-merge rule §4.3.
- `source_meta`: `{ source_state: 'live', last_attempted_utc: ... }`.

The 14 synthetic placeholders are visible on the live Pipeline page but carry no real data. A future Phase 2A.1 cleanup can either prune them or leave them as no-ops (currently they render with the same status badges as real rows).

### `src/data/snapshots/ipo-documents.json`
- **Before**: 6 IPOs had `docs[]` entries (NFP, Vegorama, InCred, Quasar, Lumino, Greendale — the synthetic/seeded set).
- **After**: **+4 new IPO entries** added to `by_ipo[]`:
  - `online-instruments-india` — DRHP doc from SEBI URL
  - `jindal-supreme-india` — DRHP doc from SEBI URL
  - `playsimple-games` — DRHP doc from SEBI URL
  - `punjab-carbonic` — DRHP doc from SEBI URL
- **InCred Holdings**: the existing DRHP doc at the matching URL was refreshed (new `fetched_at_utc`); title field re-derived; nothing else touched. No DRHP overwrote an RHP anywhere (the `skipped-rhp-in-place` counter stayed 0).

### `src/data/snapshots/ipo-source-audit.json`
- **Before**: per-IPO `fields[]` arrays for the 6 seeded IPOs.
- **After**: **+4 new IPO entries** added (matching the 4 above) with a single `drhp` SEBI live audit row each.
- **InCred Holdings**: existing `drhp` SEBI field row was refreshed (new `fetched_at_utc`); no duplicate row added (dedupe by `(field, source, url)` worked).

---

## 4. Matched IPOs (cross-fill targets)

The bridge matches probe `link_text` against `Ipo.slug` via whole-word token containment. 5 of 19 probe entries matched (the rest are companies not yet in `ipo-master.json`):

| Probe link_text | IPO slug | Result |
|---|---|---|
| `Incred Holdings Limited - Draft Abridged Prospectus` | `incred-holdings` | Existing DRHP refreshed |
| `Online Instruments(India) Limited - Draft Abridged Prospectus` | `online-instruments-india` | New DRHP added |
| `Jindal Supreme (India) Limited - Draft Abridged Prospectus` | `jindal-supreme-india` | New DRHP added |
| `Playsimple Games Limited - Draft Abridged Prospectus` | `playsimple-games` | New DRHP added |
| `Punjab Carbonic Limited - Draft Abridged Prospectus` | `punjab-carbonic` | New DRHP added |

The other 14 probe entries (Rentomojo, RKB Global, Manipal Health, etc.) don't match any current `ipo-master.json` slug — they live in `sebi-pipeline.json` only, which is the correct outcome.

---

## 5. Safety properties confirmed

| Property | Confirmation |
|---|---|
| Never wipes manual/legacy rows on source-empty | 14 Phase-1-synthetic SEBI rows preserved across runs |
| Never overwrites RHP with DRHP | `skipped-rhp-in-place` counter stayed 0; logic explicitly checks `kind === 'RHP'` |
| Per-row provenance always written | Every new/refreshed row carries `source: 'SEBI'` + `fetched_at_utc: <ISO>` |
| Idempotent | Second run shows `+0 added` across all 3 snapshots |
| Atomic writes | `safeWrite.ts` writes to `.tmp` then `rename()` |
| Build-deploy independence | Typecheck + build gates run BEFORE commit-back in the workflow |
| Source-empty handled | If `pdfs[]` is `[]`, source_meta becomes `empty`; existing entries kept; early return |
| Source-missing handled | If artifact file doesn't exist, source_meta becomes `missing`; existing entries kept; early return |
| Source-failed handled | If artifact is malformed JSON, source_meta becomes `failed` with `last_error`; existing entries kept |
| No external network | Bridge reads `phase-0/samples/...` only; the only HTTP is the live PDF link rendered in the dashboard |

---

## 6. Workflow

`.github/workflows/ingest.yml` — `workflow_dispatch` only (no cron yet):

1. Checkout `main` (`fetch-depth: 0` for rebase).
2. Setup Node 20 + npm cache.
3. `npm install --no-audit --no-fund`.
4. **Phase 2A** — `npm run ingest:sebi`.
5. `npm run typecheck` (blocks bad snapshots from reaching main).
6. `npm run build` (proves snapshots still satisfy `src/types/`).
7. Show changed files (`git status --short` + `git diff --stat`).
8. Commit changed snapshots (skip if no diff); rebase on top of remote; push with 3× retry.

**Failure semantics**:
- Source-empty / source-missing / source-failed → not a workflow failure (snapshots get a metadata update but content is preserved).
- typecheck / build failure → **workflow fails** (snapshots are NOT committed to main; dashboard stays on the last known-good state).
- Script runtime error → **workflow fails** (commit-back step skipped via `if: success()`).

Permissions: `contents: write` (for the commit-back).

---

## 7. What's NOT in this slice (deferred to later phases)

- **No direct SEBI refetch.** This script only reads the probe-maintained `phase-0/samples/sebi-publicissues-pdfs.json`. The probe workflow (`phase-0-probes.yml` / P-08) is what actually talks to SEBI. Direct refetch is a Phase 2A.1 hardening step, deferred until the bridge is proven in production.
- **No NSE / BSE / GMP / RHP-parsing ingest.** Those are Phase 2B / 2C / 2D / 2E / 5.
- **No cron.** Workflow is `workflow_dispatch` only for now. Cron added only after one full week of clean manual runs.
- **No UI changes.** Dashboard reads the same snapshot files; only values changed.
- **No new dependencies.** Reuses existing `tsx`, Node built-ins, and types.
- **No database / KV / Workers.** JSON-on-disk only.
- **No scraping of Trendlyne / Zerodha / Upstox.** Master plan §A reaffirmed.

---

## 8. Next step

Trigger the ingest workflow manually:

> GitHub UI → **Actions** → `ingest` → **Run workflow** → branch `main`.

Expected outcome:
1. Workflow runs in ~2 minutes (install ≈25 s, ingest ≈1 s, typecheck ≈10 s, build ≈20 s).
2. **No commit-back** if the snapshots on `main` are already identical to my local run (they should be, since I pushed the locally-run snapshots).
3. Cloudflare Pages will redeploy automatically only if a snapshot commit lands — i.e. on the FIRST run-against-main if I didn't pre-write the snapshots, OR on any future run where the probe artifact has changed.

After the workflow finishes, I will pull and report:
- Snapshots changed (vs current).
- SEBI rows merged (added / refreshed / preserved counts).
- Documents cross-filled (which IPOs got new DRHP docs).
- Audit entries added.
- Whether Cloudflare auto-deployed successfully (visible on `https://ipomarket-pages.pages.dev/pipeline`).

---

## 9. Recommendation

Phase 2A is functionally complete. The bridge is proven idempotent, the safe-merge invariants hold, and the workflow gates bad snapshots from reaching `main`.

**Do not start Phase 2B / 2C / 2D / 2E yet.** Phase 2A.1 (direct SEBI refetch as a hardening step on top of the bridge) is the cheaper next item if you want to deepen Phase 2A before broadening to NSE / BSE. Both are separate approvals from you.
