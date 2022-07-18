import { validateChunk } from '../errors';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from '../types/builtin';
import type { AsyncIterableReturn } from '../types/utils';
import { uint8arrayFrom } from './array-buffer';

export function convertChunk(builtin: BuiltinEncodeStringRecord & BuiltinInspectRecord) {
    return (chunk: unknown): Uint8Array => uint8arrayFrom(builtin.encodeString, validateChunk(builtin, chunk));
}

export async function* convertIterableValue<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    converter: (value: T) => U,
): AsyncIterableReturn<U, void> {
    for await (const value of iterable) yield converter(value);
}
