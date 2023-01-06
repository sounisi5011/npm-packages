import * as varint from 'varint';

import { readVarint } from '../../../src/core/header/utils';
import { padStartArray } from '../../helpers';
import { DummyBufferReader } from '../../helpers/stream';

describe('readVarint()', () => {
    type ResultType = Awaited<ReturnType<typeof readVarint>>;
    const passthroughError = (error: unknown): Error =>
        error instanceof Error
            ? error
            : new Error('hoge fuga');

    it.each([
        ['00'],
        ['0A'],
        ['10'],
        ['0100'],
        ['1000'],
        ['010000'],
        ['100000'],
    ])('read 0x%s', async codeStr => {
        const codeInt = Number.parseInt(codeStr, 16);
        const reader = new DummyBufferReader(
            new Uint8Array(
                varint.encode(codeInt),
            ),
        );
        const byteLength = varint.encodingLength(codeInt);

        const result = readVarint(reader, passthroughError);
        await expect(result).resolves.toStrictEqual<ResultType>({
            value: codeInt,
            byteLength,
            endOffset: 0 + byteLength,
        });
    });
    it.each([
        ['zero length data', Buffer.from([])],
        ['maximum of 9 bytes data', Buffer.from(padStartArray([0x00], 9, 0xFF))],
    ])('%s', async (_, data) => {
        const reader = new DummyBufferReader(data);

        const result = readVarint(reader, passthroughError);
        await expect(result).rejects.toThrowWithMessage(
            RangeError,
            'Could not decode varint',
        );
    });
    it('different offsets', async () => {
        const reader = new DummyBufferReader(
            new Uint8Array([
                0b01100101,
                0b01001000,
                0b10011011,
                0b11100001,
                0b00000001,
            ]),
        );

        await expect(readVarint(reader, passthroughError, { offset: 0 })).resolves.toStrictEqual<ResultType>({
            value: 0b1100101 << 7 * 0,
            byteLength: 1,
            endOffset: 0 + 1,
        });
        await expect(readVarint(reader, passthroughError, { offset: 1 })).resolves.toStrictEqual<ResultType>({
            value: 0b1001000 << 7 * 0,
            byteLength: 1,
            endOffset: 1 + 1,
        });
        await expect(readVarint(reader, passthroughError, { offset: 2 })).resolves.toStrictEqual<ResultType>({
            value: 0b0011011 << 7 * 0 | 0b1100001 << 7 * 1 | 0b0000001 << 7 * 2,
            byteLength: 3,
            endOffset: 2 + 3,
        });
        await expect(readVarint(reader, passthroughError, { offset: 3 })).resolves.toStrictEqual<ResultType>({
            value: 0b1100001 << 7 * 0 | 0b0000001 << 7 * 1,
            byteLength: 2,
            endOffset: 3 + 2,
        });
        await expect(readVarint(reader, passthroughError, { offset: 4 })).resolves.toStrictEqual<ResultType>({
            value: 0b0000001 << 7 * 0,
            byteLength: 1,
            endOffset: 4 + 1,
        });
    });
    it('offset out of range', async () => {
        const reader = new DummyBufferReader(new Uint8Array(3));

        await expect(readVarint(reader, passthroughError, { offset: 0 })).toResolve();
        await expect(readVarint(reader, passthroughError, { offset: 1 })).toResolve();
        await expect(readVarint(reader, passthroughError, { offset: 2 })).toResolve();
        await expect(readVarint(reader, passthroughError, { offset: 3 })).rejects.toThrowWithMessage(
            RangeError,
            'Could not decode varint',
        );
        await expect(readVarint(reader, passthroughError, { offset: 87 })).rejects.toThrowWithMessage(
            RangeError,
            'Could not decode varint',
        );
    });
});
