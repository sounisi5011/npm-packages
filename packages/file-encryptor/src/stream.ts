import { Transform } from 'stream';

import type { EncryptOptions, Encryptor } from '.';

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
            flush: async callback => {
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

export class EncryptorTransform extends WaitAllDataTransform {
    private readonly encryptor: Encryptor;
    private readonly options: EncryptOptions;

    constructor(encryptor: Encryptor, options: EncryptOptions) {
        super();
        this.encryptor = encryptor;
        this.options = options;
    }

    async transformAllData(data: Buffer): Promise<Buffer> {
        return await this.encryptor.encrypt(data, this.options);
    }
}

export class DecryptorTransform extends WaitAllDataTransform {
    private readonly encryptor: Encryptor;

    constructor(encryptor: Encryptor) {
        super();
        this.encryptor = encryptor;
    }

    async transformAllData(data: Buffer): Promise<Buffer> {
        return await this.encryptor.decrypt(data);
    }
}
