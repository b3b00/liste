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
        if (valueTypeFiles != null && valueTypeFiles.length == 1) {
            const content = await valueTypeFiles[0].text();
            const data : {categories:Category[], list:ShopItem[], history:{[category:string]:string[]}} = JSON.parse(content);
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
