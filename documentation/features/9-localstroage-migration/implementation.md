# Implementation: LocalStorage Migration (Feature #9)

## Overview

Implemented automatic migration from single-list localStorage structure to multi-list structure when the app detects old data format.

## Changes Made

### 1. Modified `store.ts`

Replaced the simple `createWritableStore` call for `lists` with a custom `createListsStore` function that includes migration logic.

#### Key Features:

**Detection Logic:**

-   Checks for presence of old `list` and `categories` keys
-   Checks if `lists` key is missing or empty
-   Only migrates if old data exists and new structure doesn't

**Migration Process:**

```typescript
1. Read old list and categories from localStorage
2. Create StoredList object:
   - id: "liste" (default)
   - categories: from old categories key
   - items: from old list key
   - version: 0
3. Save to new lists array
4. Update listsHistory with entry for "liste"
5. Update settings.id to point to "liste"
6. Keep old keys intact (for backwards compatibility)
```

**Error Handling:**

-   Wrapped in try/catch blocks
-   Logs errors to console
-   Falls back to empty array on failure
-   Original data preserved

**Logging:**

-   Console logs for migration start
-   Item and category counts
-   Success/failure messages
-   Debug information for troubleshooting

## Code Location

File: `public/store.ts`

-   Function: `createListsStore()`
-   Executed: On app initialization when `lists.useLocalStorage()` is called

## Migration Flow

```
App Start
    ↓
lists.useLocalStorage() called
    ↓
Check localStorage for 'list' and 'categories'
    ↓
┌─────────────────┬─────────────────┐
│ Old data found  │ No old data     │
│ New data empty  │ Or new data OK  │
└────────┬────────┴────────┬────────┘
         ↓                  ↓
    MIGRATE           Load existing
         ↓                  ↓
    - Parse old data        │
    - Create StoredList     │
    - Update history        │
    - Update settings       │
         ↓                  ↓
         └──────────────────┘
                  ↓
            Set store value
                  ↓
         Subscribe to changes
```

## Testing Scenarios

### Scenario 1: Fresh Install

-   No localStorage data
-   Result: Empty lists array, no migration

### Scenario 2: Existing User (Pre-Feature #8)

-   localStorage has `list` and `categories`
-   localStorage missing `lists` or has empty array
-   Result: Data migrated to "liste", history and settings updated

### Scenario 3: Updated User (Post-Feature #8)

-   localStorage has `lists` with data
-   Result: Existing data loaded, no migration

### Scenario 4: Corrupted Data

-   Malformed JSON in old keys
-   Result: Migration fails gracefully, empty array set

## Backwards Compatibility

**Original keys preserved:**

-   `list` key remains in localStorage
-   `categories` key remains in localStorage
-   Allows rollback to older app version if needed
-   Can be cleaned up in future release

**Settings handling:**

-   Only updates if no id set or creates new settings
-   Preserves autoSave preference if it exists

## Success Metrics

✅ No data loss during migration
✅ Transparent to user (no UI interruption)
✅ Logged for debugging
✅ Single execution (doesn't re-migrate)
✅ Graceful error handling
✅ Original data preserved

## Console Output Examples

**Successful Migration:**

```
[STORE] Detecting old localStorage structure, starting migration...
[STORE] Migrated 15 items and 5 categories to list "liste"
[STORE] Created listsHistory entry for migrated list
[STORE] Updated settings to point to "liste"
[STORE] Migration completed successfully
```

**No Migration Needed:**

```
[STORE] Loaded 3 lists from localStorage
```

**Migration Error:**

```
[STORE] Detecting old localStorage structure, starting migration...
[STORE] Migration failed: SyntaxError: Unexpected token...
```

## Future Improvements

-   Add migration version tracking
-   Support cleaning up old keys after confirmed migration
-   Add migration analytics/telemetry
-   Support for multiple old list formats if needed
