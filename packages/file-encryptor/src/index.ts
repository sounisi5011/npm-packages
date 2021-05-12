import type { CryptAlgorithmName } from './cipher';
import type { CompressOptionsWithString } from './compress';
import { createDecryptorGenerator } from './decrypt';
import { createEncryptorGenerator, encryptFirstChunk, EncryptOptions, EncryptorTransform } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import type { InputDataType } from './types';
import gts from './utils/generator-transform-stream';

export { CompressOptionsWithString, CryptAlgorithmName, EncryptOptions, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    return (await encryptFirstChunk(cleartext, password, options)).encryptedData;
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const source = (function*() {
        yield encryptedData;
    })();

    const chunkList: Buffer[] = [];
    for await (const chunk of createDecryptorGenerator(password)(source)) {
        chunkList.push(chunk);
    }

    return Buffer.concat(chunkList);
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
