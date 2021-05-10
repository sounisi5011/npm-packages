import { number2hex } from '../utils';
import type { StreamReader } from '../utils/stream';
import { cidNumber } from './content-identifier';
import { parseProtobufHeader } from './protocol-buffers-converter/header';
import { parseProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';
import { Header } from './protocol-buffers/header_pb';
import { createHeaderDataParser, parseDataLength, readVarint, validateDataLength } from './utils';

export async function validateCID(reader: StreamReader): Promise<void> {
    const result = await readVarint(
        reader,
        new Error(`Could not decode identifier. Multicodec compliant identifiers are required.`),
        { autoSeek: true },
    );
    if (result.value !== cidNumber) {
        throw new Error(
            `Invalid identifier detected.`
                + number2hex` The identifier must be ${cidNumber}, encoded as unsigned varint.`
                + number2hex` Received ${result.value}`,
        );
    }
}

export const parseHeaderLength = parseDataLength({ name: 'header', autoSeek: true });

export const parseSimpleHeaderLength = parseDataLength({ name: 'simple header', autoSeek: true });

export const parseHeaderData = createHeaderDataParser({
    name: 'header',
    longname: 'header data',
    genHeaderData: headerDataBytes => parseProtobufHeader(Header.deserializeBinary(headerDataBytes)),
    autoSeek: true,
});

export const parseSimpleHeaderData = createHeaderDataParser({
    name: 'simple header',
    longname: 'simple header data',
    genHeaderData: headerDataBytes => parseProtobufSimpleHeader(Header.deserializeBinary(headerDataBytes)),
    autoSeek: true,
});

export const parseCiphertextLength = parseDataLength({ name: 'ciphertext', autoSeek: true });

export async function parseCiphertextData(
    reader: StreamReader,
    { ciphertextByteLength, offset = 0, autoSeek = true }: {
        ciphertextByteLength: number;
        offset?: number;
        autoSeek?: boolean;
    },
): Promise<{ ciphertextDataBytes: Uint8Array; endOffset: number }> {
    const { targetDataBytes: ciphertextDataBytes, endOffset } = await validateDataLength({
        reader,
        dataByteLength: ciphertextByteLength,
        offset,
        name: 'ciphertext',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        autoSeek: autoSeek || undefined,
    });
    return { ciphertextDataBytes, endOffset };
}
