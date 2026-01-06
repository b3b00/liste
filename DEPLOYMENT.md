# Deployment Guide for 'liste' (Cloudflare Pages + Durable Objects)

This document describes how to build and deploy the `liste` project so that:
- the named Worker `listes-worker` (which exports the `ListSync` Durable Object) is published, and
- the Cloudflare Pages site `liste-de-courses` is published using the `public/` build output.

## Overview
The Pages project requires Durable Objects to reference a named Worker via `script_name`. We publish a Worker named `listes-worker` (a small TypeScript wrapper that re-exports `ListSync` from `public/_worker.js`) and then deploy Pages, which uploads the `public/` directory.

Files of interest
- `wrangler.toml` — Pages configuration (pages_build_output_dir = "public").
- `wrangler.worker.toml` — Worker configuration used to deploy `listes-worker`. This file includes Durable Object migrations (free-plan-friendly `new_sqlite_classes`).
- `listes-worker.ts` — TypeScript wrapper that imports and re-exports `ListSync` and the default worker handler from `public/_worker.js`.
- `public/_worker.js` — compiled worker bundle generated during build.

## Local commands (manual deploy)
Run these steps locally to build and publish both the Worker and the Pages site.

1. Install dependencies

```bash
npm ci
```

2. Build the project (front-end + back-end)

```bash
npm run build
```

This produces `public/` static assets and `public/_worker.js`.

3. Deploy the named Worker `listes-worker`

```bash
npx wrangler deploy --config wrangler.worker.toml
```

This publishes the `listes-worker` script, creating the Durable Object migration if necessary.

4. Deploy the Pages site

```bash
npx wrangler pages deploy ./public/ --project-name liste-de-courses
```

After successful runs you should see your Pages URL and alias in the CLI output.

## CI / Pages Dashboard build settings
If you want Cloudflare Pages to perform the build/deploy when pushing changes, configure the Pages project build settings as follows.

- Install command: `npm ci`
- Build command:

```bash
npm ci && npm run build && npx wrangler deploy --config wrangler.worker.toml && git rev-parse --short HEAD
```

- Build output directory: `public`

### Environment variables (set in Pages dashboard)
- `CF_API_TOKEN` — API token with permissions to deploy Workers and manage Durable Objects (scope to account with limited permissions).
- `CF_ACCOUNT_ID` — Cloudflare account ID for the target account.
- Any other variables referenced by `wrangler.toml` `[vars]`.

Add those under Pages → Project → Settings → Environment variables (Build & Deploy).

## Notes and caveats
- Use `npx wrangler` in the build so you don't require a global `wrangler` install.
- Ensure `wrangler.worker.toml` lists migrations for the Durable Object classes. For free plan accounts we used `new_sqlite_classes`.
- If you prefer not to publish a Worker from the Pages build, publish `listes-worker` manually (locally or in CI) and remove the `npx wrangler deploy` step from the Pages build command.
- If your CI environment restricts outgoing API calls, publish the Worker as a separate step in your CI pipeline before Pages builds.

## Troubleshooting
- "Script _worker not found": caused by `script_name` pointing to a script that doesn't exist. Deploy the named worker or change `script_name` to point to an existing worker.
- Durable Objects migration errors on free plan: use `new_sqlite_classes` migration to create SQLite-based DOs.
- If Pages CLI warns about uncommitted changes, set `--commit-dirty=true` when using `npx wrangler pages deploy` locally (not required for dashboard builds).

## Commands summary
- Install: `npm ci`
- Build: `npm run build`
- Deploy Worker: `npx wrangler deploy --config wrangler.worker.toml`
- Deploy Pages: `npx wrangler pages deploy ./public/ --project-name liste-de-courses`
- One-liner for CI: `npm ci && npm run build && npx wrangler deploy --config wrangler.worker.toml && npx wrangler pages deploy ./public/ --project-name liste-de-courses && git rev-parse --short HEAD`


---

If you want, I can:
- commit `DEPLOYMENT.md` to the current branch and open a PR, or
- add a small `Makefile` or `scripts/deploy.sh` to automate these steps in CI. Let me know which you prefer.