import { isInstance, isOrType, isString } from './utils';
import type { AsyncIterableIteratorReturn } from './utils/type';

export type InputDataType = string | Buffer | ArrayBufferView | ArrayBufferLike;

export type IteratorConverter = (
    source: Iterable<InputDataType> | AsyncIterable<InputDataType>,
) => AsyncIterableIteratorReturn<Uint8Array, void>;

export const isInputDataType = isOrType(
    isString,
    ArrayBuffer.isView,
    isInstance(ArrayBuffer),
    isInstance(SharedArrayBuffer),
);
