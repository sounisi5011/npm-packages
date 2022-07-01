export type GetRandomBytesFn = (size: number) => Promise<Uint8Array>;

export type CryptoAlgorithmName = (typeof cryptoAlgorithmNameList)[number];
export interface CryptoAlgorithmData {
    readonly algorithmName: CryptoAlgorithmName;
    readonly keyLength: number;
    readonly nonceLength: number;
    encrypt: (
        arg: {
            key: Uint8Array;
            nonce: Uint8Array;
            cleartext: Uint8Array;
        },
    ) => Promise<{
        ciphertext: Uint8Array;
        authTag: Uint8Array;
    }>;
    decrypt: (
        arg: {
            key: Uint8Array;
            nonce: Uint8Array;
            authTag: Uint8Array;
            ciphertext: Iterable<Uint8Array> | AsyncIterable<Uint8Array>;
        },
    ) => AsyncIterable<Uint8Array>;
}
export type GetCryptoAlgorithm = (algorithmName: CryptoAlgorithmName) => CryptoAlgorithmData | undefined;

export const cryptoAlgorithmNameList = ['aes-256-gcm', 'chacha20-poly1305'] as const;
export const defaultCryptoAlgorithmName: CryptoAlgorithmName = 'chacha20-poly1305';
