import { encode as varintEncode } from 'varint';

import type { BuiltinInspectRecord } from '../../types/builtin';
import type { CompressOptions } from '../types/compress';
import type { CryptoAlgorithmName } from '../types/crypto';
import type { NormalizedKeyDerivationOptions } from '../types/key-derivation-function';
import { uint8arrayConcat } from '../utils';
import { cidByteList } from './content-identifier';
import { createProtobufHeader } from './protocol-buffers-converter/header';
import { createProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';

export interface SimpleHeaderData {
    crypto: {
        nonceDiff:
            | { addCounter: bigint }
            | {
                addFixed: bigint;
                resetCounter: bigint;
            };
        authTag: Uint8Array;
    };
}

export interface HeaderData {
    crypto: {
        algorithmName: CryptoAlgorithmName;
        nonce: Uint8Array;
        authTag: Uint8Array;
    };
    key: {
        length: number;
        salt: Uint8Array;
        keyDerivationFunctionOptions: NormalizedKeyDerivationOptions;
    };
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
}

export interface HeaderDataWithCiphertextLength extends HeaderData {
    ciphertextLength: number;
}

export interface SimpleHeaderDataWithCiphertextLength extends SimpleHeaderData {
    ciphertextLength: number;
}

export function createHeader(builtin: BuiltinInspectRecord, data: HeaderDataWithCiphertextLength): Uint8Array {
    const { ciphertextLength, ...headerData } = data;

    const headerDataBinary = createProtobufHeader(builtin, headerData)
        .serializeBinary();

    return uint8arrayConcat(
        cidByteList,
        varintEncode(headerDataBinary.byteLength),
        headerDataBinary,
        varintEncode(ciphertextLength),
    );
}

export function createSimpleHeader(
    builtin: BuiltinInspectRecord,
    data: SimpleHeaderDataWithCiphertextLength,
): Uint8Array {
    const { ciphertextLength, ...headerData } = data;

    const simpleHeaderDataBinary = createProtobufSimpleHeader(builtin, headerData)
        .serializeBinary();

    return uint8arrayConcat(
        varintEncode(simpleHeaderDataBinary.byteLength),
        simpleHeaderDataBinary,
        varintEncode(ciphertextLength),
    );
}
