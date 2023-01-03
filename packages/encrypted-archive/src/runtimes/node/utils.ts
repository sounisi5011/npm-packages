import { inspect as nodeInspect } from 'util';

import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

import type { InspectFn } from '../../core/types/builtin';
import { isOneArray, isString } from '../../core/utils/type-check';

export const inspect: InspectFn = value => nodeInspect(value, { breakLength: Infinity });

export function bufferFrom(
    value: string | ArrayBufferView | ArrayBufferLike,
    encoding?: BufferEncoding | undefined,
): Buffer {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return Buffer.from(value, encoding);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return Buffer.from(value);
}

export async function asyncIterable2Buffer(iterable: AsyncIterable<Uint8Array>): Promise<Buffer> {
    const chunkList: Uint8Array[] = [];
    for await (const chunk of iterable) {
        chunkList.push(chunk);
    }
    // The `Buffer.concat()` function will always copy the Buffer object.
    // However, if the length of the array is 1, there is no need to copy it.
    return isOneArray(chunkList)
        ? bufferFrom(chunkList[0])
        : Buffer.concat(chunkList);
}

function isErrorConstructor(value: unknown): value is ErrorConstructor {
    /**
     * @see https://stackoverflow.com/a/14486171/4907315
     */
    return typeof value === 'function' && value.prototype instanceof Error;
}

export function fixNodePrimordialsErrorInstance(oldError: unknown): never {
    if (
        typeof oldError === 'object' && isPropAccessible(oldError)
        && !(oldError instanceof Error)
        && typeof oldError['name'] === 'string'
        && typeof oldError['message'] === 'string'
    ) {
        const name = oldError['name'];
        const detectConstructor = (globalThis as Record<string, unknown>)[name];
        const ErrorConstructor = isErrorConstructor(detectConstructor) ? detectConstructor : Error;
        const newError = new ErrorConstructor();
        Object.defineProperties(
            newError,
            Object.getOwnPropertyDescriptors(oldError),
        );
        throw newError;
    }
    throw oldError;
}

/**
 * The Node.js built-in function throws a pseudo Error object that does not extend the Error object.
 * Their stack trace is incomplete and errors are difficult to trace.
 * For example, the results of {@link https://jestjs.io/ Jest} do not show where the error occurred.
 * This function will fix the stack trace of the pseudo Error object to the proper one.
 */
export function fixNodePrimordialsErrorStackTrace(oldError: unknown): never {
    /* eslint-disable @typescript-eslint/no-throw-literal */
    if (!(typeof oldError === 'object' && isPropAccessible(oldError) && !(oldError instanceof Error))) throw oldError;
    const oldErrorStackTrace = oldError['stack'];

    if (!(isString(oldError['message']) && isString(oldErrorStackTrace))) throw oldError;
    const newError = new Error();
    const newErrorStackTrace = newError.stack;

    if (!isString(newErrorStackTrace)) throw oldError;
    const newErrorStackTraceLastLine = newErrorStackTrace.replace(/^(?:(?!\n[^\n]+$).)+/s, '');

    if (oldErrorStackTrace.includes(newErrorStackTraceLastLine)) throw oldError;
    Object.defineProperties(
        newError,
        Object.getOwnPropertyDescriptors(oldError),
    );
    newError.stack = oldErrorStackTrace
        + newErrorStackTrace.replace(
            new RegExp(
                String.raw`^Error: [^\n]*(?:\n *at (?:Object\.)?${fixNodePrimordialsErrorStackTrace.name}\b[^\n]*)?`,
            ),
            '',
        );
    throw newError;
    /* eslint-enable */
}
