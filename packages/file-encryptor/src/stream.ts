import { Transform } from 'stream';

import { decrypt, encrypt, EncryptOptions } from '.';

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

export class EncryptorTransform extends WaitAllDataTransform {
    private readonly password: string | Buffer;
    private readonly options: EncryptOptions;

    constructor(password: string | Buffer, options: EncryptOptions) {
        super();
        this.password = password;
        this.options = options;
    }

    async transformAllData(data: Buffer): Promise<Buffer> {
        return await encrypt(data, this.password, this.options);
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
