import { flatbuffers } from 'flatbuffers';
import { decode as varintDecode, encode as varintEncode } from 'varint';

import type { CryptAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';
import { number2hex } from '../utils';
import { Header, SimpleHeader } from './flatbuffers/header_generated';
import { createFbsHeaderTable, parseFbsHeaderTable } from './flatbuffers/headerTable';
import { createFbsSimpleHeaderTable, parseFbsSimpleHeaderTable } from './flatbuffers/simpleHeaderTable';

export interface SimpleHeaderData {
    nonce: Uint8Array;
    authTag: Uint8Array;
}

export interface SimpleHeaderDataWithCiphertextLength extends SimpleHeaderData {
    ciphertextLength: number;
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

function readVarint<T>(
    buf: Uint8Array,
    errorCallback: (error: unknown) => T,
    offset = 0,
): { value: number; bytes: number; endOffset: number } | T {
    try {
        const value = varintDecode(buf, offset);
        const bytes = varintDecode.bytes;
        return {
            value,
            bytes,
            endOffset: offset + bytes,
        };
    } catch (error) {
        return errorCallback(error);
    }
}

/**
 * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
 */
const CID = 0x305011;

export function createHeader(data: HeaderDataWithCiphertextLength): Buffer {
    const { ciphertextLength, ...fbsData } = data;

    const fbsBuilder = new flatbuffers.Builder();
    const fbsHeaderOffset = createFbsHeaderTable(fbsBuilder, fbsData);
    fbsBuilder.finish(fbsHeaderOffset);
    const headerDataTable = fbsBuilder.asUint8Array();

    return Buffer.concat([
        Buffer.from([
            ...varintEncode(CID),
            ...varintEncode(headerDataTable.byteLength),
        ]),
        headerDataTable,
        Buffer.from(varintEncode(ciphertextLength)),
    ]);
}

function validateCID(data: Uint8Array): { headerLengthOffset: number } {
    const { value: cidFromData, endOffset: headerLengthOffset } = readVarint(
        data,
        () => {
            throw new Error(`Could not decode identifier. Multicodec compliant identifiers are required.`);
        },
    );
    if (cidFromData !== CID) {
        throw new Error(
            `Invalid identifier detected.`
                + number2hex` The identifier must be ${CID}, encoded as unsigned varint.`
                + number2hex` Received ${cidFromData}`,
        );
    }
    return { headerLengthOffset };
}

function parseLengthPrefixedData(
    fullData: Uint8Array,
    { name, longname, startOffset }: { name: string; longname?: string; startOffset: number },
): { byteLength: number; startOffset: number; endOffset: number; data: Uint8Array } {
    const { value: subDataByteLength, endOffset: subDataStartOffset } = readVarint(fullData, () => {
        throw new Error(
            `Could not decode ${name} size. The byte length of the ${name} encoded as unsigned varint is required.`,
        );
    }, startOffset);
    if (subDataByteLength < 1) throw new Error(`Invalid ${name} byte length received: ${subDataByteLength}`);
    const subDataEndOffset = subDataStartOffset + subDataByteLength;
    const subDataBytes = fullData.subarray(subDataStartOffset, subDataEndOffset);
    if (subDataBytes.byteLength !== subDataByteLength) {
        throw new Error(
            `Could not read ${longname ?? name}.`
                + ` ${subDataByteLength} byte length ${name} is required.`
                + ` Received data: ${subDataBytes.byteLength} bytes`,
        );
    }
    return {
        byteLength: subDataByteLength,
        startOffset: subDataStartOffset,
        endOffset: subDataEndOffset,
        data: subDataBytes,
    };
}

export function parseHeader(data: Uint8Array): {
    header: HeaderData;
    ciphertext: Uint8Array;
    readByteLength: number;
} {
    const { headerLengthOffset } = validateCID(data);

    const { endOffset: ciphertextLengthStartOffset, data: headerBytes } = parseLengthPrefixedData(data, {
        name: 'header',
        longname: 'header table',
        startOffset: headerLengthOffset,
    });

    const { endOffset: readByteLength, data: ciphertext } = parseLengthPrefixedData(data, {
        name: 'ciphertext',
        startOffset: ciphertextLengthStartOffset,
    });

    const fbsBuf = new flatbuffers.ByteBuffer(headerBytes);
    const fbsHeader = Header.getRootAsHeader(fbsBuf);
    const headerData = parseFbsHeaderTable(fbsHeader);

    return {
        header: headerData,
        ciphertext,
        readByteLength,
    };
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

export function parseSimpleHeader(data: Uint8Array): {
    header: SimpleHeaderData;
    ciphertext: Uint8Array;
    readByteLength: number;
} {
    const { endOffset: ciphertextLengthStartOffset, data: simpleHeaderBytes } = parseLengthPrefixedData(data, {
        name: 'simple header',
        longname: 'simple header table',
        startOffset: 0,
    });

    const { endOffset: readByteLength, data: ciphertext } = parseLengthPrefixedData(data, {
        name: 'ciphertext',
        startOffset: ciphertextLengthStartOffset,
    });

    const fbsBuf = new flatbuffers.ByteBuffer(simpleHeaderBytes);
    const fbsSimpleHeader = SimpleHeader.getRootAsSimpleHeader(fbsBuf);
    const simpleHeaderData = parseFbsSimpleHeaderTable(fbsSimpleHeader);

    return {
        header: simpleHeaderData,
        ciphertext,
        readByteLength,
    };
}
