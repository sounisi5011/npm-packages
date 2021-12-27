import type { AsyncIterableReturn } from '../../src/utils/type';

export function rangeArray(start: number, stop: number, step = 1): number[] {
    return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + (i * step));
}

export function padStartArray<T, U>(array: readonly T[], length: number, value: U): Array<T | U> {
    if (length < array.length) return [...array];
    const newArray = Array<U>(length - array.length).fill(value);
    return [...newArray, ...array];
}

export function padEndArray<T, U>(array: readonly T[], length: number, value: U): Array<T | U> {
    if (length < array.length) return [...array];
    const newArray = Array<U>(length - array.length).fill(value);
    return [...array, ...newArray];
}

export function addNegativeNumber(values: readonly number[]): number[];
export function addNegativeNumber(values: ReadonlyArray<bigint>): Array<bigint>;
export function addNegativeNumber(values: ReadonlyArray<number | bigint>): Array<number | bigint>;
export function addNegativeNumber(values: ReadonlyArray<number | bigint>): Array<number | bigint> {
    return values.flatMap(num => {
        const negativeNum = -num;
        return Object.is(num, negativeNum) ? [num] : [num, negativeNum];
    });
}

export function createDummySizeBuffer(size: number): Buffer {
    return Object.defineProperties(Buffer.alloc(0), {
        byteLength: {
            get: () => size,
            enumerable: false,
            configurable: true,
        },
        length: {
            get: () => size,
            enumerable: false,
            configurable: true,
        },
    });
}

export async function iterable2buffer(iterable: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Buffer> {
    const bufferList: Uint8Array[] = [];
    for await (const buffer of iterable) bufferList.push(buffer);
    return Buffer.concat(bufferList);
}

export async function* buffer2asyncIterable(buffer: Buffer, chunkSize = 5): AsyncIterableReturn<Buffer, void> {
    while (buffer.byteLength > 0) {
        yield buffer.subarray(0, chunkSize);
        buffer = buffer.subarray(chunkSize);
    }
}
