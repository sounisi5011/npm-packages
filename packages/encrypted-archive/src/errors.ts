import { InputDataType, isInputDataType } from './types';
import { printObject } from './utils';

function createInputDataTypeErrorMessage(prefix: string, actual: unknown): string {
    return (
        prefix
        + ` must be of type string or an instance of Buffer, TypedArray, DataView, or ArrayBuffer.`
        + ` Received ${printObject(actual)}`
    );
}

export function validateChunk(chunk: unknown): InputDataType {
    if (!isInputDataType(chunk)) {
        throw new TypeError(createInputDataTypeErrorMessage('Invalid type chunk received. Each chunk', chunk));
    }
    return chunk;
}

export function validatePassword(password: unknown): asserts password is InputDataType {
    if (!isInputDataType(password)) {
        throw new TypeError(
            createInputDataTypeErrorMessage('Invalid type password received. The password argument', password),
        );
    }
}
