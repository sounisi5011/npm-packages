import { InputDataType, isInputDataType } from './types';
import { printObject } from './utils';

export function validateChunk(chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(
            `Invalid type chunk received.`
                + ` Each chunk must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer.`
                + ` Received ${printObject(chunk)}`,
        );
    }
    return chunk;
}
