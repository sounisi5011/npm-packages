import { decode as varintDecode } from 'varint';

export function readVarint(
    buf: Uint8Array,
    errorCallback: (error: unknown) => never,
    offset?: number,
): { value: number; bytes: number; endOffset: number };
export function readVarint<T>(
    buf: Uint8Array,
    errorCallback: (error: unknown) => T,
    offset?: number,
): { value: number; bytes: number; endOffset: number; error?: undefined } | { error: T };
export function readVarint<T>(
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

export interface ParseDataLengthFn {
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: true }): { dataByteLength: number; endOffset: number };
    (opts: { data: Uint8Array; offset?: number; throwIfLowData?: boolean }):
        | { dataByteLength: number; endOffset: number; error?: never }
        | { error: { needByteLength: number } };
}

export function parseDataLength(opts: { name: string }): ParseDataLengthFn;
export function parseDataLength(
    { name }: { name: string },
): (opts: {
    data: Uint8Array;
    offset?: number;
    throwIfLowData?: boolean;
}) => { dataByteLength: number; endOffset: number; error?: never } | { error: { needByteLength: number } } {
    return ({ data, offset = 0, throwIfLowData = true }) => {
        const needByteLength = offset + 9;
        const result = readVarint(
            data,
            throwIfLowData || needByteLength <= data.byteLength
                ? () => {
                    throw new Error(
                        `Could not decode ${name} size. The byte length of the ${name} encoded as unsigned varint is required.`,
                    );
                }
                : () => ({ needByteLength }),
            offset,
        );
        if (result.error) return result;
        const { value: dataByteLength, endOffset } = result;
        if (dataByteLength < 1) throw new Error(`Invalid ${name} byte length received: ${dataByteLength}`);
        return { dataByteLength, endOffset };
    };
}

export function validateDataLength(
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

export function createHeaderDataParser<T>(
    { name, longname, genHeaderData }: {
        name: string;
        longname: string;
        genHeaderData: (headerDataBytes: Uint8Array) => T;
    },
): (opts: { data: Uint8Array; headerByteLength: number; offset?: number }) => { headerData: T; endOffset: number } {
    return ({ data, headerByteLength, offset = 0 }) => {
        const { targetDataBytes: headerDataBytes, endOffset } = validateDataLength({
            data,
            dataByteLength: headerByteLength,
            offset,
            name,
            longname,
        });

        const headerData = genHeaderData(headerDataBytes);

        return { headerData, endOffset };
    };
}
