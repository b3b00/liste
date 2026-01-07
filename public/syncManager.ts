// Client-side WebSocket sync manager

import { list, categories } from './store';
import { get } from 'svelte/store';
import { notifications } from './notifications';import { t } from './i18n';

class SyncManager {
    private ws: WebSocket | null = null;
    private reconnectTimeout: number | null = null;
    private listId: string = 'default';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isConnecting = false;
    private isApplyingRemoteUpdate = false; // Flag to prevent feedback loop
    private broadcastsSuspended = false; // Flag to prevent broadcasts during list transitions

    connect(listId: string = 'default') {
        // If already connected to a different listId, disconnect first
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.listId !== listId) {
            console.log('[SYNC] Disconnecting from', this.listId, 'to reconnect to', listId);
            this.disconnect();
        }
        
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('[SYNC] Already connecting or connected to', this.listId);
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
        
        // Ignore messages that don't match our current listId
        if (data.listId && data.listId !== this.listId) {
            console.warn('[SYNC] Ignoring message for different listId:', data.listId, 'expected:', this.listId);
            return;
        }
        
        switch (data.type) {
            case 'connected':
                console.log('[SYNC] Sync connected for listId:', data.listId);
                break;
            
            case 'list_update':
                console.log('[SYNC] Applying remote list update');
                // Get current list before update
                const currentList = get(list);
                
                // Set flag to prevent re-broadcasting this update
                this.isApplyingRemoteUpdate = true;
                
                // Deep clone to ensure Svelte detects all changes
                const newList = data.list.map((item: any) => ({...item}));
                list.set(newList);
                console.log('[SYNC] List store updated with', newList.length, 'items');
                
                // Detect and notify about changes
                this.notifyListChanges(currentList, newList);
                
                // Reset flag after longer delay to ensure all reactive updates complete
                setTimeout(() => {
                    this.isApplyingRemoteUpdate = false;
                    console.log('[SYNC] Remote update flag cleared');
                }, 100);
                break;
            
            case 'categories_update':
                console.log('[SYNC] Applying remote categories update');
                // Get current categories before update
                const currentCategories = get(categories);
                
                // Set flag to prevent re-broadcasting this update
                this.isApplyingRemoteUpdate = true;
                
                // Deep clone to ensure Svelte detects all changes
                const newCategories = data.categories.map((cat: any) => ({...cat}));
                categories.set(newCategories);
                console.log('[SYNC] Categories store updated with', newCategories.length, 'categories');
                
                // Detect and notify about changes
                this.notifyCategoryChanges(currentCategories, newCategories);
                
                // Reset flag after longer delay to ensure all reactive updates complete
                setTimeout(() => {
                    this.isApplyingRemoteUpdate = false;
                    console.log('[SYNC] Remote categories update flag cleared');
                }, 100);
                break;
        }
    }

    private applyListUpdate(data: any) {
        console.log('[SYNC] Applying remote list update');
        // Get current list before update
        const currentList = get(list);
        
        // Set flag to prevent re-broadcasting this update
        this.isApplyingRemoteUpdate = true;
        
        // Deep clone to ensure Svelte detects all changes
        const newList = data.list.map((item: any) => ({...item}));
        list.set(newList);
        console.log('[SYNC] List store updated with', newList.length, 'items');
        
        // Detect and notify about changes
        this.notifyListChanges(currentList, newList);
        
        // Reset flag after longer delay to ensure all reactive updates complete
        setTimeout(() => {
            this.isApplyingRemoteUpdate = false;
            console.log('[SYNC] Remote update flag cleared');
        }, 100);
    }

    private applyCategoriesUpdate(data: any) {
        console.log('[SYNC] Applying remote categories update');
        // Get current categories before update
        const currentCategories = get(categories);
        
        // Set flag to prevent re-broadcasting this update
        this.isApplyingRemoteUpdate = true;
        
        // Deep clone to ensure Svelte detects all changes
        const newCategories = data.categories.map((cat: any) => ({...cat}));
        categories.set(newCategories);
        console.log('[SYNC] Categories store updated with', newCategories.length, 'categories');
        
        // Detect and notify about changes
        this.notifyCategoryChanges(currentCategories, newCategories);
        
        // Reset flag after longer delay to ensure all reactive updates complete
        setTimeout(() => {
            this.isApplyingRemoteUpdate = false;
            console.log('[SYNC] Remote categories update flag cleared');
        }, 100);
    }

    private notifyListChanges(oldList: any[], newList: any[]) {
        console.log('[NOTIFY] List changes - old:', oldList.length, 'items, new:', newList.length, 'items');
        const oldMap = new Map(oldList.map(item => [item.id, item]));
        const newMap = new Map(newList.map(item => [item.id, item]));
        
        const messages: string[] = [];
        
        // Detect potential category renames by finding items that moved from same old category to same new category
        const categoryChanges = new Map<string, Map<string, Set<number>>>(); // old -> new -> Set of item IDs
        for (const [id, newItem] of newMap) {
            const oldItem = oldMap.get(id);
            if (oldItem && oldItem.category !== newItem.category) {
                if (!categoryChanges.has(oldItem.category)) {
                    categoryChanges.set(oldItem.category, new Map());
                }
                const targetMap = categoryChanges.get(oldItem.category)!;
                if (!targetMap.has(newItem.category)) {
                    targetMap.set(newItem.category, new Set());
                }
                targetMap.get(newItem.category)!.add(id);
            }
        }
        
        // If multiple items (3+) all moved from same old category to same new category, it's likely a rename
        const categoryRenames = new Set<string>(); // Set of "oldCat->newCat" pairs to ignore
        for (const [oldCat, targetMap] of categoryChanges) {
            // Check if all items from this old category went to a single new category
            if (targetMap.size === 1) {
                const [newCat, itemIds] = Array.from(targetMap.entries())[0];
                // If 3 or more items moved together, treat it as a category rename
                if (itemIds.size >= 3) {
                    categoryRenames.add(`${oldCat}->${newCat}`);
                    console.log('[NOTIFY] Detected category rename via item moves:', oldCat, '→', newCat, `(${itemIds.size} items)`);
                }
            }
        }
        
        // Check for added items
        for (const [id, newItem] of newMap) {
            if (!oldMap.has(id)) {
                messages.push(`📥 ${t('item.added', { name: newItem.label })}`);
            }
        }
        
        // Check for removed items
        for (const [id, oldItem] of oldMap) {
            if (!newMap.has(id)) {
                messages.push(`🗑️ ${t('item.removed', { name: oldItem.label })}`);
            }
        }
        
        // Check for modified items - detect specific changes
        for (const [id, newItem] of newMap) {
            const oldItem = oldMap.get(id);
            if (oldItem) {
                // Check if label changed (renamed)
                if (oldItem.label !== newItem.label) {
                    messages.push(`✏️ ${t('item.renamed', { oldName: oldItem.label, newName: newItem.label })}`);
                    continue; // Skip other checks for renamed items
                }
                
                // Check if category changed (moved to different category)
                if (oldItem.category !== newItem.category) {
                    // Skip notification if this is just a category rename
                    const renameKey = `${oldItem.category}->${newItem.category}`;
                    if (categoryRenames.has(renameKey)) {
                        console.log('[NOTIFY] Skipping item move notification for', newItem.label, '- category was renamed');
                        continue;
                    }
                    messages.push(`📦 ${t('item.moved', { name: newItem.label, oldCategory: oldItem.category, newCategory: newItem.category })}`);
                    continue; // Don't report other changes when moving categories
                }
                
                // Check if done status changed
                if (oldItem.done !== newItem.done) {
                    if (newItem.done) {
                        messages.push(`✓ ${t('item.done', { name: newItem.label })}`);
                    } else {
                        messages.push(`○ ${t('item.notDone', { name: newItem.label })}`);
                    }
                }
            }
        }
        
        // Show notifications
        console.log('[NOTIFY] List notifications to show:', messages);
        messages.forEach(msg => {
            console.log('[NOTIFY] Showing list notification:', msg);
            notifications.show(msg, 'info', 5000);
        });
    }

    private notifyCategoryChanges(oldCategories: any[], newCategories: any[]) {
        console.log('[NOTIFY] Category changes - old:', oldCategories.length, 'categories, new:', newCategories.length, 'categories');
        const messages: string[] = [];
        
        // Build maps of category names to their positions
        const oldNameToIndex = new Map(oldCategories.map((c, i) => [c.label, i]));
        const newNameToIndex = new Map(newCategories.map((c, i) => [c.label, i]));
        
        // Build maps of category names to their full objects
        const oldNameToCategory = new Map(oldCategories.map(c => [c.label, c]));
        const newNameToCategory = new Map(newCategories.map(c => [c.label, c]));
        
        // Track which categories we've already reported on to avoid duplicates
        const reportedOldNames = new Set<string>();
        const reportedNewNames = new Set<string>();
        
        // First, check for renames (same position, different name, neither moved)
        const minLength = Math.min(oldCategories.length, newCategories.length);
        for (let i = 0; i < minLength; i++) {
            const oldCat = oldCategories[i];
            const newCat = newCategories[i];
            
            if (oldCat.label !== newCat.label) {
                // Check if old name doesn't exist in new list and new name doesn't exist in old list
                const oldNameGone = !newNameToIndex.has(oldCat.label);
                const newNameNew = !oldNameToIndex.has(newCat.label);
                
                if (oldNameGone && newNameNew) {
                    // This is a rename at the same position
                    messages.push(`✏️ ${t('category.renamed', { oldName: oldCat.label, newName: newCat.label })}`);
                    reportedOldNames.add(oldCat.label);
                    reportedNewNames.add(newCat.label);
                }
            }
        }
        
        // Check for added categories (names that exist in new but not in old)
        for (const [name, newIndex] of newNameToIndex) {
            if (!oldNameToIndex.has(name) && !reportedNewNames.has(name)) {
                messages.push(`📂 ${t('category.added', { name })}`);
                reportedNewNames.add(name);
            }
        }
        
        // Check for removed categories (names that exist in old but not in new)
        for (const [name, oldIndex] of oldNameToIndex) {
            if (!newNameToIndex.has(name) && !reportedOldNames.has(name)) {
                messages.push(`🗑️ ${t('category.removed', { name })}`);
                reportedOldNames.add(name);
            }
        }
        
        // Check for moved categories (same name, different position)
        for (const [name, newIndex] of newNameToIndex) {
            const oldIndex = oldNameToIndex.get(name);
            if (oldIndex !== undefined && oldIndex !== newIndex) {
                if (newIndex < oldIndex) {
                    const count = oldIndex - newIndex;
                    messages.push(`↑ ${t('category.movedUp', { name, count })}`);
                } else {
                    const count = newIndex - oldIndex;
                    messages.push(`↓ ${t('category.movedDown', { name, count })}`);
                }
            }
        }
        
        // Check for color changes (same name, but different color)
        for (const [name, newCat] of newNameToCategory) {
            const oldCat = oldNameToCategory.get(name);
            if (oldCat && oldCat.color !== newCat.color) {
                messages.push(`🎨 ${t('category.colorChanged', { name })}`);
            }
        }
        
        // Show notifications
        console.log('[NOTIFY] Category notifications to show:', messages);
        messages.forEach(msg => {
            console.log('[NOTIFY] Showing category notification:', msg);
            notifications.show(msg, 'info', 5000);
        });
    }

    sendListUpdate(listData: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[SYNC] Sending list update for listId:', this.listId, 'data:', listData);
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
            console.log('[SYNC] Sending categories update for listId:', this.listId, 'data:', categoryData);
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

    suspendBroadcasts() {
        console.log('[SYNC] Broadcasts suspended');
        this.broadcastsSuspended = true;
    }

    resumeBroadcasts() {
        console.log('[SYNC] Broadcasts resumed');
        this.broadcastsSuspended = false;
    }
}

export const syncManager = new SyncManager();

// Export convenience functions for suspending/resuming broadcasts
export function suspendBroadcasts() {
    syncManager.suspendBroadcasts();
}

export function resumeBroadcasts() {
    syncManager.resumeBroadcasts();
}

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
    console.log('[SYNC] Categories changed, connected:', syncManager.isConnected(), 'applying remote:', syncManager['isApplyingRemoteUpdate'], 'suspended:', syncManager['broadcastsSuspended'], 'value:', value);
    
    // Don't broadcast if we're applying a remote update (would cause feedback loop)
    if (syncManager['isApplyingRemoteUpdate']) {
        console.log('[SYNC] Skipping categories broadcast - this is a remote update');
        // Deep clone to avoid reference issues
        lastCategoriesValue = JSON.parse(JSON.stringify(value));
        return;
    }
    
    // Don't broadcast if broadcasts are suspended (during list transitions)
    if (syncManager['broadcastsSuspended']) {
        console.log('[SYNC] Skipping categories broadcast - broadcasts are suspended');
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
