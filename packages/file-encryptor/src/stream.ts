import { Transform } from 'stream';

import type { EncryptOptions, Encryptor } from '.';

// TODO: Rewrite the process to be a true streaming process that can handle huge files.

export class EncryptorTransform extends Transform {
    constructor(encryptor: Encryptor, options: EncryptOptions) {
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
                    const encryptedData = await encryptor.encrypt(inputData, options);
                    this.push(encryptedData);
                })()
                    .then(() => callback())
                    .catch(callback);
            },
        });
    }
}

export class DecryptorTransform extends Transform {
    constructor(encryptor: Encryptor) {
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
                    const encryptedData = await encryptor.decrypt(inputData);
                    this.push(encryptedData);
                })()
                    .then(() => callback())
                    .catch(callback);
            },
        });
    }
}
