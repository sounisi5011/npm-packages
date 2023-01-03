import type { RequireAtLeastOne } from './utils';

export type GetRandomBytesFn = (size: number) => Promise<Uint8Array>;

export type CryptoAlgorithmName = (typeof cryptoAlgorithmNameList)[number];
export interface CryptoAlgorithmData {
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
    /**
     * The `ciphertextIter` input and output types are AsyncIterable.
     * This is because of the following possibilities:
     *
     * + A huge ciphertext may be passed.
     *
     *     The specification does not specify a maximum length of ciphertext.
     *     For this reason, decryption is recommended to be a streaming process.
     *
     * + You may be compelled to return a huge plaintext.
     *
     *     When decrypting huge ciphertext as stream data, it is optimal to return the plaintext as stream data as well.
     *     If huge plaintexts are concatenated and returned, memory will be used unnecessarily.
     */
    decrypt: (
        arg: {
            key: Uint8Array;
            nonce: Uint8Array;
            authTag: Uint8Array;
            ciphertextIter: AsyncIterableIterator<Uint8Array>;
        },
    ) => AsyncIterable<Uint8Array> | AsyncIterator<Uint8Array>;
}
export interface CryptoAlgorithmBuiltinAPI {
    algorithmRecord: RequireAtLeastOne<
        Readonly<Record<CryptoAlgorithmName, CryptoAlgorithmData>>
    >;
    defaultAlgorithmName: CryptoAlgorithmName;
}

export const cryptoAlgorithmNameList = ['aes-256-gcm', 'chacha20-poly1305'] as const;
