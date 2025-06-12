<script lang="ts">

import { onMount } from "svelte";
import { categories, list, itemsHistory } from './store';
import {compressAndEncodeBase64, decodeBase64AndDecompress} from './zip';
import QRCode from './QRCode.svelte'; 
import Pen from "svelte-material-icons/Pen.svelte";
import Share from "svelte-material-icons/Share.svelte";
import IconButton from '@smui/icon-button';

onMount(async () => {
    await initialize();
});

let ShareLink = "";

let initialize = async () => {
    if (!navigator.clipboard) {
        alert("Clipboard API not supported in this browser.");
        return;
    }
    const currentList = $list;
    const currentCategories = $categories;
    const currentHistory = $itemsHistory;

    const data = {
        list: currentList,
        categories: currentCategories
    };

    const compressedData = await compressAndEncodeBase64(JSON.stringify(data));
    const url = window.location.origin;
    ShareLink = `${url}/#import/${compressedData}`;
    navigator.clipboard.writeText(ShareLink).then(() => {
        alert("Share data copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy: ", err);
    });
}



let share = async () => {
    await navigator.share({
        title: "Share Shopping List",
        text: "Check out my shopping list!",
        url: ShareLink
    });
}

</script>

<div>
    <IconButton on:click={share} toggle>
                <Share></Share>
    </IconButton>
    <QRCode {ShareLink} />
</div>
