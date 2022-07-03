import { Header, SimpleHeader } from '../../protocol-buffers/header_pb';
import { number2hex } from '../utils';
import type { StreamReaderInterface } from '../utils/stream';
import type { AsyncIterableReturn } from '../utils/type';
import { cidNumber } from './content-identifier';
import { parseProtobufHeader } from './protocol-buffers-converter/header';
import { parseProtobufSimpleHeader } from './protocol-buffers-converter/simpleHeader';
import { createHeaderDataParser, parseDataLength, readVarint, validateDataLength } from './utils';

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

export const parseHeaderData = createHeaderDataParser({
    name: 'header',
    longname: 'header data',
    genHeaderData: (headerDataBytes, builtin) =>
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

export async function* parseCiphertextIterable<T extends Uint8Array>(
    reader: StreamReaderInterface<T>,
    { ciphertextByteLength, offset = 0 }: { ciphertextByteLength: number; offset?: number | undefined },
): AsyncIterableReturn<T, void> {
    for await (const { data, readedSize } of reader.readIterator(ciphertextByteLength, offset)) {
        if (data) {
            yield data;
        } else {
            validateDataLength({
                requiredLength: ciphertextByteLength,
                received: readedSize,
                name: 'ciphertext',
            });
        }
    }
}
