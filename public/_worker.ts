// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error, type IRequest  } from 'itty-router'
import { type KVNamespace, type ExecutionContext, type ScheduledController } from '@cloudflare/workers-types'
import { get } from 'svelte/store'
import { getList, saveList } from './logic'
import type { SharedList } from './model'



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
 
router.get<IRequest, CF>('/list/:id', async (request:IRequest, env:Env) => {
    try {
        const id = request.params.id;
        const p = await getList(env, id);
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
router.post<IRequest, CF>('/list/:id', withParams, async (request:IRequest, env:Env) => {
    try {                        
        const id = request.params.id;
        const list = JSON.parse(await streamToText(request.body)) as SharedList
        saveList(env, id, list);
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
router.put<IRequest, CF>('/list/:id', withParams, async (request:IRequest, env:Env) => {    
    try {                        
        const id = request.params.id;
        const list = JSON.parse(await streamToText(request.body)) as SharedList
        saveList(env, id, list);
        return renderOkJson(env,request,{});

    } catch (e :any) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while saving list :>${request.postQuery.name}<`,e.message],null));
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
