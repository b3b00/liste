import { writable } from 'svelte/store';
import { Category, ShopItem } from './model';


const createWritableStore = <T>(key:string, startValue:T) => {
    const { subscribe, set, update } = writable(startValue);
    
      return {
      subscribe,
      update,
      set,
      useLocalStorage: () => {
        const json = localStorage.getItem(key);
        if (json) {
          var parsed = JSON.parse(json);
          set(parsed);
        }
        
        subscribe(current => {
          localStorage.setItem(key, JSON.stringify(current));
        });
      }
    };
  }
  
  export const categories = createWritableStore<Category[]>('categories',JSON.parse('[]'));

  export const list = createWritableStore<ShopItem[]>('list',JSON.parse('[]'));

  export const items = createWritableStore<{[category:string]:ShopItem[]}>('items',JSON.parse('[]'));

  export const displayDoneItems = createWritableStore<boolean>('displayDoneItems',true);

  export const getItems = (category:string) : ShopItem[] => {
    let itemsForCategory:ShopItem[] = []
    items.update(r => {
        if (Object.hasOwn(r,category)) {
            itemsForCategory = r[category];
        }
        return r;
    })
    return itemsForCategory;
  }

  
  