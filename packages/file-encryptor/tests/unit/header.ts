import * as crypto from 'crypto';
import { promises as fsAsync } from 'fs';
import * as path from 'path';

import * as multicodec from 'multicodec';
import * as varint from 'varint';

import {
    createHeader,
    HeaderData,
    HeaderDataWithCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    validateCID,
} from '../../src/header';
import { cidByteList } from '../../src/header/content-identifier';
import { padStartArray } from '../helpers';

const dummyHeaderData: HeaderDataWithCiphertextLength = {
    algorithmName: 'aes-256-gcm',
    salt: new Uint8Array(),
    keyLength: 0,
    keyDerivationOptions: {
        algorithm: 'argon2d',
        iterations: 0,
        memory: 0,
        parallelism: 0,
    },
    nonce: new Uint8Array(),
    authTag: new Uint8Array(),
    compressAlgorithmName: 'gzip',
    ciphertextLength: 0,
};

const cidByte = Buffer.from(cidByteList);
const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));

describe('createHeader()', () => {
    describe('multicodec compliant', () => {
        it('can read', () => {
            const headerData = createHeader(dummyHeaderData);
            expect(() => multicodec.getCodeFromData(headerData)).not.toThrow();
        });
        it('code is within Private Use Area', () => {
            /**
             * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
             */
            const headerData = createHeader(dummyHeaderData);
            const code = multicodec.getCodeFromData(headerData);
            expect(code).toBeGreaterThanOrEqual(0x300000);
            expect(code).toBeLessThanOrEqual(0x3FFFFF);
        });
    });
    describe('header byte length included', () => {
        it('can read', () => {
            const headerData = createHeader(dummyHeaderData);
            const headerStartOffset = 0 + cidByte.byteLength;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = createHeader(dummyHeaderData);
            const headerLenStartOffset = 0 + cidByte.byteLength;
            {
                const headerLength = varint.decode(headerData, headerLenStartOffset);
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBe(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByte.byteLength,
                );
            }
            {
                const headerLength = varint.decode(headerData.subarray(headerLenStartOffset));
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBe(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByte.byteLength,
                );
            }
        });
    });
});

describe('validateCID()', () => {
    it.each([
        ['zero length', Buffer.from([])],
        ['invalid varint', Buffer.from([0xFF])],
        ['maximum of 9 bytes', Buffer.from(padStartArray([0x00], 9, 0xFF))],
    ])('%s', (_, data) => {
        expect(() => validateCID({ data })).toThrowWithMessage(
            Error,
            `Could not decode identifier. Multicodec compliant identifiers are required.`,
        );
    });
    it.each([
        ['00', 0x00],
        ['0A', 0x0A],
        ['10', 0x10],
        ['0100', 0x0100],
        ['1000', 0x1000],
        ['010000', 0x010000],
        ['100000', 0x100000],
    ])('no match / 0x%s', (codeStr, codeInt) => {
        const data = Buffer.from(varint.encode(codeInt));
        expect(() => validateCID({ data })).toThrowWithMessage(
            Error,
            new RegExp(
                String.raw`^Invalid identifier detected\.`
                    + String.raw` The identifier must be 0x[0-9A-F]+, encoded as unsigned varint\.`
                    + String.raw` Received 0x${codeStr}$`,
            ),
        );
    });
});

describe('parseHeaderLength()', () => {
    describe('invalid header byte length', () => {
        it.each([
            ['zero length bytes', Buffer.from([])],
            ['invalid varint', Buffer.from([0xFF])],
            ['maximum of 9 bytes', Buffer.from(padStartArray([0x00], 9, 0xFF))],
        ])('%s', (_, headerLengthBytes) => {
            const data = headerLengthBytes;
            expect(() => parseHeaderLength({ data })).toThrowWithMessage(
                Error,
                `Could not decode header size. The byte length of the header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', () => {
            const data = Buffer.from([0x00]);
            expect(() => parseHeaderLength({ data })).toThrowWithMessage(
                Error,
                `Invalid header byte length received: 0`,
            );
        });
    });
});

describe('parseHeaderData()', () => {
    describe('parse FlatBuffer binary', () => {
        it.each<[string, HeaderData]>([
            [
                'header-table.basic.bin',
                {
                    algorithmName: 'aes-256-gcm',
                    salt: new Uint8Array([9, 8, 7]),
                    keyLength: 32,
                    keyDerivationOptions: {
                        algorithm: 'argon2d',
                        iterations: 3,
                        memory: 12,
                        parallelism: 1,
                    },
                    nonce: new Uint8Array([4, 5, 6]),
                    authTag: new Uint8Array([2, 3, 4]),
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-table.chacha20-poly1305.bin',
                {
                    algorithmName: 'chacha20-poly1305',
                    salt: new Uint8Array([0, 1, 2]),
                    keyLength: 96,
                    keyDerivationOptions: {
                        algorithm: 'argon2d',
                        iterations: 4,
                        memory: 128,
                        parallelism: 6,
                    },
                    nonce: new Uint8Array([3, 4]),
                    authTag: new Uint8Array([5, 6, 7, 8]),
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-table.argon2id.bin',
                {
                    algorithmName: 'aes-256-gcm',
                    salt: new Uint8Array([]),
                    keyLength: 666,
                    keyDerivationOptions: {
                        algorithm: 'argon2id',
                        iterations: 1,
                        memory: 6,
                        parallelism: 99,
                    },
                    nonce: new Uint8Array([255]),
                    authTag: new Uint8Array([8]),
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-table.compress-gzip.bin',
                {
                    algorithmName: 'aes-256-gcm',
                    salt: new Uint8Array([9, 8, 7]),
                    keyLength: 32,
                    keyDerivationOptions: {
                        algorithm: 'argon2d',
                        iterations: 3,
                        memory: 12,
                        parallelism: 1,
                    },
                    nonce: new Uint8Array([4, 5, 6]),
                    authTag: new Uint8Array([2, 3, 4]),
                    compressAlgorithmName: 'gzip',
                },
            ],
            [
                'header-table.compress-brotli.bin',
                {
                    algorithmName: 'aes-256-gcm',
                    salt: new Uint8Array([9, 8, 7]),
                    keyLength: 32,
                    keyDerivationOptions: {
                        algorithm: 'argon2d',
                        iterations: 3,
                        memory: 12,
                        parallelism: 1,
                    },
                    nonce: new Uint8Array([4, 5, 6]),
                    authTag: new Uint8Array([2, 3, 4]),
                    compressAlgorithmName: 'brotli',
                },
            ],
        ])('%s', async (filename, expected) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const result = parseHeaderData({ data, headerByteLength: data.byteLength });
            expect(result.headerData).toStrictEqual(expected);
        });
    });
    describe('invalid length bytes', () => {
        it.each([
            [9, 0],
            [7, 3],
            [11, 10],
            [11, 10],
            [300, 259],
        ])('need %i bytes / actual %i bytes', (needLen, actualLen) => {
            const data = crypto.randomBytes(actualLen);
            expect(() => parseHeaderData({ data, headerByteLength: needLen })).toThrowWithMessage(
                Error,
                `Could not read header table. ${needLen} byte length header is required. Received data: ${actualLen} bytes`,
            );
        });
    });
});
