# Offline Functionality with Authentication

## How It Works

This PWA supports **true offline functionality** while maintaining secure authentication for cloud sync. Users can continue using the app offline with locally cached data, and changes will sync when they reconnect.

## Architecture Overview

### Three-Layer Approach

1. **Service Worker** (worker.js) - Caches app assets and handles offline requests
2. **Local Storage** - Stores user data, auth tokens, and pending sync flags
3. **Cloud Sync** (when online) - Syncs data to server with multi-tenant isolation

## Offline Behavior

### When You're Offline

✅ **You CAN:**
- Use the app with cached UI and assets
- View your locally stored shopping lists
- Add, edit, and delete items
- Modify categories
- All changes are saved to localStorage
- App shows "📴 Offline Mode" indicator

❌ **You CANNOT:**
- Sync changes to the cloud
- Access lists from other devices
- Fetch fresh data from server
- Login/logout (requires network)

### When You Come Back Online

✅ **Automatic behavior:**
- App detects online status
- Offline indicator disappears
- Next save operation syncs to cloud
- Auth token is validated with server

⚠️ **Manual sync:**
- Changes made offline are marked for sync
- User should manually save/refresh to push changes

## Authentication Flow

### First-Time User (Must Be Online)
1. User visits app → Sees login prompt
2. Clicks "Sign in with Google" → OAuth flow (requires network)
3. Auth token stored in localStorage
4. User data cached locally
5. Can now use app offline

### Returning User (Can Be Offline)
1. User visits app → Auth token loaded from localStorage
2. App works immediately with cached data
3. If online: token validated, data synced
4. If offline: app works with local data only

### Offline-First User (Never Logged In)
1. User visits app while offline
2. Sees message: "📴 You're offline. You can still use the app with cached data."
3. Can use app with local data only
4. When online: Prompted to sign in for cloud sync

## Code Implementation

### Client-Side (client.ts)

```typescript
// Check if online before API calls
if (!navigator.onLine) {
    // Use local data
    return undefined; // Falls back to localStorage
}

// Try to fetch from server
try {
    const response = await fetch(url, { headers: getAuthHeaders() });
    // Handle response
} catch (error) {
    // Network error - use local data
    return undefined;
}
```

### Save with Offline Support

```typescript
try {
    const response = await fetch(url, { method: 'POST', body: data });
    if (response.ok) {
        // Sync successful
        localStorage.removeItem('pending_sync_' + id);
    }
} catch (error) {
    // Network error - mark for later sync
    localStorage.setItem('pending_sync_' + id, 'true');
    return true; // Don't show error to user
}
```

### UI Adaptation (AuthWidget.svelte)

```svelte
<script>
    let isOnline = navigator.onLine;
    
    window.addEventListener('online', () => { isOnline = true; });
    window.addEventListener('offline', () => { isOnline = false; });
</script>

{#if !isOnline}
    <span class="offline-badge">📴 Offline Mode</span>
{/if}
```

## Security Model

### Authentication Is Optional for Offline Use
- App doesn't block offline usage
- Local data is accessible without auth
- Auth only required for cloud sync

### What's Stored Locally (Unencrypted)
- Shopping lists (categories and items)
- User profile (name, email, picture)
- Auth token (Google ID token)
- Pending sync flags

⚠️ **Security Note:** Local data is stored in browser storage (localStorage) which is:
- Accessible by the user
- Not encrypted by default
- Cleared when cache/site data is cleared
- Isolated per-origin (cannot be accessed by other websites)

### What's Protected
- **Cloud data** is always filtered by user_id
- **Auth tokens** are validated on every server request
- **No token = no cloud access** (but local access works)

## Sync Behavior

### Pending Sync Tracking

When offline, changes are marked with a flag:
```typescript
localStorage.setItem('pending_sync_listid', 'true');
```

### Sync on Reconnect

```typescript
// Check for pending syncs
export function hasPendingSync(id: string): boolean {
    return localStorage.getItem(`pending_sync_${id}`) === 'true';
}

// Sync when back online
window.addEventListener('online', async () => {
    await syncPendingChanges();
});
```

### Conflict Resolution

**Current behavior:** Last write wins
- Offline changes overwrite server data on next save
- No merge or conflict detection (yet)

**Best practice for users:**
- Use one device at a time
- Sync (save) before switching devices
- Avoid editing same list on multiple devices simultaneously

## Service Worker Behavior

### Cached Assets (Always Available Offline)
- HTML, CSS, JavaScript bundles
- Icons and images
- Material UI fonts
- Core app functionality

### Network-First (With Fallback)
- API requests to `/list/*`, `/lists`, `/auth/*`
- Try network first
- Fall back to cache on failure
- Falls back to local data in code

### Cache Strategy

```javascript
self.addEventListener('fetch', async function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        return response || fetchAndCache(event.request);
      })
  );
});
```

## User Experience

### Visual Indicators

**Offline Badge**
```
📴 Offline Mode
```

**Login Prompt (Offline)**
```
📴 You're offline. You can still use the app with cached data.
Sign in when you're back online to sync your changes.
```

**Login Prompt (Online)**
```
Please sign in to sync your lists across devices
[Sign in with Google]
```

## Testing Offline Mode

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Set throttling to "Offline"
4. App should continue working with local data
5. Offline indicator should appear

### Real Offline Test
1. Disable Wi-Fi/mobile data
2. Open app (if already cached)
3. Add/edit items
4. Re-enable network
5. Save changes → Should sync to server

## Migration from Pre-Auth Version

### Existing Users (Before OAuth)
- Local data remains accessible
- Prompted to sign in for cloud sync
- Can continue using offline without signing in
- Sign in links local data to Google account

### Data Migration Path
1. User has local data (no auth)
2. User signs in → creates account
3. Local data can be manually exported
4. User saves to server → syncs to account

## Best Practices

### For Developers

✅ **DO:**
- Always check `navigator.onLine` before API calls
- Catch network errors gracefully
- Show offline indicators to users
- Store pending sync flags
- Fall back to local data when server unavailable

❌ **DON'T:**
- Block app usage when offline
- Force authentication for local operations
- Show errors for expected offline behavior
- Clear local data on auth errors

### For Users

✅ **DO:**
- Sign in for multi-device sync
- Save regularly when online
- Use one device at a time
- Let app sync before closing

⚠️ **BE AWARE:**
- Offline changes only save locally
- Clearing browser data loses offline changes
- Multiple devices can cause conflicts
- Auth required for first login (must be online)

## Troubleshooting

**"App won't load offline"**
- Visit app while online first to cache assets
- Check if service worker registered
- Clear cache and reload (while online)

**"Changes not syncing"**
- Check network connection
- Check if signed in (`localStorage.getItem('google_id_token')`)
- Try saving again after confirming online

**"Lost data after clearing cache"**
- localStorage is tied to browser storage
- Clearing site data removes offline changes
- Sign in and sync regularly to protect data

**"Can't login offline"**
- OAuth requires network connection
- Wait until back online
- Can still use app with local data

## Future Enhancements

Potential improvements:
- Background sync API for automatic sync
- Conflict resolution with merge strategies
- Offline change queue with retry logic
- IndexedDB for larger offline storage
- End-to-end encryption for local data
- Progressive data loading
