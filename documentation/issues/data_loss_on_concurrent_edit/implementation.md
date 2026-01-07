# Implementation: Data Loss on Concurrent Edit Fix

## Status: Partially Implemented

The version-based approach has been implemented but does not fully resolve the initial bug. Further investigation needed.

## Implementation Summary

### Changes Made

#### 1. Data Model Updates

**File: `public/model.ts`**
- Added `version: number` field to `SharedList` interface
- Version field will be incremented on every modification to track data freshness

#### 2. Store Updates

**File: `public/store.ts`**
- Added `listVersion` store to track main list version (separate from sharedList which is for Inbox)
- Updated `sharedList` default value to include `version: 0`
- Added normalization logic to add `version: 0` to old data loaded from localStorage
- Normalization immediately persists to localStorage to ensure version field exists

**Storage Keys:**
- `listVersion` - Version number for main user list (list + categories)
- `sharedList` - Contains version for Inbox/shared lists

#### 3. Client Functions

**File: `public/client.ts`**
- Added normalization in `getList()` - adds `version: 0` if missing when fetching from server
- Added `getListState()` function - wrapper for `getList()` with explicit naming for check-on-load use case
- Both functions ensure old data without version field gets normalized to version 0

#### 4. Server-Side Storage

**File: `public/ListSync.ts`**
- Updated list_update handler to increment version: `version: (currentList?.version || 0) + 1`
- Updated categories_update handler to increment version: `version: (currentList?.version || 0) + 1`
- Version is now persisted to D1 database as part of the SharedList JSON in the `content` column

**D1 Storage:**
- Table: `shoppingList`
- Column: `content` (TEXT) - stores entire SharedList as JSON including version field
- Version increments server-side on every WebSocket update broadcast

#### 5. REST Endpoint

**File: `public/_worker.ts`**
- Existing GET endpoint `/list/:id` already returns full list data including version
- No changes needed - endpoint already functional for version checking

#### 6. Check-on-Load Logic

**File: `public/App.svelte`**
- Added version check BEFORE WebSocket connection in `onMount()`
- Fetches server state using `getListState(listId)`
- Compares `$listVersion` (local) vs `serverState.version` (server)
- **If server > local:** Updates local data from server and updates `$listVersion`
- **If local > server:** Saves local data to server via `saveList()`
- **If equal:** No action needed
- **If server has no data:** Initializes server with local data
- Falls back gracefully on network errors

**Load Sequence:**
1. Load from localStorage
2. Check IDs on items (existing logic)
3. **NEW:** Fetch server state via REST GET
4. **NEW:** Compare versions and use newer data
5. **NEW:** Sync version to server if local is newer
6. Connect WebSocket
7. Start normal sync

#### 7. Version Increment on Modifications

**Updated Files:**
- `public/List.svelte` - Increments `$listVersion` in `save()` function after each modification
- `public/Categories.svelte` - Increments `$listVersion` in `save()` function after each modification
- `public/ListSettings.svelte` - Increments `$listVersion` in `save()` and `createNewList()` functions

**Pattern Used:**
```typescript
const newVersion = ($listVersion || 0) + 1;
await saveList($settings.id, {
    categories: $categories,
    list: $list,
    version: newVersion
});
$listVersion = newVersion;
```

#### 8. Store Imports and Initialization

**Updated Files:**
- `public/App.svelte` - Added `listVersion` import and `useLocalStorage()` call
- `public/List.svelte` - Added `listVersion` import
- `public/Categories.svelte` - Added `sharedList` and `listVersion` imports, added `useLocalStorage()` calls
- `public/ListSettings.svelte` - Added `sharedList` and `listVersion` imports, added `useLocalStorage()` calls

All components now properly initialize the version-related stores.

### Removed Code

#### Deferral Implementation Rollback

**File: `public/syncManager.ts`**
- Removed deferral constants: `LOCAL_MODIFICATION_WINDOW`, `REMOTE_UPDATE_DEFER_TIME`, `MAX_DEFER_COUNT`
- Removed tracking variables: `lastLocalModificationTime`, `queuedListUpdate`, `queuedCategoriesUpdate`, `deferTimeout`
- Removed methods: `updateLocalModificationTime()`, `shouldDeferRemoteUpdate()`, `processDeferredUpdates()`, `applyListUpdate()`, `applyCategoriesUpdate()`
- Restored original `handleMessage()` switch statement logic

**Files: `public/List.svelte`, `public/Categories.svelte`**
- Removed all `syncManager.updateLocalModificationTime()` calls
- Removed `syncManager` imports where only used for deferral

The deferral approach was replaced with the simpler check-on-load version-based approach.

## Technical Architecture

### Version Flow

```
┌─────────────────┐
│   App Startup   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Load localStorage   │
│ (listVersion: N)    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ GET /list/:id        │
│ (server version: M)  │
└────────┬─────────────┘
         │
         ▼
    ┌────┴────┐
    │ M > N?  │
    └─┬────┬──┘
  Yes │    │ No
      │    │
      ▼    ▼
   ┌─────────┐  ┌──────────────┐
   │ Use     │  │ Save local   │
   │ Server  │  │ to server    │
   └─────────┘  └──────────────┘
         │            │
         └─────┬──────┘
               │
               ▼
      ┌────────────────┐
      │ Connect        │
      │ WebSocket      │
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │ Normal sync    │
      │ operations     │
      └────────────────┘
```

### Version Storage

**Client-Side:**
- localStorage key: `listVersion`
- Type: `number`
- Default: `0`
- Incremented by: Save operations in List.svelte, Categories.svelte, ListSettings.svelte

**Server-Side:**
- D1 table: `shoppingList`
- Column: `content` (JSON)
- JSON structure: `{ list: [], categories: [], version: N }`
- Incremented by: ListSync Durable Object on WebSocket updates

## Known Issues

### Issue: Does Not Prevent Original Bug

The implementation does not fully resolve the data loss scenario:

**Expected Behavior:**
- Firefox loads with stale data (v3)
- Check-on-load fetches server state (v5)
- Firefox loads fresh data
- Chrome's modifications preserved

**Actual Behavior:**
The bug still occurs - investigation needed to determine why.

**Possible Causes:**
1. Version not being incremented at the right time
2. WebSocket broadcast happening before version check completes
3. Race condition between check-on-load and WebSocket connection
4. Server state not being properly stored/retrieved
5. Version comparison logic issue

### Issue: Version Counter Limitations

As documented in plan.md critique section, the version counter approach has fundamental limitations:

1. **Race Conditions:** Two clients can increment the same version simultaneously
2. **No Causality Tracking:** Cannot distinguish between conflicting vs. independent changes
3. **Version Reset Scenarios:** Multiple ways version can reset or become inconsistent
4. **Lost Increments:** Offline modifications may use same version number
5. **Full State Replacement:** Still "last write wins" with no merge capability
6. **Silent Conflicts:** No indication when changes are overwritten

### Issue: Incomplete Migration Path

Old data normalization works but:
- First load may not immediately save version to server if versions match
- Some edge cases around empty lists vs. non-existent lists
- Version 0 could mean "old data" or "newly created empty list"

## Testing Performed

None documented - implementation needs validation.

## Recommended Next Steps

1. **Debug Why Original Bug Still Occurs:**
   - Add extensive logging to trace version flow
   - Test check-on-load timing vs WebSocket connection
   - Verify server state is actually stored in Durable Object
   - Check if REST endpoint returns correct data

2. **Add Logging:**
   - Log every version increment
   - Log version comparisons with detailed context
   - Log WebSocket message sequence
   - Log REST GET responses

3. **Test Scenarios:**
   - Basic: Chrome modifies (v1), close, Firefox opens - should see v1
   - Concurrent: Both open, Chrome modifies (v1), Firefox should receive update
   - Stale cache: Chrome at v3, close for hours, Firefox modifies to v4-v5, Chrome reopens - should see v5
   - Network failure: Check-on-load fails - should fall back to local gracefully

4. **Consider Alternative Approaches:**
   - Operational Transformation (OT)
   - Conflict-free Replicated Data Types (CRDTs)
   - Vector clocks for causality
   - Per-item versioning instead of whole-list versioning

## Files Modified

### Core Implementation
- `public/model.ts` - Added version field
- `public/store.ts` - Added listVersion store and normalization
- `public/client.ts` - Added getListState() and normalization
- `public/ListSync.ts` - Server-side version increment
- `public/App.svelte` - Check-on-load logic
- `public/List.svelte` - Version increment on save
- `public/Categories.svelte` - Version increment on save
- `public/ListSettings.svelte` - Version increment on save/create

### Deferral Rollback
- `public/syncManager.ts` - Removed deferral implementation
- `public/List.svelte` - Removed deferral notifications
- `public/Categories.svelte` - Removed deferral notifications

### REST Endpoint
- `public/_worker.ts` - No changes needed (endpoint already exists)

## Git Commit Recommendations

If committing this work, consider separate commits:

1. "Remove deferral sync approach" - Clean removal of failed attempt
2. "Add version field to data model" - Model and store updates
3. "Add version tracking infrastructure" - Client normalization, server increment
4. "Implement check-on-load version comparison" - App.svelte logic
5. "Wire version increment through save operations" - Component updates

Or single commit: "WIP: Attempt version-based sync conflict resolution (incomplete)"

## Notes

- This implementation represents significant effort but does not achieve the goal
- The approach is theoretically sound but may have implementation bugs
- Further debugging required to identify why the fix doesn't work
- Consider whether version counter is fundamentally flawed or just incorrectly implemented
- May need to revisit architectural assumptions about sync timing and state management
