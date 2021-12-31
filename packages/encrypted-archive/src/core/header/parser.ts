import type { BuiltinInspectRecord } from '../../types/builtin';
import { number2hex } from '../utils';
import type { StreamReaderInterface } from '../utils/stream';
import { cidNumber } from './content-identifier';
import { parseProtobufHeader } from './protocol-buffers-converter/header';
import { parseProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';
import { Header, SimpleHeader } from './protocol-buffers/header_pb';
import {
    createHeaderDataParser,
    createHeaderDataParserWithBuiltin,
    parseDataLength,
    readVarint,
    validateDataLength,
} from './utils';

export async function validateCID(reader: StreamReaderInterface): Promise<void> {
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

export const parseHeaderData = createHeaderDataParserWithBuiltin({
    name: 'header',
    longname: 'header data',
    genHeaderData: (builtin: BuiltinInspectRecord, headerDataBytes) =>
        parseProtobufHeader(builtin, Header.deserializeBinary(headerDataBytes)),
    autoSeek: true,
});

export const parseSimpleHeaderData = createHeaderDataParser({
    name: 'simple header',
    longname: 'simple header data',
    genHeaderData: headerDataBytes => parseProtobufSimpleHeader(SimpleHeader.deserializeBinary(headerDataBytes)),
    autoSeek: true,
});

export const parseCiphertextLength = parseDataLength({ name: 'ciphertext', autoSeek: true });

export async function parseCiphertext<T extends Uint8Array>(
    reader: StreamReaderInterface<T>,
    { ciphertextByteLength, offset = 0 }: { ciphertextByteLength: number; offset?: number | undefined },
): Promise<T> {
    const ciphertextBytes = await reader.read(ciphertextByteLength, offset);
    validateDataLength({
        requiredLength: ciphertextByteLength,
        received: ciphertextBytes,
        name: 'ciphertext',
    });

    const endOffset = offset + ciphertextBytes.byteLength;
    await reader.seek(endOffset);

    return ciphertextBytes;
}
