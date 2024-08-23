<script lang="ts">

    import { onMount } from "svelte";
    import Button, {Label, Icon} from '@smui/button';
    import 'material-design-inspired-color-picker';
    import {categories, list, itemsHistory} from './store';
    import Textfield from '@smui/textfield';
    import { Category, ShopItem } from "./model"
    import { push } from "svelte-spa-router"

    categories.useLocalStorage();
    list.useLocalStorage();
    itemsHistory.useLocalStorage();

    let valueTypeFiles: FileList | null = null;



    onMount(() => {
        });

    const importData = async () => {
        console.log('import data.... ',valueTypeFiles);
        if (valueTypeFiles != null && valueTypeFiles.length == 1) {
            console.log('found 1 file to import',valueTypeFiles[0]);
            const content = await valueTypeFiles[0].text();
            console.log('raw data is ',content);
            const data : {categories:Category[], list:ShopItem[], history:{[category:string]:string[]}} = JSON.parse(content);
            console.log('parsed data is ',data);
            $list = data.list;
            $categories = data.categories;
            $itemsHistory = data.history;
            push("/list");
        }
    }

    </script>
    
    <div>

        <Textfield bind:files={valueTypeFiles} label="File" type="file" />
        <Button on:click={importData}>Importer...</Button>


    </div>