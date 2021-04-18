import type { CryptAlgorithmName } from './cipher';
import type { CompressOptionsWithString } from './compress';
import { decryptFirstChunk } from './decrypt';
import { encryptFirstChunk, EncryptOptions } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import { DecryptorTransform, EncryptorTransform } from './stream';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: string | Buffer,
    password: string | Buffer,
    options: EncryptOptions = {},
): Promise<Buffer> {
    return (await encryptFirstChunk(cleartext, password, options)).encryptedData;
}

export async function decrypt(encryptedData: Buffer, password: string | Buffer): Promise<Buffer> {
    return (await decryptFirstChunk(encryptedData, password)).cleartext;
}

export function encryptStream(password: string | Buffer, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: string | Buffer): DecryptorTransform {
    return new DecryptorTransform(password);
}
