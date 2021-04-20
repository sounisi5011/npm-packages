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

export function createHeader(data: HeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...fbsData } = data;

    const fbsBuilder = new flatbuffers.Builder();
    const fbsHeaderOffset = createFbsHeaderTable(fbsBuilder, fbsData);
    fbsBuilder.finish(fbsHeaderOffset);
    const headerDataTable = fbsBuilder.asUint8Array();

    return Buffer.concat([
        Buffer.from([
            ...cidByteList,
            ...varintEncode(headerDataTable.byteLength),
        ]),
        headerDataTable,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}

export function createSimpleHeader(data: SimpleHeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...fbsData } = data;

    const fbsBuilder = new flatbuffers.Builder();
    const fbsSimpleHeaderOffset = createFbsSimpleHeaderTable(fbsBuilder, fbsData);
    fbsBuilder.finish(fbsSimpleHeaderOffset);
    const simpleHeaderDataTable = fbsBuilder.asUint8Array();

    return Buffer.concat([
        Buffer.from(varintEncode(simpleHeaderDataTable.byteLength)),
        simpleHeaderDataTable,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}
