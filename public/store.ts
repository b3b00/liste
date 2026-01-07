import { writable } from 'svelte/store';
import type { Category, SharedList, SaveSettings, VersionInfo } from './model';
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