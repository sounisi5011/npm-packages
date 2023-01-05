/* eslint-disable @typescript-eslint/no-invalid-void-type */

import { expectAssignable, expectType } from 'tsd';

import type {
    CompressOptions,
    CryptoAlgorithmName,
    EncryptOptions,
    InputDataType,
    IteratorConverter,
    KeyDerivationOptions,
} from '../..';
import { keyof } from '../utils.js';

type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;

/**
 * InputDataType
 */

declare const inputData:
    | string
    | Buffer
    | TypedArray
    | DataView
    | ArrayBuffer
    | SharedArrayBuffer;

expectAssignable<InputDataType>(inputData);

/**
 * IteratorConverter
 */

declare const iteratorConverter: IteratorConverter;

declare const source:
    | Iterable<typeof inputData>
    | AsyncIterable<typeof inputData>;
iteratorConverter(source);

void (async function*() {
    const result = iteratorConverter(source);
    expectAssignable<AsyncIterableIterator<Buffer>>(result);

    const iterRes = await result.next();
    if (!iterRes.done) expectType<Buffer>(iterRes.value);
    for await (const chunk of result) {
        expectType<Buffer>(chunk);
    }

    // return type is `void`
    if (iterRes.done) expectType<void>(iterRes.value);
    const ret = yield* result;
    expectType<void>(ret);
})();

/**
 * EncryptOptions
 */

// All properties are optional.
expectAssignable<EncryptOptions>({});

expectType<
    | 'algorithm'
    | 'keyDerivation'
    | 'compress'
>(keyof<EncryptOptions>());

declare const encryptOptions: EncryptOptions;

expectType<CryptoAlgorithmName | undefined>(encryptOptions.algorithm);
// `undefined` can be specified
expectAssignable<EncryptOptions>({ algorithm: undefined });

expectType<KeyDerivationOptions | undefined>(encryptOptions.keyDerivation);
// `undefined` can be specified
expectAssignable<EncryptOptions>({ keyDerivation: undefined });

expectType<CompressOptions | CompressOptions['algorithm'] | undefined>(encryptOptions.compress);
// `undefined` can be specified
expectAssignable<EncryptOptions>({ compress: undefined });

/**
 * CryptoAlgorithmName
 */

declare const cryptoAlgorithmName: CryptoAlgorithmName;

expectType<
    | 'aes-256-gcm'
    | 'chacha20-poly1305'
>(cryptoAlgorithmName);

/**
 * KeyDerivationOptions
 */

declare const keyDerivationOptions: KeyDerivationOptions;

// check all supported key derivation functions
expectType<
    /**
     * Argon2
     */
    | 'argon2d'
    | 'argon2id'
>(keyDerivationOptions.algorithm);

// All option properties are optional.
expectAssignable<KeyDerivationOptions>({
    algorithm: keyDerivationOptions.algorithm,
});

/**
 * Argon2 options
 */
if (
    keyDerivationOptions.algorithm === 'argon2d'
    || keyDerivationOptions.algorithm === 'argon2id'
) {
    const { algorithm } = keyDerivationOptions;

    expectType<number | undefined>(keyDerivationOptions.iterations);
    // `undefined` can be specified
    expectAssignable<typeof keyDerivationOptions>({ iterations: undefined, algorithm });

    expectType<number | undefined>(keyDerivationOptions.memory);
    // `undefined` can be specified
    expectAssignable<typeof keyDerivationOptions>({ memory: undefined, algorithm });

    expectType<number | undefined>(keyDerivationOptions.parallelism);
    // `undefined` can be specified
    expectAssignable<typeof keyDerivationOptions>({ parallelism: undefined, algorithm });

    expectType<
        | 'algorithm'
        | 'keyDerivation'
        | 'compress'
    >(keyof<EncryptOptions>());
}

/**
 * CompressOptions
 */

declare const compressOptions: CompressOptions;

// check all supported compression algorithms
expectType<
    | 'gzip'
    | 'brotli'
>(compressOptions.algorithm);

// All option properties are optional.
expectAssignable<CompressOptions>({
    algorithm: compressOptions.algorithm,
});

/* eslint-enable */
