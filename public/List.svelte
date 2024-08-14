<script lang="ts">

    import { onMount } from "svelte";
    
        export let params;
    
        export let message: string = "empty message"
    
        onMount(() => {
            if (params && params.message) {
                message = params.message;
            }
        })
    </script>
    
    <div>
        <h2>to come</h2>
    </div>