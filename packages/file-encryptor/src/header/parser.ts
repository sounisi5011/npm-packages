import { number2hex } from '../utils';
import { cidNumber } from './content-identifier';
import { Header, SimpleHeader } from './flatbuffers/header_generated';
import { parseFbsHeaderTable } from './flatbuffers/headerTable';
import { parseFbsSimpleHeaderTable } from './flatbuffers/simpleHeaderTable';
import { createHeaderDataParser, parseDataLength, readVarint, validateDataLength } from './utils';

export function validateCID(
    opts: { data: Uint8Array; offset?: number; throwIfLowData?: true },
): { endOffset: number };
export function validateCID(
    opts: { data: Uint8Array; offset?: number; throwIfLowData?: boolean },
): { endOffset: number; error?: never } | { error: { needByteLength: number } };
export function validateCID(
    { data, offset = 0, throwIfLowData = true }: { data: Uint8Array; offset?: number; throwIfLowData?: boolean },
): { endOffset: number; error?: never } | { error: { needByteLength: number } } {
    const needByteLength = offset + 9;
    const result = readVarint(
        data,
        throwIfLowData || needByteLength <= data.byteLength
            ? () => {
                throw new Error(`Could not decode identifier. Multicodec compliant identifiers are required.`);
            }
            : () => ({ needByteLength }),
        offset,
    );
    if (result.error) return result;
    if (result.value !== cidNumber) {
        throw new Error(
            `Invalid identifier detected.`
                + number2hex` The identifier must be ${cidNumber}, encoded as unsigned varint.`
                + number2hex` Received ${result.value}`,
        );
    }
    return { endOffset: result.endOffset };
}

export const parseHeaderLength = parseDataLength({ name: 'header' });

export const parseSimpleHeaderLength = parseDataLength({ name: 'simple header' });

export const parseHeaderData = createHeaderDataParser({
    name: 'header',
    longname: 'header table',
    genHeaderData: fbsBuf => parseFbsHeaderTable(Header.getRoot(fbsBuf)),
});

export const parseSimpleHeaderData = createHeaderDataParser({
    name: 'simple header',
    longname: 'simple header table',
    genHeaderData: fbsBuf => parseFbsSimpleHeaderTable(SimpleHeader.getRoot(fbsBuf)),
});

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
