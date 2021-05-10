import * as stream from 'stream';

import { StreamReader } from '../../../src/utils/stream';

describe('class StreamReader', () => {
    describe('read() method', () => {
        it('empty stream', async () => {
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
                const targetStream = stream.Readable.from(chunkList.map(chunkData => Buffer.from(chunkData)));
                const reader = new StreamReader(targetStream);

                const expectedBuffer = Buffer.from(expected);
                if (input.offset === undefined) {
                    await expect(reader.read(input.size)).resolves
                        .toStrictEqual(expectedBuffer);
                }
                await expect(reader.read(input.size, input.offset)).resolves
                    .toStrictEqual(expectedBuffer);
            });
        });
        it('multi read', async () => {
            let readCount = 0;
            const gen = function*(): Generator<Buffer> {
                const chunkList = [
                    [0, 1, 2, 3],
                    [4],
                    [5, 6, 7, 8],
                ];
                for (const chunkData of chunkList) {
                    yield Buffer.from(chunkData);
                    readCount++;
                }
            };
            const targetStream = stream.Readable.from(gen());
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
            const targetStream = stream.Readable.from([]);
            const reader = new StreamReader(targetStream);

            await expect(reader.isEnd()).resolves.toBeTrue();
        });
        it('non empty stream', async () => {
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
