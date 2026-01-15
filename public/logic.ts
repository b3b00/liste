import type { SharedList } from "./model";
import type { Env } from "../worker-configuration.d.ts";

export interface D1Result<T> {
    results: T[]
    success: boolean
    meta : { rows_written: number, changes: number }
}

export async function getList(env: Env, userId: string, id: string): Promise<SharedList | undefined> {
    console.log(`get list for user ${userId}, id ${id}`, env);
    try {
        const result: D1Result<{id:string, content:string, user_id:string}> = await env.D1_lists.prepare(
            'SELECT * FROM shoppingList WHERE id=?1 AND user_id=?2'
        )
            .bind(decodeURI(id), userId)
            .all()
        if (result.success && result.results.length > 0) {
            return JSON.parse(result.results[0].content) as SharedList;
        }
    }
    catch(e : any) {
        console.log(e);
        return undefined;
    }

    return undefined
}

export async function saveList(env: Env, userId: string, id: string, list :SharedList): Promise<boolean> {
    console.log(`save list for user ${userId}, id ${id}`, list, env);
    try {
    let l = await getList(env, userId, id);
 console.log('testing if list already exists ? ',l);
    if (l) {
        console.log(`list ${id} already exists => updating ?`)
        if (list.categories.length > 0 && list.list.length > 0) {
            console.log(`updating list for user ${userId}, id ${id}`, list);
            const result:D1Result<SharedList> = await env.D1_lists.prepare(
            'update shoppingList set content=?1 where id=?2 AND user_id=?3;')
            .bind(JSON.stringify(list), decodeURI(id), userId)
            .run();
            console.log("update result", result);

            return result.success;
        }
        return false;
    }
    else {
        console.log(`creating list for user ${userId}, id ${id}`, list);
        const result:D1Result<SharedList> = await env.D1_lists.prepare(
        'insert into shoppingList (id, user_id, content) values (?1, ?2, ?3);'
    )
        .bind(decodeURI(id), userId, JSON.stringify(list))
        .run()
        console.log("insert result", result);
        return result.success;
    }
    }
    catch(e) {
        console.error("Error saving list", e);
        return false;   
    }
}

export async function getUserLists(env: Env, userId: string): Promise<Array<{id: string, content: SharedList}>> {
    console.log(`get all lists for user ${userId}`);
    try {
        const result: D1Result<{id:string, content:string}> = await env.D1_lists.prepare(
            'SELECT id, content FROM shoppingList WHERE user_id=?1 ORDER BY id'
        )
            .bind(userId)
            .all();
        
        if (result.success) {
            return result.results.map(row => ({
                id: row.id,
                content: JSON.parse(row.content) as SharedList
            }));
        }
    }
    catch(e : any) {
        console.error('Error getting user lists:', e);
    }

    return [];
}
