    <script>

      import {onMount} from "svelte";
    
    export let value = ""
    export let size = "200";
  
    let image = null;
  
    onMount(() => {
      console.log("Generating QR code for value:", value, encodeURIComponent(value));
      image = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
      console.log("QR code image URL:", image);
    });

    $: {
      console.log("reactive : Generating QR code for value:", value, encodeURIComponent(value));
      image = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
      console.log("reactive : QR code image URL:", image);
    }
  </script>

  <img src={image} alt=""/>