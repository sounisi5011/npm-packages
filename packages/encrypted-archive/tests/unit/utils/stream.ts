import * as stream from 'stream';

import { StreamReader } from '../../../src/utils/stream';

describe('class StreamReader', () => {
    describe('read() method', () => {
        it('empty stream', async () => {
            // eslint-disable-next-line node/no-unsupported-features/node-builtins
            const targetStream = stream.Readable.from([]);
            const reader = new StreamReader(targetStream);
            await expect(reader.read(1)).resolves
                .toStrictEqual(Buffer.from([]));
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
                // eslint-disable-next-line node/no-unsupported-features/node-builtins
                const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                const reader = new StreamReader(targetStream);

                const expectedBuffer = Buffer.from(expected);
                if (input.offset === undefined) {
                    // eslint-disable-next-line jest/no-conditional-expect
                    await expect(reader.read(input.size)).resolves
                        .toStrictEqual(expectedBuffer);
                }
                await expect(reader.read(input.size, input.offset)).resolves
                    .toStrictEqual(expectedBuffer);
            });
        });
        it('multi read', async () => {
            const chunkList = [
                [0, 1, 2, 3],
                [4],
                [5, 6, 7, 8],
            ];

            let readCount = 0;
            // eslint-disable-next-line node/no-unsupported-features/node-builtins
            const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)))
                .on('data', () => {
                    readCount++;
                });
            const reader = new StreamReader(targetStream);

            expect(readCount).toBe(0);

            await expect(reader.read(0)).resolves
                .toStrictEqual(Buffer.from([]));
            expect(readCount).toBe(0);

            await expect(reader.read(1)).resolves
                .toStrictEqual(Buffer.from([0]));
            expect(readCount).toBe(1);

            await expect(reader.read(4)).resolves
                .toStrictEqual(Buffer.from([0, 1, 2, 3]));
            expect(readCount).toBe(1);

            await expect(reader.read(5)).resolves
                .toStrictEqual(Buffer.from([0, 1, 2, 3, 4]));
            expect(readCount).toBe(2);

            await expect(reader.read(4)).resolves
                .toStrictEqual(Buffer.from([0, 1, 2, 3]));
            expect(readCount).toBe(2);

            await expect(reader.read(2, 3)).resolves
                .toStrictEqual(Buffer.from([3, 4]));
            expect(readCount).toBe(2);

            await expect(reader.read(2, 4)).resolves
                .toStrictEqual(Buffer.from([4, 5]));
            expect(readCount).toBe(3);

            await expect(reader.read(10, 4)).resolves
                .toStrictEqual(Buffer.from([4, 5, 6, 7, 8]));
            expect(readCount).toBe(3);
        });
    });
    describe('readIterator() method', () => {
        interface ReadEntry {
            data?: Buffer | undefined;
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
                const reader = new StreamReader(targetStream);

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
            const reader = new StreamReader(targetStream);

            await expect(reader.read(2)).resolves.toStrictEqual(Buffer.from([0, 1]));
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
            await expect(reader.read(2)).resolves.toStrictEqual(Buffer.from([3, 4]));
            await expect(reader.isEnd()).resolves.toBeFalse();

            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(999, 1)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        data: Buffer.from([4, 5, 6, 7, 8, 9]),
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

            await expect(reader.read(1)).resolves.toStrictEqual(Buffer.from([]));
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
            const reader = new StreamReader(targetStream);

            await expect(reader.read(2)).resolves.toStrictEqual(Buffer.from([0, 1]));
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
            await expect(reader.read(3)).resolves.toStrictEqual(Buffer.from([3, 4, 5]));
            {
                const entryList: ReadEntry[] = [];
                for await (const entry of reader.readIterator(999, 1)) {
                    entryList.push(entry);
                }
                expect(entryList).toStrictEqual([
                    {
                        // chunks read by the `read()` method will be concatenated.
                        data: Buffer.from([4, 5, 6]),
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

            await expect(reader.read(1)).resolves.toStrictEqual(Buffer.from([]));
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
                    // eslint-disable-next-line node/no-unsupported-features/node-builtins
                    const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                    const reader = new StreamReader(targetStream);

                    await reader.seek(offset);
                    await expect(reader.read(3, 0)).resolves
                        .toStrictEqual(Buffer.from(expected));
                });
            });
            describe('after read', () => {
                it.each([
                    ['first chunk', 1, [8, 7, 6]],
                    ['second chunk', 4, [5, 4]],
                    ['zero seek', 0, [9, 8, 7]],
                    ['over seek', 999, []],
                ])('%s', async (_, offset, expected) => {
                    // eslint-disable-next-line node/no-unsupported-features/node-builtins
                    const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                    const reader = new StreamReader(targetStream);

                    await expect(reader.read(3, 0)).resolves
                        .toStrictEqual(Buffer.from([9, 8, 7]));
                    await reader.seek(offset);
                    await expect(reader.read(3, 0)).resolves
                        .toStrictEqual(Buffer.from(expected));
                });
            });
        });
    });
    describe('isEnd() method', () => {
        it('empty stream', async () => {
            // eslint-disable-next-line node/no-unsupported-features/node-builtins
            const targetStream = stream.Readable.from([]);
            const reader = new StreamReader(targetStream);

            await expect(reader.isEnd()).resolves.toBeTrue();
        });
        it('non empty stream', async () => {
            // eslint-disable-next-line node/no-unsupported-features/node-builtins
            const targetStream = stream.Readable.from([Buffer.alloc(1)]);
            const reader = new StreamReader(targetStream);

            await expect(reader.isEnd()).resolves.toBeFalse();

            await reader.read(1);
            await expect(reader.isEnd()).resolves.toBeFalse();

            await reader.seek(1);
            await expect(reader.isEnd()).resolves.toBeTrue();
        });
    });
});
