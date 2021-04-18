import { Transform } from 'stream';
import type * as stream from 'stream';
import { callbackify } from 'util';

import type { CryptAlgorithm } from './cipher';
import { decryptFirstChunk, decryptSubsequentChunk } from './decrypt';
import { encryptFirstChunk, EncryptOptions, encryptSubsequentChunk } from './encrypt';

export class EncryptorTransform extends Transform {
    private readonly password: string | Buffer;
    private readonly options: EncryptOptions;
    private encryptData: { algorithm: CryptAlgorithm; key: Uint8Array } | undefined;

    constructor(password: string | Buffer, options: EncryptOptions) {
        super();
        this.password = password;
        this.options = options;
    }

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: stream.TransformCallback): void {
        const encryptData = this.encryptData;
        callbackify(async (): Promise<Buffer> => {
            if (encryptData) {
                const { encryptedData } = await encryptSubsequentChunk(
                    chunk,
                    { algorithm: encryptData.algorithm, key: encryptData.key, compress: this.options.compress },
                );
                return encryptedData;
            } else {
                const { algorithm, key, encryptedData } = await encryptFirstChunk(chunk, this.password, this.options);
                this.encryptData = { algorithm, key };
                return encryptedData;
            }
        })(callback);
    }
}

export class DecryptorTransform extends Transform {
    private readonly password: string | Buffer;
    private decryptorMetadata: Parameters<typeof decryptSubsequentChunk>[1] | undefined;

    constructor(password: string | Buffer) {
        super();
        this.password = password;
    }

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: stream.TransformCallback): void {
        callbackify(async (): Promise<Buffer> => {
            if (this.decryptorMetadata) {
                const { cleartext } = await decryptSubsequentChunk(
                    chunk,
                    this.decryptorMetadata,
                );
                return cleartext;
            } else {
                const { cleartext, algorithm, key, compressAlgorithmName } = await decryptFirstChunk(
                    chunk,
                    this.password,
                );
                this.decryptorMetadata = { algorithm, key, compressAlgorithmName };
                return cleartext;
            }
        })(callback);
    }
}
