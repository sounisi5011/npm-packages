import * as stream from 'stream';

import { StreamReader } from '../../../src/core/utils/stream';
import { inspect } from '../../../src/runtimes/node/utils';
import { spyObj, SpyObjCallItem } from '../../helpers/spy';

/* eslint @typescript-eslint/no-unused-vars: ["error", { varsIgnorePattern: "^_+$" }] */

const builtin: ConstructorParameters<typeof StreamReader>[0] = {
    inspect,
    encodeString: str => Buffer.from(str, 'utf8'),
};

describe('class StreamReader', () => {
    describe('read() method', () => {
        it('empty stream', async () => {
            const targetStream = stream.Readable.from([]);
            const reader = new StreamReader(builtin, targetStream);
            await expect(reader.read(1)).resolves
                .toBytesEqual(Buffer.from([]));
        });
        describe.each([
            ['non empty stream', [[0, 1, 2, 3, 4, 5]]],
            ['multi chunk stream', [[0, 1], [2, 3, 4, 5]]],
        ])('%s', (_, chunkList) => {
            it.each<[{ size: number; offset?: number }, number[]]>([
                [{ size: 0 }, []],
                [{ size: 1 }, [0]],
                [{ size: 2 }, [0, 1]],
                [{ size: 3 }, [0, 1, 2]],
                [{ size: 999 }, [0, 1, 2, 3, 4, 5]],
                [{ size: 4, offset: 0 }, [0, 1, 2, 3]],
                [{ size: 4, offset: 2 }, [2, 3, 4, 5]],
                [{ size: 4, offset: 4 }, [4, 5]],
                [{ size: 4, offset: 999 }, []],
            ])('%p', async (input, expected) => {
                const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                const reader = new StreamReader(builtin, targetStream);

                const expectedBuffer = Buffer.from(expected);
                if (input.offset === undefined) {
                    // eslint-disable-next-line jest/no-conditional-expect
                    await expect(reader.read(input.size)).resolves
                        .toBytesEqual(expectedBuffer);
                }
                await expect(reader.read(input.size, input.offset)).resolves
                    .toBytesEqual(expectedBuffer);
            });
        });
        it('multi read', async () => {
            const chunkSpyList = [
                spyObj(Buffer.from([0, 1, 2, 3]), ['.then']),
                spyObj(Buffer.from([4]), ['.then']),
                spyObj(Buffer.from([5, 6, 7, 8]), ['.then']),
            ] as const;

            let readCount = 0;
            const targetStream = stream.Readable.from(chunkSpyList.map(({ value }) => value))
                .on('data', () => {
                    readCount++;
                });
            const reader = new StreamReader(builtin, targetStream);

            expect(readCount).toBe(0);
            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(0)).resolves
                .toBytesEqual(Buffer.from([]));
            expect(readCount).toBe(0);
            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(1)).resolves
                .toBytesEqual(Buffer.from([0]));
            expect(readCount).toBe(1);
            {
                const newCalls0 = chunkSpyList[0].newCalls;
                // StreamReader should not copy chunks
                expect(newCalls0).not.toIncludeAnyMembers<SpyObjCallItem>([
                    { type: 'get', path: '[0]' },
                    { type: 'get', path: '[1]' },
                    { type: 'get', path: '[2]' },
                    { type: 'get', path: '[3]' },
                    { type: 'get', path: '.buffer' },
                ]);
                expect(newCalls0).toIncludeAllMembers<SpyObjCallItem>([
                    { type: 'apply', path: '.subarray(0, 1)' },
                ]);
                // StreamReader should not touch other chunks
                expect(chunkSpyList[1].newCalls).toStrictEqual([]);
                expect(chunkSpyList[2].newCalls).toStrictEqual([]);
            }

            await expect(reader.read(4)).resolves
                .toBytesEqual(Buffer.from([0, 1, 2, 3]));
            expect(readCount).toBe(1);
            expect(chunkSpyList[0].newCalls).toIncludeAllMembers<SpyObjCallItem>([
                { type: 'apply', path: '.subarray(0, 4)' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(5)).resolves
                .toBytesEqual(Buffer.from([0, 1, 2, 3, 4]));
            expect(readCount).toBe(2);
            // StreamReader should copy chunks
            expect(chunkSpyList[0].newCalls).toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '[3]' },
                { type: 'get', path: '.buffer' },
            ]);
            expect(chunkSpyList[1].newCalls).toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '.buffer' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(4)).resolves
                .toBytesEqual(Buffer.from([0, 1, 2, 3]));
            expect(readCount).toBe(2);
            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(2, 3)).resolves
                .toBytesEqual(Buffer.from([3, 4]));
            expect(readCount).toBe(2);
            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await expect(reader.read(2, 4)).resolves
                .toBytesEqual(Buffer.from([4, 5]));
            expect(readCount).toBe(3);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            // StreamReader should copy chunks
            expect(chunkSpyList[2].newCalls).toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '[3]' },
                { type: 'get', path: '.buffer' },
            ]);

            await expect(reader.read(10, 4)).resolves
                .toBytesEqual(Buffer.from([4, 5, 6, 7, 8]));
            expect(readCount).toBe(3);
            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);
        });
    });
    describe('readIterator() method', () => {
        interface ReadEntry {
            data?: Uint8Array | undefined;
            requestedSize: number;
            offset: number;
            readedSize: number;
        }

        describe('empty stream', () => {
            it.each<number | undefined>([
                undefined,
                0,
                3,
            ])('offset=%p', async offset => {
                const targetStream = stream.Readable.from([]);
                const reader = new StreamReader(builtin, targetStream);

                const entryList: ReadEntry[] = [];
                // eslint-disable-next-line jest/no-if
                if (offset === undefined) {
                    for await (const entry of reader.readIterator(1)) {
                        entryList.push(entry);
                    }
                } else {
                    for await (const entry of reader.readIterator(1, offset)) {
                        entryList.push(entry);
                    }
                }

                expect(entryList).toStrictEqual([
                    {
                        // the last entry always does not contain the data property.
                        requestedSize: 1,
                        offset: offset ?? 0,
                        readedSize: 0,
                    },
                ]);
            });
        });
        it('single chunk stream', async () => {
            const targetStream = stream.Readable.from((function*() {
                yield Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            })());
            const reader = new StreamReader(builtin, targetStream);

            await expect(reader.read(2)).resolves.toBytesEqual(Buffer.from([0, 1]));
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(3)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        data: Buffer.from([0, 1, 2]),
                        requestedSize: 3,
                        offset: 0,
                        readedSize: 3,
                    },
                    {
                        // the last entry will always be generated
                        requestedSize: 3,
                        offset: 0,
                        readedSize: 3,
                    },
                ]);
            }
            // always seek because storing huge data is inefficient
            await expect(reader.read(2)).resolves.toBytesEqual(Buffer.from([3, 4]));
            await expect(reader.isEnd()).resolves.toBeFalse();

            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(999, 1)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        data: new Uint8Array([4, 5, 6, 7, 8, 9]),
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 6,
                    },
                    {
                        // no error will be generated if the requested data length cannot be read
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 6,
                    },
                ]);
            }

            await expect(reader.read(1)).resolves.toBytesEqual(Buffer.from([]));
            await expect(reader.isEnd()).resolves.toBeTrue();
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(42)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        requestedSize: 42,
                        offset: 0,
                        readedSize: 0,
                    },
                ]);
            }
        });
        it('multi chunk stream', async () => {
            const targetStream = stream.Readable.from((function*() {
                yield Buffer.from([0, 1]);
                yield Buffer.from([2, 3, 4]);
                yield Buffer.from([5, 6]);
                yield Buffer.from([7, 8]);
                yield Buffer.alloc(0);
                yield Buffer.from([9]);
            })());
            const reader = new StreamReader(builtin, targetStream);

            await expect(reader.read(2)).resolves.toBytesEqual(Buffer.from([0, 1]));
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(3)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        data: Buffer.from([0, 1]),
                        requestedSize: 3,
                        offset: 0,
                        readedSize: 2,
                    },
                    {
                        // chunks coming from the stream will not be merged
                        data: Buffer.from([2]),
                        requestedSize: 3,
                        offset: 0,
                        readedSize: 3,
                    },
                    {
                        requestedSize: 3,
                        offset: 0,
                        readedSize: 3,
                    },
                ]);
            }

            // the `read()` method merges the chunks as it reads them
            await expect(reader.read(3)).resolves.toBytesEqual(Buffer.from([3, 4, 5]));
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(999, 1)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        // chunks read by the `read()` method will be concatenated.
                        data: new Uint8Array([4, 5, 6]),
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 3,
                    },
                    {
                        data: Buffer.from([7, 8]),
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 5,
                    },
                    {
                        // data with zero length should not be ignored
                        data: Buffer.from([]),
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 5,
                    },
                    {
                        data: Buffer.from([9]),
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 6,
                    },
                    {
                        requestedSize: 999,
                        offset: 1,
                        readedSize: 6,
                    },
                ]);
            }

            await expect(reader.read(1)).resolves.toBytesEqual(Buffer.from([]));
            await expect(reader.isEnd()).resolves.toBeTrue();
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(42)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        requestedSize: 42,
                        offset: 0,
                        readedSize: 0,
                    },
                ]);
            }
        });
        it('should not copy chunks', async () => {
            const chunkSpyList = [
                spyObj(Buffer.from([9, 8, 7]), ['.then']),
                spyObj(Buffer.from([6, 5]), ['.then']),
                spyObj(Buffer.from([4]), ['.then']),
                spyObj(Buffer.from([3, 2, 1]), ['.then']),
                spyObj(Buffer.from([0]), ['.then']),
            ] as const;
            const reader = new StreamReader(builtin, chunkSpyList.map(({ value }) => value));

            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);
            expect(chunkSpyList[3].newCalls).toStrictEqual([]);
            expect(chunkSpyList[4].newCalls).toStrictEqual([]);

            for await (const _ of reader.readIterator(3));
            // StreamReader should not copy chunks
            expect(chunkSpyList[0].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '.buffer' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);
            expect(chunkSpyList[3].newCalls).toStrictEqual([]);
            expect(chunkSpyList[4].newCalls).toStrictEqual([]);

            for await (const _ of reader.readIterator(3));
            // StreamReader should not copy chunks
            expect(chunkSpyList[1].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '.buffer' },
            ]);
            expect(chunkSpyList[2].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '.buffer' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[3].newCalls).toStrictEqual([]);
            expect(chunkSpyList[4].newCalls).toStrictEqual([]);

            await reader.read(1, 3);
            chunkSpyList.forEach(({ newCalls }) => newCalls);

            for await (const _ of reader.readIterator(99));
            // StreamReader should not copy chunks
            expect(chunkSpyList[3].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '.buffer' },
            ]);
            expect(chunkSpyList[4].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '.buffer' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);
        });
    });
    describe('seek() method', () => {
        describe.each([
            ['non empty stream', [[9, 8, 7, 6, 5, 4]]],
            ['multi chunk stream', [[9, 8, 7, 6], [5, 4]]],
        ])('%s', (_, chunkList) => {
            describe('before read', () => {
                it.each([
                    ['first chunk', 1, [8, 7, 6]],
                    ['second chunk', 4, [5, 4]],
                    ['zero seek', 0, [9, 8, 7]],
                    ['over seek', 999, []],
                ])('%s', async (_, offset, expected) => {
                    const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                    const reader = new StreamReader(builtin, targetStream);

                    await reader.seek(offset);
                    await expect(reader.read(3, 0)).resolves
                        .toBytesEqual(Buffer.from(expected));
                });
            });
            describe('after read', () => {
                it.each([
                    ['first chunk', 1, [8, 7, 6]],
                    ['second chunk', 4, [5, 4]],
                    ['zero seek', 0, [9, 8, 7]],
                    ['over seek', 999, []],
                ])('%s', async (_, offset, expected) => {
                    const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                    const reader = new StreamReader(builtin, targetStream);

                    await expect(reader.read(3, 0)).resolves
                        .toBytesEqual(Buffer.from([9, 8, 7]));
                    await reader.seek(offset);
                    await expect(reader.read(3, 0)).resolves
                        .toBytesEqual(Buffer.from(expected));
                });
            });
        });
        it('should not copy chunks', async () => {
            const chunkSpyList = [
                spyObj(Buffer.from([9, 8, 7, 6, 5]), ['.then']),
                spyObj(Buffer.from([4, 3]), ['.then']),
                spyObj(Buffer.from([2, 1, 0]), ['.then']),
            ] as const;
            const reader = new StreamReader(builtin, chunkSpyList.map(({ value }) => value));

            // StreamReader should not touch any chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
            expect(chunkSpyList[2].newCalls).toStrictEqual([]);

            await reader.seek(3);
            {
                const newCalls0 = chunkSpyList[0].newCalls;
                // StreamReader should not copy chunks
                expect(newCalls0).not.toIncludeAnyMembers<SpyObjCallItem>([
                    { type: 'get', path: '[0]' },
                    { type: 'get', path: '[1]' },
                    { type: 'get', path: '[2]' },
                    { type: 'get', path: '[3]' },
                    { type: 'get', path: '[4]' },
                    { type: 'get', path: '.buffer' },
                ]);
                expect(newCalls0).toIncludeAllMembers<SpyObjCallItem>([
                    { type: 'apply', path: '.subarray(3)' },
                ]);
                // StreamReader should not touch other chunks
                expect(chunkSpyList[1].newCalls).toStrictEqual([]);
                expect(chunkSpyList[2].newCalls).toStrictEqual([]);
            }

            await reader.seek(3);
            {
                const newCalls1 = chunkSpyList[1].newCalls;
                // StreamReader should not copy chunks
                expect(newCalls1).not.toIncludeAnyMembers<SpyObjCallItem>([
                    { type: 'get', path: '[0]' },
                    { type: 'get', path: '[1]' },
                    { type: 'get', path: '.buffer' },
                ]);
                expect(newCalls1).toIncludeAllMembers<SpyObjCallItem>([
                    { type: 'apply', path: '.subarray(1)' },
                ]);
                // StreamReader should not touch other chunks
                expect(chunkSpyList[0].newCalls).toStrictEqual([]);
                expect(chunkSpyList[2].newCalls).toStrictEqual([]);
            }

            await reader.seek(999);
            // StreamReader should not copy chunks
            expect(chunkSpyList[2].newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '.buffer' },
                { type: 'get', path: '.subarray' },
            ]);
            // StreamReader should not touch other chunks
            expect(chunkSpyList[0].newCalls).toStrictEqual([]);
            expect(chunkSpyList[1].newCalls).toStrictEqual([]);
        });
    });
    describe('isEnd() method', () => {
        it('empty stream', async () => {
            const targetStream = stream.Readable.from([]);
            const reader = new StreamReader(builtin, targetStream);

            await expect(reader.isEnd()).resolves.toBeTrue();
        });
        it('non empty stream', async () => {
            const targetStream = stream.Readable.from([Buffer.alloc(1)]);
            const reader = new StreamReader(builtin, targetStream);

            await expect(reader.isEnd()).resolves.toBeFalse();

            await reader.read(1);
            await expect(reader.isEnd()).resolves.toBeFalse();

            await reader.seek(1);
            await expect(reader.isEnd()).resolves.toBeTrue();
        });
        it('should not copy chunks', async () => {
            const chunkSpy = spyObj(Buffer.from([4, 2, 3, 7, 1, 9]), ['.then']);
            const reader = new StreamReader(builtin, [chunkSpy.value]);

            // StreamReader should not touch any chunks
            expect(chunkSpy.newCalls).toStrictEqual([]);

            await expect(reader.isEnd()).resolves.toBeFalse();
            // StreamReader should not copy chunks
            expect(chunkSpy.newCalls).not.toIncludeAnyMembers<SpyObjCallItem>([
                { type: 'get', path: '[0]' },
                { type: 'get', path: '[1]' },
                { type: 'get', path: '[2]' },
                { type: 'get', path: '.buffer' },
                { type: 'get', path: '.subarray' },
            ]);
        });
    });
});
