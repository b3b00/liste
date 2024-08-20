import{ShareData} from './model';

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


export function exportData(shareData : ShareData): string {
  const raw = JSON.stringify(shareData);
  const base64 = btoa(raw);
  const slug = encodeURIComponent(base64);
  const url = window.location;    
  const urlified = `${url.origin}/#/share/${slug}`;
  return urlified;
}

export function importData(raw: string) : ShareData {
  const base64 = decodeURIComponent(raw);
  const json = atob(base64);
  const data: ShareData = JSON.parse(json);
  return data;
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
  console.log(`decompress : raw :: >${data}<`)
  const uriDecoded = decodeURIComponent(data);
  console.log(`decompress : uri decoded :: >${uriDecoded}<`)
  let bytes = base64ToArray(uriDecoded);
  console.log(`decompress : base64 decoded :: `,bytes);
  return decompressByteArray(bytes);
}

export async function shareData<T>(data:T) : Promise<string> {
  console.log('sharing raw ',data);
  let bytes = await compress(JSON.stringify(data));
  console.log('sharing zipped',bytes);
  const encoded = byteArrayToBase64(bytes);
  console.log('sharing base 64 encoded : ',encoded);
  let b64 = encodeURIComponent(encoded);
  console.log('sharing URI encoded : ',b64);
  const url = window.location;    
  const urlified = `${url.origin}/#/share/${b64}`;
  console.log('sharing url ',urlified);
  return urlified;
}