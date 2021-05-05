import * as crypto from 'crypto';
import { promises as fsAsync } from 'fs';
import * as path from 'path';

import * as multicodec from 'multicodec';
import * as varint from 'varint';

import {
    createHeader,
    createSimpleHeader,
    HeaderData,
    HeaderDataWithCiphertextLength,
    parseCiphertextData,
    parseCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeaderData,
    parseSimpleHeaderLength,
    SimpleHeaderData,
    validateCID,
} from '../../src/header';
import { cidByteList } from '../../src/header/content-identifier';
import { padStartArray, rangeArray } from '../helpers';

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
    ciphertextLength: 123456,
};

const cidByte = Buffer.from(cidByteList);

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
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            {
                const headerLength = varint.decode(headerData, headerLenStartOffset);
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBe(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
            {
                const headerLength = varint.decode(headerData.subarray(headerLenStartOffset));
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBe(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = createHeader(dummyHeaderData);
        const headerInCiphertextLenBytes = headerData.subarray(
            headerData.byteLength - ciphertextLengthByte.byteLength,
            headerData.byteLength,
        );
        expect(headerInCiphertextLenBytes).toStrictEqual(ciphertextLengthByte);
    });
});

describe('createSimpleHeader()', () => {
    describe('header byte length included', () => {
        it('can read', () => {
            const headerData = createSimpleHeader(dummyHeaderData);
            const headerStartOffset = 0;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = createSimpleHeader(dummyHeaderData);
            const headerLength = varint.decode(headerData);
            const headerLengthVarintBytes = varint.decode.bytes;
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            expect(headerData.byteLength).toBe(
                headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
            );
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = createSimpleHeader(dummyHeaderData);
        const headerInCiphertextLenBytes = headerData
            .subarray(headerData.byteLength - ciphertextLengthByte.byteLength, headerData.byteLength);
        expect(headerInCiphertextLenBytes).toStrictEqual(ciphertextLengthByte);
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
    describe('throwIfLowData=false', () => {
        it.each(rangeArray(1, 12))('<Buffer 0xFF x %i>', length => {
            const data = Buffer.from(rangeArray(1, length).fill(0xFF));
            if (data.byteLength < 9) {
                expect(validateCID({ data, throwIfLowData: false })).toStrictEqual({
                    error: { needByteLength: 9 },
                });
            } else {
                expect(() => validateCID({ data, throwIfLowData: false })).toThrowWithMessage(
                    Error,
                    `Could not decode identifier. Multicodec compliant identifiers are required.`,
                );
            }
        });
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
    describe('throwIfLowData=false', () => {
        it.each(rangeArray(1, 12))('<Buffer 0xFF x %i>', length => {
            const data = Buffer.from(rangeArray(1, length).fill(0xFF));
            if (data.byteLength < 9) {
                expect(parseHeaderLength({ data, throwIfLowData: false })).toStrictEqual({
                    error: { needByteLength: 9 },
                });
            } else {
                expect(() => parseHeaderLength({ data, throwIfLowData: false })).toThrowWithMessage(
                    Error,
                    `Could not decode header size. The byte length of the header encoded as unsigned varint is required.`,
                );
            }
        });
    });
});

describe('parseHeaderData()', () => {
    describe('parse generated data by createHeader()', () => {
        const headerData: HeaderData = {
            algorithmName: 'chacha20-poly1305',
            salt: new Uint8Array([0, 1, 2]),
            keyLength: 6,
            keyDerivationOptions: {
                algorithm: 'argon2d',
                iterations: 2,
                memory: 12,
                parallelism: 4,
            },
            nonce: new Uint8Array([9, 8, 7]),
            authTag: new Uint8Array([4, 6, 8]),
            compressAlgorithmName: 'gzip',
        };
        const headerDataBuffer = createHeader({ ...headerData, ciphertextLength: 0 });
        const headerLengthStartOffset = 0 + cidByte.byteLength;
        const headerByteLength = varint.decode(headerDataBuffer, headerLengthStartOffset);
        const headerDataStartOffset = headerLengthStartOffset + varint.decode.bytes;

        it('offset=undefined', () => {
            const result = parseHeaderData({
                data: headerDataBuffer.subarray(headerDataStartOffset),
                headerByteLength,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        it('offset=0', () => {
            const result = parseHeaderData({
                data: headerDataBuffer.subarray(headerDataStartOffset),
                headerByteLength,
                offset: 0,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        it('offset defined', () => {
            const result = parseHeaderData({
                data: headerDataBuffer,
                headerByteLength,
                offset: headerDataStartOffset,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        describe('invalid offset defined', () => {
            it('offset=undefined', () => {
                expect(() =>
                    parseHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                    })
                ).toThrow();
            });
            it('offset=0', () => {
                expect(() =>
                    parseHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                        offset: 0,
                    })
                ).toThrow();
            });
            it('offset=+1', () => {
                expect(() =>
                    parseHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                        offset: headerDataStartOffset + 1,
                    })
                ).toThrow();
            });
        });
    });
    describe('parse Protocol Buffers binary', () => {
        it.each<[string, HeaderData]>([
            [
                'header-message.basic.bin',
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
                'header-message.full-length.bin',
                {
                    algorithmName: 'chacha20-poly1305',
                    salt: new Uint8Array([...Array(256 / 8).keys()]),
                    keyLength: 32,
                    keyDerivationOptions: {
                        algorithm: 'argon2d',
                        iterations: 3,
                        memory: 12,
                        parallelism: 1,
                    },
                    nonce: new Uint8Array([...Array(96 / 8).keys()]),
                    authTag: new Uint8Array([...Array(128 / 8).keys()].reverse()),
                    compressAlgorithmName: 'brotli',
                },
            ],
            [
                'header-message.chacha20-poly1305.bin',
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
                'header-message.argon2id.bin',
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
                'header-message.compress-gzip.bin',
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
                'header-message.compress-brotli.bin',
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
                `Could not read header data. ${needLen} byte length header is required. Received data: ${actualLen} bytes`,
            );
        });
    });
});

describe('parseSimpleHeaderLength()', () => {
    describe('invalid simple header byte length', () => {
        it.each([
            ['zero length bytes', Buffer.from([])],
            ['invalid varint', Buffer.from([0xFF])],
            ['maximum of 9 bytes', Buffer.from(padStartArray([0x00], 9, 0xFF))],
        ])('%s', (_, data) => {
            expect(() => parseSimpleHeaderLength({ data })).toThrowWithMessage(
                Error,
                `Could not decode simple header size. The byte length of the simple header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', () => {
            const data = Buffer.from([0x00]);
            expect(() => parseSimpleHeaderLength({ data })).toThrowWithMessage(
                Error,
                `Invalid simple header byte length received: 0`,
            );
        });
    });
    describe('throwIfLowData=false', () => {
        it.each(rangeArray(1, 12))('<Buffer 0xFF x %i>', length => {
            const data = Buffer.from(rangeArray(1, length).fill(0xFF));
            if (data.byteLength < 9) {
                expect(parseSimpleHeaderLength({ data, throwIfLowData: false })).toStrictEqual({
                    error: { needByteLength: 9 },
                });
            } else {
                expect(() => parseSimpleHeaderLength({ data, throwIfLowData: false })).toThrowWithMessage(
                    Error,
                    `Could not decode simple header size. The byte length of the simple header encoded as unsigned varint is required.`,
                );
            }
        });
    });
});

describe('parseSimpleHeaderData()', () => {
    describe('parse generated data by createSimpleHeader()', () => {
        const headerData: SimpleHeaderData = {
            nonce: new Uint8Array([2, 3, 4]),
            authTag: new Uint8Array([9, 9, 8, 6, 0, 7]),
        };
        const headerDataBuffer = createSimpleHeader({ ...headerData, ciphertextLength: 0 });
        const headerByteLength = varint.decode(headerDataBuffer);
        const headerDataStartOffset = varint.decode.bytes;

        it('offset=undefined', () => {
            const result = parseSimpleHeaderData({
                data: headerDataBuffer.subarray(headerDataStartOffset),
                headerByteLength,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        it('offset=0', () => {
            const result = parseSimpleHeaderData({
                data: headerDataBuffer.subarray(headerDataStartOffset),
                headerByteLength,
                offset: 0,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        it('offset defined', () => {
            const result = parseSimpleHeaderData({
                data: headerDataBuffer,
                headerByteLength,
                offset: headerDataStartOffset,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        describe('invalid offset defined', () => {
            it('offset=undefined', () => {
                expect(() =>
                    parseSimpleHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                    })
                ).toThrow();
            });
            it('offset=0', () => {
                expect(() =>
                    parseSimpleHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                        offset: 0,
                    })
                ).toThrow();
            });
            it('offset=+1', () => {
                expect(() =>
                    parseSimpleHeaderData({
                        data: headerDataBuffer,
                        headerByteLength,
                        offset: headerDataStartOffset + 1,
                    })
                ).toThrow();
            });
        });
    });
    describe('parse Protocol Buffers binary', () => {
        it.each<[string, SimpleHeaderData]>([
            [
                'simple-header-message.basic.bin',
                {
                    nonce: new Uint8Array([1, 2, 3]),
                    authTag: new Uint8Array([4, 5, 6]),
                },
            ],
            [
                'simple-header-message.full-length.bin',
                {
                    nonce: new Uint8Array([...Array(96 / 8).keys()]),
                    authTag: new Uint8Array([...Array(128 / 8).keys()].reverse()),
                },
            ],
        ])('%s', async (filename, expected) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const result = parseSimpleHeaderData({ data, headerByteLength: data.byteLength });
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
            expect(() => parseSimpleHeaderData({ data, headerByteLength: needLen })).toThrowWithMessage(
                Error,
                `Could not read simple header data. ${needLen} byte length simple header is required. Received data: ${actualLen} bytes`,
            );
        });
    });
});

describe('parseCiphertextLength()', () => {
    describe('invalid ciphertext byte length', () => {
        it.each([
            ['zero length bytes', Buffer.from([])],
            ['invalid varint', Buffer.from([0xFF])],
            ['maximum of 9 bytes', Buffer.from(padStartArray([0x00], 9, 0xFF))],
        ])('%s', (_, data) => {
            expect(() => parseCiphertextLength({ data })).toThrowWithMessage(
                Error,
                `Could not decode ciphertext size. The byte length of the ciphertext encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', () => {
            const data = Buffer.from([0x00]);
            expect(() => parseCiphertextLength({ data })).toThrowWithMessage(
                Error,
                `Invalid ciphertext byte length received: 0`,
            );
        });
    });
    describe('throwIfLowData=false', () => {
        it.each(rangeArray(1, 12))('<Buffer 0xFF x %i>', length => {
            const data = Buffer.from(rangeArray(1, length).fill(0xFF));
            if (data.byteLength < 9) {
                expect(parseCiphertextLength({ data, throwIfLowData: false })).toStrictEqual({
                    error: { needByteLength: 9 },
                });
            } else {
                expect(() => parseCiphertextLength({ data, throwIfLowData: false })).toThrowWithMessage(
                    Error,
                    `Could not decode ciphertext size. The byte length of the ciphertext encoded as unsigned varint is required.`,
                );
            }
        });
    });
});

describe('parseCiphertextData()', () => {
    describe('larger data than needed byte length', () => {
        const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const ciphertextByteLength = 6;
        it.each<[string, { offset?: number }, ReturnType<typeof parseCiphertextData>]>([
            [
                'offset=undefined',
                {},
                { ciphertextDataBytes: data.subarray(0, ciphertextByteLength), endOffset: ciphertextByteLength },
            ],
            [
                'offset=0',
                { offset: 0 },
                { ciphertextDataBytes: data.subarray(0, ciphertextByteLength), endOffset: ciphertextByteLength },
            ],
            [
                'offset defined',
                { offset: 2 },
                {
                    ciphertextDataBytes: data.subarray(2, ciphertextByteLength + 2),
                    endOffset: ciphertextByteLength + 2,
                },
            ],
        ])('%s', (_, opts, expected) => {
            expect(() => {
                const result = parseCiphertextData({ data, ciphertextByteLength: 6, ...opts });
                expect(result).toStrictEqual(expected);
            }).not.toThrow();
        });
    });
    describe('same size data as needed byte length', () => {
        const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        it.each<[string, { ciphertextByteLength: number; offset?: number }, ReturnType<typeof parseCiphertextData>]>([
            [
                'offset=undefined',
                { ciphertextByteLength: data.byteLength },
                { ciphertextDataBytes: data, endOffset: data.byteLength },
            ],
            [
                'offset=0',
                { ciphertextByteLength: data.byteLength, offset: 0 },
                { ciphertextDataBytes: data, endOffset: data.byteLength },
            ],
            [
                'offset defined',
                { ciphertextByteLength: data.byteLength - 2, offset: 2 },
                { ciphertextDataBytes: data.subarray(2, data.byteLength), endOffset: data.byteLength },
            ],
        ])('%s', (_, opts, expected) => {
            expect(() => {
                const result = parseCiphertextData({ data, ...opts });
                expect(result).toStrictEqual(expected);
            }).not.toThrow();
        });
    });
    describe('smaller data than required byte length', () => {
        const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        it.each<[string, { ciphertextByteLength: number; offset?: number }, string]>([
            [
                'offset=undefined',
                { ciphertextByteLength: 99 },
                `Could not read ciphertext. 99 byte length ciphertext is required. Received data: ${data.byteLength} bytes`,
            ],
            [
                'offset=0',
                { ciphertextByteLength: 99, offset: 0 },
                `Could not read ciphertext. 99 byte length ciphertext is required. Received data: ${data.byteLength} bytes`,
            ],
            [
                'offset defined',
                { ciphertextByteLength: data.byteLength, offset: 1 },
                `Could not read ciphertext. ${data.byteLength} byte length ciphertext is required.`
                + ` Received data: ${data.byteLength - 1} bytes`,
            ],
            [
                'offset is greater than data length',
                { ciphertextByteLength: 2, offset: data.byteLength + 1 },
                `Could not read ciphertext. 2 byte length ciphertext is required. Received data: 0 bytes`,
            ],
        ])('%s', (_, opts, expectedErrorMessage) => {
            expect(() => parseCiphertextData({ data, ...opts })).toThrowWithMessage(
                Error,
                expectedErrorMessage,
            );
        });
    });
});
