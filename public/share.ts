
function base64ToArray(content:string):Uint8Array {
    let byteArrayAsString = atob(content);
    
    let bytesAsStrings = byteArrayAsString.split(',');


    var bytes = new Uint8Array(bytesAsStrings.length);
    for (var i = 0; i < bytes.length; i++) {
        let byteAsString = bytesAsStrings[i];
        let int = parseInt(byteAsString);
        bytes[i] = int;
    }
    return bytes;
}

function byteArrayToBase64(buffer: ArrayBuffer): string {  
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}




const compress = (string: string): Promise<ArrayBuffer> => {
  
  const byteArray: Uint8Array = new TextEncoder().encode(string);
  const cs: CompressionStream = new CompressionStream("gzip");
  const writer = cs.writable.getWriter()
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer();
}

const decompressByteArray = (byteArray: Uint8Array): Promise<string> => {
  const cs: DecompressionStream = new DecompressionStream("gzip");
  const writer = cs.writable.getWriter()
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer().then((arrayBuffer: ArrayBuffer) => new TextDecoder().decode(arrayBuffer));
}

export async function decompress(data:string ) : Promise<string> {
  let bytes = base64ToArray(data);
  return decompressByteArray(bytes);
}

export async function shareData<T>(data:T) : Promise<string> {
  let bytes = await compress(JSON.stringify(data));
  let b64 = byteArrayToBase64(bytes);
  const url = window.location;    
  const urlified = `${url.origin}/#/share/${b64}`;
  return urlified;
}