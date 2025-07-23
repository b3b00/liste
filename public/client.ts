import { type SharedList } from "./model"

export const getList = async (id: string): Promise<SharedList | undefined> => {
    console.log(`Fetching list with id ${id}`);
    id = await hashString(id);
    console.log(`fetching - Hashed id: ${id}`);
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

export async function hashString(message : string): Promise<string> {
    // Encode the string as a Uint8Array
    const msgBuffer = new TextEncoder().encode(message);
    
    // Hash the message using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    // Convert the ArrayBuffer to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
    
    return hashHex;
}

export const saveList = async (id: string, list: SharedList): Promise<boolean> => {
    console.log(`Saving list with id ${id}`, list);
    id = await hashString(id);
    console.log(`saving - Hashed id: ${id}`);
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