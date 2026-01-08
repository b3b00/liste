# Sync Conflict Detection

## Problem
When using the application in multiple browser sessions (e.g., Chrome and Firefox), concurrent edits cause data loss. The "last write wins" strategy silently overwrites local changes without user awareness.

**Example scenario:**
1. Chrome: User modifies "item1" to "item1 - modified"
2. Firefox: Sends an update based on older state
3. Chrome: Receives Firefox update and loses the local modification

## Goal
Detect when incoming sync updates would overwrite local uncommitted changes and notify the user, allowing them to decide how to handle the conflict.

## Requirements

### Detection
- Track when local changes are made
- Detect when incoming sync updates conflict with local uncommitted changes
- Identify which items/categories are affected by conflicts

### User Notification
- Show a clear, non-intrusive notification when conflicts are detected
- Display what changes would be lost (local) vs what would be gained (remote)
- Notification should be visible but not block the UI

### User Actions
User should be able to:
- **Keep local changes** - reject incoming update, keep local version
- **Accept remote changes** - discard local edits, apply remote version
- **Merge both** (if applicable) - keep changes from both sides

### Edge Cases
- Multiple conflicts in rapid succession
- Conflicts involving deleted items
- Category changes that affect items
- User navigates away before resolving conflict

## Non-Goals
- Full operational transformation or CRDT implementation
- Automatic conflict resolution
- Change history/versioning system
- Real-time collaborative editing indicators
