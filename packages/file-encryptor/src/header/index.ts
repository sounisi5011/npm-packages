import type { HeaderData, SimpleHeaderData } from './create';
import {
    parseCiphertextData,
    parseCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeaderData,
    parseSimpleHeaderLength,
    validateCID,
} from './parser';

export * from './create';
export * from './parser';

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
