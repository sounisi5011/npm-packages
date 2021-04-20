import { flatbuffers } from 'flatbuffers';
import { decode as varintDecode } from 'varint';

import { CryptAlgorithm, cryptAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompress } from './compress';
import { encryptFirstChunk, EncryptOptions, encryptSubsequentChunk } from './encrypt';
import { CID, HeaderData, SimpleHeaderData } from './header';
import { Header, SimpleHeader } from './header/flatbuffers/header_generated';
import { parseFbsHeaderTable } from './header/flatbuffers/headerTable';
import { parseFbsSimpleHeaderTable } from './header/flatbuffers/simpleHeaderTable';
import { deriveKey } from './key-derivation-function';
import { nonceState } from './nonce';
import { number2hex } from './utils';
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

interface DecryptorMetadata {
    algorithm: CryptAlgorithm;
    key: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
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
            const result = this.parseCID({ buffer, isFinished });
            if ('requestByteLength' in result) {
                this.requestByteLength = result.requestByteLength;
                return;
            }
            nextState = { type: 'headerLen' };
            nextOffset = result.nextOffset;
        } else if (state.type === 'headerLen') {
            const result = this.parseHeaderLength({
                buffer,
                isFinished,
                isSubsequentChunk: Boolean(this.decryptorMetadata),
            });
            if ('requestByteLength' in result) {
                this.requestByteLength = result.requestByteLength;
                return;
            }
            nextState = { type: 'header', headerByteLength: result.byteLength };
            this.requestByteLength = result.byteLength;
            nextOffset = result.nextOffset;
        } else if (state.type === 'header') {
            let headerData: HeaderData | SimpleHeaderData & DecryptorMetadata;
            if (this.decryptorMetadata) {
                const result = this.parseSimpleHeader({
                    buffer,
                    headerByteLength: state.headerByteLength,
                });
                headerData = { ...this.decryptorMetadata, ...result.data };
                nextOffset = result.nextOffset;
            } else {
                const result = this.parseHeader({
                    buffer,
                    headerByteLength: state.headerByteLength,
                });
                headerData = result.data;
                nextOffset = result.nextOffset;
            }
            nextState = { type: 'ciphertextLen', headerData };
            this.requestByteLength = 0;
        } else if (state.type === 'ciphertextLen') {
            const result = this.parseCiphertextLength({ buffer, isFinished });
            if ('requestByteLength' in result) {
                this.requestByteLength = result.requestByteLength;
                return;
            }
            nextState = { type: 'ciphertext', ciphertextByteLength: result.byteLength, headerData: state.headerData };
            this.requestByteLength = result.byteLength;
            nextOffset = result.nextOffset;
        } else {
            const result = this.parseCiphertext({
                buffer,
                ciphertextByteLength: state.ciphertextByteLength,
            });
            const ciphertext = result.data;
            nextState = { type: 'headerLen' };
            this.requestByteLength = 0;
            nextOffset = result.nextOffset;

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

    private parseCID(opts: {
        buffer: Buffer;
        isFinished: boolean;
        offset?: number;
    }): { nextOffset: number } | { requestByteLength: number } {
        const varint = this.parseUnsignedVarint({
            ...opts,
            offset: opts.offset ?? 0,
            decodeError: new Error(`Could not decode identifier. Multicodec compliant identifiers are required.`),
        });
        if (!('value' in varint)) return varint;
        if (varint.value !== CID) {
            throw new Error(
                `Invalid identifier detected.`
                    + number2hex` The identifier must be ${CID}, encoded as unsigned varint.`
                    + number2hex` Received ${varint.value}`,
            );
        }
        return { nextOffset: varint.nextOffset };
    }

    private parseHeaderLength(opts: {
        buffer: Buffer;
        isFinished: boolean;
        isSubsequentChunk: boolean;
        offset?: number;
    }): { byteLength: number; nextOffset: number } | { requestByteLength: number } {
        const headerName = opts.isSubsequentChunk ? 'simple header' : 'header';
        const varint = this.parseUnsignedVarint({
            ...opts,
            offset: opts.offset ?? 0,
            decodeError: new Error(
                `Could not decode ${headerName} size.`
                    + ` The byte length of the ${headerName} encoded as unsigned varint is required.`,
            ),
        });
        if (!('value' in varint)) return varint;
        if (varint.value < 1) {
            throw new Error(`Invalid ${headerName} byte length received: ${varint.value}`);
        }
        return { byteLength: varint.value, nextOffset: varint.nextOffset };
    }

    private parseHeader(opts: {
        buffer: Buffer;
        headerByteLength: number;
        offset?: number;
    }): { data: HeaderData; nextOffset: number } {
        const { buffer, headerByteLength } = opts;
        const beginOffset = opts.offset ?? 0;
        const endOffset = beginOffset + headerByteLength;
        const headerBytes = buffer.subarray(beginOffset, endOffset);
        if (headerBytes.byteLength !== headerByteLength) {
            throw new Error(
                `Could not read header table.`
                    + ` ${headerByteLength} byte length header is required.`
                    + ` Received data: ${headerBytes.byteLength} bytes`,
            );
        }

        const fbsBuf = new flatbuffers.ByteBuffer(headerBytes);
        const fbsHeader = Header.getRoot(fbsBuf);
        const headerData = parseFbsHeaderTable(fbsHeader);

        return {
            data: headerData,
            nextOffset: endOffset,
        };
    }

    private parseSimpleHeader(opts: {
        buffer: Buffer;
        headerByteLength: number;
        offset?: number;
    }): { data: SimpleHeaderData; nextOffset: number } {
        const { buffer, headerByteLength } = opts;
        const beginOffset = opts.offset ?? 0;
        const endOffset = beginOffset + headerByteLength;
        const simpleHeaderBytes = buffer.subarray(beginOffset, endOffset);
        if (simpleHeaderBytes.byteLength !== headerByteLength) {
            throw new Error(
                `Could not read simple header table.`
                    + ` ${headerByteLength} byte length simple header is required.`
                    + ` Received data: ${simpleHeaderBytes.byteLength} bytes`,
            );
        }

        const fbsBuf = new flatbuffers.ByteBuffer(simpleHeaderBytes);
        const fbsSimpleHeader = SimpleHeader.getRoot(fbsBuf);
        const simpleHeaderData = parseFbsSimpleHeaderTable(fbsSimpleHeader);

        return {
            data: simpleHeaderData,
            nextOffset: endOffset,
        };
    }

    private parseCiphertextLength(opts: {
        buffer: Buffer;
        isFinished: boolean;
        offset?: number;
    }): { byteLength: number; nextOffset: number } | { requestByteLength: number } {
        const varint = this.parseUnsignedVarint({
            ...opts,
            offset: opts.offset ?? 0,
            decodeError: new Error(
                `Could not decode ciphertext size.`
                    + ` The byte length of the ciphertext encoded as unsigned varint is required.`,
            ),
        });
        if (!('value' in varint)) return varint;
        if (varint.value < 1) {
            throw new Error(`Invalid ciphertext byte length received: ${varint.value}`);
        }
        return {
            byteLength: varint.value,
            nextOffset: varint.nextOffset,
        };
    }

    private parseCiphertext(opts: {
        buffer: Buffer;
        ciphertextByteLength: number;
        offset?: number;
    }): { data: Buffer; nextOffset: number } {
        const { buffer, ciphertextByteLength } = opts;
        const beginOffset = opts.offset ?? 0;
        const endOffset = beginOffset + ciphertextByteLength;
        const ciphertextBytes = buffer.subarray(beginOffset, endOffset);
        if (ciphertextBytes.byteLength !== ciphertextByteLength) {
            throw new Error(
                `Could not read ciphertext.`
                    + ` ${ciphertextByteLength} byte length ciphertext is required.`
                    + ` Received data: ${ciphertextBytes.byteLength} bytes`,
            );
        }
        return {
            data: ciphertextBytes,
            nextOffset: endOffset,
        };
    }

    private parseUnsignedVarint(opts: {
        buffer: Buffer;
        offset: number;
        isFinished: boolean;
        decodeError: Error;
    }): { value: number; nextOffset: number } | { requestByteLength: number } {
        try {
            const value = varintDecode(opts.buffer, opts.offset);
            const nextOffset = opts.offset + varintDecode.bytes;
            return { value, nextOffset };
        } catch {
            if (opts.isFinished) {
                throw opts.decodeError;
            } else {
                return { requestByteLength: 9 };
            }
        }
    }
}
