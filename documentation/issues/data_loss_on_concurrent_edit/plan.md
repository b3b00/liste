# Fix Plan: Data Loss on Concurrent Edit

## Problem Summary
Local edits are lost when incoming sync updates arrive from browsers with stale data. Firefox opens with old cached data and broadcasts it, overwriting Chrome's newer modifications.

## Root Cause
When a browser (Firefox) loads the app:
1. It loads data from localStorage (which may be stale/old)
2. Immediately connects to WebSocket and broadcasts this old data
3. Other browsers (Chrome) receive and apply this old data
4. Newer modifications are lost

The browser has no way to know its cached data is outdated.

## Proposed Fix: Check Server on Load

### Core Strategy
Before broadcasting local data on app initialization, check if the server has a more recent version. Only broadcast if local data is actually newer or server has no data.

### Technical Approach

#### 1. Add Version/Timestamp to Data Model
Add a simple version counter to track data freshness:
- `version: number` - incremented on every modification
- Stored with list and categories data
- Compared on load to determine which version is newer

#### 2. Server-Side Storage
Store current list state on server (Durable Object):
- Keep latest list and categories state
- Keep version number
- Provide REST GET endpoint to fetch current state

#### 3. Client-Side Load Sequence
On app initialization (before WebSocket connection):
1. Load data from localStorage
2. **NEW**: Fetch current state from server via REST GET
3. Compare versions:
   - If server version > local version: use server data, update localStorage
   - If local version > server version: use local data (will broadcast via WebSocket)
   - If versions equal: use either (no conflict)
4. Connect to WebSocket
5. Start normal sync

### Implementation Details

#### Server Changes (ListSync Durable Object)

**Add storage state:**
```typescript
state: {
  list: ShopItem[],
  categories: Category[],
  version: number
}
```

**Add REST endpoint:**
- `GET /api/list/:listId` - returns current state with version
- Update state when receiving WebSocket updates
- Increment version on each update

#### Client Changes

**Update data model:**
- Add `version` field to SharedList interface
- Initialize version to 0 for new lists
- Increment version on every modification

**Add REST client function (client.ts):**
```typescript
async function getListState(listId: string): Promise<{list, categories, version}>
```

**Update initialization (App.svelte or main entry):**
1. Load from localStorage
2. Call `getListState(listId)`
3. Compare versions
4. Use newer data
5. Connect WebSocket

**Update all modification points:**
- Increment version when modifying list or categories
- Store version with data in localStorage

### Files to Modify

#### Server-Side
- `public/ListSync.ts` - Add state storage and REST endpoint handling
- `public/_worker.ts` or worker routing - Add GET endpoint route

#### Client-Side
- `public/model.ts` - Add version to SharedList interface
- `public/client.ts` - Add getListState() function
- `public/store.ts` - Include version in store data
- `public/App.svelte` - Add check-on-load logic before WebSocket connect
- `public/List.svelte` - Increment version on modifications
- `public/Categories.svelte` - Increment version on modifications
- `public/syncManager.ts` - Send version with updates

### Advantages of This Approach

✅ **Simple and Direct** - Solves root cause at app startup  
✅ **No Race Conditions** - Synchronous check before sync starts  
✅ **Works Offline** - Handles long offline periods correctly  
✅ **Minimal Runtime Overhead** - Only one check at startup  
✅ **Easy to Understand** - Clear version comparison logic  
✅ **Backward Compatible** - Can default version to 0 for existing data  

### Edge Cases Handled

#### First Time User
- localStorage empty, server has no data
- Version defaults to 0, proceeds normally

#### Long Offline Period
- Local version may be very old
- Server has newer version from other devices
- Local changes discarded in favor of server (expected behavior)

#### Simultaneous Startup
- Multiple browsers start at same time
- All fetch same server version
- First to modify increments version
- Others receive update via WebSocket normally

#### Network Failure During Check
- If GET fails, fall back to localStorage
- Log warning but proceed
- Better than blocking app startup

### Implementation Steps

#### Phase 1: Add Version Infrastructure
1. Update model.ts with version field
2. Update stores to include version
3. Migrate existing localStorage data (add version: 0)

#### Phase 2: Server-Side Storage
1. Add state storage to ListSync Durable Object
2. Persist state on WebSocket updates
3. Increment version on updates

#### Phase 3: REST Endpoint
1. Add GET endpoint in worker
2. Route to ListSync Durable Object
3. Return current state with version

#### Phase 4: Client Load Check
1. Add getListState() in client.ts
2. Update App.svelte initialization
3. Compare and load newer data
4. Only then connect WebSocket

#### Phase 5: Version Increment
1. Update all modification functions to increment version
2. Test version propagation
3. Verify localStorage updates

### Testing Plan

1. **Basic scenario**: Start Chrome, modify, close. Start Firefox - should load Chrome's version
2. **Concurrent start**: Start both simultaneously - last to modify wins
3. **Network failure**: Disable network during check - should fall back gracefully
4. **Version migration**: Test with old data without version field
5. **Long offline**: Close browser for hours, modify elsewhere, reopen - should sync

### Limitations

⚠️ **Still "Last Write Wins"** - Just more intelligent about "last"  
⚠️ **Requires server storage** - Durable Object must persist state  
⚠️ **Network dependency** - Startup check requires network (with fallback)  

This fix addresses the specific reported issue where stale browsers overwrite fresh data. For true multi-user collaborative editing, the broader "sync conflict detection" feature would still be needed.

## Critique: Version Counter Brittleness

### Fundamental Issues

#### 1. Concurrent Version Increment Race Condition
**Problem**: Two browsers can increment the same version simultaneously
- Chrome at version 5, modifies item → version 6
- Firefox at version 5, modifies item → version 6
- Both send version 6 to server
- Server accepts both as "valid"
- Last message to arrive wins, other changes lost

**Impact**: The exact scenario we're trying to fix can still occur mid-session

#### 2. No Causality Tracking
**Problem**: Version number is just a counter, doesn't capture relationships
- Browser A: v5 → v6 (adds item X)
- Browser B: v5 → v6 (adds item Y)
- No way to know these are independent changes that should merge
- System treats second arrival as "newer" and discards first

**Impact**: Legitimate concurrent edits are treated as conflicts

#### 3. Version Counter Reset Scenarios
**Problem**: Multiple ways version can reset to 0:
- Durable Object evicted/recreated (server restart)
- User clears localStorage
- Bug in version increment logic
- Migration from old data without version

**Impact**: After reset, all existing clients have "future" versions, causing confusion

#### 4. Lost Increments on Network Failure
**Problem**: Version increments locally but update doesn't reach server
- Local: v5 → v6 (modify item)
- Network fails, update never sent
- Local thinks version is 6
- Server still at version 5
- Next browser connects, gets v5 from server
- Sends v6 update, local changes lost

**Impact**: Network issues cause version drift and data loss

#### 5. Full State Replacement
**Problem**: Still replacing entire state, not merging
- Even with "correct" version, we overwrite everything
- Can't merge independent changes
- Can't preserve partial modifications

**Impact**: Granular concurrent edits impossible

#### 6. No Conflict Visibility
**Problem**: User has no idea conflicts occurred
- Changes silently overwritten
- No notification when version mismatch detected
- No way to recover lost changes

**Impact**: Same user experience issue as before, just less frequent

### Why This Still Solves The Reported Issue

Despite brittleness, this fixes the **specific startup scenario**:
- Browser opens with stale localStorage
- Checks server first
- Uses newer version
- **Only broadcasts if local is actually newer**

The race conditions above happen **during active use**, not at startup. The reported issue was specifically about **stale data at startup**, which this addresses.

### Better Long-Term Solutions

For robust sync, would need:

1. **Vector Clocks / Version Vectors**
   - Track causality, not just version number
   - Detect true conflicts vs. concurrent independent changes
   - Can merge non-conflicting changes

2. **Operational Transformation (OT)**
   - Transform operations based on concurrent changes
   - Preserve intent of all modifications
   - Used by Google Docs

3. **Conflict-free Replicated Data Types (CRDTs)**
   - Data structures that automatically merge
   - No conflicts by design
   - Examples: Automerge, Yjs

4. **Delta Synchronization**
   - Send operations, not full state
   - Server can merge concurrent operations
   - Can replay operations for conflict resolution

5. **Timestamp + Server Authority**
   - Server assigns authoritative timestamps
   - All clients defer to server time
   - Server detects concurrent modifications
   - Can notify clients of conflicts

### Recommended Compromise

**For this fix**: Accept the brittleness as acceptable for:
- Single user, multiple devices
- Occasional concurrent use
- Startup stale-data issue (primary goal)

**For future**: Plan to implement proper conflict detection when:
- True multi-user collaboration needed
- Concurrent editing becomes common
- Data loss from races becomes noticeable

### Mitigation Strategies

To reduce brittleness impact:

1. **Atomic Version Increment on Server**
   - Server assigns versions, not client
   - Clients send modifications without version
   - Server increments and broadcasts
   - Eliminates race conditions

2. **Coarse-Grained Locking**
   - First client to modify "locks" list for N seconds
   - Other modifications queued
   - Not ideal for UX but prevents conflicts

3. **User Notification**
   - When version mismatch detected, show warning
   - "List was modified elsewhere, reloading..."
   - At least user knows something happened

4. **Pessimistic Loading**
   - Always prefer server version on load
   - Only use localStorage if server unreachable
   - Reduces chance of stale data propagation

**Recommendation**: Implement #3 (user notification) as part of this fix for better UX.

## Alternative: Merkle Tree Approach?

### What Merkle Tree Would Provide

A Merkle tree could help detect **which specific items** changed:
- Hash each item/category individually
- Build tree: leaf hashes → branch hashes → root hash
- Compare root hashes to detect if ANY change occurred
- Traverse tree to find EXACTLY which items differ
- Can merge non-conflicting item changes

### Development Effort Analysis

**Compared to simple version counter: Significantly MORE work**

#### Additional Complexity:
1. **Hash computation** - Need to hash every item on every change
2. **Tree structure** - Build and maintain tree structure (not just a counter)
3. **Tree comparison** - Implement tree traversal and diff algorithm
4. **Merge logic** - Handle partial tree merges for non-conflicting changes
5. **Serialization** - Store/transmit tree structure efficiently
6. **Performance** - Hashing overhead on every modification

**Estimated effort**: 3-5x more code than version counter approach

### Does It Solve The Brittleness?

**No - Same fundamental issues remain:**

❌ **Still no causality tracking**
- Two browsers both modify item X → different hashes
- Which hash is "correct"? Still last-write-wins
- Can detect conflict but can't resolve it

❌ **Root hash collision still possible**
- Different modification orders can produce same hash
- Hash(A+B) might equal Hash(C) - depends on implementation

❌ **Concurrent modifications still conflict**
- Browser A: adds item X → new tree hash
- Browser B: adds item Y → different tree hash
- Both valid, both conflicting, still can't merge automatically

❌ **No operation history**
- Tree shows current state, not how we got there
- Can't replay or transform operations
- Can't determine user intent

### What Merkle Tree DOES Help With

✅ **Efficient difference detection**
- Quick check if ANY change occurred (compare root hash)
- Pinpoint exact items that differ
- Avoid sending full state if no changes

✅ **Partial updates**
- Only send changed items/branches
- Bandwidth efficient for large lists
- Good for sync optimization

✅ **Data integrity**
- Detect corruption or tampering
- Verify received data is complete
- Good for security/reliability

### Better Use Case For Merkle Tree

Merkle tree is excellent for **sync optimization**, not conflict resolution:
- Use AFTER establishing what to sync
- Minimize data transfer
- Verify integrity
- Detect which items to update

But still need separate mechanism to decide **which version wins**.

### Simpler Alternatives That Help More

For this specific issue, these are simpler AND more effective:

#### 1. Last-Modified Timestamp Per Item
```typescript
interface ShopItem {
  id: number;
  label: string;
  // ...
  modifiedAt: number; // timestamp
}
```
- Compare timestamps per item, not whole list
- Can merge non-conflicting items
- Still simple counter-based
- Much less code than Merkle tree

**Effort**: +20% vs version counter  
**Benefit**: Solves item-level conflicts

#### 2. Server-Assigned Version
```typescript
// Client sends modification
{ op: "update", itemId: 5, label: "new" }

// Server responds with version
{ op: "update", itemId: 5, label: "new", version: 42 }
```
- Server is source of truth
- No client-side race conditions
- Clients just apply server version
- Dead simple

**Effort**: +10% vs client version counter  
**Benefit**: Eliminates race conditions entirely

#### 3. Simple Conflict Detection + User Choice
- Keep version counter (simple)
- On mismatch, fetch both versions
- Show user: "Local changes vs Remote changes"
- Let user pick or merge manually

**Effort**: +30% vs version counter  
**Benefit**: User controls conflict resolution, no data loss

### Recommendation

**For this fix**: Stick with version counter + startup check
- Solves the reported issue
- Minimal complexity
- Can enhance later if needed

**For future optimization**: Consider Merkle tree for:
- Bandwidth optimization (large lists)
- Partial sync (only changed items)
- Integrity verification

**For conflict resolution**: Use timestamps or server-assigned versions, NOT Merkle tree

**Bottom Line**: Merkle tree is overkill for this problem and doesn't solve the core brittleness issues. It's a tool for efficient sync, not conflict resolution.

## Rollback Plan

If issues arise:
1. Server can return empty response (no stored state)
2. Client falls back to localStorage-only behavior
3. Remove version comparison logic
4. Revert to current sync behavior
