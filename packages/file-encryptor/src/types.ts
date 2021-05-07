import { types } from 'util';

export type InputDataType = string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike;
export type PasswordDataType = string | Buffer | Uint8Array;

export function isInputDataType(value: unknown): value is InputDataType {
    return typeof value === 'string'
        || Buffer.isBuffer(value)
        || types.isArrayBufferView(value)
        || types.isAnyArrayBuffer(value);
}
