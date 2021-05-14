import { encode as varintEncode } from 'varint';

import type { CryptoAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';
import { cidByteList } from './content-identifier';
import { createProtobufHeader } from './protocol-buffers-converter/header';
import { createProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';

export interface SimpleHeaderData {
    nonce: Uint8Array;
    authTag: Uint8Array;
}

export interface HeaderData extends SimpleHeaderData {
    algorithmName: CryptoAlgorithmName;
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

export function createHeader(data: HeaderDataWithCiphertextLength): Array<Uint8Array | number[]> {
    const { ciphertextLength, ...headerData } = data;

    const headerDataBinary = createProtobufHeader(headerData)
        .serializeBinary();

    return [
        cidByteList,
        varintEncode(headerDataBinary.byteLength),
        headerDataBinary,
        varintEncode(ciphertextLength),
    ];
}

export function createSimpleHeader(data: SimpleHeaderDataWithCiphertextLength): Array<Uint8Array | number[]> {
    const { ciphertextLength, ...headerData } = data;

    const simpleHeaderDataBinary = createProtobufSimpleHeader(headerData)
        .serializeBinary();

    return [
        varintEncode(simpleHeaderDataBinary.byteLength),
        simpleHeaderDataBinary,
        varintEncode(ciphertextLength),
    ];
}
