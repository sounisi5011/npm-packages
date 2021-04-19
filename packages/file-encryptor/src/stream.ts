import type { CryptAlgorithm } from './cipher';
import { decryptFirstChunk, decryptSubsequentChunk } from './decrypt';
import { encryptFirstChunk, EncryptOptions, encryptSubsequentChunk } from './encrypt';
import { PromisifyTransform } from './utils/stream';

export class EncryptorTransform extends PromisifyTransform {
    private readonly password: string | Buffer;
    private readonly options: EncryptOptions;
    private encryptData: { algorithm: CryptAlgorithm; key: Uint8Array } | undefined;

    constructor(password: string | Buffer, options: EncryptOptions) {
        super();
        this.password = password;
        this.options = options;
    }

    async transform(chunk: Buffer): Promise<Buffer> {
        const encryptData = this.encryptData;
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
    }
}

export class DecryptorTransform extends PromisifyTransform {
    private readonly password: string | Buffer;
    private buffer: Buffer = Buffer.from([]);
    private decryptorMetadata: Parameters<typeof decryptSubsequentChunk>[1] | undefined;

    constructor(password: string | Buffer) {
        super();
        this.password = password;
    }

    async transform(chunk: Buffer): Promise<Buffer | null> {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        return await this.decryptMultiChunk(false);
    }

    async flush(): Promise<Buffer | null> {
        return await this.decryptMultiChunk(true);
    }

    private async decryptMultiChunk(throwError: boolean): Promise<Buffer | null> {
        const cleartextList: Buffer[] = [];
        while (this.buffer.byteLength > 0) {
            // TODO: Fix terrible logic that tries to ignore errors thrown and retranslate
            try {
                cleartextList.push(await this.decryptChunk());
            } catch (error) {
                if (throwError) throw error;
                break;
            }
        }
        return cleartextList.length > 0 ? Buffer.concat(cleartextList) : null;
    }

    private async decryptChunk(): Promise<Buffer> {
        let cleartext: Buffer;
        let readByteLength: number;
        if (this.decryptorMetadata) {
            const result = await decryptSubsequentChunk(
                this.buffer,
                this.decryptorMetadata,
            );
            cleartext = result.cleartext;
            readByteLength = result.readByteLength;
        } else {
            const { algorithm, key, compressAlgorithmName, ...result } = await decryptFirstChunk(
                this.buffer,
                this.password,
            );
            cleartext = result.cleartext;
            readByteLength = result.readByteLength;
            this.decryptorMetadata = { algorithm, key, compressAlgorithmName };
        }
        this.buffer = this.buffer.subarray(readByteLength);
        return cleartext;
    }
}
