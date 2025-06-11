import { compress, decompress } from 'lzma';

// Encode une chaîne en Base64 compressée
export function compressAndEncodeBase64(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
        compress(input, 1, (result: Uint8Array | number[], error?: Error) => {
            if (error) return reject(error);

            const byteArray = result instanceof Uint8Array ? result : new Uint8Array(result);
            const binaryString = String.fromCharCode(...byteArray);
            const base64 = btoa(binaryString);
            resolve(base64);
        });
    });
}

// Décode Base64 et décompresse pour retrouver la chaîne originale
export function decodeBase64AndDecompress(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const binaryString = atob(base64);
        const byteArray = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }

        decompress(byteArray, (result: string, error?: Error) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}
