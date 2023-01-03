import { randomBytes } from 'crypto';
import type * as stream from 'stream';

import { transformFrom } from '@sounisi5011/stream-transform-from';

import { createDecryptorIterator, DecryptBuiltinAPIRecord } from './core/decrypt';
import {
    createEncryptorIterator,
    EncryptBuiltinAPIRecord,
    EncryptOptions as InternalEncryptOptions,
} from './core/encrypt';
import { validateChunk } from './core/errors';
import type {
    InputDataType as InternalInputDataType,
    IteratorConverter as InternalIteratorConverter,
} from './core/types';
import type { CryptoAlgorithmName } from './core/types/crypto';
import type { KeyDerivationOptions } from './core/types/key-derivation-function';
import type { Expand, ExpandObject } from './core/types/utils';
import { convertIterableValue } from './core/utils/convert';
import * as cryptoAlgorithm from './runtimes/node/cipher';
import { CompressOptions, createCompressor, decompressIterable } from './runtimes/node/compress';
import { kdfBuiltinRecord as kdfBuiltin } from './runtimes/node/key-derivation-function';
import { asyncIterable2Buffer, bufferFrom, inspect } from './runtimes/node/utils';

const builtin: EncryptBuiltinAPIRecord<CompressOptions> & DecryptBuiltinAPIRecord = {
    encodeString: str => Buffer.from(str, 'utf8'),
    inspect,
    getRandomBytes: async size => randomBytes(size),
    cryptoAlgorithm,
    kdfBuiltin,
    createCompressor,
    decompressIterable,
};

type EncryptOptions = ExpandObject<InternalEncryptOptions<CompressOptions>>;
type InputDataType = Expand<Buffer | InternalInputDataType>;
type IteratorConverter = InternalIteratorConverter<InputDataType, Buffer>;

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

const createTransformStream = (
    transformFn: (source: AsyncIterable<InputDataType>) => AsyncIterable<Uint8Array>,
): stream.Transform =>
    transformFrom(
        (source): AsyncIterable<Buffer> => {
            const inputIterable = convertIterableValue(
                source,
                ({ chunk, encoding }) => bufferFrom(validateChunk({ inspect }, chunk), encoding),
            );
            const transformedIterable = transformFn(inputIterable);
            return convertIterableValue(transformedIterable, bufferFrom);
        },
        { readableObjectMode: true, writableObjectMode: true },
    );

export function encryptStream(password: InputDataType, options: EncryptOptions = {}): stream.Transform {
    const encryptor = createEncryptorIterator(builtin, password, options);
    return createTransformStream(encryptor);
}

export function decryptStream(password: InputDataType): stream.Transform {
    const decryptor = createDecryptorIterator(builtin, password);
    return createTransformStream(decryptor);
}

function transformAsyncIterableResult2buffer<T extends unknown[]>(
    fn: (...args: T) => AsyncIterableIterator<ArrayBufferView>,
) {
    return async function*(...args: T) {
        for await (const result of fn(...args)) {
            yield bufferFrom(result);
        }
    };
}

export function encryptIterator(password: InputDataType, options: EncryptOptions = {}): IteratorConverter {
    return transformAsyncIterableResult2buffer(createEncryptorIterator(builtin, password, options));
}

export function decryptIterator(password: InputDataType): IteratorConverter {
    return transformAsyncIterableResult2buffer(createDecryptorIterator(builtin, password));
}
