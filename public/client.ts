import { type SharedList, type VersionInfo } from "./model"
import Pusher from 'pusher-js';

let pusherClient: Pusher | null = null;
let currentSubscription: any = null;

/**
 * Subscribe to real-time updates for a specific list
 */
export const subscribeToList = (listId: string, onUpdate: (list: SharedList) => void): void => {
    // Initialize Pusher client if not already done
    if (!pusherClient) {
        // Get Pusher key from the page (you'll need to inject this from your worker)
        const pusherKey = (window as any).PUSHER_KEY || 'your-app-key';
        const pusherCluster = (window as any).PUSHER_CLUSTER || 'your-cluster';
        
        pusherClient = new Pusher(pusherKey, {
            cluster: pusherCluster,
        });
    }

    // Unsubscribe from previous list if any
    if (currentSubscription) {
        currentSubscription.unbind_all();
        currentSubscription.unsubscribe();
    }

    // Subscribe to the list's channel
    const channel = pusherClient.subscribe(`list-${listId}`);
    
    channel.bind('list-updated', (data: any) => {
        console.log('Received list update:', data);
        onUpdate({
            categories: data.categories,
            list: data.list
        });
    });

    currentSubscription = channel;
    console.log(`Subscribed to list ${listId}`);
}

/**
 * Unsubscribe from all Pusher channels
 */
export const unsubscribeFromList = (): void => {
    if (currentSubscription) {
        currentSubscription.unbind_all();
        currentSubscription.unsubscribe();
        currentSubscription = null;
    }
}

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

export const getVersion = async (): Promise<VersionInfo | undefined> => {
    console.log(`Fetching version`);
    let url = `version.json`;
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
        const data = await response.json();
        console.log(`Fetched version`, data);
        return data as VersionInfo;
    } else {
        console.error(`Error fetching version:`, response.statusText);
        return undefined;
    }
}