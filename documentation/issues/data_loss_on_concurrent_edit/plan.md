# Fix Plan: Data Loss on Concurrent Edit

## Problem Summary
Local edits are lost when incoming sync updates arrive, because the current implementation performs full state replacement without checking for local uncommitted changes.

## Root Cause
In `syncManager.ts`, the `applyRemoteUpdate` function directly replaces the entire store state:
- Incoming update contains full list/categories state
- Local store is completely replaced with remote state
- No check for pending local modifications
- No temporary buffer or comparison

## Proposed Fix: Pending Changes Buffer

### Core Strategy
Instead of immediately applying remote updates, check if there are local modifications made within a recent time window. If local changes exist, defer the remote update briefly to allow local changes to sync out first.

### Technical Approach

#### 1. Track Local Modifications
Add a simple timestamp tracking mechanism:
- Track timestamp of last local modification
- Store in a variable: `lastLocalModificationTime`
- Update whenever user makes a change (add, edit, delete, move items)

#### 2. Defer Remote Updates
When remote update arrives:
- Check if local modification happened recently (within last 2-3 seconds)
- If yes: queue the remote update with a small delay (1-2 seconds)
- If no: apply immediately as before
- This gives local change time to propagate to other clients

#### 3. Update Queueing
Implement simple update queue:
- Hold incoming remote update temporarily
- After delay, check again for pending local changes
- Apply update when clear window exists
- Limit queue size to prevent memory issues

### Implementation Details

#### Modified Files
**syncManager.ts** - Add deferral logic:
- `lastLocalModificationTime: number` - tracks last local change
- `updateLocalModificationTime()` - called on local changes
- `shouldDeferRemoteUpdate()` - checks if update should be delayed
- `queuedUpdate` - holds pending remote update
- Modified `applyRemoteUpdate()` - check before applying

**List.svelte** - Notify on modifications:
- Call `syncManager.updateLocalModificationTime()` in:
  - `AddOrUpdate()`
  - `shop()`
  - `remove()`
  - `moveToCategory()`
  - `updateItemLabel()` (new edit feature)

**Categories.svelte** - Same pattern for category changes

#### Constants
```typescript
const LOCAL_MODIFICATION_WINDOW = 2000; // 2 seconds
const REMOTE_UPDATE_DEFER_TIME = 1500; // 1.5 seconds
const MAX_DEFER_COUNT = 3; // Maximum times to defer same update
```

### Edge Cases Handled

#### Rapid Local Edits
- Update timestamp on each edit
- Remote updates keep getting deferred
- Prevents interruption during active editing session

#### Multiple Browsers Editing Simultaneously
- Both browsers defer each other's updates
- Eventually one stops editing
- Updates flow through after brief pause
- Last completed change wins (but after proper propagation)

#### Network Delays
- If update is old (timestamp diff > 5 seconds), apply immediately
- Prevents indefinite deferral due to network issues

#### User Leaves Tab
- System eventually applies queued updates
- Maximum defer count prevents permanent blocking

### Advantages of This Approach

✅ **Minimal Code Changes** - Small modification to syncManager  
✅ **No Data Model Changes** - No new fields in ShopItem/Category  
✅ **No UI Changes** - Invisible to user when working correctly  
✅ **Low Risk** - Falls back to current behavior if deferral logic fails  
✅ **Backward Compatible** - Works with existing sync protocol  
✅ **Solves Reported Issue** - Prevents the specific data loss scenario  

### Limitations

⚠️ **Not a Complete Solution** - Still has edge cases:
- If both browsers edit same item simultaneously (rare)
- Very long network delays might still cause issues
- Doesn't detect actual conflicts, just defers updates

⚠️ **Temporary Desync** - Brief period where clients see different states

⚠️ **Heuristic-Based** - Uses time windows, not true conflict detection

### Future Improvements
This fix addresses the immediate issue. For robust multi-user editing, the broader "sync conflict detection" feature should be implemented later.

## Testing Plan

### Test Cases
1. **Basic Reproduction** - Verify original issue is fixed
2. **Rapid Edits** - Multiple quick edits in one browser
3. **Simultaneous Edits** - Both browsers editing different items
4. **Network Latency** - Simulate slow connections
5. **Browser Sleep/Wake** - Tab backgrounded then restored
6. **Multiple Deferrals** - Verify max defer count works

### Success Criteria
- Original reproduction case no longer loses data
- No infinite deferral loops
- Updates eventually propagate to all clients
- No memory leaks from queued updates

## Implementation Steps
1. Add tracking variables to syncManager
2. Implement deferral logic functions
3. Update all modification points to notify syncManager
4. Add queueing mechanism for deferred updates
5. Test with multiple browsers
6. Add logging for debugging
7. Monitor in production for unexpected behavior
