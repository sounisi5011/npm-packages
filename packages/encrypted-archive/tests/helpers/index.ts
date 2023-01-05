import { TextEncoder } from 'util';

import type { AsyncIterableReturn } from '../../src/core/types/utils';
import { isAsyncIterable } from '../../src/core/utils/type-check';

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

export async function iterable2list<T>(iterable: Iterable<T> | Iterable<Promise<T>> | AsyncIterable<T>): Promise<T[]> {
    const list: T[] = [];
    if (isAsyncIterable(iterable)) {
        for await (const item of iterable) list.push(item);
    } else {
        for (const item of iterable) list.push(await item);
    }
    return list;
}

export async function iterable2buffer(iterable: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Buffer> {
    const bufferList: Uint8Array[] = [];
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

export function genInputTypeCases(
    originalValue: string,
): Array<[string, string | ArrayBufferLike | NodeJS.ArrayBufferView]>;
export function genInputTypeCases(originalValue: Uint8Array): Array<[string, ArrayBufferLike | NodeJS.ArrayBufferView]>;
export function genInputTypeCases(
    originalValue: string | Uint8Array,
): Array<[string, string | ArrayBufferLike | NodeJS.ArrayBufferView]> {
    const withLabel = <T extends object>(obj: T): [string, T] => {
        if (ArrayBuffer.isView(obj)) {
            const bufferlabel = `${obj.buffer.constructor.name}(${obj.buffer.byteLength})`;
            const beginByteOffset = obj.byteOffset;
            const endByteOffset = obj.byteOffset + obj.byteLength;

            const subarrayParams: string[] = [];
            if (beginByteOffset !== 0) subarrayParams.push(`begin=${beginByteOffset}`);
            if (endByteOffset !== obj.buffer.byteLength) subarrayParams.push(`end=${endByteOffset}`);
            if (subarrayParams.length > 0) {
                return [`${obj.constructor.name}( ${bufferlabel} |> subarray( ${subarrayParams.join(' ')} ) )`, obj];
            }

            return [`${obj.constructor.name}( ${bufferlabel} )`, obj];
        }
        return [`${obj.constructor.name}`, obj];
    };
    const originalBytes = typeof originalValue === 'string' ? new TextEncoder().encode(originalValue) : originalValue;
    const genView = <T extends ArrayBufferView>(
        ViewConstructor: {
            new(buffer: ArrayBufferLike, byteOffset: number, length: number): T;
            readonly BYTES_PER_ELEMENT?: number;
        },
        data: ArrayBufferView & ArrayLike<number>,
        beginByteOffset = 0,
        overrunByteLength = 0,
    ): T => {
        const { BYTES_PER_ELEMENT = 1 } = ViewConstructor;
        if (beginByteOffset % BYTES_PER_ELEMENT !== 0) {
            beginByteOffset = Math.ceil(beginByteOffset / BYTES_PER_ELEMENT) * BYTES_PER_ELEMENT;
        }
        if (data.byteLength % BYTES_PER_ELEMENT !== 0) {
            throw new Error(`byte length of originalValue argument must be a multiple of ${BYTES_PER_ELEMENT}`);
        }
        const buffer = new ArrayBuffer(beginByteOffset + data.byteLength + overrunByteLength);
        new Uint8Array(buffer).set(data, beginByteOffset);
        return new ViewConstructor(buffer, beginByteOffset, data.byteLength / BYTES_PER_ELEMENT);
    };
    const genBuf = <T extends ArrayBufferLike>(
        BufferConstructor: new (byteLength: number) => T,
        data: ArrayBufferView & ArrayLike<number>,
    ): T => {
        const buffer = new BufferConstructor(data.byteLength);
        new Uint8Array(buffer).set(data);
        return buffer;
    };

    return [
        // string
        ...(
            typeof originalValue === 'string'
                ? [
                    ['string', originalValue] as [string, string],
                ]
                : []
        ),
        ...[
            // Node.js Buffer & TypedArray & DataView
            ...[
                Buffer,
                Uint8Array,
                Uint8ClampedArray,
                Uint16Array,
                Uint32Array,
                Int8Array,
                Int16Array,
                Int32Array,
                BigUint64Array,
                BigInt64Array,
                Float32Array,
                Float64Array,
                DataView,
            ].flatMap(c => [
                genView<InstanceType<typeof c>>(c, originalBytes),
                genView<InstanceType<typeof c>>(c, originalBytes, 1),
                genView<InstanceType<typeof c>>(c, originalBytes, 0, 2),
                genView<InstanceType<typeof c>>(c, originalBytes, 3, 4),
            ]),
            // ArrayBufferLike
            genBuf(ArrayBuffer, originalBytes),
            genBuf(SharedArrayBuffer, originalBytes),
        ].map(withLabel),
    ];
}

export function genIterableTypeCases<T>(
    valueCases: ReadonlyArray<readonly [string, T]>,
): Array<[string, Iterable<T> | AsyncIterable<T>]> {
    return valueCases.flatMap(([valueLabel, value]) => {
        const genNextFn = (): () => IteratorResult<T> => {
            const valueList = [value];
            return () => {
                const value = valueList.shift();
                if (value === undefined) {
                    // According to the specification, the `value` property can be omitted if the `done` property is `true`.
                    // However, the `value` property of the `IteratorReturnResult` type cannot be omitted.
                    // For this reason, we will force overriding the return value type to the `IteratorReturnResult` type and avoid this problem.
                    // see https://tc39.es/ecma262/#sec-iteratorresult-interface
                    // @ts-expect-error TS2741: Property 'value' is missing in type '{ done: true; }' but required in type 'IteratorReturnResult<undefined>'.
                    const ret: IteratorReturnResult<undefined> = { done: true };
                    return ret;
                }
                return { value };
            };
        };
        const iter: Iterable<T> = {
            [Symbol.iterator]() {
                return { next: genNextFn() };
            },
        };
        const asyncIter: AsyncIterable<T> = {
            [Symbol.asyncIterator]() {
                const getResult = genNextFn();
                // eslint-disable-next-line @typescript-eslint/promise-function-async
                return { next: () => Promise.resolve(getResult()) };
            },
        };
        return [
            [`Iterable<${valueLabel}>`, iter],
            [`AsyncIterable<${valueLabel}>`, asyncIter],
        ];
    });
}
