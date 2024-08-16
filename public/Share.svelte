<script lang="ts">

import { onMount } from "svelte";
import {categories, items, list} from './store';
import {ShopItem, Category, ShareData} from './model';
import { decompress, shareData } from './share';

    export let params;

    let data: string = ""

    let categoriesCount : number = 0;

    let itemsCount : number = 0;

    onMount(async () => {
        console.log('mounting Share component')
        if (params && params.data) {
            console.log('loading data from '+params);
            data = params.message;
            await loadData()
        }
    })

    async function loadData() {
        // TODO : decode data to json string
        console.log(`importing data from >${data}<`)
        let shareData:ShareData = JSON.parse(await decompress(data));
        console.log('decode data is ',shareData);
        // $categories = shareData.categories;
        // $list = shareData.list;
    }

</script>

<div>
    <h2>Partage</h2>
    {#if categoriesCount > 0}
    <h3>{categoriesCount} catégories importées.</h3>
    {/if}
    {#if itemsCount > 0}
    <h3>{itemsCount} items importés.</h3>
    {/if}    
</div>