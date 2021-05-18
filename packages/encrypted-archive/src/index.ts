import { createDecryptorIterator } from './decrypt';
import { createEncryptorIterator, EncryptOptions } from './encrypt';
import { asyncIterable2Buffer } from './utils';
import gts from './utils/generator-transform-stream';

import type { CryptoAlgorithmName } from './cipher';
import type { CompressOptions } from './compress';
import type { KeyDerivationOptions } from './key-derivation-function';
import type { InputDataType, IteratorConverter } from './types';
import type * as stream from 'stream';

export { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, IteratorConverter, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const encryptor = createEncryptorIterator(password, options);
    const encryptedDataIterable = encryptor([cleartext]);
    return await asyncIterable2Buffer(encryptedDataIterable);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const decryptor = createDecryptorIterator(password);
    const decryptedDataIterable = decryptor([encryptedData]);
    return await asyncIterable2Buffer(decryptedDataIterable);
}

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

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return createEncryptorIterator(password, options);
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return createDecryptorIterator(password);
}
