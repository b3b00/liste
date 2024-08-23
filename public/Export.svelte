<script lang="ts">

    import { onMount } from "svelte";
    import Button, {Label, Icon} from '@smui/button';  
    import 'material-design-inspired-color-picker';
    import {categories, list, itemsHistory} from './store';
    
    categories.useLocalStorage();
    list.useLocalStorage();
    itemsHistory.useLocalStorage();



    onMount(() => {
        });

    const exportData = () => {
        const content = JSON.stringify({'categories':$categories,'list':$list,'history':$itemsHistory});
        const blob = new Blob([content], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'data.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url); // Object URLs should be revoked after use
    }

    </script>
    
    <div>

        

<div style="display:flex;flex-direction: column;">
        
    <Button class="button-shaped-round" style="color:black;font-weight: bold;background-color:white" on:click={exportData}>Exporter...</Button>
</div>


    </div>