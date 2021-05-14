import { promises as fsAsync } from 'fs';
import * as path from 'path';

import * as multicodec from 'multicodec';
import * as varint from 'varint';

import {
    createHeader,
    createSimpleHeader,
    HeaderData,
    HeaderDataWithCiphertextLength,
    parseCiphertextIterable,
    parseCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeaderData,
    parseSimpleHeaderLength,
    SimpleHeaderData,
    validateCID,
} from '../../src/header';
import { cidByteList } from '../../src/header/content-identifier';
import { iterable2buffer, padStartArray } from '../helpers';
import '../helpers/jest-matchers';
import { DummyStreamReader } from '../helpers/stream';

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

function toBuffer(dataList: Array<Uint8Array | number[]>): Buffer {
    return Buffer.concat(dataList.map(data => data instanceof Uint8Array ? data : Buffer.from(data)));
}

describe('createHeader()', () => {
    describe('multicodec compliant', () => {
        it('can read', () => {
            const headerData = toBuffer(createHeader(dummyHeaderData));
            expect(() => multicodec.getCodeFromData(headerData)).not.toThrow();
        });
        it('code is within Private Use Area', () => {
            /**
             * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
             */
            const headerData = toBuffer(createHeader(dummyHeaderData));
            const code = multicodec.getCodeFromData(headerData);
            expect(code).toBeGreaterThanOrEqual(0x300000);
            expect(code).toBeLessThanOrEqual(0x3FFFFF);
        });
    });
    describe('header byte length included', () => {
        it('can read', () => {
            const headerData = toBuffer(createHeader(dummyHeaderData));
            const headerStartOffset = 0 + cidByte.byteLength;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = toBuffer(createHeader(dummyHeaderData));
            const headerLenStartOffset = 0 + cidByte.byteLength;
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            {
                const headerLength = varint.decode(headerData, headerLenStartOffset);
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBeByteSize(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
            {
                const headerLength = varint.decode(headerData.subarray(headerLenStartOffset));
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData.byteLength).toBeByteSize(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = toBuffer(createHeader(dummyHeaderData));
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
            const headerData = toBuffer(createSimpleHeader(dummyHeaderData));
            const headerStartOffset = 0;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = toBuffer(createSimpleHeader(dummyHeaderData));
            const headerLength = varint.decode(headerData);
            const headerLengthVarintBytes = varint.decode.bytes;
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            expect(headerData.byteLength).toBeByteSize(
                headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
            );
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = toBuffer(createSimpleHeader(dummyHeaderData));
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
    ])('%s', async (_, data) => {
        const reader = new DummyStreamReader(data);
        await expect(validateCID(reader)).rejects.toThrowWithMessageFixed(
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
    ])('no match / 0x%s', async (codeStr, codeInt) => {
        const data = Buffer.from(varint.encode(codeInt));
        const reader = new DummyStreamReader(data);
        await expect(validateCID(reader)).rejects.toThrowWithMessageFixed(
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
        ])('%s', async (_, headerLengthBytes) => {
            const reader = new DummyStreamReader(headerLengthBytes);
            await expect(parseHeaderLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Could not decode header size. The byte length of the header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const data = Buffer.from([0x00]);
            const reader = new DummyStreamReader(data);
            await expect(parseHeaderLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Invalid header byte length received: 0`,
            );
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
        const headerDataBuffer = toBuffer(createHeader({ ...headerData, ciphertextLength: 0 }));
        const headerLengthStartOffset = 0 + cidByte.byteLength;
        const headerByteLength = varint.decode(headerDataBuffer, headerLengthStartOffset);
        const headerDataStartOffset = headerLengthStartOffset + varint.decode.bytes;

        type Opts = Omit<Parameters<typeof parseHeaderData>[1], 'headerByteLength'>;
        it.each<[string, Opts, Buffer]>([
            [
                'offset=undefined',
                {},
                headerDataBuffer.subarray(headerDataStartOffset),
            ],
            [
                'offset=0',
                { offset: 0 },
                headerDataBuffer.subarray(headerDataStartOffset),
            ],
            [
                'offset defined',
                { offset: headerDataStartOffset },
                headerDataBuffer,
            ],
        ])('%s', async (_, opts, data) => {
            const reader = new DummyStreamReader(data);
            const result = await parseHeaderData(reader, {
                ...opts,
                headerByteLength,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        describe('invalid offset defined', () => {
            it.each<[string, Opts]>([
                [
                    'offset=undefined',
                    {},
                ],
                [
                    'offset=0',
                    { offset: 0 },
                ],
                [
                    'offset=+1',
                    { offset: headerDataStartOffset + 1 },
                ],
            ])('%s', async (_, opts) => {
                await expect(
                    parseHeaderData(new DummyStreamReader(headerDataBuffer), {
                        headerByteLength,
                        ...opts,
                    }),
                ).rejects.toThrow();
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
                    salt: new Uint8Array([...Array(128 / 8).keys()]),
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
            const reader = new DummyStreamReader(data);
            const result = await parseHeaderData(reader, { headerByteLength: data.byteLength });
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
        ])('need %i bytes / actual %i bytes', async (needLen, actualLen) => {
            const data = Buffer.alloc(actualLen);
            const reader = new DummyStreamReader(data);
            await expect(parseHeaderData(reader, { headerByteLength: needLen })).rejects.toThrowWithMessageFixed(
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
        ])('%s', async (_, data) => {
            const reader = new DummyStreamReader(data);
            await expect(parseSimpleHeaderLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Could not decode simple header size. The byte length of the simple header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const data = Buffer.from([0x00]);
            const reader = new DummyStreamReader(data);
            await expect(parseSimpleHeaderLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Invalid simple header byte length received: 0`,
            );
        });
    });
});

describe('parseSimpleHeaderData()', () => {
    describe('parse generated data by createSimpleHeader()', () => {
        const headerData: SimpleHeaderData = {
            nonce: new Uint8Array([2, 3, 4]),
            authTag: new Uint8Array([9, 9, 8, 6, 0, 7]),
        };
        const headerDataBuffer = toBuffer(createSimpleHeader({ ...headerData, ciphertextLength: 0 }));
        const headerByteLength = varint.decode(headerDataBuffer);
        const headerDataStartOffset = varint.decode.bytes;

        type Opts = Omit<Parameters<typeof parseSimpleHeaderData>[1], 'headerByteLength'>;
        it.each<[string, Opts, Buffer]>([
            [
                'offset=undefined',
                {},
                headerDataBuffer.subarray(headerDataStartOffset),
            ],
            [
                'offset=0',
                { offset: 0 },
                headerDataBuffer.subarray(headerDataStartOffset),
            ],
            [
                'offset defined',
                { offset: headerDataStartOffset },
                headerDataBuffer,
            ],
        ])('%s', async (_, opts, data) => {
            const reader = new DummyStreamReader(data);
            const result = await parseSimpleHeaderData(reader, {
                ...opts,
                headerByteLength,
            });
            expect(result.headerData).toStrictEqual(headerData);
        });
        describe('invalid offset defined', () => {
            it.each<[string, Opts]>([
                [
                    'offset=undefined',
                    {},
                ],
                [
                    'offset=0',
                    { offset: 0 },
                ],
                [
                    'offset=+1',
                    { offset: headerDataStartOffset + 1 },
                ],
            ])('%s', async (_, opts) => {
                await expect(
                    parseSimpleHeaderData(new DummyStreamReader(headerDataBuffer), {
                        headerByteLength,
                        ...opts,
                    }),
                ).rejects.toThrow();
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
            const reader = new DummyStreamReader(data);
            const result = await parseSimpleHeaderData(reader, { headerByteLength: data.byteLength });
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
        ])('need %i bytes / actual %i bytes', async (needLen, actualLen) => {
            const data = Buffer.alloc(actualLen);
            const reader = new DummyStreamReader(data);
            await expect(parseSimpleHeaderData(reader, { headerByteLength: needLen })).rejects.toThrowWithMessageFixed(
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
        ])('%s', async (_, data) => {
            const reader = new DummyStreamReader(data);
            await expect(parseCiphertextLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Could not decode ciphertext size. The byte length of the ciphertext encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const reader = new DummyStreamReader(Buffer.from([0x00]));
            await expect(parseCiphertextLength(reader)).rejects.toThrowWithMessageFixed(
                Error,
                `Invalid ciphertext byte length received: 0`,
            );
        });
    });
});

describe('parseCiphertextIterable()', () => {
    type Optsions = Parameters<typeof parseCiphertextIterable>[1];
    describe('larger data than needed byte length', () => {
        const data = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const ciphertextByteLength = 6;
        it.each<[string, Omit<Optsions, 'ciphertextByteLength'>, Buffer]>([
            [
                'offset=undefined',
                {},
                data.subarray(0, ciphertextByteLength),
            ],
            [
                'offset=0',
                { offset: 0 },
                data.subarray(0, ciphertextByteLength),
            ],
            [
                'offset defined',
                { offset: 2 },
                data.subarray(2, ciphertextByteLength + 2),
            ],
        ])('%s', async (_, opts, expected) => {
            const reader = new DummyStreamReader(data);
            const resultIterable = parseCiphertextIterable(reader, { ciphertextByteLength: 6, ...opts });
            await expect(iterable2buffer(resultIterable)).resolves.toStrictEqual(expected);
        });
    });
    describe('same size data as needed byte length', () => {
        const data = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        it.each<[string, Optsions, Buffer]>([
            [
                'offset=undefined',
                { ciphertextByteLength: data.byteLength },
                data,
            ],
            [
                'offset=0',
                { ciphertextByteLength: data.byteLength, offset: 0 },
                data,
            ],
            [
                'offset defined',
                { ciphertextByteLength: data.byteLength - 2, offset: 2 },
                data.subarray(2, data.byteLength),
            ],
        ])('%s', async (_, opts, expected) => {
            const reader = new DummyStreamReader(data);
            const resultIterable = parseCiphertextIterable(reader, opts);
            await expect(iterable2buffer(resultIterable)).resolves.toStrictEqual(expected);
        });
    });
    describe('smaller data than required byte length', () => {
        const data = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        it.each<[string, Optsions, string]>([
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
        ])('%s', async (_, opts, expectedErrorMessage) => {
            const reader = new DummyStreamReader(data);
            const resultIterable = parseCiphertextIterable(reader, opts);
            await expect(iterable2buffer(resultIterable)).rejects.toThrowWithMessageFixed(
                Error,
                expectedErrorMessage,
            );
        });
    });
});
