# Quick Start: Google OAuth2 Multi-Tenant

## Prerequisites Checklist
- [ ] Google account
- [ ] Node.js and npm installed
- [ ] 5-10 minutes of setup time

## Get Google OAuth2 Credentials (First Time Setup) DONE

### Detailed Steps:

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a Project**
   - Click project dropdown (top left, next to "Google Cloud")
   - Click "NEW PROJECT"
   - Name it (e.g., "Liste Shopping App")
   - Click "CREATE"
   - Wait for creation, then select your project

3. **Enable Google+ API**
   - Sidebar: "APIs & Services" → "Library"
   - Search: "Google+ API"
   - Click on it, then click "ENABLE"

4. **Configure OAuth Consent Screen**
   - Sidebar: "APIs & Services" → "OAuth consent screen"
   - Select "External"
   - Fill in:
     - App name: "Liste"
     - User support email: your email
     - Developer contact: your email
   - Click "SAVE AND CONTINUE" through all steps

5. **Create OAuth Client ID**
   - Sidebar: "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS"
   - Select "OAuth client ID"
   - Choose "Web application"
   - Name it: "Liste Web Client"
   
6. **Add Authorized Origins and Redirects**
   - **Authorized JavaScript origins:**
     - `http://localhost:8888`
   - **Authorized redirect URIs:**
     - `http://localhost:8888/auth/callback`
   - Click "CREATE"

7. **Copy Your Credentials**
   - **Client ID**: `123456789-abc...apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-abc123...`
   - Save these somewhere safe!

---

## Setup Steps (2 minutes)

### 1. Configure Google OAuth2 (1 min)
Edit [wrangler.toml](wrangler.toml):
```toml
GOOGLE_CLIENT_ID = "YOUR-CLIENT-ID.apps.googleusercontent.com"
GOOGLE_REDIRECT_URI = "http://localhost:8888/auth/callback"
```

Edit [.dev.vars](.dev.vars):
```
GOOGLE_CLIENT_SECRET=YOUR-CLIENT-SECRET
```

### 2. Run Database Migration (1 min)
```bash
wrangler d1 execute D1_lists --file=./migrations/001_add_multi_tenant.sql --local
```

### 3. Build and Run (2 min)
```bash
npm run build
npm run dev
```

### 4. Test
1. Open http://localhost:8888/auth/login
2. Sign in with Google
3. You should be redirected back to /

## Integration in Your App

Add auth widget to your main component:

```svelte
<script>
  import AuthWidget from './AuthWidget.svelte';
  import { isAuthenticated } from './client';
  
  let authenticated = isAuthenticated();
</script>

<AuthWidget />

{#if authenticated}
  <!-- Your app content -->
{:else}
  <!-- App still works offline with local data -->
  <p>You can use the app with local data. Sign in to sync across devices.</p>
{/if}
```

**Note:** The app works offline without authentication! Users can still access locally cached data.
See [OFFLINE_FUNCTIONALITY.md](OFFLINE_FUNCTIONALITY.md) for details.

## Testing the API

With authentication:
```bash
# Get your token from localStorage after login
TOKEN="your-id-token-from-localstorage"

# Get all your lists
curl -H "Authorization: Bearer $TOKEN" http://localhost:8888/lists

# Get specific list
curl -H "Authorization: Bearer $TOKEN" http://localhost:8888/list/my-list-id

# Save list
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"categories":[],"list":[]}' \
  http://localhost:8888/list/my-list-id
```

## Troubleshooting

**"Unauthorized" error**
- Check that ID token is in localStorage as `google_id_token`
- Verify token is included in Authorization header
- Token may be expired - try logging in again

**"Missing authorization code" error**
- Check GOOGLE_REDIRECT_URI matches exactly in Google Console and wrangler.toml
- Ensure http://localhost:8888 is in Authorized JavaScript origins

**Database errors**
- Run the migration: `wrangler d1 execute D1_lists --file=./migrations/001_add_multi_tenant.sql --local`
- Check that D1_lists binding is correct in wrangler.toml

## Production Deployment

1. Update [wrangler.toml](wrangler.toml) with production redirect URI
2. Add production domain to Google OAuth2 authorized origins/redirects
3. Set `GOOGLE_CLIENT_SECRET` in Cloudflare Pages environment variables
4. Run migration on production database:
   ```bash
   wrangler d1 execute D1_lists --file=./migrations/001_add_multi_tenant.sql
   ```

## Next Steps

See [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md) for complete documentation.
