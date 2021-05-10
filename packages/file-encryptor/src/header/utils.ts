import { decode as varintDecode } from 'varint';

import type { StreamReader } from '../utils/stream';

export async function readVarint(
    reader: StreamReader,
    error: Error | ((error: unknown) => Error),
    options?: { offset?: number; autoSeek?: true },
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
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: true }): { dataByteLength: number; endOffset: number };
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: boolean }):
        | { dataByteLength: number; endOffset: number; error?: never }
        | { error: { needByteLength: number } };
}

// export function parseDataLength(opts: { name: string }): ParseDataLengthFn;
export function parseDataLength(
    { name, autoSeek: defaultAutoSeek }: { name: string; autoSeek?: true },
): (
    reader: StreamReader,
    opts?: { offset?: number; autoSeek?: boolean },
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

export async function validateDataLength(
    { reader, dataByteLength, offset, name, longname, autoSeek }: {
        reader: StreamReader;
        dataByteLength: number;
        offset: number;
        name: string;
        longname?: string;
        autoSeek?: true;
    },
): Promise<{ targetDataBytes: Uint8Array; endOffset: number }> {
    const targetDataBytes = await reader.read(dataByteLength, offset);
    if (targetDataBytes.byteLength !== dataByteLength) {
        throw new Error(
            `Could not read ${longname ?? name}.`
                + ` ${dataByteLength} byte length ${name} is required.`
                + ` Received data: ${targetDataBytes.byteLength} bytes`,
        );
    }
    const endOffset = offset + dataByteLength;
    if (autoSeek) await reader.seek(endOffset);
    return { targetDataBytes, endOffset };
}

export function createHeaderDataParser<T>(
    { name, longname, genHeaderData, autoSeek: defaultAutoSeek }: {
        name: string;
        longname: string;
        genHeaderData: (headerDataBytes: Uint8Array) => T;
        autoSeek?: true;
    },
): (
    reader: StreamReader,
    opts: { headerByteLength: number; offset?: number; autoSeek?: boolean },
) => Promise<{ headerData: T; endOffset: number }> {
    return async (reader, { headerByteLength, offset = 0, autoSeek = defaultAutoSeek }) => {
        const { targetDataBytes: headerDataBytes, endOffset } = await validateDataLength({
            reader,
            dataByteLength: headerByteLength,
            offset,
            name,
            longname,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            autoSeek: autoSeek || undefined,
        });

        const headerData = genHeaderData(headerDataBytes);

        return { headerData, endOffset };
    };
}
