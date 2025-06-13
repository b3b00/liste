<script lang="ts">
import { onMount } from "svelte";
import { categories, sharedList } from "./store";
import { decodeBase64AndDecompress } from "./zip";
    import { push } from "svelte-spa-router"

export let params:any = {};

onMount(async () => {
     console.log("IMPORT.ONMOUNT : Importing shopping list from data:", params);
    if (params.data) {
        try {
            console.log("IMPORT : found data, importing shopping list from data:", params);
            const decodedData = decodeBase64AndDecompress(params.data);
            console.log("IMPORT : decompressed data:", decodedData);
            const importedList = JSON.parse(decodedData);
            sharedList.set(importedList);
            console.log("IMPORT : Shopping list imported successfully!", importedList);
            push("/list/In");
        } catch (error) {
            console.error("IMPORT : Error importing shopping list:", error);
            
        }
    } else {
        alert("IMPORT : No data provided for import.");
    }
});

$: {
     console.log("REACTIVE.$ : Importing shopping list from data:", params);
    if (params.data) {
        try {
            console.log("reactive : Importing shopping list from data:", params);
            const decodedData = decodeBase64AndDecompress(params.data);
            console.log("reactive : decompressed data:", decodedData);
            const importedList = JSON.parse(decodedData);
            sharedList.set(importedList);
            console.log("reactive : Shopping list imported successfully!", importedList);
            push("/list/In");
        } catch (error) {
            console.error("reactive : Error importing shopping list:", error);
        }
    } else {
        alert("reactive : No data provided for import.");
    }
}

</script>


    <div>

        <a href="/#/list/In"><h1>Liste importée</h1></a>

        
        <ul>
        {#each $sharedList.list as item}
            <li>{item.label} - {item.category}</li>
        {/each}
        </ul>
        
    </div>