import { validateChunk } from '../errors';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from '../types/builtin';
import type { AsyncIterableReturn } from '../types/utils';
import { uint8arrayFrom } from './array-buffer';
import { isAsyncIterable } from './type-check';

export function convertChunk(builtin: BuiltinEncodeStringRecord & BuiltinInspectRecord) {
    return (chunk: unknown): Uint8Array => uint8arrayFrom(builtin.encodeString, validateChunk(builtin, chunk));
}

export function asyncIter2AsyncIterable<T extends AsyncIterable<unknown> | AsyncIterator<unknown>>(
    asyncIter: T,
): T extends AsyncIterable<unknown> ? T : { [Symbol.asyncIterator]: () => T };
export function asyncIter2AsyncIterable(
    asyncIter: AsyncIterable<unknown> | AsyncIterator<unknown>,
): AsyncIterable<unknown> {
    return isAsyncIterable(asyncIter) ? asyncIter : { [Symbol.asyncIterator]: () => asyncIter };
}

export async function* convertIterableValue<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    converter: (value: T) => U,
): AsyncIterableReturn<U, void> {
    for await (const value of iterable) yield converter(value);
}
