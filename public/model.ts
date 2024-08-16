import Menu from '@smui/menu';

export interface Category {
    label : string,
    color : string,
}



export interface ShopItem {
    label: string,
    category: string,
    color: string,
    done : boolean,
}

export interface ShareData {
    categories: Category[],
    list: ShopItem[]
}