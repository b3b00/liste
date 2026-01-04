// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error, type IRequest  } from 'itty-router'
import { type KVNamespace, type ExecutionContext, type ScheduledController } from '@cloudflare/workers-types'
import { get } from 'svelte/store'
import { getList, saveList, getUserLists } from './logic'
import type { SharedList } from './model'
import { withAuth, type AuthenticatedRequest, exchangeCodeForTokens, getUserInfo, saveUser } from './auth'



// declare what's available in our env


type LRequest = {
    id: string;
    postQuery:any;
  } & IRequest

  // create a convenient duple
  type CF = [env: Env, context: ExecutionContext]

const router = Router()


async function streamToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
    if (!stream) {
        return '';
    }
    let r = new Response(stream);
    return await r.text()
}

const withPostQuery = async (request:IRequest) => {
    let body = await streamToText(request.body);
    console.log(body);
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

async function renderJson(env:Env, request:IRequest, data :any) {
    const payload = JSON.stringify(data);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    return response
}

// OAuth2 login endpoint
router.get<IRequest, CF>('/auth/login', async (request: IRequest, env: Env) => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    
    return Response.redirect(authUrl.toString(), 302);
});

// OAuth2 callback endpoint
router.get<IRequest, CF>('/auth/callback', async (request: IRequest, env: Env) => {
    try {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        
        if (!code) {
            return new Response('Missing authorization code', { status: 400 });
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(env, code);
        
        // Get user info
        const userInfo = await getUserInfo(tokens.access_token);
        
        // Save user to database
        await saveUser(env, userInfo);
        
        // Return HTML page that stores token and redirects
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Login Successful</title></head>
            <body>
                <script>
                    localStorage.setItem('google_id_token', '${tokens.id_token}');
                    localStorage.setItem('user_id', '${userInfo.id}');
                    localStorage.setItem('user_email', '${userInfo.email}');
                    localStorage.setItem('user_name', '${userInfo.name}');
                    localStorage.setItem('user_picture', '${userInfo.picture}');
                    window.location.href = '/';
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
                localStorage.removeItem('google_id_token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_email');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_picture');
                window.location.href = '/';
            </script>
            <p>Logged out successfully! Redirecting...</p>
        </body>
        </html>
    `;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
});

// Get current user info
router.get<AuthenticatedRequest, CF>('/auth/me', withAuth, async (request: AuthenticatedRequest, env: Env) => {
    return renderOkJson(env, request, {
        userId: request.userId,
        email: request.userEmail
    });
});

// Get all lists for authenticated user
router.get<AuthenticatedRequest, CF>('/lists', withAuth, async (request: AuthenticatedRequest, env: Env) => {
    try {
        const lists = await getUserLists(env, request.userId!);
        return renderOkJson(env, request, okResult(lists));
    } catch (e: any) {
        return await renderInternalServorErrorJson(env, request,
            errorResult([`error while getting lists`, e.message], null));
    }
});
 
router.get<AuthenticatedRequest, CF>('/list/:id', withAuth, async (request: AuthenticatedRequest, env: Env) => {
    try {
        console.log('GET /list/:id', request.params.id);
        const id = request.params.id;
        const p = await getList(env, request.userId!, id);
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
router.post<AuthenticatedRequest, CF>('/list/:id', withAuth, withParams, async (request: AuthenticatedRequest, env: Env) => {
    try {
        console.log('POST LIST...',request);
        const id = request.params.id;
        const body = await streamToText(request.body);
        console.log("POST",body);
        const list = JSON.parse(body) as SharedList
        console.log(`POST /list/${id}`,list);
        await saveList(env, request.userId!, id, list);
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
router.put<AuthenticatedRequest, CF>('/list/:id', withAuth, async (request: AuthenticatedRequest, env: Env) => {
    try {                        
        const id = request.params.id;
        const body = await streamToText(request.body);
        console.log("PUT",body);
        const list = JSON.parse(body) as SharedList
        console.log('PUT /list/:id',list);
        await saveList(env, request.userId!, id, list);
        return renderOkJson(env,request,{});

    } catch (e :any) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while saving list :>${request.params.id}<`,e.message],null));
    }
})




router.all('*', (request, env) => {
    console.log('assets handler')
    return env.ASSETS.fetch(request)
})

export default {
    async fetch(request :IRequest, environment :Env, context :ExecutionContext) {
        return router.handle(request, environment, context)
    },
    async scheduled(controller: ScheduledController, environment: Env, context: ExecutionContext) {
        // await doATask();
    },
}
