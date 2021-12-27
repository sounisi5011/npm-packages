import { types } from 'util';

import type { AsyncIterableIteratorReturn } from '../utils/type';

export type InputDataType = string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike;

export type IteratorConverter = (
    source: Iterable<InputDataType> | AsyncIterable<InputDataType>,
) => AsyncIterableIteratorReturn<Buffer, void>;

export function isInputDataType(value: unknown): value is InputDataType {
    return typeof value === 'string'
        || Buffer.isBuffer(value)
        || types.isArrayBufferView(value)
        || types.isAnyArrayBuffer(value);
}
