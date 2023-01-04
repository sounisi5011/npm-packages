import type * as stream from 'stream';

import { expectType } from 'tsd';

import type { EncryptOptions, InputDataType, IteratorConverter } from '../../dist/index.js';
import { decrypt, decryptIterator, decryptStream, encrypt, encryptIterator, encryptStream } from '../../dist/index.js';
import { keyof } from '../utils.js';

// check all exported names
expectType<
    | 'encrypt'
    | 'decrypt'
    | 'encryptStream'
    | 'decryptStream'
    | 'encryptIterator'
    | 'decryptIterator'
>(keyof<typeof import('../../dist/index.js')>());

expectType<
    (
        cleartext: InputDataType,
        password: InputDataType,
        options?: EncryptOptions,
    ) => Promise<Buffer>
>(encrypt);

expectType<
    (
        encryptedData: InputDataType,
        password: InputDataType,
    ) => Promise<Buffer>
>(decrypt);

expectType<
    (
        password: InputDataType,
        options?: EncryptOptions,
    ) => stream.Transform
>(encryptStream);

expectType<
    (password: InputDataType) => stream.Transform
>(decryptStream);

expectType<
    (
        password: InputDataType,
        options?: EncryptOptions,
    ) => IteratorConverter
>(encryptIterator);

expectType<
    (password: InputDataType) => IteratorConverter
>(decryptIterator);
