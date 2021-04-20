import { CryptAlgorithm, cryptAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompress } from './compress';
import {
    HeaderData,
    parseCiphertextData,
    parseCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeaderData,
    parseSimpleHeaderLength,
    SimpleHeaderData,
    validateCID,
} from './header';
import { deriveKey } from './key-derivation-function';
import { nonceState } from './nonce';
import { PromisifyTransform } from './utils/stream';

export interface DecryptedData {
    cleartext: Buffer;
    readByteLength: number;
}

export interface DecryptorMetadata {
    algorithm: CryptAlgorithm;
    key: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

export type DecryptedFirstData = DecryptedData & DecryptorMetadata;

export class DecryptorTransform extends PromisifyTransform {
    private readonly password: string | Buffer;
    private buffer: Buffer = Buffer.alloc(0);
    private needByteLength = 0;
    private decryptorMetadata: DecryptorMetadata | undefined;
    private state:
        | { type: 'cid' }
        | { type: 'headerLen' }
        | { type: 'header'; headerByteLength: number }
        | { type: 'ciphertextLen'; headerData: HeaderData | SimpleHeaderData & DecryptorMetadata }
        | {
            type: 'ciphertext';
            ciphertextByteLength: number;
            headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
        } = { type: 'cid' };

    constructor(password: string | Buffer) {
        super();
        this.password = password;
    }

    async transform(chunk: Buffer): Promise<void> {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        await this.processMultiChunk(false);
    }

    async flush(): Promise<void> {
        await this.processMultiChunk(true);
    }

    private async processMultiChunk(isFinished: boolean): Promise<void> {
        while (this.buffer.byteLength > 0) {
            if (!isFinished && this.buffer.byteLength < this.needByteLength) break;
            this.push(await this.processChunk(isFinished));
        }
    }

    private async processChunk(isFinished: boolean): Promise<Buffer | undefined> {
        const state = this.state;
        const buffer = this.buffer;

        let result: {
            nextState: DecryptorTransform['state'];
            nextOffset: number;
            needByteLength?: number;
            cleartext?: Buffer;
        } | { needByteLength: number };
        if (state.type === 'cid') {
            result = this.processCID({ buffer, isFinished });
        } else if (state.type === 'headerLen') {
            result = this.processHeaderLength({ buffer, isFinished });
        } else if (state.type === 'header') {
            result = this.processHeader({ ...state, buffer });
        } else if (state.type === 'ciphertextLen') {
            result = this.processCiphertextLength({ buffer, headerData: state.headerData, isFinished });
        } else {
            result = await this.processCiphertext({ ...state, buffer });
        }

        if ('nextState' in result) {
            this.state = result.nextState;
            this.buffer = buffer.subarray(result.nextOffset);
        }
        this.needByteLength = result.needByteLength ?? 0;
        return 'cleartext' in result ? result.cleartext : undefined;
    }

    private processCID({ buffer, isFinished }: { buffer: Buffer; isFinished: boolean }):
        | { nextState: DecryptorTransform['state']; nextOffset: number }
        | { needByteLength: number }
    {
        const result = validateCID({ data: buffer, throwIfLowData: isFinished });
        if (result.error) return result.error;
        return {
            nextState: { type: 'headerLen' },
            nextOffset: result.endOffset,
        };
    }

    private processHeaderLength({ buffer, isFinished }: { buffer: Buffer; isFinished: boolean }):
        | { nextState: DecryptorTransform['state']; nextOffset: number; needByteLength: number }
        | { needByteLength: number }
    {
        const result = (this.decryptorMetadata ? parseSimpleHeaderLength : parseHeaderLength)({
            data: buffer,
            throwIfLowData: isFinished,
        });
        if (result.error) return result.error;
        return {
            nextState: { type: 'header', headerByteLength: result.dataByteLength },
            nextOffset: result.endOffset,
            needByteLength: result.dataByteLength,
        };
    }

    private processHeader({ buffer, headerByteLength }: { buffer: Buffer; headerByteLength: number }): {
        nextState: DecryptorTransform['state'];
        nextOffset: number;
    } {
        const decryptorMetadata = this.decryptorMetadata;
        let headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
        let nextOffset: number;
        if (decryptorMetadata) {
            const result = parseSimpleHeaderData({
                data: buffer,
                headerByteLength,
            });
            headerData = { ...decryptorMetadata, ...result.headerData };
            nextOffset = result.endOffset;
        } else {
            const result = parseHeaderData({
                data: buffer,
                headerByteLength,
            });
            headerData = result.headerData;
            nextOffset = result.endOffset;
        }
        return {
            nextState: { type: 'ciphertextLen', headerData },
            nextOffset,
        };
    }

    private processCiphertextLength(
        { buffer, headerData, isFinished }: {
            buffer: Buffer;
            headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
            isFinished: boolean;
        },
    ):
        | { nextState: DecryptorTransform['state']; nextOffset: number; needByteLength: number }
        | { needByteLength: number }
    {
        const result = parseCiphertextLength({ data: buffer, throwIfLowData: isFinished });
        if (result.error) return result.error;
        return {
            nextState: {
                type: 'ciphertext',
                ciphertextByteLength: result.dataByteLength,
                headerData,
            },
            nextOffset: result.endOffset,
            needByteLength: result.dataByteLength,
        };
    }

    private async processCiphertext(
        { buffer, ciphertextByteLength, headerData }: {
            buffer: Buffer;
            ciphertextByteLength: number;
            headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
        },
    ): Promise<{ nextState: DecryptorTransform['state']; nextOffset: number; cleartext: Buffer }> {
        const result = parseCiphertextData({
            data: buffer,
            ciphertextByteLength,
        });
        const ciphertext = result.ciphertextDataBytes;

        const { algorithm, key } = await this.getAlgorithmAndKey(headerData);

        /**
         * Update the invocation part in the nonce
         */
        nonceState.updateInvocation(headerData.nonce);

        /**
         * Decrypt ciphertext
         */
        const decipher = algorithm.createDecipher(key, headerData.nonce);
        decipher.setAuthTag(headerData.authTag);
        const compressedCleartext = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]);

        /**
         * Decompress cleartext
         */
        const cleartext = headerData.compressAlgorithmName
            ? await decompress(compressedCleartext, headerData.compressAlgorithmName)
            : compressedCleartext;

        return {
            nextState: { type: 'headerLen' },
            nextOffset: result.endOffset,
            cleartext,
        };
    }

    private async getAlgorithmAndKey(
        headerData: HeaderData | SimpleHeaderData & DecryptorMetadata,
    ): Promise<{ algorithm: CryptAlgorithm; key: Uint8Array }> {
        if ('algorithmName' in headerData) {
            const algorithm = cryptAlgorithmMap.get(headerData.algorithmName);
            if (!algorithm) {
                throw new TypeError(`Unknown algorithm was received: ${headerData.algorithmName}`);
            }

            /**
             * Generate key
             */
            const { key } = await deriveKey(
                this.password,
                headerData.salt,
                headerData.keyLength,
                headerData.keyDerivationOptions,
            );

            this.decryptorMetadata = {
                algorithm,
                key,
                compressAlgorithmName: headerData.compressAlgorithmName,
            };

            return { algorithm, key };
        } else {
            return {
                algorithm: headerData.algorithm,
                key: headerData.key,
            };
        }
    }
}
