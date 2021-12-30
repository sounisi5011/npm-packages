import type { BuiltinInspectRecord } from '../types/builtin';
import { InputDataType, isInputDataType } from './types';

export function validateChunk(builtin: BuiltinInspectRecord, chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(
            `Invalid type chunk received.`
                + ` Each chunk must be of type string or an instance of ArrayBufferView (TypedArray or DataView), or ArrayBuffer.`
                + ` Received ${builtin.inspect(chunk)}`,
        );
    }
    return chunk;
}
