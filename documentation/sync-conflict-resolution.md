# Synchronization and Conflict Resolution Strategy

## Overview

The Liste application uses real-time WebSocket-based synchronization to keep list data and categories in sync across multiple browser sessions and users. This document explains how the synchronization works and how conflicts are handled.

## Architecture

### Components

1. **SyncManager (Client-side)** - Located in `syncManager.ts`
   - Manages WebSocket connection to the server
   - Monitors local store changes (list items and categories)
   - Broadcasts local changes to the server
   - Receives and applies remote changes from other clients

2. **ListSync Durable Object (Server-side)** - Located in `ListSync.ts`
   - Maintains WebSocket connections from all clients for a given list
   - Broadcasts updates from one client to all other connected clients
   - Provides message routing and session management

3. **Svelte Stores** - Located in `store.ts`
   - Reactive data stores for list items and categories
   - Trigger updates when data changes

## Synchronization Flow

### Sending Local Changes

1. User makes a change in their browser (adds/edits/deletes an item or category)
2. The Svelte store is updated locally
3. Store subscription in `syncManager.ts` detects the change
4. If not applying a remote update, SyncManager sends the change via WebSocket to the server
5. ListSync Durable Object receives the message
6. Server broadcasts the change to all other connected clients (excluding the sender)

### Receiving Remote Changes

1. Client receives a WebSocket message with `list_update` or `categories_update` type
2. SyncManager sets `isApplyingRemoteUpdate = true` flag
3. The complete new state is applied to the local store (full state replacement)
4. After 100ms timeout, the flag is cleared to resume normal broadcasting
5. UI updates reactively via Svelte's reactivity system

## Conflict Resolution Strategy

### Current Implementation: **Last Write Wins (LWW)**

The current implementation uses a **Last Write Wins** strategy with **full state replacement**:

#### How It Works

- **No version tracking**: Updates are not versioned or timestamped for comparison
- **Full state sync**: Each update contains the complete list/categories state, not deltas
- **Immediate overwrite**: When a remote update arrives, it completely replaces the local state
- **No merge logic**: Concurrent edits from different clients do not merge; the last received update wins

#### Example Scenario

```
Time    Client A (Firefox)           Client B (Chrome)           Server State
----    ------------------           -----------------           ------------
T0      List: [A, B, C]             List: [A, B, C]             [A, B, C]
T1      Adds item D                 Adds item E
        List: [A, B, C, D]          List: [A, B, C, E]
T2      → Sends [A,B,C,D]           → Sends [A,B,C,E]
T3                                  ← Receives [A,B,C,D]        [A,B,C,D]
        ← Receives [A,B,C,E]        List: [A,B,C,D]
T4      List: [A,B,C,E]                                         [A,B,C,E]
```

**Result**: Depending on network timing, either item D or item E will be lost. The last update to reach other clients wins.

### Advantages of Current Strategy

✅ **Simple implementation** - Easy to understand and maintain  
✅ **No complex state** - No need to track version numbers or vector clocks  
✅ **Fast synchronization** - Minimal processing overhead  
✅ **Works well for single-user scenarios** - When one person uses multiple devices  
✅ **Eventual consistency** - All clients eventually see the same state  

### Limitations

❌ **Data loss on concurrent edits** - Changes made simultaneously on different clients can be lost  
❌ **No conflict detection** - Users are not notified when their changes are overwritten  
❌ **Race conditions** - Network latency determines which change survives  
❌ **Full state transfer** - Bandwidth inefficient for large lists (entire list sent every time)  
❌ **No undo of lost changes** - Overwritten changes are permanently lost  

## Feedback Loop Prevention

The system prevents infinite feedback loops using the `isApplyingRemoteUpdate` flag:

1. When a remote update arrives, the flag is set to `true`
2. The store update triggers subscriptions
3. The broadcast logic checks the flag and skips sending if true
4. After 100ms (ensuring all reactive updates complete), the flag clears
5. Normal broadcasting resumes

This prevents Client A → Server → Client B → Server → Client A... infinite loops.

## Future Improvements

To handle conflicts better, consider these strategies:

### 1. Operational Transformation (OT)
- Transform concurrent operations to maintain consistency
- Complex but handles most conflict scenarios
- Used by Google Docs

### 2. Conflict-free Replicated Data Types (CRDTs)
- Data structures designed for distributed systems
- Automatic conflict resolution
- Examples: Automerge, Yjs
- Higher complexity and memory overhead

### 3. Version Vectors / Vector Clocks
- Track causality between updates
- Detect concurrent modifications
- Allow explicit conflict resolution

### 4. Optimistic Locking with Versions
```javascript
{
  list: [...],
  version: 5,
  timestamp: 1704460800000
}
```
- Include version number in each update
- Reject updates with outdated versions
- Notify user of conflict and allow manual resolution

### 5. Delta Synchronization
- Send only changes (add/edit/delete operations) instead of full state
- More bandwidth efficient
- Easier to merge concurrent operations
- Example:
```javascript
{
  type: "operation",
  op: "add",
  item: { id: 10, label: "new item" },
  version: 5
}
```

## Recommendations

For the Liste application's use case (personal task management):

1. **Short term**: Current LWW strategy is acceptable if:
   - Primary usage is single-user with multiple devices
   - Concurrent edits are rare
   - Users are aware of potential data loss

2. **Medium term** (recommended):
   - Add timestamps to detect conflicts
   - Show notification when remote changes overwrite local edits
   - Implement a simple undo buffer to recover lost changes

3. **Long term** (for multi-user collaboration):
   - Implement delta synchronization
   - Use CRDTs for automatic conflict resolution
   - Add user presence indicators
   - Show who is editing what in real-time

## Implementation Notes

### Feedback Loop Detection
```typescript
// In syncManager.ts
if (syncManager['isApplyingRemoteUpdate']) {
    console.log('[SYNC] Skipping broadcast - this is a remote update');
    lastListValue = JSON.parse(JSON.stringify(value));
    return;
}
```

### Deep Cloning
Deep cloning is used to avoid object reference issues:
```typescript
const newList = data.list.map((item: any) => ({...item}));
lastListValue = JSON.parse(JSON.stringify(value));
```

### Session Filtering
```typescript
// Only broadcast to other sessions for the same list
if (session !== sender && session.listId === sender.listId) {
    session.webSocket.send(messageStr);
}
```

## Monitoring and Debugging

Enable sync logging by checking browser console:
- `[SYNC]` prefix - Client-side SyncManager events
- `[DURABLE]` prefix - Server-side ListSync Durable Object events
- `[WORKER]` prefix - Cloudflare Worker routing events

Key metrics to monitor:
- Message frequency (updates/second)
- Round-trip latency (client → server → client)
- Number of active sessions per list
- Reconnection frequency

## Conclusion

The current **Last Write Wins** strategy provides a simple, functional synchronization mechanism suitable for personal use cases. For collaborative scenarios with multiple concurrent users, consider implementing one of the more sophisticated conflict resolution strategies outlined above.
