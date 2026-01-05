// Client-side WebSocket sync manager
import { list, categories } from './store';
import { get } from 'svelte/store';
import { notifications } from './notifications';
class SyncManager {
    ws = null;
    reconnectTimeout = null;
    listId = 'default';
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    isConnecting = false;
    isApplyingRemoteUpdate = false; // Flag to prevent feedback loop
    connect(listId = 'default') {
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('[SYNC] Error creating WebSocket:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }
    handleMessage(data) {
        console.log('[SYNC] Handling message type:', data.type, data);
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
                const newList = data.list.map((item) => ({ ...item }));
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
                const newCategories = data.categories.map((cat) => ({ ...cat }));
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
    notifyListChanges(oldList, newList) {
        const oldMap = new Map(oldList.map(item => [item.id, item]));
        const newMap = new Map(newList.map(item => [item.id, item]));
        const messages = [];
        // Check for added items
        for (const [id, newItem] of newMap) {
            if (!oldMap.has(id)) {
                messages.push(`📥 Item "${newItem.label}" added`);
            }
        }
        // Check for removed items
        for (const [id, oldItem] of oldMap) {
            if (!newMap.has(id)) {
                messages.push(`🗑️ Item "${oldItem.label}" removed`);
            }
        }
        // Check for modified items - detect specific changes
        for (const [id, newItem] of newMap) {
            const oldItem = oldMap.get(id);
            if (oldItem) {
                const changes = [];
                // Check if label changed (renamed)
                if (oldItem.label !== newItem.label) {
                    messages.push(`✏️ Item renamed: "${oldItem.label}" → "${newItem.label}"`);
                    continue; // Skip other checks for renamed items
                }
                // Check if category changed
                if (oldItem.category !== newItem.category) {
                    changes.push(`category: ${oldItem.category} → ${newItem.category}`);
                }
                // Check if done status changed
                if (oldItem.done !== newItem.done) {
                    if (newItem.done) {
                        changes.push('marked as done');
                    }
                    else {
                        changes.push('marked as not done');
                    }
                }
                // Check if color changed
                if (oldItem.color !== newItem.color) {
                    changes.push('color changed');
                }
                // Show notification for this item if there are changes
                if (changes.length > 0) {
                    messages.push(`✏️ Item "${newItem.label}": ${changes.join(', ')}`);
                }
            }
        }
        // Show notifications
        messages.forEach(msg => {
            notifications.show(msg, 'info', 5000);
        });
    }
    notifyCategoryChanges(oldCategories, newCategories) {
        const messages = [];
        // Check for added categories (new categories at the end)
        if (newCategories.length > oldCategories.length) {
            for (let i = oldCategories.length; i < newCategories.length; i++) {
                messages.push(`📂 Category "${newCategories[i].label}" added`);
            }
        }
        // Check for removed categories (fewer categories than before)
        if (newCategories.length < oldCategories.length) {
            for (let i = newCategories.length; i < oldCategories.length; i++) {
                messages.push(`🗑️ Category "${oldCategories[i].label}" removed`);
            }
        }
        // Check for modified categories at same positions
        const minLength = Math.min(oldCategories.length, newCategories.length);
        for (let i = 0; i < minLength; i++) {
            const oldCat = oldCategories[i];
            const newCat = newCategories[i];
            // Check if label changed (renamed)
            if (oldCat.label !== newCat.label) {
                messages.push(`✏️ Category renamed: "${oldCat.label}" → "${newCat.label}"`);
            }
            else {
                // Check if color changed (only if label is the same)
                if (oldCat.color !== newCat.color) {
                    messages.push(`🎨 Category "${newCat.label}" changed color`);
                }
            }
        }
        // Check for reordering (if same length, no adds/removes/renames, but different order)
        if (messages.length === 0 && oldCategories.length === newCategories.length) {
            const oldOrder = oldCategories.map(c => c.label).join(',');
            const newOrder = newCategories.map(c => c.label).join(',');
            if (oldOrder !== newOrder) {
                // Find which category moved and in which direction
                const oldLabelToIndex = new Map(oldCategories.map((c, i) => [c.label, i]));
                const newLabelToIndex = new Map(newCategories.map((c, i) => [c.label, i]));
                for (const cat of newCategories) {
                    const oldIndex = oldLabelToIndex.get(cat.label);
                    const newIndex = newLabelToIndex.get(cat.label);
                    if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
                        if (newIndex < oldIndex) {
                            const positions = oldIndex - newIndex;
                            messages.push(`↑ Category "${cat.label}" moved up ${positions} position${positions > 1 ? 's' : ''}`);
                        }
                        else {
                            const positions = newIndex - oldIndex;
                            messages.push(`↓ Category "${cat.label}" moved down ${positions} position${positions > 1 ? 's' : ''}`);
                        }
                        break; // Only report the first moved category to avoid multiple messages
                    }
                }
            }
        }
        // Show notifications
        messages.forEach(msg => {
            notifications.show(msg, 'info', 5000);
        });
    }
    sendListUpdate(listData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[SYNC] Sending list update:', listData);
            this.ws.send(JSON.stringify({
                type: 'list_update',
                listId: this.listId,
                list: listData
            }));
        }
        else {
            console.log('[SYNC] Cannot send update - WebSocket not connected. State:', this.ws?.readyState);
        }
    }
    sendCategoryUpdate(categoryData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[SYNC] Sending categories update:', categoryData);
            this.ws.send(JSON.stringify({
                type: 'categories_update',
                listId: this.listId,
                categories: categoryData
            }));
        }
        else {
            console.log('[SYNC] Cannot send categories update - WebSocket not connected. State:', this.ws?.readyState);
        }
    }
    scheduleReconnect() {
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
        }
        else {
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
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
export const syncManager = new SyncManager();
// Subscribe to list changes and broadcast them
let lastListValue = null;
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
let lastCategoriesValue = null;
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
