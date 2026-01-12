# Plan: LocalStorage Migration (Feature #9)

## Objective

Migrate existing localStorage data from the old structure (single list) to the new structure (multiple lists) without data loss.

## Problem Statement

Users who have been using the app before feature #8 have data stored as:

-   `list`: ShopItem[]
-   `categories`: Category[]

After feature #8, the structure is:

-   `lists`: StoredList[] (where StoredList = {id, categories, items, version})
-   `listsHistory`: ListMetadata[]

Without migration, existing users would lose their data.

## Migration Strategy

### 1. Detection

Check if old structure exists and new structure doesn't:

-   localStorage contains `list` key
-   localStorage contains `categories` key
-   localStorage does NOT contain `lists` key OR `lists` is empty

### 2. Migration Process

When old structure is detected:

1. Read existing `list` and `categories` from localStorage
2. Create a new StoredList entry with:
    - `id`: "liste" (default name)
    - `categories`: existing categories array
    - `items`: existing list array (rename `list` → `items`)
    - `version`: 0
3. Create `lists` array containing this single entry
4. Create `listsHistory` entry for the migrated list
5. Update `settings` to point to "liste" as current list
6. Keep original `list` and `categories` for backwards compatibility (don't delete yet)

### 3. Implementation Location

Best place: `store.ts` in the `useLocalStorage()` method of the `lists` store

-   Runs once on app initialization
-   Has access to all stores
-   Can perform migration before any component loads

### 4. Edge Cases

-   Empty list/categories: Still migrate to maintain structure consistency
-   Malformed data: Handle JSON parse errors gracefully
-   Partial migration: If `lists` exists but `listsHistory` doesn't, only create history
-   Multiple runs: Check if migration already done to avoid duplicates

## Technical Constraints

### Data Integrity

-   No data loss during migration
-   Original data remains until migration confirmed successful
-   If migration fails, app should still work with old structure

### User Experience

-   Migration should be transparent (no user action required)
-   No visible delay or loading screens
-   Console logging for debugging purposes

### Backwards Compatibility

-   Keep old localStorage keys initially for safety
-   Can be cleaned up in a future version after migration proven stable

## Implementation Steps

### Step 1: Add Migration Logic to store.ts

Modify the `lists` store creation to include migration check in `useLocalStorage()`

### Step 2: Migration Function

Create helper function to:

-   Detect old structure
-   Transform data format
-   Create new lists and listsHistory entries
-   Log migration status

### Step 3: Settings Update

Ensure `settings` store points to the migrated list ("liste") as active list

### Step 4: Testing

-   Test with empty localStorage
-   Test with old structure data
-   Test with new structure (no migration needed)
-   Test with partial/corrupted data

## Success Criteria

-   Existing users see their data after migration
-   New users don't trigger migration logic
-   No console errors during migration
-   Migration happens only once
-   Data structure matches new format after migration
