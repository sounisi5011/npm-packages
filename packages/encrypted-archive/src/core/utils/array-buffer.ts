import type { EncodeStringFn } from '../types/builtin';

/**
 * @see https://stackoverflow.com/a/69998555/4907315
 */
export function uint8arrayConcat(...arrayList: ReadonlyArray<ArrayLike<number>>): Uint8Array {
    const totalLength = arrayList.map(array => array.length).reduce((a, b) => a + b, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const array of arrayList) {
        result.set(array, offset);
        offset += array.length;
    }

    return result;
}

export function uint8arrayFrom(
    encodeString: EncodeStringFn,
    value: string | ArrayBufferView | ArrayBufferLike,
): Uint8Array {
    if (typeof value === 'string') return encodeString(value);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return new Uint8Array(value);
}
