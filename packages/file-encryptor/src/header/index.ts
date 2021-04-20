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

function readVarint(
    buf: Uint8Array,
    errorCallback: (error: unknown) => never,
    offset?: number,
): { value: number; bytes: number; endOffset: number };
function readVarint<T>(
    buf: Uint8Array,
    errorCallback: (error: unknown) => T,
    offset?: number,
): { value: number; bytes: number; endOffset: number; error?: undefined } | { error: T };
function readVarint<T>(
    buf: Uint8Array,
    errorCallback: (error: unknown) => T,
    offset = 0,
): { value: number; bytes: number; endOffset: number; error?: undefined } | { error: T } {
    try {
        const value = varintDecode(buf, offset);
        const bytes = varintDecode.bytes;
        return {
            value,
            bytes,
            endOffset: offset + bytes,
        };
    } catch (error) {
        return { error: errorCallback(error) };
    }
}

interface ParseDataLengthFn {
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: true }): { dataByteLength: number; endOffset: number };
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: boolean }):
        | { dataByteLength: number; endOffset: number; error?: never }
        | { error: { needByteLength: number } };
}

function parseDataLength(opts: { name: string }): ParseDataLengthFn;
function parseDataLength(
    { name }: { name: string },
): (opts: {
    data: Uint8Array;
    offset?: number;
    throwIfLowData?: boolean;
}) => { dataByteLength: number; endOffset: number; error?: never } | { error: { needByteLength: number } } {
    return ({ data, offset = 0, throwIfLowData = true }) => {
        const result = readVarint(
            data,
            throwIfLowData
                ? () => {
                    throw new Error(
                        `Could not decode ${name} size. The byte length of the ${name} encoded as unsigned varint is required.`,
                    );
                }
                : () => ({ needByteLength: offset + 9 }),
            offset,
        );
        if (result.error) return result;
        const { value: dataByteLength, endOffset } = result;
        if (dataByteLength < 1) throw new Error(`Invalid ${name} byte length received: ${dataByteLength}`);
        return { dataByteLength, endOffset };
    };
}

function validateDataLength(
    { data, dataByteLength, offset, name, longname }: {
        data: Uint8Array;
        dataByteLength: number;
        offset: number;
        name: string;
        longname?: string;
    },
): { targetDataBytes: Uint8Array; endOffset: number } {
    const endOffset = offset + dataByteLength;
    const targetDataBytes = data.subarray(offset, endOffset);
    if (targetDataBytes.byteLength !== dataByteLength) {
        throw new Error(
            `Could not read ${longname ?? name}.`
                + ` ${dataByteLength} byte length ${name} is required.`
                + ` Received data: ${targetDataBytes.byteLength} bytes`,
        );
    }
    return { targetDataBytes, endOffset };
}

/**
 * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
 */
export const CID = 0x305011;

export function validateCID(
    opts: { data: Uint8Array; offset?: number; throwIfLowData?: true },
): { endOffset: number };
export function validateCID(
    opts: { data: Uint8Array; offset?: number; throwIfLowData?: boolean },
): { endOffset: number; error?: never } | { error: { needByteLength: number } };
export function validateCID(
    { data, offset = 0, throwIfLowData = true }: { data: Uint8Array; offset?: number; throwIfLowData?: boolean },
): { endOffset: number; error?: never } | { error: { needByteLength: number } } {
    const result = readVarint(
        data,
        throwIfLowData
            ? () => {
                throw new Error(`Could not decode identifier. Multicodec compliant identifiers are required.`);
            }
            : () => ({ needByteLength: offset + 9 }),
        offset,
    );
    if (result.error) return result;
    if (result.value !== CID) {
        throw new Error(
            `Invalid identifier detected.`
                + number2hex` The identifier must be ${CID}, encoded as unsigned varint.`
                + number2hex` Received ${result.value}`,
        );
    }
    return { endOffset: result.endOffset };
}

export const parseHeaderLength = parseDataLength({ name: 'header' });

export const parseSimpleHeaderLength = parseDataLength({ name: 'simple header' });

export function parseHeaderData(
    { data, headerByteLength, offset = 0 }: { data: Uint8Array; headerByteLength: number; offset?: number },
): { headerData: HeaderData; endOffset: number } {
    const { targetDataBytes: headerDataBytes, endOffset } = validateDataLength({
        data,
        dataByteLength: headerByteLength,
        offset,
        name: 'header',
        longname: 'header table',
    });

    const fbsBuf = new flatbuffers.ByteBuffer(headerDataBytes);
    const fbsHeader = Header.getRoot(fbsBuf);
    const headerData = parseFbsHeaderTable(fbsHeader);

    return { headerData, endOffset };
}

export function parseSimpleHeaderData(
    { data, headerByteLength, offset = 0 }: { data: Uint8Array; headerByteLength: number; offset?: number },
): { headerData: SimpleHeaderData; endOffset: number } {
    const { targetDataBytes: headerDataBytes, endOffset } = validateDataLength({
        data,
        dataByteLength: headerByteLength,
        offset,
        name: 'simple header',
        longname: 'simple header table',
    });

    const fbsBuf = new flatbuffers.ByteBuffer(headerDataBytes);
    const fbsSimpleHeader = SimpleHeader.getRoot(fbsBuf);
    const headerData = parseFbsSimpleHeaderTable(fbsSimpleHeader);

    return { headerData, endOffset };
}

export const parseCiphertextLength = parseDataLength({ name: 'ciphertext' });

export function parseCiphertextData(
    { data, ciphertextByteLength, offset = 0 }: { data: Uint8Array; ciphertextByteLength: number; offset?: number },
): { ciphertextDataBytes: Uint8Array; endOffset: number } {
    const { targetDataBytes: ciphertextDataBytes, endOffset } = validateDataLength({
        data,
        dataByteLength: ciphertextByteLength,
        offset,
        name: 'ciphertext',
    });
    return { ciphertextDataBytes, endOffset };
}

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

export function parseHeader(data: Uint8Array): {
    header: HeaderData;
    ciphertext: Uint8Array;
    readByteLength: number;
} {
    const { endOffset: headerLengthOffset } = validateCID({ data });
    const { dataByteLength: headerByteLength, endOffset: headerOffset } = parseHeaderLength(
        { data, offset: headerLengthOffset },
    );
    const { headerData, endOffset: ciphertextLengthOffset } = parseHeaderData(
        { data, headerByteLength, offset: headerOffset },
    );
    const { dataByteLength: ciphertextByteLength, endOffset: ciphertextOffset } = parseCiphertextLength(
        { data, offset: ciphertextLengthOffset },
    );
    const { ciphertextDataBytes, endOffset: readByteLength } = parseCiphertextData(
        { data, ciphertextByteLength, offset: ciphertextOffset },
    );
    return {
        header: headerData,
        ciphertext: ciphertextDataBytes,
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
    const { dataByteLength: headerByteLength, endOffset: headerOffset } = parseSimpleHeaderLength({ data });
    const { headerData, endOffset: ciphertextLengthOffset } = parseSimpleHeaderData(
        { data, headerByteLength, offset: headerOffset },
    );
    const { dataByteLength: ciphertextByteLength, endOffset: ciphertextOffset } = parseCiphertextLength(
        { data, offset: ciphertextLengthOffset },
    );
    const { ciphertextDataBytes, endOffset: readByteLength } = parseCiphertextData(
        { data, ciphertextByteLength, offset: ciphertextOffset },
    );
    return {
        header: headerData,
        ciphertext: ciphertextDataBytes,
        readByteLength,
    };
}
