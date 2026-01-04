# Google OAuth2 Multi-Tenant Setup Guide

## Overview

The application now supports Google OAuth2 authentication with multi-tenant data isolation. Each user can only access their own shopping lists.

## 1. Setup Google OAuth2

### Create OAuth2 Credentials (Step-by-Step)

#### Step 1: Access Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Sign in with your Google account

#### Step 2: Create or Select a Project
1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"NEW PROJECT"** button (top right of dialog)
3. Enter a project name (e.g., "Liste Shopping App")
4. Click **"CREATE"**
5. Wait for project creation (notification will appear)
6. Make sure your new project is selected in the dropdown

#### Step 3: Enable Required APIs
1. In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or go directly to: https://console.cloud.google.com/apis/library
2. Search for **"Google+ API"** in the search bar
3. Click on **"Google+ API"**
4. Click the blue **"ENABLE"** button
5. Wait for it to enable (may take a few seconds)

#### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Or: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** (unless you have Google Workspace)
3. Click **"CREATE"**
4. Fill in **required fields**:
   - **App name**: `Liste` (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"SAVE AND CONTINUE"**
6. **Scopes** page: Click **"SAVE AND CONTINUE"** (no changes needed)
7. **Test users** page: Click **"SAVE AND CONTINUE"** (no changes needed for now)
8. Review and click **"BACK TO DASHBOARD"**

#### Step 5: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
   - Or: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"** from the dropdown
5. Enter a name: `Liste Web Client`

#### Step 6: Configure Authorized Origins and Redirects
In the form that appears:

**Authorized JavaScript origins:**
- Click **"+ ADD URI"**
- Enter: `http://localhost:8888`
- Click **"+ ADD URI"** again
- Enter: `https://your-production-domain.com` (change to your actual domain later)

**Authorized redirect URIs:**
- Click **"+ ADD URI"**
- Enter: `http://localhost:8888/auth/callback`
- Click **"+ ADD URI"** again
- Enter: `https://your-production-domain.com/auth/callback` (change later)

7. Click **"CREATE"**

#### Step 7: Copy Your Credentials
A popup will appear with your credentials:

📋 **Copy these immediately:**
- **Your Client ID**: Looks like `123456789-abc123xyz.apps.googleusercontent.com`
- **Your Client Secret**: Looks like `GOCSPX-abc123def456ghi789`

⚠️ **Important:** Keep the Client Secret secure! Don't commit it to git.

You can also find these later by:
1. Going to **"Credentials"** page
2. Clicking on your OAuth client name
3. Viewing the **Client ID** and **Client Secret** on the right side

## 2. Configure Environment Variables

### Update wrangler.toml

1. Open `wrangler.toml` in your editor
2. Find the `[vars]` section
3. Replace the placeholder values:

```toml
[vars]
GOOGLE_CLIENT_ID = "123456789-abc123xyz.apps.googleusercontent.com"  # ← Paste your Client ID here
GOOGLE_REDIRECT_URI = "http://localhost:8888/auth/callback"
```

**Example with real Client ID:**
```toml
[vars]
GOOGLE_CLIENT_ID = "845729318402-9kj8h7g6f5d4s3a2w1q0.apps.googleusercontent.com"
GOOGLE_REDIRECT_URI = "http://localhost:8888/auth/callback"
```

### Create .dev.vars File

1. Copy `.dev.vars.example` to `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Open `.dev.vars` in your editor
3. Add your **Client Secret** (keep this secret, don't commit!):

```bash
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789
```

**Example with real secret:**
```bash
GOOGLE_CLIENT_SECRET=GOCSPX-xYz9WvUtS8rQpOnM7lK6jI5h
```

### Verify Your Configuration

Your files should look like:

**wrangler.toml** (safe to commit):
```toml
[vars]
GOOGLE_CLIENT_ID = "your-actual-client-id.apps.googleusercontent.com"
GOOGLE_REDIRECT_URI = "http://localhost:8888/auth/callback"
```

**.dev.vars** (NEVER commit - in .gitignore):
```bash
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

### For Production (Cloudflare Pages)

1. Go to your Cloudflare Pages project settings
2. Navigate to **Environment Variables**
3. Add:
   - `GOOGLE_CLIENT_SECRET` = your-client-secret
   - Update `GOOGLE_REDIRECT_URI` in wrangler.toml for production

## 3. Database Migration

Run the migration to add multi-tenant support:

```bash
wrangler d1 execute D1_lists --file=./migrations/001_add_multi_tenant.sql --local
```

For production:
```bash
wrangler d1 execute D1_lists --file=./migrations/001_add_multi_tenant.sql
```

## 4. How It Works

### Authentication Flow

1. User clicks login → redirected to `/auth/login`
2. App redirects to Google OAuth2 consent screen
3. User authorizes → Google redirects back to `/auth/callback` with code
4. Backend exchanges code for tokens
5. User info is stored in database and localStorage
6. ID token is stored in localStorage for API authentication

### API Authentication

All protected endpoints require authentication:
- **GET/POST/PUT `/list/:id`** - Requires `Authorization: Bearer <id_token>` header
- **GET `/lists`** - Get all lists for current user
- **GET `/auth/me`** - Get current user info

### Multi-Tenant Data Isolation

- Each list is associated with a `user_id` (Google OAuth2 user ID)
- Database queries filter by `user_id` automatically
- Users can only access their own data

## 5. Client-Side Usage

### Check Authentication Status

```typescript
import { isAuthenticated, getCurrentUser, login, logout } from './client';

if (!isAuthenticated()) {
    // Show login button
    login(); // Redirects to Google login
} else {
    const user = getCurrentUser();
    console.log(`Logged in as: ${user.name} (${user.email})`);
}
```

### Logout

```typescript
import { logout } from './client';

logout(); // Clears localStorage and redirects
```

### Fetch User's Lists

```typescript
import { getUserLists } from './client';

const lists = await getUserLists();
console.log('My lists:', lists);
```

## 6. Available Endpoints

### Authentication
- `GET /auth/login` - Initiate Google OAuth2 login
- `GET /auth/callback` - OAuth2 callback handler
- `GET /auth/logout` - Logout (clears localStorage)
- `GET /auth/me` - Get current user info (requires auth)

### Lists (All require authentication)
- `GET /lists` - Get all lists for current user
- `GET /list/:id` - Get specific list
- `POST /list/:id` - Create/update list
- `PUT /list/:id` - Update list

## 7. Security Notes

- **ID Token** is stored in localStorage and sent with each API request
- **Client Secret** is never exposed to clients (stored in .dev.vars and Cloudflare secrets)
- Tokens are verified with Google on each request
- All data is isolated by user_id

## 8. Testing

1. Build and run the dev server:
```bash
npm run build
npm run dev
```

2. Navigate to `http://localhost:8888`
3. Click login or navigate to `/auth/login`
4. Authorize with Google
5. You should be redirected back with authentication complete

## Database Schema

### shoppingList table
- `id` (TEXT) - List identifier
- `user_id` (TEXT) - Google OAuth2 user ID
- `content` (TEXT) - JSON content of the list

### users table
- `id` (TEXT) - Google OAuth2 user ID (primary key)
- `email` (TEXT) - User email
- `name` (TEXT) - User display name
- `picture` (TEXT) - User profile picture URL
- `created_at` (INTEGER) - Unix timestamp
- `last_login` (INTEGER) - Unix timestamp

## Offline Functionality

This PWA supports full offline functionality. Users can:
- ✅ Use the app without authentication (local data only)
- ✅ Continue working offline after authentication
- ✅ Make changes offline (saved locally, synced when online)
- ✅ View cached data without network

Authentication is only required for:
- ❌ Syncing data to cloud
- ❌ Accessing data from other devices
- ❌ Initial login (OAuth requires network)

For complete details on offline behavior, see [OFFLINE_FUNCTIONALITY.md](OFFLINE_FUNCTIONALITY.md).
