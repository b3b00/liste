/**
 * Middleware to verify JWT token and extract user information
 */
export async function withAuth(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const token = authHeader.substring(7);
    try {
        // Verify the ID token with Google
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const tokenInfo = await response.json();
        // Attach user info to request
        request.userId = tokenInfo.sub;
        request.userEmail = tokenInfo.email;
        console.log(`Authenticated user: ${request.userEmail} (${request.userId})`);
    }
    catch (error) {
        console.error('Auth error:', error);
        return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Token verification failed' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(env, code) {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
    });
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }
    return await response.json();
}
/**
 * Get user info from Google
 */
export async function getUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        throw new Error('Failed to get user info');
    }
    return await response.json();
}
/**
 * Save or update user in database
 */
export async function saveUser(env, userInfo) {
    const now = Math.floor(Date.now() / 1000);
    await env.D1_lists.prepare(`INSERT INTO users (id, email, name, picture, created_at, last_login)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = ?3,
            picture = ?4,
            last_login = ?6`)
        .bind(userInfo.id, userInfo.email, userInfo.name, userInfo.picture, now, now)
        .run();
}
