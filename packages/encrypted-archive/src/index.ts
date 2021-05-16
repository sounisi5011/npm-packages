import type * as stream from 'stream';

import type { CryptoAlgorithmName } from './cipher';
import type { CompressAlgorithmName, CompressOptions, CompressOptionsWithString } from './compress';
import { createDecryptorIterator } from './decrypt';
import { createEncryptorIterator, EncryptOptions } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import type { InputDataType } from './types';
import { asyncIterable2Buffer, createIterable } from './utils';
import gts from './utils/generator-transform-stream';

export {
    CompressAlgorithmName,
    CompressOptions,
    CompressOptionsWithString,
    CryptoAlgorithmName,
    EncryptOptions,
    InputDataType,
    KeyDerivationOptions,
};

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const source = createIterable(cleartext);
    const encryptorIterable = createEncryptorIterator(password, options)(source);
    return await asyncIterable2Buffer(encryptorIterable);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const source = createIterable(encryptedData);
    const decryptorIterable = createDecryptorIterator(password)(source);
    return await asyncIterable2Buffer(decryptorIterable);
}

export { createEncryptorIterator as encryptIterator };
export { createDecryptorIterator as decryptIterator };

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Duplex {
    return gts(
        createEncryptorIterator(password, options),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function decryptStream(password: InputDataType): stream.Duplex {
    return gts(
        createDecryptorIterator(password),
        { readableObjectMode: true, writableObjectMode: true },
    );
}
