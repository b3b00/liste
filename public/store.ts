import { writable } from 'svelte/store';
import type { Category, SharedList } from './model';
import type { ShopItem } from './model';
import { ListMode } from './model';


const createWritableStore = <T>(key:string, startValue:T) => {
    const { subscribe, set, update } = writable(startValue);

      return {
      subscribe,
      update,
      set,
      useLocalStorage: () => {
        console.log(`reading ${key}`);
        const json = localStorage.getItem(key);
        if (json) {
          if (json !== 'undefined') {
            var parsed = JSON.parse(json);
            set(parsed);
          }
        }

        subscribe(current => {
          console.log(`saving ${key} : ${current}`);
          localStorage.setItem(key, JSON.stringify(current));
        });
      }
    };
  }

  export const categories = createWritableStore<Category[]>('categories',JSON.parse('[]'));

  export const list = createWritableStore<ShopItem[]>('list',JSON.parse('[]'));

  export const itemsHistory = createWritableStore<{[category:string]:string[]}>('itemsHistory',JSON.parse('{}'));

  export const displayDoneItems = createWritableStore<boolean|undefined>('displayDoneItems',true);

  export const listMode = writable<ListMode>(ListMode.Edit);

  export const sharedList = createWritableStore<SharedList>('sharedList',{categories:[],list:[]});
  