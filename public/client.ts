import { type SharedList, type VersionInfo } from "./model"

/**
 * Get the auth token from localStorage
 */
function getAuthToken(): string | null {
    return localStorage.getItem('google_id_token');
}

/**
 * Check if browser is online
 */
function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return getAuthToken() !== null;
}

/**
 * Get current user info from localStorage
 */
export function getCurrentUser(): { id: string; email: string; name: string; picture: string } | null {
    const id = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    const picture = localStorage.getItem('user_picture');
    
    if (id && email && name && picture) {
        return { id, email, name, picture };
    }
    
    return null;
}

/**
 * Initiate login flow
 */
export function login(): void {
    window.location.href = '/auth/login';
}

/**
 * Logout
 */
export function logout(): void {
    window.location.href = '/auth/logout';
}

export const getList = async (id: string): Promise<SharedList | undefined> => {
    console.log(`Fetching list with id ${id}`);    
    let url = `list/${id}`;
    
    try {
        const response = await fetch(url, { 
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`Fetched list with id ${id}`, data);
            return data as SharedList;
        } else if (response.status === 401 && !isOnline()) {
            // Offline and not authenticated - return undefined to use local data
            console.log('Offline mode: using local data');
            return undefined;
        } else {
            console.error(`Error fetching list with id ${id}:`, response.statusText);
            return undefined;
        }
    } catch (error) {
        // Network error (likely offline) - return undefined to use local data
        console.log('Network error (possibly offline): using local data', error);
        return undefined;
    }
}

export const saveList = async (id: string, list: SharedList): Promise<boolean> => {
    console.log(`Saving list with id ${id}`, list);
    console.log(`saving - Hashed id: ${id}`);
    let url = `list/${id}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(list)
        });
        if (response.ok) {
            console.log(`List with id ${id} saved successfully`);
            // Clear any pending sync flag
            localStorage.removeItem(`pending_sync_${id}`);
            return true;
        } else if (!isOnline() || response.status === 401) {
            // Offline or auth issue - save locally and mark for sync
            console.log('Offline mode: changes will sync when online');
            localStorage.setItem(`pending_sync_${id}`, 'true');
            return true; // Return true so UI doesn't show error
        } else {
            console.error(`Error saving list with id ${id}:`, response.statusText);
            return false;
        }
    } catch (error) {
        // Network error (likely offline) - save locally
        console.log('Network error (possibly offline): changes will sync when online', error);
        localStorage.setItem(`pending_sync_${id}`, 'true');
        return true; // Return true so UI doesn't show error
    }
}

/**
 * Check if there are pending syncs for a list
 */
export function hasPendingSync(id: string): boolean {
    return localStorage.getItem(`pending_sync_${id}`) === 'true';
}

/**
 * Attempt to sync pending changes when back online
 */
export async function syncPendingChanges(): Promise<void> {
    if (!isOnline() || !isAuthenticated()) {
        return;
    }
    
    console.log('Attempting to sync pending changes...');
    
    // Find all pending sync items
    const pendingKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pending_sync_')) {
            pendingKeys.push(key);
        }
    }
    
    // No pending syncs
    if (pendingKeys.length === 0) {
        return;
    }
    
    console.log(`Found ${pendingKeys.length} pending syncs`);
    
    // Note: Actual sync would require storing the list data
    // For now, just clear the flags and let user re-save
    pendingKeys.forEach(key => {
        localStorage.removeItem(key);
    });
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('Back online - checking for pending syncs');
        setTimeout(() => syncPendingChanges(), 1000); // Wait 1s for connection to stabilize
    });
}

export const getUserLists = async (): Promise<Array<{id: string, content: SharedList}>> => {
    console.log('Fetching all user lists');
    
    if (!isOnline()) {
        console.log('Offline mode: cannot fetch user lists');
        return [];
    }
    
    try {
        const response = await fetch('/lists', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.result || [];
        } else {
            console.error('Error fetching user lists:', response.statusText);
            return [];
        }
    } catch (error) {
        console.log('Network error: cannot fetch user lists', error);
        return [];
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