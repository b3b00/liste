    <script>

      import {onMount} from "svelte";
    
    export let value = ""
    export let size = "200";
  
    let image = null;
  
    onMount(() => {
      image = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    });

    $: {
      image = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    }
  </script>

  <img src={image} alt=""/>