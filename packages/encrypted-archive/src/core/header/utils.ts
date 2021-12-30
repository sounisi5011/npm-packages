import { decode as varintDecode } from 'varint';

import type { StreamReaderInterface } from '../utils/stream';

export async function readVarint(
    reader: StreamReaderInterface,
    error: Error | ((error: unknown) => Error),
    options?: { offset?: number | undefined; autoSeek?: true | undefined },
): Promise<{ value: number; byteLength: number; endOffset: number }> {
    const { offset = 0, autoSeek } = options ?? {};
    const data = await reader.read(9, offset);
    try {
        const value = varintDecode(data);
        const byteLength = varintDecode.bytes;
        const endOffset = offset + byteLength;
        if (autoSeek) await reader.seek(endOffset);
        return { value, byteLength, endOffset };
    } catch (err) {
        throw typeof error === 'function' ? error(err) : error;
    }
}

export interface ParseDataLengthFn {
    (opts: {
        data: Uint8Array;
        offset?: number | undefined;
        throwIfLowData?: true | undefined;
    }): { dataByteLength: number; endOffset: number };
    (opts: {
        data: Uint8Array;
        offset?: number | undefined;
        throwIfLowData?: boolean | undefined;
    }):
        | { dataByteLength: number; endOffset: number; error?: never }
        | { error: { needByteLength: number } };
}

// export function parseDataLength(opts: { name: string }): ParseDataLengthFn;
export function parseDataLength(
    { name, autoSeek: defaultAutoSeek }: { name: string; autoSeek?: true | undefined },
): (
    reader: StreamReaderInterface,
    opts?: { offset?: number | undefined; autoSeek?: boolean | undefined },
) => Promise<{ dataByteLength: number; endOffset: number }> {
    return async (reader, { offset = 0, autoSeek = defaultAutoSeek } = {}) => {
        const result = await readVarint(
            reader,
            new Error(
                `Could not decode ${name} size. The byte length of the ${name} encoded as unsigned varint is required.`,
            ),
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            { offset, autoSeek: autoSeek || undefined },
        );
        const { value: dataByteLength, endOffset } = result;
        if (dataByteLength < 1) throw new Error(`Invalid ${name} byte length received: ${dataByteLength}`);
        return { dataByteLength, endOffset };
    };
}

export function validateDataLength(
    { requiredLength, received, name, longname }: {
        requiredLength: number;
        received: number | Uint8Array;
        name: string;
        longname?: string | undefined;
    },
): void {
    const receivedLength = typeof received === 'number' ? received : received.byteLength;
    if (receivedLength !== requiredLength) {
        throw new Error(
            `Could not read ${longname ?? name}.`
                + ` ${requiredLength} byte length ${name} is required.`
                + ` Received data: ${receivedLength} bytes`,
        );
    }
}

interface CreateHeaderDataParserOptions {
    name: string;
    longname: string;
    autoSeek?: true | undefined;
}
export interface HeaderDataParserOptions {
    headerByteLength: number;
    offset?: number | undefined;
    autoSeek?: boolean | undefined;
}
type HeaderDataParserResult<THeaderData> = Promise<{ headerData: THeaderData; endOffset: number }>;

export function createHeaderDataParserWithBuiltin<TBuiltin, THeaderData>(
    { name, longname, genHeaderData, autoSeek: defaultAutoSeek }:
        & CreateHeaderDataParserOptions
        & {
            genHeaderData: (builtin: TBuiltin, headerDataBytes: Uint8Array) => THeaderData;
        },
): (
    builtin: TBuiltin,
    reader: StreamReaderInterface,
    opts: HeaderDataParserOptions,
) => HeaderDataParserResult<THeaderData> {
    return async (builtin, reader, { headerByteLength, offset = 0, autoSeek = defaultAutoSeek }) => {
        const headerDataBytes = await reader.read(headerByteLength, offset);
        validateDataLength({
            requiredLength: headerByteLength,
            received: headerDataBytes,
            name,
            longname,
        });

        const endOffset = offset + headerDataBytes.byteLength;
        if (autoSeek) await reader.seek(endOffset);

        const headerData = genHeaderData(builtin, headerDataBytes);

        return { headerData, endOffset };
    };
}

export function createHeaderDataParser<THeaderData>(
    { genHeaderData, ...args }:
        & CreateHeaderDataParserOptions
        & {
            genHeaderData: (headerDataBytes: Uint8Array) => THeaderData;
        },
): (
    reader: StreamReaderInterface,
    opts: HeaderDataParserOptions,
) => HeaderDataParserResult<THeaderData> {
    const parser = createHeaderDataParserWithBuiltin({
        ...args,
        genHeaderData: (_, headerDataBytes) => genHeaderData(headerDataBytes),
    });
    return parser.bind(null, null);
}
