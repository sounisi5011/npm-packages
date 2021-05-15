import { encode as varintEncode } from 'varint';

import type { CryptoAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';
import { cidByteList } from './content-identifier';
import { createProtobufHeader } from './protocol-buffers-converter/header';
import { createProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';

export interface SimpleHeaderData {
    nonce:
        | { addCounter: bigint }
        | {
            addFixed: bigint;
            resetCounter: bigint;
        };
    authTag: Uint8Array;
}

export interface HeaderData {
    algorithmName: CryptoAlgorithmName;
    nonce: Uint8Array;
    authTag: Uint8Array;
    salt: Uint8Array;
    keyLength: number;
    keyDerivationOptions: NormalizedKeyDerivationOptions;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

export interface HeaderDataWithCiphertextLength extends HeaderData {
    ciphertextLength: number;
}

export interface SimpleHeaderDataWithCiphertextLength extends SimpleHeaderData {
    ciphertextLength: number;
}

export function createHeader(data: HeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...headerData } = data;

    const headerDataBinary = createProtobufHeader(headerData)
        .serializeBinary();

    return Buffer.concat([
        Buffer.from([
            ...cidByteList,
            ...varintEncode(headerDataBinary.byteLength),
        ]),
        headerDataBinary,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}

export function createSimpleHeader(data: SimpleHeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...headerData } = data;

    const simpleHeaderDataBinary = createProtobufSimpleHeader(headerData)
        .serializeBinary();

    return Buffer.concat([
        Buffer.from(varintEncode(simpleHeaderDataBinary.byteLength)),
        simpleHeaderDataBinary,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}
