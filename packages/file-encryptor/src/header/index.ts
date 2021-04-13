import { encode as varintEncode } from 'varint';

import type { CryptAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';

export interface HeaderData {
    algorithmName: CryptAlgorithmName;
    salt: Uint8Array;
    keyLength: number;
    keyDerivationOptions: NormalizedKeyDerivationOptions;
    nonce: Uint8Array;
    authTag: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

export interface HeaderDataWithEncryptedDataOffset extends HeaderData {
    ciphertextStartOffset: number;
}

/**
 * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
 */
const CID = 0x305011;

export function createHeader(data: HeaderData): Buffer {
    const headerDataTable = Buffer.from('TODO');
    return Buffer.concat([
        Buffer.from([
            ...varintEncode(CID),
            ...varintEncode(headerDataTable.byteLength),
        ]),
        headerDataTable,
    ]);
}

export function parseHeader(data: Uint8Array): [HeaderData, Uint8Array] {
    // TODO
    const ciphertextStartOffset = NaN;

    const ciphertext = data.subarray(ciphertextStartOffset);
    return [{}, ciphertext];
}
