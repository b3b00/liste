export interface Category {
    label : string,
    color : string,
}



export interface ShopItem {
    label: string,
    category: string,
    color: string,
    done : boolean,
    id: number,
}

export enum ListMode {
    Shop,
    Edit,
    In,
}

export interface SharedList {
    categories: Category[],
    list: ShopItem[],
}

export interface SaveSettings {
    id:string|null,
    autoSave:boolean
}

export interface VersionInfo {
    version: string,
    hash?: string
}