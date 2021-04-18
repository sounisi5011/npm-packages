import { flatbuffers } from 'flatbuffers';
import { decode as varintDecode, encode as varintEncode } from 'varint';

import type { CryptAlgorithmName } from '../cipher';
import type { CompressAlgorithmName } from '../compress';
import type { NormalizedKeyDerivationOptions } from '../key-derivation-function';
import { number2hex } from '../utils';
import { Header } from './flatbuffers/header_generated';
import { createFbsHeaderTable, parseFbsHeaderTable } from './flatbuffers/headerTable';

export interface HeaderData {
    algorithmName: CryptAlgorithmName;
    salt: Uint8Array;
    keyLength: number;
    keyDerivationOptions: NormalizedKeyDerivationOptions;
    nonce: Uint8Array;
    authTag: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
    ciphertextLength: number;
}

export interface HeaderDataWithEncryptedDataOffset extends HeaderData {
    ciphertextStartOffset: number;
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

export function createHeader(data: HeaderData): Buffer {
    const fbsBuilder = new flatbuffers.Builder();
    const fbsHeaderOffset = createFbsHeaderTable(fbsBuilder, data);
    fbsBuilder.finish(fbsHeaderOffset);
    const headerDataTable = fbsBuilder.asUint8Array();

    return Buffer.concat([
        Buffer.from([
            ...varintEncode(CID),
            ...varintEncode(headerDataTable.byteLength),
        ]),
        headerDataTable,
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

function validateHeaderLength(
    { data, headerLengthOffset }: { data: Uint8Array; headerLengthOffset: number },
): { headerByteLength: number; headerStartOffset: number } {
    const { value: headerByteLength, endOffset: headerStartOffset } = readVarint(data, () => {
        throw new Error(
            `Could not decode header size. The byte length of the header encoded as unsigned varint is required.`,
        );
    }, headerLengthOffset);
    if (headerByteLength < 1) throw new Error(`Invalid header byte length received: ${headerByteLength}`);
    return { headerByteLength, headerStartOffset };
}

export function parseHeader(data: Uint8Array): [HeaderData, Uint8Array] {
    const { headerLengthOffset } = validateCID(data);

    const { headerByteLength, headerStartOffset } = validateHeaderLength({ data, headerLengthOffset });
    const ciphertextStartOffset = headerStartOffset + headerByteLength;

    const headerBytes = data.subarray(headerStartOffset, ciphertextStartOffset);
    if (headerBytes.byteLength !== headerByteLength) {
        throw new Error(
            `Could not read header table. ${headerByteLength} byte length header is required. Received data: ${headerBytes.byteLength} bytes`,
        );
    }

    const fbsBuf = new flatbuffers.ByteBuffer(headerBytes);
    const fbsHeader = Header.getRootAsHeader(fbsBuf);
    const headerData = parseFbsHeaderTable(fbsHeader);

    const ciphertextEndOffset = ciphertextStartOffset + headerData.ciphertextLength;
    const ciphertext = data.subarray(ciphertextStartOffset, ciphertextEndOffset);

    return [headerData, ciphertext];
}
