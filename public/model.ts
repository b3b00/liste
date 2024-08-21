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

export enum ListMode {
    Shop,
    Edit
}