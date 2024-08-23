import { writable } from 'svelte/store';
import { Category, ListMode, ShopItem } from './model';


const createWritableStore = <T>(key: string, startValue: T) => {
  const { subscribe, set, update } = writable(startValue);

  return {
    subscribe,
    update,
    set,
    useLocalStorage: () => {
      const json = localStorage.getItem(key);
      if (json) {
        if (json !== 'undefined') {
          var parsed = JSON.parse(json);
          set(parsed);
        }
      }

      subscribe(current => {
        localStorage.setItem(key, JSON.stringify(current));
      });
    }
  };
}

export const categories = createWritableStore<Category[]>('categories', JSON.parse('[]'));

export const list = createWritableStore<ShopItem[]>('list', JSON.parse('[]'));

export const itemsHistory = createWritableStore<{ [category: string]: string[] }>('itemsHistory', JSON.parse('{}'));

export const displayDoneItems = createWritableStore<boolean | undefined>('displayDoneItems', true);

export const listMode = writable<ListMode>(ListMode.Edit);



