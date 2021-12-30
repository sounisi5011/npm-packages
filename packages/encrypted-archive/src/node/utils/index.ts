import { inspect as nodeInspect } from 'util';

import type { InspectFn } from '../../types/builtin';

export const inspect: InspectFn = value => nodeInspect(value, { breakLength: Infinity });

/**
 * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L108
 */
export function arrayBufferView2NodeBuffer(view: ArrayBufferView): Buffer {
    if (Buffer.isBuffer(view)) return view;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
}

export function bufferFrom(
    value: string | Buffer | ArrayBufferView | ArrayBufferLike,
    encoding: BufferEncoding | undefined,
): Buffer {
    if (typeof value === 'string') return Buffer.from(value, encoding);
    if (ArrayBuffer.isView(value)) return arrayBufferView2NodeBuffer(value);
    return Buffer.from(value);
}
