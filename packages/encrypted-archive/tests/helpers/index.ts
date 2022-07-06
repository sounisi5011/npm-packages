import type { AsyncIterableReturn } from '../../src/utils/type';

export function isOneOrMoreArray<T>(value: T[]): value is [T, ...T[]];
export function isOneOrMoreArray<T>(value: readonly T[]): value is readonly [T, ...T[]];
export function isOneOrMoreArray<T>(value: readonly T[]): value is readonly [T, ...T[]] {
    return value.length >= 1;
}

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
export function addNegativeNumber(values: readonly bigint[]): bigint[];
export function addNegativeNumber(values: ReadonlyArray<number | bigint>): Array<number | bigint>;
export function addNegativeNumber(values: ReadonlyArray<number | bigint>): Array<number | bigint> {
    return values.flatMap(num => {
        const negativeNum = -num;
        return Object.is(num, negativeNum) ? [num] : [num, negativeNum];
    });
}

export function bufferChunk(buf: Buffer, chunkLength: number): Buffer[] {
    if (!(chunkLength >= 1 && Number.isSafeInteger(chunkLength))) {
        throw new RangeError(`chunkLength argument must be an integer greater than or equal to 1`);
    }
    const chunkList: Buffer[] = [];
    for (let beginIndex = 0; beginIndex < buf.length; beginIndex += chunkLength) {
        chunkList.push(buf.subarray(beginIndex, beginIndex + chunkLength));
    }
    return chunkList;
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

export async function iterable2buffer(iterable: Iterable<Buffer> | AsyncIterable<Buffer>): Promise<Buffer> {
    const bufferList: Buffer[] = [];
    for await (const buffer of iterable) bufferList.push(buffer);
    return Buffer.concat(bufferList);
}

export function* buffer2iterable(buffer: Buffer, chunkSize = 5): Iterable<Buffer> {
    while (buffer.byteLength > 0) {
        yield buffer.subarray(0, chunkSize);
        buffer = buffer.subarray(chunkSize);
    }
}

export async function* buffer2asyncIterable(buffer: Buffer, chunkSize = 5): AsyncIterableReturn<Buffer, void> {
    yield* buffer2iterable(buffer, chunkSize);
}

export function buffer2chunkArray(buffer: Buffer, chunkSize = 5): Buffer[] {
    return [...buffer2iterable(buffer, chunkSize)];
}
