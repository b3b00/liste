# Sync Conflict Detection - Implementation Plan

## Functional Requirements
- Detect when incoming sync updates would overwrite uncommitted local changes
- Show notification to user with conflict details
- Allow user to choose: keep local, accept remote, or merge
- Handle multiple conflict scenarios gracefully

## Technical Approach

### Change Detection Strategy

#### Local Change Tracking
- Add timestamps to track when local modifications occur
- Maintain a "dirty flag" or "pending changes" indicator
- Track which specific items/categories have uncommitted local edits
- Store local change timestamp at item level

#### Conflict Detection Logic
In `syncManager.ts`, before applying remote updates:
1. Check if local stores have uncommitted changes (dirty flag set)
2. Compare remote update items with local modified items
3. Identify conflicts: same item ID modified locally and in remote update
4. If conflicts found, pause sync and trigger conflict resolution UI

### Conflict Resolution UI

#### Notification Component
- Create a modal or toast notification component
- Display affected items with side-by-side comparison:
  - Local version (what would be lost)
  - Remote version (what would be applied)
- Show conflict metadata: when each change was made

#### User Actions
Three resolution options:
1. **Keep Local** - Reject remote update, broadcast local version to other clients
2. **Accept Remote** - Apply remote update, discard local changes
3. **Merge** - For non-conflicting properties, keep both changes

### Technical Constraints

#### Timestamp Management
- Add `modifiedAt` timestamp field to ShopItem and Category interfaces
- Update timestamp on every local modification
- Include timestamps in sync messages
- Use timestamps to determine which change is newer (for user information only)

#### Store Changes
Minimal changes to existing stores:
- Add `localModificationTimestamp` to track pending changes
- Add `lastSyncTimestamp` to track last successful sync
- Track dirty items in a separate structure: `Map<itemId, timestamp>`

#### SyncManager Updates
- Enhance `isApplyingRemoteUpdate` logic to check for conflicts first
- Add conflict detection before `list.set()` and `categories.set()`
- Implement conflict queue for multiple rapid conflicts
- Add resolution handlers for each user action

#### State Management
- Pause automatic sync when conflict detected
- Queue incoming updates while conflict UI is displayed
- Resume sync after user resolution
- Handle case where user dismisses notification without resolving

### Architecture Components

#### New Files
1. `ConflictResolver.svelte` - UI component for conflict resolution
2. `conflictDetection.ts` - Conflict detection logic

#### Modified Files
1. `syncManager.ts` - Add conflict detection before applying updates
2. `model.ts` - Add timestamp fields to ShopItem and Category
3. `store.ts` - Add dirty tracking mechanism
4. `List.svelte` - Show conflict notification component

### Data Structure Changes

#### Enhanced Item Model
```typescript
interface ShopItem {
    // ... existing fields
    modifiedAt?: number; // timestamp
}
```

#### Conflict Data Structure
```typescript
interface Conflict {
    itemId: number;
    localVersion: ShopItem;
    remoteVersion: ShopItem;
    localTimestamp: number;
    remoteTimestamp: number;
}
```

### User Experience Considerations

#### Non-Blocking Design
- Conflict notification should not block entire UI
- User can continue working during conflict resolution
- Unaffected items remain functional

#### Clear Communication
- Use French labels consistent with app
- Clearly indicate what will happen with each choice
- Show preview of result before applying

#### Timeout Behavior
If user doesn't respond within reasonable time:
- Default to "Accept Remote" to maintain sync
- Log the auto-resolution
- Show brief notification of what happened

## Implementation Phases

### Phase 1: Timestamp Infrastructure
- Add timestamp fields to models
- Update all modification points to set timestamps
- Include timestamps in sync messages

### Phase 2: Conflict Detection
- Implement dirty tracking in stores
- Add conflict detection logic in syncManager
- Test detection accuracy

### Phase 3: Resolution UI
- Create ConflictResolver component
- Integrate with syncManager
- Implement resolution actions

### Phase 4: Edge Cases & Polish
- Handle rapid conflicts
- Test deleted item conflicts
- Add auto-resolution timeout
- Refine UX based on testing

## Constraints & Risks

### Constraints
- Must maintain backward compatibility with existing sync protocol
- Should not significantly increase message size
- Must handle offline/online transitions
- Cannot break existing single-user workflow

### Risks
- Timestamp sync issues across devices with different clocks
- Race conditions during conflict resolution
- Increased complexity in syncManager
- Performance impact of comparison logic

### Mitigation
- Use monotonic counters if clock sync is problematic
- Lock sync during resolution
- Comprehensive testing with multiple clients
- Optimize comparison for large lists

## Files to Modify
- [public/syncManager.ts](c:/Users/olduh/dev/liste/public/syncManager.ts)
- [public/model.ts](c:/Users/olduh/dev/liste/public/model.ts)
- [public/store.ts](c:/Users/olduh/dev/liste/public/store.ts)
- [public/List.svelte](c:/Users/olduh/dev/liste/public/List.svelte)
- [public/App.svelte](c:/Users/olduh/dev/liste/public/App.svelte)

## New Files to Create
- [public/ConflictResolver.svelte](c:/Users/olduh/dev/liste/public/ConflictResolver.svelte)
- [public/conflictDetection.ts](c:/Users/olduh/dev/liste/public/conflictDetection.ts)
