import { InputDataType, isInputDataType } from './types';
import type { BuiltinInspectRecord } from './types/inspect';

export function validateChunk(builtin: BuiltinInspectRecord, chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(
            `Invalid type chunk received.`
                + ` Each chunk must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer.`
                + ` Received ${builtin.inspect(chunk)}`,
        );
    }
    return chunk;
}
