import { Transform } from 'stream';
import type * as stream from 'stream';
import { callbackify } from 'util';

import { decrypt } from '.';
import type { CryptAlgorithm } from './cipher';
import { encryptFirstChunk, EncryptOptions, encryptSubsequentChunk } from './encrypt';

// TODO: Rewrite the process to be a true streaming process that can handle huge files.

abstract class WaitAllDataTransform extends Transform {
    constructor() {
        const chunkList: Buffer[] = [];
        super({
            transform: (chunk, _encoding, callback) => {
                try {
                    chunkList.push(Buffer.from(chunk));
                } catch (error) {
                    callback(error);
                }
                callback();
            },
            flush: callback => {
                (async () => {
                    const inputData = Buffer.concat(chunkList);
                    const transformedData = await this.transformAllData(inputData);
                    this.push(transformedData);
                })()
                    .then(() => callback())
                    .catch(callback);
            },
        });
    }

    abstract transformAllData(data: Buffer): Promise<unknown>;
}

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

export class DecryptorTransform extends WaitAllDataTransform {
    private readonly password: string | Buffer;

    constructor(password: string | Buffer) {
        super();
        this.password = password;
    }

    async transformAllData(data: Buffer): Promise<Buffer> {
        return await decrypt(data, this.password);
    }
}
