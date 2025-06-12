import LZMA from 'lzma-web'
const lzma = new LZMA()
//import { compress, decompress } from 'lzma-web';

// Encode une chaîne en Base64 compressée
export let compressAndEncodeBase64 = async (input: string): Promise<string> => {
        const buffer = await lzma.compress(input)
        const compressed = new TextDecoder().decode(buffer)
        return atob(compressed);
}

// Décode Base64 et décompresse pour retrouver la chaîne originale
export let decodeBase64AndDecompress = async (
    base64: string
): Promise<string> => {
    let compressed = atob(base64)
    const buffer = new TextEncoder().encode(compressed)
    let result = await lzma.decompress(buffer);
    let stringResult : string = '';
    if (result instanceof Uint8Array) {
        stringResult = new TextDecoder().decode(result as Uint8Array)
    }
    return stringResult;
}
