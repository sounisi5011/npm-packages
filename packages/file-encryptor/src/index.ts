import { streamToBuffer } from '@jorgeferrero/stream-to-buffer';

import type { CryptAlgorithmName } from './cipher';
import type { CompressOptionsWithString } from './compress';
import { DecryptorTransform } from './decrypt';
import { encryptFirstChunk, EncryptOptions, EncryptorTransform } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: string | Buffer,
    password: string | Buffer,
    options: EncryptOptions = {},
): Promise<Buffer> {
    return (await encryptFirstChunk(cleartext, password, options)).encryptedData;
}

export async function decrypt(encryptedData: Buffer, password: string | Buffer): Promise<Buffer> {
    const stream = new DecryptorTransform(password);
    const dataPromise = streamToBuffer(stream);
    stream.end(encryptedData);
    return await dataPromise;
}

export function encryptStream(password: string | Buffer, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: string | Buffer): DecryptorTransform {
    return new DecryptorTransform(password);
}
