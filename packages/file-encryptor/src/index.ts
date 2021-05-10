import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';

import type { CryptAlgorithmName } from './cipher';
import type { CompressOptionsWithString } from './compress';
import { createDecryptorTransform } from './decrypt';
import { encryptFirstChunk, EncryptOptions, EncryptorTransform } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import type { InputDataType } from './types';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    return (await encryptFirstChunk(cleartext, password, options)).encryptedData;
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const stream = createDecryptorTransform(password);
    const dataPromise = streamToBuffer(stream);
    stream.end(encryptedData);
    return await dataPromise;
}

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: InputDataType): NodeJS.ReadWriteStream {
    return createDecryptorTransform(password);
}
