# Cloudflare Pages Deployment — Phase 1 Mock Dashboard

This deploys the static Vite + React build to Cloudflare Pages. **Phase 1 only** — no live ingestion, no Workers, no database, no secrets required beyond what the manual UI flow needs.

---

## Live URL

> **Production**: `<paste-live-url-here>` *(fill in after first Cloudflare deploy; see "How to redeploy" below)*
> **Latest deploy**: see Cloudflare → Workers & Pages → ipomarket → Deployments
> **Post-deploy smoke test**: see `post-deploy-checklist.md` at the repo root

---

## How to redeploy

| Trigger | What happens |
|---|---|
| `git push origin main` | Cloudflare auto-detects the push (native GitHub integration), runs `npm install` → `npm run build`, deploys `dist/`. ~1–2 min total. New deploy replaces the production deployment when the build succeeds. |
| Push to any non-`main` branch | Cloudflare creates a **preview deployment** at `https://<branch>.<project-name>.pages.dev` — production stays untouched. Handy for testing Phase 2 ingestion later. |
| Manual rollback | Cloudflare → Workers & Pages → `ipomarket` → Deployments → pick a previous successful deploy → **Rollback**. |
| Redeploy without code change | Cloudflare → Workers & Pages → `ipomarket` → Deployments → latest → **Retry deployment**. |

Build config is fixed and stored in the Pages project (see "Build configuration" below) — no need to re-enter on each deploy.

---

## Build configuration

| Setting | Value |
|---|---|
| Framework preset | **Vite** |
| Build command | `npm run build` |
| Output (build) directory | `dist` |
| Production branch | `main` |
| Node version | `20` (recommended; Vite 5 requires 18+) |
| Environment variables | **None required for Phase 1** |
| SPA routing fallback | `public/_redirects` → `/* /index.html 200` (already committed) |
| Expected URL | `https://<project-name>.pages.dev` |

---

## Primary path — Cloudflare Pages UI (no GitHub secrets needed)

Cloudflare Pages has a native GitHub integration: it installs a Cloudflare app on the repo, watches the production branch, and runs the build in its own environment. No GitHub Actions workflow needed, no secrets to manage from our side. This is the recommended path for Phase 1.

### Step 1 — Open the Pages dashboard

1. Sign in to <https://dash.cloudflare.com>.
2. In the left sidebar, click **Workers & Pages**.
3. Click **Create application**, then the **Pages** tab, then **Connect to Git**.

### Step 2 — Authorize GitHub and pick the repo

1. Click **Connect GitHub**, authorize the Cloudflare Pages app if prompted.
2. Choose the **techmuns** account (or the org that owns the repo).
3. In the repository list pick **`techmuns/ipomarket`**.
4. Click **Begin setup**.

### Step 3 — Configure the build

| Field | Enter |
|---|---|
| Project name | `ipomarket` (suggested; appears in the URL as `ipomarket.pages.dev`) |
| Production branch | `main` |
| Framework preset | **Vite** |
| Build command | `npm run build` (auto-filled by the Vite preset) |
| Build output directory | `dist` (auto-filled by the Vite preset) |
| Root directory | leave blank (project is at the repo root) |
| Environment variables | none |

Optional: under **Environment variables → Production**, you can pin `NODE_VERSION` to `20` if Cloudflare's default differs. Phase 1 doesn't require it but it's a useful guardrail.

Click **Save and Deploy**.

### Step 4 — Wait for the first build

The first build takes about **1–2 minutes** on Cloudflare's runners:

- Install (`npm install`): ~25 s
- Build (`npm run build`): ~15–20 s (1.87 MB JS bundle, 588 KB gzipped)
- Deploy: ~10 s

Cloudflare streams the build log live in the UI. If it succeeds, the deployment goes live at `https://<project-name>.pages.dev`.

### Step 5 — Verify the deployment

Open the URL Cloudflare shows. Then verify SPA refresh works (this is what `_redirects` is for):

1. Navigate to `/` → should show **Market Pulse**.
2. Click **Open & Upcoming** → URL becomes `/open` and the open IPOs list renders.
3. **Hard-refresh** (`Cmd/Ctrl + Shift + R`) on `/open` — should still render Open & Upcoming, not 404.
4. Directly hit `https://<project-name>.pages.dev/ipo/nfp-sampoorna-foods` → should render the NFP detail page (4 tabs: About / Analysis / Subscription / Documents).
5. Directly hit `https://<project-name>.pages.dev/source-health` → should render the 29-probe health view.
6. Directly hit `https://<project-name>.pages.dev/recently-listed` → should render the fade-scatter + listings table.

If any direct URL returns 404, the `_redirects` file did not get bundled. Check that `dist/_redirects` exists in the latest build output (we verify this locally before pushing — see "Local verification" below).

### Step 6 — Future redeploys (automatic)

Every push to `main` triggers a fresh build on Cloudflare Pages automatically — there's nothing to do beyond `git push origin main`. The current deployment becomes the "Production" deployment when the build succeeds. Non-`main` branches get **preview deployments** at `https://<branch>.<project-name>.pages.dev` (also automatic).

---

## Local verification (run before pushing)

```bash
npm install
npm run typecheck
npm run build
ls -la dist/_redirects   # confirms the SPA redirect file is in the output
```

`dist/_redirects` must contain `/* /index.html 200`. Vite copies the `public/` directory contents to `dist/` verbatim during build, so the source-of-truth file is `public/_redirects`.

---

## Custom domain (optional, post-deploy)

Once the `<project-name>.pages.dev` URL is live, you can attach a custom domain in **Workers & Pages → ipomarket → Custom domains → Set up a custom domain**. Cloudflare provisions a managed cert automatically. This step is optional for Phase 1 and changes nothing about the build.

---

## Optional — GitHub Actions deploy workflow (NOT enabled)

For Phase 1 we rely on Cloudflare's native GitHub integration (Step 2 above). If you later want CI-driven deploys (e.g. to gate behind tests or to deploy from a different runner), here's a safe drop-in:

```yaml
# .github/workflows/deploy-cloudflare-pages.yml
name: deploy-cloudflare-pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  deployments: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Gate on Cloudflare secrets
        id: gate
        env:
          HAS_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN != '' }}
          HAS_ACCOUNT: ${{ secrets.CLOUDFLARE_ACCOUNT_ID != '' }}
          HAS_PROJECT: ${{ secrets.CLOUDFLARE_PROJECT_NAME != '' }}
        run: |
          if [ "$HAS_TOKEN" = "true" ] && [ "$HAS_ACCOUNT" = "true" ] && [ "$HAS_PROJECT" = "true" ]; then
            echo "ok=true" >> "$GITHUB_OUTPUT"
          else
            echo "ok=false" >> "$GITHUB_OUTPUT"
            echo "::warning::Cloudflare secrets not set — deploy SKIPPED (run does not fail)."
          fi

      - if: steps.gate.outputs.ok == 'true'
        uses: actions/checkout@v4
      - if: steps.gate.outputs.ok == 'true'
        uses: actions/setup-node@v4
        with: { node-version: "20", cache: npm }
      - if: steps.gate.outputs.ok == 'true'
        run: npm install --no-audit --no-fund
      - if: steps.gate.outputs.ok == 'true'
        run: npm run build
      - if: steps.gate.outputs.ok == 'true'
        name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=${{ secrets.CLOUDFLARE_PROJECT_NAME }}
```

Required secrets (set under **GitHub repo → Settings → Secrets and variables → Actions**):
- `CLOUDFLARE_API_TOKEN` — token with **Account ▸ Cloudflare Pages ▸ Edit** scope.
- `CLOUDFLARE_ACCOUNT_ID` — visible in any Cloudflare dashboard URL.
- `CLOUDFLARE_PROJECT_NAME` — the project name you picked in Step 3 (e.g. `ipomarket`).

The gate-on-secrets step means: if these aren't set, the deploy is **skipped cleanly** — the workflow run still ends green and no other workflow (visual QA, probes) is affected.

**For Phase 1, we have not added this file** — the Cloudflare native integration is simpler. You can drop the workflow in later if you want CI-gated deploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails on Cloudflare with "command not found: tsc" | Node version mismatch | Set `NODE_VERSION=20` in Pages env vars |
| `/ipo/<slug>` returns 404 on refresh | `_redirects` not in `dist/` | Confirm `public/_redirects` exists; rerun build |
| First load is slow | 1.87 MB bundle (ECharts) | Phase 1.5 candidate: code-split ECharts behind a dynamic import |
| Build succeeds but live site is blank | Asset path mismatch | Confirm Vite `base` defaults (we use `'/'`); check browser console |

---

## What's NOT in this deploy

- No backend / Cloudflare Workers — pure static SPA.
- No D1 / KV / R2.
- No live ingestion or scraping jobs.
- No Trendlyne / Zerodha / Upstox scraping.
- No environment variables.
- No custom build commands beyond `npm run build`.

Phase 2 (live ingestion) is a separate decision. Deployment of Phase 1 to Cloudflare Pages does not start Phase 2.
