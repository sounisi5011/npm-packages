import { InputDataType, isInputDataType } from './types';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from './types/builtin';
import { uint8arrayFrom } from './utils';

export function validateChunk(builtin: BuiltinInspectRecord, chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(
            `Invalid type chunk received.`
                + ` Each chunk must be of type string or an instance of TypedArray, DataView, or ArrayBuffer.`
                + ` Received ${builtin.inspect(chunk)}`,
        );
    }
    return chunk;
}

export function convertChunk(builtin: BuiltinEncodeStringRecord & BuiltinInspectRecord) {
    return (chunk: unknown): Uint8Array => uint8arrayFrom(builtin.encodeString, validateChunk(builtin, chunk));
}
