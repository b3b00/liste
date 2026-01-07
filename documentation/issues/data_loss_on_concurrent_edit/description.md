# Data Loss on Concurrent Edit

## Issue Description
When the same list is open in multiple browsers, local modifications are silently lost when a sync update arrives from another browser.

## Reproduction Steps
1. Open Chrome browser with the list application
2. Verify the list contains an item (e.g., "item1")
3. Open Firefox browser with the same list
4. In Chrome: Modify "item1" to "item1 - modified"
5. In Firefox: Make any change that triggers a sync (add item, check item, etc.)
6. Firefox sends a full list update based on its (older) state
7. Chrome receives the update and overwrites local state

## Observed Behavior
- Chrome's modification ("item1 - modified") is lost
- The list reverts to "item1" (old label)
- No notification or warning to the user
- The change appears to succeed initially but is silently discarded

## Root Cause
Firefox sends an **older version** of the list to the backend. The backend propagates this older version to Chrome, which then overwrites Chrome's **more recent version**. The system has no way to detect that Firefox's update is based on stale data.

Key problem: **No version tracking** - the backend cannot distinguish between:
- A legitimate new update
- An outdated update from a browser with stale state

## Expected Behavior
The system should recognize that Chrome has a more recent version and either:
- Reject Firefox's older update, OR
- Detect the version mismatch and prevent Chrome from accepting the older data, OR
- Merge changes intelligently

## Impact
- User loses work without warning
- More recent data is overwritten by older data
- Confusing user experience
- Data integrity issues
- Loss of trust in the application

## Technical Context
- Current sync uses "Last Write Wins" strategy
- Full state replacement (not delta updates)
- **No versioning or timestamps** to detect which update is newer
- Backend blindly propagates all updates without validation
- See `documentation/sync-conflict-resolution.md` for architecture details
