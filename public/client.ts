import { type SharedList } from "./model"

export const getList = async (id: string): Promise<SharedList | undefined> => {
    console.log(`Fetching list with id ${id}`);
    let url = `list/${id}`;
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
        const data = await response.json();
        console.log(`Fetched list with id ${id}`, data);
        return data as SharedList;
    } else {
        console.error(`Error fetching list with id ${id}:`, response.statusText);
        return undefined;
    }
}



export const saveList = async (id: string, list: SharedList): Promise<boolean> => {
    console.log(`Saving list with id ${id}`, list);
    let url = `list/${id}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(list)
    });
    if (response.ok) {
        console.log(`List with id ${id} saved successfully`);
        return true;
    } else {
        console.error(`Error saving list with id ${id}:`, response.statusText);
        return false;
    }
}