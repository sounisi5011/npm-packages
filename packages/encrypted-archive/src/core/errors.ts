import { InputDataType, isInputDataType } from './types';
import type { BuiltinInspectRecord } from './types/builtin';

function createInputDataTypeErrorMessage(builtin: BuiltinInspectRecord, prefix: string, actual: unknown): string {
    return (
        prefix
        + ` must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer.`
        + ` Received ${builtin.inspect(actual)}`
    );
}

export function validateChunk(builtin: BuiltinInspectRecord, chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(createInputDataTypeErrorMessage(builtin, 'Invalid type chunk received. Each chunk', chunk));
    }
    return chunk;
}

export function validatePassword(builtin: BuiltinInspectRecord, password: unknown): asserts password is InputDataType {
    if (!isInputDataType(password)) {
        throw new TypeError(
            createInputDataTypeErrorMessage(builtin, 'Invalid type password received. The password argument', password),
        );
    }
}
