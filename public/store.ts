import { writable } from 'svelte/store';
import type { Category, SharedList, SaveSettings, VersionInfo, ListMetadata, StoredList } from './model';
import type { ShopItem } from './model';
import { ListMode } from './model';


const createWritableStore = <T>(key:string, startValue:T) => {
    const { subscribe, set, update } = writable(startValue);

      return {
      subscribe,
      update,
      set,
      useLocalStorage: () => {
        const json = localStorage.getItem(key);
        let needsPersist = false;
        if (json) {
          if (json !== 'undefined') {
            var parsed = JSON.parse(json);
            // Normalize old data: add version:0 if missing for SharedList
            if (key === 'sharedList' && parsed && typeof parsed === 'object' && parsed.version === undefined) {
              parsed.version = 0;
              needsPersist = true;
              console.log('[STORE] Normalized old list data with version:0');
            }
            set(parsed);
            // Persist normalized data immediately
            if (needsPersist) {
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }

        subscribe(current => {
          localStorage.setItem(key, JSON.stringify(current));
        });
      }
    };
  }

  export const categories = createWritableStore<Category[]>('categories',JSON.parse('[]'));

  export const list = createWritableStore<ShopItem[]>('list',JSON.parse('[]'));

  export const listVersion = createWritableStore<number>('listVersion', 0);

  export const itemsHistory = createWritableStore<{[category:string]:string[]}>('itemsHistory',JSON.parse('{}'));

  export const displayDoneItems = createWritableStore<boolean|undefined>('displayDoneItems',true);


  export const listMode = writable<ListMode>(ListMode.Edit);

  export const sharedList = createWritableStore<SharedList>('sharedList',{categories:[],list:[],version:0});

  export const settings = createWritableStore<SaveSettings>('settings',{id:null,autoSave:false});

  export const versionInfo = createWritableStore<VersionInfo>('versionInfo',{version:'0.0.0', hash:undefined});
  
  export const enableNotifications = createWritableStore<boolean>('enableNotifications',true);

  export const listsHistory = createWritableStore<ListMetadata[]>('listsHistory', []);

  // Create lists store with migration logic
  const createListsStore = () => {
    const { subscribe, set, update } = writable<StoredList[]>([]);

    return {
      subscribe,
      update,
      set,
      useLocalStorage: () => {
        const json = localStorage.getItem('lists');
        let migratedData: StoredList[] = [];
        let needsMigration = false;

        // Check if we need to migrate from old structure
        const oldList = localStorage.getItem('list');
        const oldCategories = localStorage.getItem('categories');
        const hasOldData = oldList && oldCategories;
        const hasNewData = json && json !== 'undefined';

        if (hasOldData && (!hasNewData || json === '[]')) {
          // Migration needed
          needsMigration = true;
          console.log('[STORE] Detecting old localStorage structure, starting migration...');
          
          try {
            const listItems: ShopItem[] = JSON.parse(oldList);
            const categoriesData: Category[] = JSON.parse(oldCategories);
            
            // Create migrated list entry with default name "liste"
            const migratedList: StoredList = {
              id: 'liste',
              categories: categoriesData,
              items: listItems,
              version: 0
            };
            
            migratedData = [migratedList];
            
            // Save migrated data
            localStorage.setItem('lists', JSON.stringify(migratedData));
            console.log(`[STORE] Migrated ${listItems.length} items and ${categoriesData.length} categories to list "liste"`);
            
            // Update listsHistory
            const historyEntry: ListMetadata = {
              id: 'liste',
              lastAccessed: Date.now(),
              version: 0
            };
            const existingHistory = localStorage.getItem('listsHistory');
            const history = existingHistory && existingHistory !== 'undefined' ? JSON.parse(existingHistory) : [];
            if (!history.find((h: ListMetadata) => h.id === 'liste')) {
              history.push(historyEntry);
              localStorage.setItem('listsHistory', JSON.stringify(history));
              console.log('[STORE] Created listsHistory entry for migrated list');
            }
            
            // Update settings to point to migrated list
            const existingSettings = localStorage.getItem('settings');
            if (existingSettings && existingSettings !== 'undefined') {
              const settingsData = JSON.parse(existingSettings);
              if (!settingsData.id) {
                settingsData.id = 'liste';
                localStorage.setItem('settings', JSON.stringify(settingsData));
                console.log('[STORE] Updated settings to point to "liste"');
              }
            } else {
              const newSettings = { id: 'liste', autoSave: false };
              localStorage.setItem('settings', JSON.stringify(newSettings));
              console.log('[STORE] Created settings for migrated list');
            }
            
            console.log('[STORE] Migration completed successfully');
          } catch (e) {
            console.error('[STORE] Migration failed:', e);
            migratedData = [];
          }
        } else if (hasNewData) {
          // Load existing new structure
          try {
            migratedData = JSON.parse(json);
            console.log(`[STORE] Loaded ${migratedData.length} lists from localStorage`);
          } catch (e) {
            console.error('[STORE] Error parsing lists:', e);
            migratedData = [];
          }
        }

        set(migratedData);

        // Subscribe to changes
        subscribe(current => {
          localStorage.setItem('lists', JSON.stringify(current));
        });
      }
    };
  };

  export const lists = createListsStore();