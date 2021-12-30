import { isArrayBufferLike, isOrType, isString } from '../utils';
import type { AsyncIterableIteratorReturn } from './utils';

export type InputDataType = string | ArrayBufferView | ArrayBufferLike;

export type IteratorConverter = (
    source: Iterable<InputDataType> | AsyncIterable<InputDataType>,
) => AsyncIterableIteratorReturn<Uint8Array, void>;

export const isInputDataType = isOrType(isString, ArrayBuffer.isView, isArrayBufferLike);
