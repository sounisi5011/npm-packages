import type { CryptAlgorithmName } from './cipher';
import type { CompressOptionsWithString } from './compress';
import { createDecryptorGenerator } from './decrypt';
import { createEncryptorGenerator, EncryptOptions, EncryptorTransform } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import type { InputDataType } from './types';
import { asyncIterable2Buffer, createIterable } from './utils';
import gts from './utils/generator-transform-stream';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const source = createIterable(cleartext);
    const encryptorGenerator = createEncryptorGenerator(password, options)(source);
    return await asyncIterable2Buffer(encryptorGenerator);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const source = createIterable(encryptedData);
    const decryptorGenerator = createDecryptorGenerator(password)(source);
    return await asyncIterable2Buffer(decryptorGenerator);
}

export { createEncryptorGenerator as encryptGenerator };
export { createDecryptorGenerator as decryptGenerator };

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: InputDataType): NodeJS.ReadWriteStream {
    return gts(
        createDecryptorGenerator(password),
        { readableObjectMode: true, writableObjectMode: true },
    );
}
