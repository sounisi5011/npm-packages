import type { AsyncIterableIteratorReturn } from './types/utils';
import { isInstance, isOrType, isString } from './utils/type-check';

export type InputDataType = string | ArrayBufferView | ArrayBufferLike;

export type IteratorConverter<TInput extends InputDataType = InputDataType, TOutput extends Uint8Array = Uint8Array> = (
    source: Iterable<TInput> | AsyncIterable<TInput>,
) => AsyncIterableIteratorReturn<TOutput, void>;

export const isInputDataType = isOrType(
    isString,
    ArrayBuffer.isView,
    isInstance(ArrayBuffer),
    isInstance(SharedArrayBuffer),
);
