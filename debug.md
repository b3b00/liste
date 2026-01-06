# Debugging the Liste App (Durable Object + Pages)

This document explains how to debug the app locally when using Cloudflare Pages, Workers and Durable Objects (DO). It covers running the DO worker locally, running Pages dev, verifying service bindings, tailing logs, and common problems (503, WebSocket errors).

1) Overview
- The Pages dev server can forward service bindings (Durable Objects) to other local Wrangler worker processes. To debug the DO you usually run two processes:
  - A worker process that exports the `ListSync` Durable Object (wrangler.worker.toml / listes-worker.ts).
  - The Pages dev server which serves the static site from `./public/` and forwards `/sync` to the DO via service bindings.

2) Files to know
- `wrangler.dev.toml` — local Pages dev config (DO bindings and migrations).
- `wrangler.worker.toml` — worker config used to run the DO-hosting worker locally (exports `ListSync`).
- `listes-worker.ts` — wrapper that re-exports the compiled `public/_worker.js` handler and the `ListSync` class.
- `public/_worker.ts` — router that forwards `/sync` to `env.LIST_SYNC.get(id).fetch(request)`.
- `public/ListSync.ts` — Durable Object implementation that handles WebSocket upgrades.

3) Start the DO worker (terminal A)
Run the worker locally so Pages dev can connect a service binding to it.

```bash
npx wrangler dev --config wrangler.worker.toml --port=8787
```

- Notes:
  - This process must be running and show logs to be considered `[connected]` by `pages dev`.
  - The worker exposes the `ListSync` class and default fetch handler (via `listes-worker.ts`).

4) Start Pages dev (terminal B)
Run the Pages dev server which will serve the app and connect service bindings to the worker process.

```bash
npx wrangler pages dev ./public/ --persist-to=./.wrangler/state/d1 --d1=D1_lists --port=8888
```

- Watch the Pages dev output. You should see a service binding status for `LIST_SYNC`. When the worker dev is running correctly the binding will show `[connected]`.

5) Test the WebSocket /sync endpoint
- Open the app in the browser (http://127.0.0.1:8888). The client code connects to `/sync?listId=default` (adjust query param).
- In the worker terminal you should see Logs from the Durable Object like:

```
[DURABLE] Fetch called, URL: .../sync?listId=default
[DURABLE] WebSocket upgrade request - listId: default
[DURABLE] WebSocketPair created
[DURABLE] WebSocket accepted
[DURABLE] Sending connection confirmation: {"type":"connected", ...}
```

If you see these messages, the WebSocket upgrade succeeded and the DO is handling sessions.

6) If you see `503 Service Unavailable` in Pages dev
- Common reasons:
  - The worker process that exports the DO is not running, or `pages dev` couldn't connect to it (service binding shows `[not connected]`). Ensure the worker dev process is running.
  - The worker process does not export the DO class (verify `listes-worker.ts` re-exports `ListSync`).
  - Migrations are not applied in the dev environment; for free-plan DOs you must create the sqlite classes.

Fixes to try:
- Ensure `wrangler.dev.toml` contains the migrations block, for example:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = [ "ListSync" ]
```

- Ensure `wrangler.worker.toml` also contains the same migrations entry.
- Restart both processes after edits.
- If you prefer to run the DO as an external deployed worker, deploy `listes-worker` and use `npx wrangler tail listes-worker` to inspect incoming requests.

7) Browser-side WebSocket errors
- Common browser errors and meaning:
  - NS_ERROR_WEBSOCKET_CONNECTION_REFUSED (Firefox) or connection refused: The server refused the TCP connection — check that Pages dev is listening and worker dev is connected.
  - readyState = 3 (CLOSED) with 'error' event: the server closed the connection or the upgrade failed — check worker and DO logs.

8) Commands for deployed worker (alternative to local DO)
- Deploy the worker (listes-worker):

```bash
npx wrangler deploy --config wrangler.worker.toml
```

- Tail the live worker logs:

```bash
npx wrangler tail listes-worker --since 1m
```

9) Collecting logs for help
- If you still need help, collect and paste:
  - Output from terminal A (worker dev): at least 10-30 lines around the error.
  - Output from terminal B (pages dev): same.
  - Browser console WebSocket error message.
  - Contents of `wrangler.dev.toml`, `wrangler.worker.toml`, and `wrangler.toml` (if edited).

10) Quick checklist
- `wrangler.dev.toml` — DO binding exists and `script_name` is removed for local dev.
- `wrangler.dev.toml` — migrations include `new_sqlite_classes = [ "ListSync" ]` for local DO creation.
- `wrangler.worker.toml` — main points to `listes-worker.ts` and migrations are present.
- `listes-worker.ts` — re-exports `ListSync` and default handler.
- Start `wrangler dev --config wrangler.worker.toml` first, then `wrangler pages dev ./public/`.

If you'd like, I can open both dev processes here and stream their logs to reproduce any remaining issues — tell me if you want me to run them now.

11) `concurrently` prefix names and colors

- The `dev:all` npm script uses `concurrently` to run both the worker and Pages dev processes. The `-n` option sets process names (prefixes) and `-c` sets the prefix colors.

- Example from `package.json`:

```json
"dev:all": "concurrently -n worker,pages -c blue,green \"npx wrangler dev --config=wrangler.worker.toml --port=8787\" \"npm run dev\""
```

- Explanation:
  - `-n worker,pages` names the first process `worker` and the second `pages`.
  - `-c blue,green` colors the `worker` prefix blue and the `pages` prefix green in the combined output, making logs easier to scan.

- Tips:
  - Use other color names (`black,red,green,yellow,blue,magenta,cyan,white,gray`) or remove `-c` to disable colors.
  - To change names, edit the `-n` list in the script.
  - On some shells (or CI) colors may not render; remove `-c` or use `--raw` to get unprefixed output.

