# Pusher Integration Setup Guide

## Security Note: Public vs Secret Keys

**Pusher uses a two-key security model:**

- **PUSHER_KEY (Public Key)** - Safe to expose in client-side code (index.html, bundle.js)
  - Only allows subscribing to channels and receiving messages
  - Cannot send messages or perform privileged operations
  - Designed to be public like an API endpoint
  
- **PUSHER_SECRET (Secret Key)** - Must NEVER be exposed to clients
  - Only used on backend/worker
  - Required to broadcast/send messages
  - Stored in .dev.vars (local) and Cloudflare environment variables (production)

**Why this is secure:**
- Clients can only **listen** for updates (read-only)
- Only your backend can **broadcast** updates (requires secret)
- Even if someone has your public key, they cannot spam or send messages to your channels

This is the industry-standard approach used by Firebase, Ably, Socket.io, and other real-time services.

## 1. Get Pusher Credentials

1. Sign up at https://pusher.com/channels
2. Create a new Channels app
3. Get your credentials from the App Keys section:
   - App ID
   - Key
   - Secret
   - Cluster

## 2. Configure Environment Variables

### For Local Development:
Create a `.dev.vars` file (copy from `.dev.vars.example`):
```bash
PUSHER_SECRET=your-secret-key
```

### For Production (Cloudflare Pages):
1. Go to your Cloudflare Pages project settings
2. Navigate to Environment Variables
3. Add these variables:
   - `PUSHER_SECRET` = your-secret-key

### Update wrangler.toml:
Replace the placeholder values in `[vars]` section:
```toml
PUSHER_APP_ID = "123456"
PUSHER_KEY = "abc123def456"
PUSHER_CLUSTER = "us2"
```

### Update index.html:
Replace the placeholder values in the `<script>` section:
```javascript
window.PUSHER_KEY = 'abc123def456';
window.PUSHER_CLUSTER = 'us2';
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Build and Run

```bash
npm run build
npm run dev
```

## 5. How It Works

- When a client saves a list, the worker broadcasts the update via Pusher
- All other clients subscribed to that list receive the update in real-time
- The Svelte components can call `subscribeToList(listId, callback)` to receive updates
- Updates include categories and list items

## 6. Usage in Your Svelte Components

```typescript
import { subscribeToList, unsubscribeFromList } from './client';
import { categories, list } from './store';

// Subscribe to updates
subscribeToList(listId, (updatedList) => {
  categories.set(updatedList.categories);
  list.set(updatedList.list);
});

// Unsubscribe when component is destroyed
onDestroy(() => {
  unsubscribeFromList();
});
```
