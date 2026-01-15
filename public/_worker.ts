// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error, type IRequest  } from 'itty-router'
import { type ExecutionContext, type ScheduledController, type D1Database, type Fetcher } from '@cloudflare/workers-types'
import { get } from 'svelte/store'
import { getList, saveList, getUserLists } from './logic'
import type { SharedList } from './model'
import { withAuthGeneric, redirectToAuthProvider, type OAuthConfiguration, type AuthenticatedRequest, type AuthenticationError, type AuthenticationInfo, type UserInfo } from './authMiddleware'



// Env interface - this should match worker-configuration.d.ts
export interface Env {
    D1_lists: D1Database;
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    REDIRECT_URI: string;
    AUTH_ENDPOINT: string;
    TOKEN_ENDPOINT: string;
    TOKEN_VERIFICATION_ENDPOINT: string;
    SCOPE: string;
    ASSETS: Fetcher;
}


type LRequest = {
    id: string;
    postQuery:any;
  } & IRequest

  // create a convenient duple
  type CF = [env: Env, context: ExecutionContext]

const router = Router()


export async function getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {        
        throw new Error(`Failed to get user info ${response.status} - ${response.statusText} : ${await response.text()}`);
    }
    var userInfo = await response.json() as UserInfo;
    return userInfo;
}

function oauthConfigBuilder(env: Env): OAuthConfiguration {
    return {
        clientId: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
        redirectUri: env.REDIRECT_URI,
        authEndpoint: env.AUTH_ENDPOINT,
        userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
        tokenVerificationEndpoint: env.TOKEN_VERIFICATION_ENDPOINT,      
        tokenEndpoint: env.TOKEN_ENDPOINT,
        callbackEndpoint: '/auth/callback',
        scope: env.SCOPE,
        getUserInfo: getUserInfo
    };
}


async function streamToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
    if (!stream) {
        return '';
    }
    let r = new Response(stream);
    return await r.text()
}

const withPostQuery = async (request:IRequest) => {
    let body = await streamToText(request.body);
    var params = new URLSearchParams(body);
    request.postQuery={};
    params.forEach((value,key,parent) => {
        request.postQuery[key] = value;
    })    
  }


export function errorResult(errors:string[],result:any) {
    return {
        ok:false,
        errors:errors,
        result:result
    };
}

export function okResult(result:any) {
    return {
        ok:true,
        result:result
    };
}


async function renderOkJson(env : Env, request : IRequest, data :any) {
    let response = await renderJson(env,request,data);
    return response;
}

async function renderInternalServorErrorJson(env : Env, request : IRequest, data :any) {
    return error(500,data);
}

async function renderBadPRequestJson(env:Env, request:IRequest, data: any) {
    return error(400,data);
}

async function notFoundJson(env:Env, request:IRequest, data :any) {
    return error(404,data);
}

async function unauthorized(env:Env, request:IRequest, data :any) {
    return error(401,data);
}

async function renderJson(env:Env, request:IRequest, data :any) {
    const payload = JSON.stringify(data);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    return response
}

// OAuth2 login endpoint
router.get<IRequest, CF>('/auth/login', async (request: IRequest, env: Env) => redirectToAuthProvider(oauthConfigBuilder(env)));


// OAuth2 callback endpoint
router.get<IRequest, CF>('/auth/callback', withAuthGeneric<Env>(oauthConfigBuilder), async (request: IRequest, env: Env) => {
    try {
       if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo as AuthenticationError;
        return unauthorized(env, request, authError);
        }
        const info = request.authenticationInfo as AuthenticationInfo;
        // Return HTML page that stores token and redirects
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Login Successful</title></head>
            <body>
                <script>
                    // Store all user data
                    localStorage.setItem('google_id_token', '${info.token}');
                    localStorage.setItem('user_id', '${info.user?.id}');
                    localStorage.setItem('user_email', '${info.user?.email}');
                    localStorage.setItem('user_name', '${info.user?.name}');
                    localStorage.setItem('user_picture', '${info.user?.picture}');
                    
                    // Wait a moment to ensure localStorage is written, then redirect
                    setTimeout(() => {
                        window.location.replace('/app.html');
                    }, 5000);
                </script>
                <p>Login successful! Redirecting...</p>
            </body>
            </html>
        `;
        
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (e: any) {
        console.error('Auth callback error:', e);
        return new Response(`Authentication failed: ${e.message}`, { status: 500 });
    }
});

// Logout endpoint
router.get<IRequest, CF>('/auth/logout', async (request: IRequest, env: Env) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Logged Out</title></head>
        <body>
            <script>
                async function performLogout() {
                    // Get the token before clearing
                    const token = localStorage.getItem('google_id_token');
                    
                    // Revoke the Google token first
                    if (token) {
                        try {
                            await fetch('https://oauth2.googleapis.com/revoke?token=' + token, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                            });
                        } catch (err) {
                            console.log('Token revocation error:', err);
                        }
                    }
                    
                    // Only clear auth-related data, keep list and categories
                    localStorage.removeItem('google_id_token');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_email');
                    localStorage.removeItem('user_name');
                    localStorage.removeItem('user_picture');
                    
                    // Verify it's cleared
                    console.log('Token after clear:', localStorage.getItem('google_id_token'));
                    console.log('List data preserved:', !!localStorage.getItem('list'));
                    
                    // Unregister service worker
                    if (navigator.serviceWorker) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for(let registration of registrations) {
                            await registration.unregister();
                        }
                    }
                    
                    // Show logged out message
                    document.body.innerHTML = '<div style="text-align:center;margin-top:50px;"><h2>Logged out successfully</h2><p><a href="/auth/login">Click here to login again</a></p></div>';
                }
                
                performLogout();
            </script>
            <p style="text-align:center;margin-top:50px;">Logging out...</p>
        </body>
        </html>
    `;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
});

// Get current user info
router.get<AuthenticatedRequest, CF>('/auth/me', withAuthGeneric<Env>(oauthConfigBuilder), async (request: AuthenticatedRequest, env: Env) => {
    if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo;
        return unauthorized(env, request, authError);
    }
    const info = request.authenticationInfo as AuthenticationInfo;
    return renderOkJson(env, request, {
        userId: info.user?.id,
        email: info.user?.email
    });
});

// Get all lists for authenticated user
router.get<AuthenticatedRequest, CF>('/lists', withAuthGeneric<Env>(oauthConfigBuilder), async (request: AuthenticatedRequest, env: Env) => {
    if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo;
        return unauthorized(env, request, authError);
    }
    try {
        const info = request.authenticationInfo as AuthenticationInfo;
        const lists = await getUserLists(env, info.user?.id!);
        return renderOkJson(env, request, okResult(lists));
    } catch (e: any) {
        return await renderInternalServorErrorJson(env, request,
            errorResult([`error while getting lists`, e.message], null));
    }
});
 
router.get<AuthenticatedRequest, CF>('/list/:id', withAuthGeneric<Env>(oauthConfigBuilder), async (request: AuthenticatedRequest, env: Env) => {
    if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo;
        return unauthorized(env, request, authError);
    }
try {
        
        const info = request.authenticationInfo as AuthenticationInfo;
        const id = request.params.id;
        const p = await getList(env, info.user?.id!, id);
        if (p === undefined) {
            return await notFoundJson(env, request, errorResult([`list with id ${id} not found`],null));
        }
        return await renderOkJson(env, request, p);
    }
    catch(e :any) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while getting list :>${request.params.id}<`,e.message],null));
    }
});


// POST a new list
// path parameters
//   - id (string) : list id
// body 
router.post<AuthenticatedRequest, CF>('/list/:id', withAuthGeneric<Env>(oauthConfigBuilder), withParams, async (request: AuthenticatedRequest, env: Env) => {
    if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo;
        return unauthorized(env, request, authError);
    }
    try {
        const info = request.authenticationInfo as AuthenticationInfo;
        const id = request.params.id;
        const body = await streamToText(request.body);
        const list = JSON.parse(body) as SharedList
        await saveList(env,info.user?.id!, id, list);
        return renderOkJson(env,request,{});

    } catch (e :any) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while saving list :>${request.params.id}<`,e.message],null));
    }
})

// PUT a new list
// path parameters
//   - id (string) : list id
// body 
router.put<AuthenticatedRequest, CF>('/list/:id', withAuthGeneric<Env>(oauthConfigBuilder), async (request: AuthenticatedRequest, env: Env) => {
    if (request.authenticationInfo && request.authenticationInfo.isError) {
        const authError = request.authenticationInfo;
        return unauthorized(env, request, authError);
    }
    try {              
        const info = request.authenticationInfo as AuthenticationInfo;
        const id = request.params.id;
        const body = await streamToText(request.body);
        const list = JSON.parse(body) as SharedList
        await saveList(env, info.user?.id!, id, list);
        return renderOkJson(env,request,{});

    } catch (e :any) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while saving list :>${request.params.id}<`,e.message],null));
    }
})

// Auth check for root path - serve a page that checks localStorage
router.get('/', withAuthGeneric<Env>(oauthConfigBuilder) , async (request: IRequest, env: Env) => {
    // Serve a simple HTML page that checks auth and redirects if needed
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Listes</title>
</head>
<body>
    <script>
        // Check for token
        const token = localStorage.getItem('google_id_token');
        console.log('Root route check - token exists:', !!token);
        
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.replace('/auth/login');
        } else {
            console.log('Token found, loading app');
            // User is authenticated, load the app
            window.location.replace('/app.html');
        }
    </script>
    <p style="text-align: center; margin-top: 50px;">Loading...</p>
</body>
</html>`;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
});

router.all<AuthenticatedRequest, CF>('*', (request : AuthenticatedRequest, env: Env) => {
    return env.ASSETS.fetch(request.url)
})

export default {
    async fetch(request :IRequest, environment :Env, context :ExecutionContext) {
        return router.handle(request, environment, context)
    },
    async scheduled(controller: ScheduledController, environment: Env, context: ExecutionContext) {
        // await doATask();
    },
}
