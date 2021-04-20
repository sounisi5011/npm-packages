import { CryptAlgorithm, cryptAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompress } from './compress';
import {
    HeaderData,
    parseCiphertextData,
    parseCiphertextLength,
    parseHeader,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeader,
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

export async function decryptFirstChunk(
    encryptedData: Buffer,
    password: string | Buffer,
): Promise<DecryptedFirstData> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const { header: data, ciphertext, readByteLength } = parseHeader(encryptedData);

    const algorithm = cryptAlgorithmMap.get(data.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${data.algorithmName}`);
    }

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(data.nonce);

    /**
     * Generate key
     */
    const { key } = await deriveKey(password, data.salt, data.keyLength, data.keyDerivationOptions);

    /**
     * Decrypt ciphertext
     */
    const decipher = algorithm.createDecipher(key, data.nonce);
    decipher.setAuthTag(data.authTag);
    const compressedCleartext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    /**
     * Decompress cleartext
     */
    const cleartext = data.compressAlgorithmName
        ? await decompress(compressedCleartext, data.compressAlgorithmName)
        : compressedCleartext;

    return {
        cleartext,
        algorithm,
        key,
        compressAlgorithmName: data.compressAlgorithmName,
        readByteLength,
    };
}

export async function decryptSubsequentChunk(
    encryptedData: Buffer,
    options: DecryptorMetadata,
): Promise<DecryptedData> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const { header: data, ciphertext, readByteLength } = parseSimpleHeader(encryptedData);

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(data.nonce);

    /**
     * Decrypt ciphertext
     */
    const decipher = options.algorithm.createDecipher(options.key, data.nonce);
    decipher.setAuthTag(data.authTag);
    const compressedCleartext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    /**
     * Decompress cleartext
     */
    const cleartext = options.compressAlgorithmName
        ? await decompress(compressedCleartext, options.compressAlgorithmName)
        : compressedCleartext;

    return { cleartext, readByteLength };
}

export class DecryptorTransform extends PromisifyTransform {
    private readonly password: string | Buffer;
    private buffer: Buffer = Buffer.alloc(0);
    private requestByteLength = 0;
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
            if (!isFinished && this.buffer.byteLength < this.requestByteLength) break;
            this.push(await this.processChunk(isFinished));
        }
    }

    private async processChunk(isFinished: boolean): Promise<Buffer | undefined> {
        const state = this.state;
        const buffer = this.buffer;

        let nextState: typeof state;
        let nextOffset: number;
        let cleartext: Buffer | undefined;

        if (state.type === 'cid') {
            const result = validateCID({ data: buffer, throwIfLowData: isFinished });
            if (result.error) {
                this.requestByteLength = result.error.needByteLength;
                return;
            }
            nextState = { type: 'headerLen' };
            nextOffset = result.endOffset;
        } else if (state.type === 'headerLen') {
            const result = (this.decryptorMetadata ? parseSimpleHeaderLength : parseHeaderLength)({
                data: buffer,
                throwIfLowData: isFinished,
            });
            if (result.error) {
                this.requestByteLength = result.error.needByteLength;
                return;
            }
            nextState = { type: 'header', headerByteLength: result.headerByteLength };
            this.requestByteLength = nextState.headerByteLength;
            nextOffset = result.endOffset;
        } else if (state.type === 'header') {
            let headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
            if (this.decryptorMetadata) {
                const result = parseSimpleHeaderData({
                    data: buffer,
                    headerByteLength: state.headerByteLength,
                });
                headerData = { ...this.decryptorMetadata, ...result.headerData };
                nextOffset = result.endOffset;
            } else {
                const result = parseHeaderData({
                    data: buffer,
                    headerByteLength: state.headerByteLength,
                });
                headerData = result.headerData;
                nextOffset = result.endOffset;
            }
            nextState = { type: 'ciphertextLen', headerData };
            this.requestByteLength = 0;
        } else if (state.type === 'ciphertextLen') {
            const result = parseCiphertextLength({ data: buffer, throwIfLowData: isFinished });
            if (result.error) {
                this.requestByteLength = result.error.needByteLength;
                return;
            }
            nextState = {
                type: 'ciphertext',
                ciphertextByteLength: result.ciphertextByteLength,
                headerData: state.headerData,
            };
            this.requestByteLength = nextState.ciphertextByteLength;
            nextOffset = result.endOffset;
        } else {
            const result = parseCiphertextData({
                data: buffer,
                ciphertextByteLength: state.ciphertextByteLength,
            });
            const ciphertext = result.ciphertextDataBytes;
            nextState = { type: 'headerLen' };
            this.requestByteLength = 0;
            nextOffset = result.endOffset;

            const data = state.headerData;
            let algorithm: CryptAlgorithm;
            let key: Uint8Array;
            if ('algorithmName' in data) {
                const cryptAlgorithm = cryptAlgorithmMap.get(data.algorithmName);
                if (!cryptAlgorithm) {
                    throw new TypeError(`Unknown algorithm was received: ${data.algorithmName}`);
                }
                algorithm = cryptAlgorithm;

                /**
                 * Generate key
                 */
                key = (await deriveKey(this.password, data.salt, data.keyLength, data.keyDerivationOptions)).key;

                this.decryptorMetadata = {
                    algorithm,
                    key,
                    compressAlgorithmName: data.compressAlgorithmName,
                };
            } else {
                algorithm = data.algorithm;
                key = data.key;
            }

            /**
             * Update the invocation part in the nonce
             */
            nonceState.updateInvocation(data.nonce);

            /**
             * Decrypt ciphertext
             */
            const decipher = algorithm.createDecipher(key, data.nonce);
            decipher.setAuthTag(data.authTag);
            const compressedCleartext = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);

            /**
             * Decompress cleartext
             */
            cleartext = data.compressAlgorithmName
                ? await decompress(compressedCleartext, data.compressAlgorithmName)
                : compressedCleartext;
        }

        this.state = nextState;
        this.buffer = buffer.subarray(nextOffset);
        return cleartext;
    }
}
