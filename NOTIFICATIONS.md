# Notifications and Change Detection (Trace)

This document explains how notifications are computed and the end-to-end path a change takes from one client through the Durable Object (DO) to other clients. It highlights the relevant files and functions so you can trace and debug the flow.

High-level flow (client1 → DO → client2)

1) Client 1 makes a local change (add/remove/modify/move item or change categories).
2) The client `list` or `categories` Svelte store detects the change and the subscription in `public/syncManager.ts` broadcasts the change to the DO.
3) The DO (`public/ListSync.ts`) receives the WebSocket message and broadcasts it to all other connected sessions for the same list.
4) Client 2 receives the message via its WebSocket, `syncManager` applies the update to local stores and runs change detection.
5) `syncManager` computes human-readable notification strings (added/removed/moved/renamed/done) and calls `notifications.show()` to display them.

Files and key functions
- `public/syncManager.ts` — the client-side sync manager and change detection logic.
  - Broadcast subscriber: `list.subscribe(...)` (see file: public/syncManager.ts#L364)
  - Sending updates: `syncManager.sendListUpdate()` and `syncManager.sendCategoryUpdate()` (public/syncManager.ts#L232 and #L259)
  - Receiving updates: `SyncManager.handleMessage()` switch on `list_update` and `categories_update` (public/syncManager.ts#L73)
  - Change detection + notifications: `notifyListChanges(oldList, newList)` and `notifyCategoryChanges(oldCategories, newCategories)` (public/syncManager.ts#L100 and #L213)

- `public/ListSync.ts` — Durable Object that accepts WebSocket upgrades and broadcasts messages.
  - WebSocket upgrade: `ListSync.fetch()` (public/ListSync.ts#L17)
  - Session handling and message handler: `ListSync.handleSession()` (public/ListSync.ts#L38)
  - Broadcast implementation: `ListSync.broadcast()` (public/ListSync.ts#L82)

- `public/notifications.ts` — simple notification store used to show toasts.
  - `notifications.show(message, type, duration)` (public/notifications.ts)

- `public/_worker.ts` — Pages worker endpoint that forwards `/sync` to the DO stub.
  - `/sync` route forwards the request to `env.LIST_SYNC.get(id).fetch(request)` (public/_worker.ts#L150)

Detailed trace: add item on Client 1

1) User action updates local store
- The UI mutates the `list` store (e.g., add item). Svelte store `list` updates and its subscribers run.

2) `list.subscribe` in `public/syncManager.ts` detects the change
- The subscription at `public/syncManager.ts#L364` compares the new value to `lastListValue`. If different and `syncManager.isConnected()` is true, it calls `syncManager.sendListUpdate(value)` (public/syncManager.ts#L373).

3) `SyncManager.sendListUpdate()` sends a WebSocket message to the DO
- `public/syncManager.ts#L232` builds a JSON payload:

```json
{ "type": "list_update", "listId": "default", "list": [...items...] }
```

and sends it over the WebSocket.

4) Durable Object `ListSync` receives the message and broadcasts
- The DO's `handleSession` (public/ListSync.ts#L44) listens for `message` events, JSON-parses them and when `data.type === 'list_update'` it calls `this.broadcast(session, { type: 'list_update', listId: data.listId, list: data.list, timestamp: Date.now() })` (public/ListSync.ts#L56).
- `ListSync.broadcast()` iterates current sessions and sends the JSON-serialized message over each other session's WebSocket (public/ListSync.ts#L82).

5) Client 2 receives the broadcast
- Its WebSocket `onmessage` handler (set in `SyncManager.connect()`) receives the JSON message and calls `handleMessage(data)` (public/syncManager.ts#L26).
- `handleMessage` for `list_update` sets `isApplyingRemoteUpdate = true`, deep-clones `data.list` and writes it to the `list` store (`list.set(newList)`) (public/syncManager.ts#L74–L84).

6) Change detection runs and notifications are computed
- After updating the store, `notifyListChanges(oldList, newList)` is invoked (public/syncManager.ts#L88). This function:
  - Builds maps of old/new items by id.
  - Detects added items (pushes `item.added` messages).
  - Detects removed items (pushes `item.removed` messages).
  - Detects modified items (rename, move, done toggles) and pushes human-readable messages.
  - Detects likely category renames by observing many items (>=3) moved from the same old category to the same new category and suppresses per-item move notifications in that case.
- For categories, `notifyCategoryChanges` compares positions, names and colors to create `category.renamed`, `category.added`, `category.removed`, `category.movedUp/Down`, and `category.colorChanged` messages (public/syncManager.ts#L213).

7) Notifications are shown via `notifications.show()`
- `notifyListChanges` and `notifyCategoryChanges` call `notifications.show(msg, 'info', 5000)` for each message (public/syncManager.ts#L209 and #L291). The store in `public/notifications.ts` appends the notification and auto-dismisses it after the given duration.

Feedback-loop protection and suppression
- To avoid echoing updates back to the originator, `SyncManager` sets `isApplyingRemoteUpdate = true` before applying remote updates and the `list.subscribe` / `categories.subscribe` handlers check this flag and skip broadcasting when it's set (public/syncManager.ts#L370 and #L399).
- Category-rename suppression: The code looks for groups of items that moved together (>=3) from an old category to a single new category and treats that as a rename. In that case it suppresses per-item move notifications (see `categoryRenames` logic in `notifyListChanges`, public/syncManager.ts#L110).

Logging points to help trace
- Client-side:
  - `[SYNC] Connecting to:` — connection attempt (public/syncManager.ts#L14)
  - `[SYNC] Broadcasting local list change` — when client sends changes (public/syncManager.ts#L372)
  - `[SYNC] Received message:` — when a client receives a DO broadcast (public/syncManager.ts#L35)
  - `[NOTIFY]` logs inside the notification functions show detected messages and which are shown (public/syncManager.ts#L193)

- Durable Object:
  - `[DURABLE] Fetch called, URL:` — DO fetch entry point (public/ListSync.ts#L17)
  - `[DURABLE] Received message:` — when DO receives a client message (public/ListSync.ts#L49)
  - `[DURABLE] Broadcasting list update` — when DO decides to broadcast (public/ListSync.ts#L56)

Notes and potential improvements
- The notification algorithm runs on the client that receives the update; this means different clients might show slightly different notifications if they have different local state at the time of applying updates. For full consistency, compute diffs server-side in the DO and broadcast explicit notification messages.
- The category-rename heuristic (>=3 moved items) is conservative — adjust threshold or centralize rename detection server-side for stronger guarantees.

If you want, I can:
- Add server-side diffing in the DO so the DO broadcasts pre-computed notification messages instead of raw list arrays.
- Add an explicit `notification` message type so the DO can broadcast immutable notification messages to clients.
