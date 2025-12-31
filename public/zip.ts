import { compressToURI, decompressFromURI } from 'lz-ts'

// Encode une chaîne en Base64 compressée
export let compressAndEncodeBase64 = (input: string): string => {
    let compressed = compressToURI(input);
    let b64 = btoa(compressed)
    return b64
}

// Décode Base64 et décompresse pour retrouver la chaîne originale
export let decodeBase64AndDecompress = (base64: string): string => {
    let compressed = atob(base64)
    let result = decompressFromURI(compressed)
    return result
}
