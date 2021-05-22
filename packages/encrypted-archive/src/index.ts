import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import type { CryptoAlgorithmName } from './cipher';
import type { CompressOptions } from './compress';
import { createDecryptorIterator } from './decrypt';
import { createEncryptorIterator, EncryptOptions } from './encrypt';
import type { KeyDerivationOptions } from './key-derivation-function';
import { validateChunk } from './stream';
import type { InputDataType, IteratorConverter } from './types';
import { asyncIterable2Buffer, bufferFrom, convertIterableValue } from './utils';

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

function transformSource2buffer<T, U extends BufferEncoding>(
    source: AsyncIterable<{ chunk: T; encoding: U }>,
): AsyncIterable<Buffer> {
    return convertIterableValue(
        source,
        ({ chunk, encoding }) => bufferFrom(validateChunk(chunk), encoding),
    );
}

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Duplex {
    const encryptor = createEncryptorIterator(password, options);
    return transformFrom(
        source => encryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function decryptStream(password: InputDataType): stream.Duplex {
    const decryptor = createDecryptorIterator(password);
    return transformFrom(
        source => decryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return createEncryptorIterator(password, options);
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return createDecryptorIterator(password);
}
