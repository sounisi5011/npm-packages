import { randomBytes } from 'crypto';
import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import { createDecryptorIterator, DecryptBuiltinAPIRecord } from './core/decrypt';
import { createEncryptorIterator, EncryptBuiltinAPIRecord, EncryptOptions } from './core/encrypt';
import type { KeyDerivationOptions } from './core/key-derivation-function';
import { validateChunk } from './core/stream';
import type { InputDataType, IteratorConverter } from './core/types';
import type { CompressOptions } from './core/types/compress';
import type { CryptoAlgorithmName } from './core/types/crypto';
import { asyncIterable2Buffer, bufferFrom, convertIterableValue } from './core/utils';
import { getCryptoAlgorithm } from './runtimes/node/cipher';
import { createCompressor, decompressIterable } from './runtimes/node/compress';

const builtin: EncryptBuiltinAPIRecord & DecryptBuiltinAPIRecord = {
    getRandomBytes: async size => randomBytes(size),
    getCryptoAlgorithm,
    createCompressor,
    decompressIterable,
};

export { CompressOptions, CryptoAlgorithmName, EncryptOptions, InputDataType, IteratorConverter, KeyDerivationOptions };

export async function encrypt(
    cleartext: InputDataType,
    password: InputDataType,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const encryptor = createEncryptorIterator(builtin, password, options);
    const encryptedDataIterable = encryptor([cleartext]);
    return await asyncIterable2Buffer(encryptedDataIterable);
}

export async function decrypt(encryptedData: InputDataType, password: InputDataType): Promise<Buffer> {
    const decryptor = createDecryptorIterator(builtin, password);
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

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Transform {
    const encryptor = createEncryptorIterator(builtin, password, options);
    return transformFrom(
        source => encryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function decryptStream(password: InputDataType): stream.Transform {
    const decryptor = createDecryptorIterator(builtin, password);
    return transformFrom(
        source => decryptor(transformSource2buffer(source)),
        { readableObjectMode: true, writableObjectMode: true },
    );
}

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return createEncryptorIterator(builtin, password, options);
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return createDecryptorIterator(builtin, password);
}
