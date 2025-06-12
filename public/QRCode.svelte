    <script>
    import QRious from 'qrious';
  
    const QRcode = new QRious();
  
  
    export let errorCorrection = "L";
    export let background = "#fff";
    export let color = "#000";
    export let size = "500";
    export let value = ""
    export let padding = 0;
  
    export let className = "qrcode"
  
    let image = null;
  
    $: {
  
      QRcode.set({
        background,
        foreground: color,
        level: errorCorrection,
        padding,
        size,
        value,
      });
  
      image = QRcode.toDataURL('image/jpeg')

console.log("QR code generated", image);
  
      

    }
  
  </script>
  
  <img src={image} alt="" class={className} />