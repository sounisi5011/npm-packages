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
    SimpleHeaderDataWithCiphertextLength,
    validateCID,
} from '../../src/core/header';
import { cidByteList } from '../../src/core/header/content-identifier';
import { inspect } from '../../src/runtimes/node/utils';
import { iterable2buffer, padStartArray } from '../helpers';
import { DummyStreamReader } from '../helpers/stream';

const MAX_UINT64 = BigInt(2) ** BigInt(64) - BigInt(1);

const builtin = { inspect };
const dummyHeaderData: HeaderDataWithCiphertextLength = {
    crypto: {
        algorithmName: 'aes-256-gcm',
        nonce: new Uint8Array(),
        authTag: new Uint8Array(),
    },
    key: {
        length: 0,
        salt: new Uint8Array(),
        keyDerivationFunctionOptions: {
            algorithm: 'argon2d',
            iterations: 0,
            memory: 0,
            parallelism: 0,
        },
    },
    compressAlgorithmName: 'gzip',
    ciphertextLength: 123456,
};

const cidByte = Buffer.from(cidByteList);

describe('createHeader()', () => {
    describe('multicodec compliant', () => {
        it('can read', () => {
            const headerData = createHeader(builtin, dummyHeaderData);
            expect(() => multicodec.getCodeFromData(headerData)).not.toThrow();
        });
        it('code is within Private Use Area', () => {
            /**
             * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
             */
            const headerData = createHeader(builtin, dummyHeaderData);
            const code = multicodec.getCodeFromData(headerData);
            expect(code).toBeGreaterThanOrEqual(0x300000);
            expect(code).toBeLessThanOrEqual(0x3FFFFF);
        });
    });
    describe('header byte length included', () => {
        it('can read', () => {
            const headerData = createHeader(builtin, dummyHeaderData);
            const headerStartOffset = 0 + cidByte.byteLength;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = createHeader(builtin, dummyHeaderData);
            const headerLenStartOffset = 0 + cidByte.byteLength;
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            {
                const headerLength = varint.decode(headerData, headerLenStartOffset);
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData).toBeByteSize(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
            {
                const headerLength = varint.decode(headerData.subarray(headerLenStartOffset));
                const headerLengthVarintBytes = varint.decode.bytes;
                expect(headerData).toBeByteSize(
                    cidByte.byteLength + headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
                );
            }
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = createHeader(builtin, dummyHeaderData);
        const headerInCiphertextLenBytes = headerData.subarray(
            headerData.byteLength - ciphertextLengthByte.byteLength,
            headerData.byteLength,
        );
        expect(headerInCiphertextLenBytes).toBytesEqual(ciphertextLengthByte);
    });
});

describe('createSimpleHeader()', () => {
    const dummyHeaderData: SimpleHeaderDataWithCiphertextLength = {
        crypto: {
            authTag: new Uint8Array([2, 6, 0, 8]),
            nonceDiff: { addCounter: BigInt(1) },
        },
        ciphertextLength: 4219,
    };

    describe('header byte length included', () => {
        it('can read', () => {
            const headerData = createSimpleHeader(builtin, dummyHeaderData);
            const headerStartOffset = 0;
            expect(() => varint.decode(headerData, headerStartOffset)).not.toThrow();
            expect(() => varint.decode(headerData.subarray(headerStartOffset))).not.toThrow();
        });
        it('correct length', () => {
            const headerData = createSimpleHeader(builtin, dummyHeaderData);
            const headerLength = varint.decode(headerData);
            const headerLengthVarintBytes = varint.decode.bytes;
            const ciphertextLengthByteLen = varint.encode(dummyHeaderData.ciphertextLength).length;
            expect(headerData).toBeByteSize(
                headerLengthVarintBytes + headerLength + ciphertextLengthByteLen,
            );
        });
    });
    it('ciphertext byte length included', () => {
        const ciphertextLengthByte = Buffer.from(varint.encode(dummyHeaderData.ciphertextLength));
        const headerData = createSimpleHeader(builtin, dummyHeaderData);
        const headerInCiphertextLenBytes = headerData
            .subarray(headerData.byteLength - ciphertextLengthByte.byteLength, headerData.byteLength);
        expect(headerInCiphertextLenBytes).toBytesEqual(ciphertextLengthByte);
    });
    describe('invalid nonce', () => {
        {
            const min = BigInt(1);
            const max = MAX_UINT64;
            it.each<[string, bigint, bigint]>([
                ['addCounter must be greater than 0', min, min - BigInt(1)],
                ['addCounter must be less than 2^64', max, max + BigInt(1)],
            ])('%s', (_, safeValue, outValue) => {
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addCounter: safeValue },
                        },
                    })
                ).not.toThrow();
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addCounter: outValue },
                        },
                    })
                ).toThrowWithMessage(
                    RangeError,
                    `The value of "simpleHeaderData.crypto.nonceDiff.addCounter" is out of range. It must be >= ${min} and <= ${max}. Received ${outValue}n`,
                );
            });
        }
        {
            const min = BigInt(1);
            const max = MAX_UINT64;
            it.each<[string, bigint, bigint]>([
                ['addFixed must be greater than 0', min, min - BigInt(1)],
                ['addFixed must be less than 2^64', max, max + BigInt(1)],
            ])('%s', (_, safeValue, outValue) => {
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addFixed: safeValue, resetCounter: BigInt(0) },
                        },
                    })
                ).not.toThrow();
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addFixed: outValue, resetCounter: BigInt(0) },
                        },
                    })
                ).toThrowWithMessage(
                    RangeError,
                    `The value of "simpleHeaderData.crypto.nonceDiff.addFixed" is out of range. It must be >= ${min} and <= ${max}. Received ${outValue}n`,
                );
            });
        }
        {
            const min = BigInt(0);
            const max = MAX_UINT64;
            it.each<[string, bigint, bigint]>([
                ['resetCounter must be greater than or equal to 0', min, min - BigInt(1)],
                ['resetCounter must be less than 2^64', max, max + BigInt(1)],
            ])('%s', (_, safeValue, outValue) => {
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addFixed: BigInt(1), resetCounter: safeValue },
                        },
                    })
                ).not.toThrow();
                expect(() =>
                    createSimpleHeader(builtin, {
                        ...dummyHeaderData,
                        crypto: {
                            ...dummyHeaderData.crypto,
                            nonceDiff: { addFixed: BigInt(1), resetCounter: outValue },
                        },
                    })
                ).toThrowWithMessage(
                    RangeError,
                    `The value of "simpleHeaderData.crypto.nonceDiff.resetCounter" is out of range. It must be >= ${min} and <= ${max}. Received ${outValue}n`,
                );
            });
        }
    });
});

describe('validateCID()', () => {
    it.each([
        ['zero length', Buffer.from([])],
        ['invalid varint', Buffer.from([0xFF])],
        ['maximum of 9 bytes', Buffer.from(padStartArray([0x00], 9, 0xFF))],
    ])('%s', async (_, data) => {
        const reader = new DummyStreamReader(data);
        await expect(validateCID(reader)).rejects.toThrowWithMessage(
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
        await expect(validateCID(reader)).rejects.toThrowWithMessage(
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
            await expect(parseHeaderLength(reader)).rejects.toThrowWithMessage(
                Error,
                `Could not decode header size. The byte length of the header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const data = Buffer.from([0x00]);
            const reader = new DummyStreamReader(data);
            await expect(parseHeaderLength(reader)).rejects.toThrowWithMessage(
                Error,
                `Invalid header byte length received: 0`,
            );
        });
    });
});

describe('parseHeaderData()', () => {
    describe('parse generated data by createHeader()', () => {
        const headerData: HeaderData = {
            crypto: {
                algorithmName: 'chacha20-poly1305',
                nonce: new Uint8Array([9, 8, 7]),
                authTag: new Uint8Array([4, 6, 8]),
            },
            key: {
                length: 6,
                salt: new Uint8Array([0, 1, 2]),
                keyDerivationFunctionOptions: {
                    algorithm: 'argon2d',
                    iterations: 2,
                    memory: 12,
                    parallelism: 4,
                },
            },
            compressAlgorithmName: 'gzip',
        };
        const headerDataBuffer = createHeader(builtin, { ...headerData, ciphertextLength: 0 });
        const headerLengthStartOffset = 0 + cidByte.byteLength;
        const headerByteLength = varint.decode(headerDataBuffer, headerLengthStartOffset);
        const headerDataStartOffset = headerLengthStartOffset + varint.decode.bytes;

        type Opts = Omit<Parameters<typeof parseHeaderData>[2], 'headerByteLength'>;
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
            const result = await parseHeaderData(builtin, reader, {
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
                    parseHeaderData(builtin, new DummyStreamReader(headerDataBuffer), {
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
                    crypto: {
                        algorithmName: 'aes-256-gcm',
                        nonce: new Uint8Array([4, 5, 6]),
                        authTag: new Uint8Array([2, 3, 4]),
                    },
                    key: {
                        length: 32,
                        salt: new Uint8Array([9, 8, 7]),
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2d',
                            iterations: 3,
                            memory: 12,
                            parallelism: 1,
                        },
                    },
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-message.full-length.bin',
                {
                    crypto: {
                        algorithmName: 'chacha20-poly1305',
                        nonce: new Uint8Array([...Array(96 / 8).keys()]),
                        authTag: new Uint8Array([...Array(128 / 8).keys()].reverse()),
                    },
                    key: {
                        length: 32,
                        salt: new Uint8Array([...Array(128 / 8).keys()]),
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2d',
                            iterations: 3,
                            memory: 12,
                            parallelism: 1,
                        },
                    },
                    compressAlgorithmName: 'brotli',
                },
            ],
            [
                'header-message.chacha20-poly1305.bin',
                {
                    crypto: {
                        algorithmName: 'chacha20-poly1305',
                        nonce: new Uint8Array([3, 4]),
                        authTag: new Uint8Array([5, 6, 7, 8]),
                    },
                    key: {
                        length: 96,
                        salt: new Uint8Array([0, 1, 2]),
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2d',
                            iterations: 4,
                            memory: 128,
                            parallelism: 6,
                        },
                    },
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-message.argon2id.bin',
                {
                    crypto: {
                        algorithmName: 'aes-256-gcm',
                        nonce: new Uint8Array([255]),
                        authTag: new Uint8Array([8]),
                    },
                    key: {
                        salt: new Uint8Array([0x42]),
                        length: 666,
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2id',
                            iterations: 1,
                            memory: 6,
                            parallelism: 99,
                        },
                    },
                    compressAlgorithmName: undefined,
                },
            ],
            [
                'header-message.compress-gzip.bin',
                {
                    crypto: {
                        algorithmName: 'aes-256-gcm',
                        nonce: new Uint8Array([4, 5, 6]),
                        authTag: new Uint8Array([2, 3, 4]),
                    },
                    key: {
                        length: 32,
                        salt: new Uint8Array([9, 8, 7]),
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2d',
                            iterations: 3,
                            memory: 12,
                            parallelism: 1,
                        },
                    },
                    compressAlgorithmName: 'gzip',
                },
            ],
            [
                'header-message.compress-brotli.bin',
                {
                    crypto: {
                        algorithmName: 'aes-256-gcm',
                        nonce: new Uint8Array([4, 5, 6]),
                        authTag: new Uint8Array([2, 3, 4]),
                    },
                    key: {
                        length: 32,
                        salt: new Uint8Array([9, 8, 7]),
                        keyDerivationFunctionOptions: {
                            algorithm: 'argon2d',
                            iterations: 3,
                            memory: 12,
                            parallelism: 1,
                        },
                    },
                    compressAlgorithmName: 'brotli',
                },
            ],
        ])('%s', async (filename, expected) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const reader = new DummyStreamReader(data);
            const result = await parseHeaderData(builtin, reader, { headerByteLength: data.byteLength });
            expect(result.headerData).toStrictEqual(expected);
        });
    });
    describe('invalid Protocol Buffers binary', () => {
        it.each<[string, ErrorConstructor, string]>([
            [
                'header-message.empty.bin',
                Error,
                'The value of the crypto_nonce field in the Header data is 0 bytes. It must be >= 1',
            ],
            [
                'simple-header-message.add-nonce-counter.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.add-nonce-fixed.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.basic.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.full-length.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.max-length.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.max-nonce-counter.bin',
                Error,
                'Assertion failed',
            ],
            [
                'simple-header-message.overflow-nonce-counter.bin',
                Error,
                'Assertion failed',
            ],
        ])('%s', async (filename, errorConst, errorMsg) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const reader = new DummyStreamReader(data);
            await expect(parseHeaderData(builtin, reader, { headerByteLength: data.byteLength })).rejects
                .toThrowWithMessage(errorConst, errorMsg);
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
            await expect(parseHeaderData(builtin, reader, { headerByteLength: needLen })).rejects.toThrowWithMessage(
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
            await expect(parseSimpleHeaderLength(reader)).rejects.toThrowWithMessage(
                Error,
                `Could not decode simple header size. The byte length of the simple header encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const data = Buffer.from([0x00]);
            const reader = new DummyStreamReader(data);
            await expect(parseSimpleHeaderLength(reader)).rejects.toThrowWithMessage(
                Error,
                `Invalid simple header byte length received: 0`,
            );
        });
    });
});

describe('parseSimpleHeaderData()', () => {
    describe('parse generated data by createSimpleHeader()', () => {
        let unsafeAdd: number | undefined;
        for (let i = 1; i < 1000; i++) {
            if (i !== ((Number.MAX_SAFE_INTEGER + i) - Number.MAX_SAFE_INTEGER)) {
                unsafeAdd = i;
                break;
            }
        }
        if (!unsafeAdd) throw new Error('The derivation of "unsafeAdd" failed.');

        const intList: ReadonlyArray<{ label?: string; value: bigint }> = [
            { value: BigInt(1) },
            { value: BigInt(2) },
            {
                label: `Number.MAX_SAFE_INTEGER + ${unsafeAdd}`,
                value: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(unsafeAdd),
            },
            { label: '2^64 - 1', value: MAX_UINT64 },
        ];

        describe.each<[string, SimpleHeaderData]>([
            ...intList.map<[string, SimpleHeaderData]>(({ label, value }) => [
                `crypto.nonceDiff.addCounter=${label ? `(${label})` : String(value)}`,
                {
                    crypto: {
                        authTag: new Uint8Array([9, 9, 8, 6, 0, 7]),
                        nonceDiff: { addCounter: value },
                    },
                },
            ]),
            ...intList.map<[string, SimpleHeaderData]>(({ label, value }) => [
                `crypto.nonceDiff.addFixed=${label ? `(${label})` : String(value)}`,
                {
                    crypto: {
                        authTag: new Uint8Array([9, 9, 8, 6, 0, 7]),
                        nonceDiff: { addFixed: value, resetCounter: BigInt(0) },
                    },
                },
            ]),
            ...[{ value: BigInt(0) }, ...intList].map<[string, SimpleHeaderData]>(({ label, value }) => [
                `crypto.nonceDiff.resetCounter=${label ? `(${label})` : String(value)}`,
                {
                    crypto: {
                        authTag: new Uint8Array([9, 9, 8, 6, 0, 7]),
                        nonceDiff: { addFixed: BigInt(1), resetCounter: value },
                    },
                },
            ]),
        ])('%s', (_, headerData) => {
            const headerDataBuffer = createSimpleHeader(builtin, { ...headerData, ciphertextLength: 0 });
            const headerByteLength = varint.decode(headerDataBuffer);
            const headerDataStartOffset = varint.decode.bytes;

            type Opts = Omit<Parameters<typeof parseSimpleHeaderData>[2], 'headerByteLength'>;
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
                const result = await parseSimpleHeaderData(builtin, reader, {
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
                        parseSimpleHeaderData(builtin, new DummyStreamReader(headerDataBuffer), {
                            headerByteLength,
                            ...opts,
                        }),
                    ).rejects.toThrow();
                });
            });
        });
    });
    describe('parse Protocol Buffers binary', () => {
        it.each<[string, SimpleHeaderData]>([
            [
                'simple-header-message.basic.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([4, 5, 6]),
                        nonceDiff: {
                            addCounter: BigInt(1),
                        },
                    },
                },
            ],
            [
                'simple-header-message.add-nonce-counter.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([0, 1, 0]),
                        nonceDiff: {
                            addCounter: BigInt(2),
                        },
                    },
                },
            ],
            [
                'simple-header-message.max-nonce-counter.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([7, 1, 4]),
                        nonceDiff: {
                            addCounter: MAX_UINT64,
                        },
                    },
                },
            ],
            [
                'simple-header-message.add-nonce-fixed.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([1, 3, 2]),
                        nonceDiff: {
                            addFixed: BigInt(1),
                            resetCounter: BigInt(0),
                        },
                    },
                },
            ],
            [
                'simple-header-message.full-length.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([...Array(128 / 8).keys()].reverse()),
                        nonceDiff: {
                            addFixed: BigInt(8640000000000000),
                            resetCounter: BigInt(2) ** (BigInt(5) * BigInt(8)) - BigInt(1),
                        },
                    },
                },
            ],
            [
                'simple-header-message.max-length.bin',
                {
                    crypto: {
                        authTag: new Uint8Array([...Array(128 / 8).keys()].reverse()),
                        nonceDiff: {
                            addFixed: MAX_UINT64,
                            resetCounter: MAX_UINT64,
                        },
                    },
                },
            ],
        ])('%s', async (filename, expected) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const reader = new DummyStreamReader(data);
            const result = await parseSimpleHeaderData(builtin, reader, { headerByteLength: data.byteLength });
            expect(result.headerData).toStrictEqual(expected);
        });
    });
    describe('invalid Protocol Buffers binary', () => {
        it.each<[string, ErrorConstructor, string]>([
            [
                'header-message.empty.bin',
                Error,
                'The value of the crypto_auth_tag field in the SimpleHeader data is 0 bytes. It must be >= 1',
            ],
            [
                'simple-header-message.overflow-nonce-counter.bin',
                Error,
                `The value of the crypto_nonce_counter_add_or_reset field in the SimpleHeader data is out of range.`
                + ` It must be >= 0 and <= ${MAX_UINT64 - BigInt(1)}.`
                + ` Received ${MAX_UINT64}`,
            ],
            [
                'header-message.argon2id.bin',
                Error,
                'Assertion failed',
            ],
            [
                'header-message.basic.bin',
                Error,
                'Assertion failed',
            ],
            [
                'header-message.chacha20-poly1305.bin',
                Error,
                'Assertion failed',
            ],
            [
                'header-message.compress-brotli.bin',
                Error,
                'Assertion failed',
            ],
            [
                'header-message.compress-gzip.bin',
                Error,
                'Assertion failed',
            ],
            [
                'header-message.full-length.bin',
                Error,
                'Assertion failed',
            ],
        ])('%s', async (filename, errorConst, errorMsg) => {
            const filepath = path.resolve(__dirname, 'fixtures', filename);
            const data = await fsAsync.readFile(filepath);
            const reader = new DummyStreamReader(data);
            await expect(parseSimpleHeaderData(builtin, reader, { headerByteLength: data.byteLength })).rejects
                .toThrowWithMessage(errorConst, errorMsg);
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
            await expect(parseSimpleHeaderData(builtin, reader, { headerByteLength: needLen })).rejects
                .toThrowWithMessage(
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
            await expect(parseCiphertextLength(reader)).rejects.toThrowWithMessage(
                Error,
                `Could not decode ciphertext size. The byte length of the ciphertext encoded as unsigned varint is required.`,
            );
        });
        it('zero length data', async () => {
            const reader = new DummyStreamReader(Buffer.from([0x00]));
            await expect(parseCiphertextLength(reader)).rejects.toThrowWithMessage(
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
            await expect(iterable2buffer(resultIterable)).resolves.toBytesEqual(expected);
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
            await expect(iterable2buffer(resultIterable)).resolves.toBytesEqual(expected);
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
            await expect(iterable2buffer(resultIterable)).rejects.toThrowWithMessage(
                Error,
                expectedErrorMessage,
            );
        });
    });
});
