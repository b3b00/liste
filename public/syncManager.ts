// Client-side WebSocket sync manager

import { list, categories } from './store';
import { get } from 'svelte/store';

class SyncManager {
    private ws: WebSocket | null = null;
    private reconnectTimeout: number | null = null;
    private listId: string = 'default';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isConnecting = false;
    private isApplyingRemoteUpdate = false; // Flag to prevent feedback loop

    connect(listId: string = 'default') {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('[SYNC] Already connecting or connected');
            return;
        }

        this.listId = listId;
        this.isConnecting = true;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/sync?listId=${encodeURIComponent(listId)}`;

        console.log('[SYNC] Connecting to:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[SYNC] WebSocket connected successfully');
                this.reconnectAttempts = 0;
                this.isConnecting = false;
            };

            this.ws.onmessage = (event) => {
                console.log('[SYNC] Received message:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('[SYNC] Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('[SYNC] WebSocket closed');
                this.ws = null;
                this.isConnecting = false;
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('[SYNC] WebSocket error:', error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('[SYNC] Error creating WebSocket:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    private handleMessage(data: any) {
        console.log('[SYNC] Handling message type:', data.type, data);
        switch (data.type) {
            case 'connected':
                console.log('[SYNC] Sync connected for listId:', data.listId);
                break;
            
            case 'list_update':
                console.log('[SYNC] Applying remote list update');
                // Set flag to prevent re-broadcasting this update
                this.isApplyingRemoteUpdate = true;
                // Deep clone to ensure Svelte detects all changes
                const newList = data.list.map((item: any) => ({...item}));
                list.set(newList);
                console.log('[SYNC] List store updated with', newList.length, 'items');
                // Reset flag after longer delay to ensure all reactive updates complete
                setTimeout(() => {
                    this.isApplyingRemoteUpdate = false;
                    console.log('[SYNC] Remote update flag cleared');
                }, 100);
                break;
            
            case 'categories_update':
                console.log('[SYNC] Applying remote categories update');
                // Set flag to prevent re-broadcasting this update
                this.isApplyingRemoteUpdate = true;
                // Deep clone to ensure Svelte detects all changes
                const newCategories = data.categories.map((cat: any) => ({...cat}));
                categories.set(newCategories);
                console.log('[SYNC] Categories store updated with', newCategories.length, 'categories');
                // Reset flag after longer delay to ensure all reactive updates complete
                setTimeout(() => {
                    this.isApplyingRemoteUpdate = false;
                    console.log('[SYNC] Remote categories update flag cleared');
                }, 100);
                break;
        }
    }

    sendListUpdate(listData: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[SYNC] Sending list update:', listData);
            this.ws.send(JSON.stringify({
                type: 'list_update',
                listId: this.listId,
                list: listData
            }));
        } else {
            console.log('[SYNC] Cannot send update - WebSocket not connected. State:', this.ws?.readyState);
        }
    }

    sendCategoryUpdate(categoryData: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[SYNC] Sending categories update:', categoryData);
            this.ws.send(JSON.stringify({
                type: 'categories_update',
                listId: this.listId,
                categories: categoryData
            }));
        } else {
            console.log('[SYNC] Cannot send categories update - WebSocket not connected. State:', this.ws?.readyState);
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            this.reconnectTimeout = window.setTimeout(() => {
                this.connect(this.listId);
            }, delay);
        } else {
            console.log('Max reconnection attempts reached');
        }
    }

    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnecting = false;
        this.reconnectAttempts = 0;
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const syncManager = new SyncManager();

// Subscribe to list changes and broadcast them
let lastListValue: any = null;
list.subscribe((value) => {
    console.log('[SYNC] List changed, connected:', syncManager.isConnected(), 'applying remote:', syncManager['isApplyingRemoteUpdate'], 'value:', value);
    
    // Don't broadcast if we're applying a remote update (would cause feedback loop)
    if (syncManager['isApplyingRemoteUpdate']) {
        console.log('[SYNC] Skipping broadcast - this is a remote update');
        // Deep clone to avoid reference issues
        lastListValue = JSON.parse(JSON.stringify(value));
        return;
    }
    
    // Only send if the list actually changed and we're connected
    if (syncManager.isConnected() && JSON.stringify(value) !== JSON.stringify(lastListValue)) {
        console.log('[SYNC] Broadcasting local list change');
        // Deep clone to avoid reference issues
        lastListValue = JSON.parse(JSON.stringify(value));
        syncManager.sendListUpdate(value);
    }
});

// Subscribe to categories changes and broadcast them
let lastCategoriesValue: any = null;
categories.subscribe((value) => {
    console.log('[SYNC] Categories changed, connected:', syncManager.isConnected(), 'applying remote:', syncManager['isApplyingRemoteUpdate'], 'value:', value);
    
    // Don't broadcast if we're applying a remote update (would cause feedback loop)
    if (syncManager['isApplyingRemoteUpdate']) {
        console.log('[SYNC] Skipping categories broadcast - this is a remote update');
        // Deep clone to avoid reference issues
        lastCategoriesValue = JSON.parse(JSON.stringify(value));
        return;
    }
    
    // Only send if the categories actually changed and we're connected
    if (syncManager.isConnected() && JSON.stringify(value) !== JSON.stringify(lastCategoriesValue)) {
        console.log('[SYNC] Broadcasting local categories change');
        // Deep clone to avoid reference issues
        lastCategoriesValue = JSON.parse(JSON.stringify(value));
        syncManager.sendCategoryUpdate(value);
    }
});
