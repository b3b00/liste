import type { SharedList } from "./model";

export interface D1Result<T> {
    results: T[]
    success: boolean
}

export async function getList(env: Env, id: string): Promise<SharedList | undefined> {
    console.log(`get list for id ${id}`,env);
    const result: D1Result<{id:string, content:string}> = await env.D1_lists.prepare(
        'SELECT * FROM shoppingList WHERE id=?1 '
    )
        .bind(decodeURI(id))
        .all()
    if (result.success) {
        return JSON.parse(result.results[0].content) as SharedList;
    }

    return undefined
}

export async function saveList(env: Env, id: string, list :SharedList): Promise<boolean> {
    console.log(`save list for id ${id}`,list,env);
    try {
    let l = await getList(env, id);
    if (l) {
        const { success } = await env.D1_lists.prepare(
        'update shoppingList set content=?1 where id=?2;'
    )
        .bind(decodeURI(id), JSON.stringify(list))
        .run()
        return success;
    }
    else {
        const { success } = await env.D1_lists.prepare(
        'insert into shoppingList (id,content) values (?1,$2);'
    )
        .bind(decodeURI(id), JSON.stringify(list))
        .run()
        return success;
    }
    }
    catch(e) {
        console.error("Error saving list", e);
        return false;   
    }
}