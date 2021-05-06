import { flatbuffers } from 'flatbuffers';
import { encode as varintEncode } from 'varint';

import type { CryptAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';
import { cidByteList } from './content-identifier';
import { createFbsHeaderTable } from './flatbuffers/headerTable';
import { createFbsSimpleHeaderTable } from './flatbuffers/simpleHeaderTable';

export interface SimpleHeaderData {
    nonce: Uint8Array;
    authTag: Uint8Array;
}

export interface HeaderData extends SimpleHeaderData {
    algorithmName: CryptAlgorithmName;
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

function createHeaderDataBinary(headerData: HeaderData): Uint8Array {
    const fbsBuilder = new flatbuffers.Builder();
    const fbsHeaderOffset = createFbsHeaderTable(fbsBuilder, headerData);
    fbsBuilder.finish(fbsHeaderOffset);
    return fbsBuilder.asUint8Array();
}

function createSimpleHeaderDataBinary(headerData: SimpleHeaderData): Uint8Array {
    const fbsBuilder = new flatbuffers.Builder();
    const fbsSimpleHeaderOffset = createFbsSimpleHeaderTable(fbsBuilder, headerData);
    fbsBuilder.finish(fbsSimpleHeaderOffset);
    return fbsBuilder.asUint8Array();
}

export function createHeader(data: HeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...headerData } = data;

    const headerDataBinary = createHeaderDataBinary(headerData);

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

    const simpleHeaderDataBinary = createSimpleHeaderDataBinary(headerData);

    return Buffer.concat([
        Buffer.from(varintEncode(simpleHeaderDataBinary.byteLength)),
        simpleHeaderDataBinary,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}
