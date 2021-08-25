import '../src';

import { plugins as prettyFormatPlugins } from 'pretty-format';

import { createTupleArray, getBytesDataList, getTypedArrayList, toIntAndBigintCases, unshiftInspect } from './helpers';

expect.addSnapshotSerializer(prettyFormatPlugins.ConvertAnsi);

{
    const byteSizeList: number[] = [0, 1, 2 ** 10, 2 ** 20, 2 ** 30, 2 ** 40, 2 ** 50];
    const byteSizeSameCases = toIntAndBigintCases([
        ...byteSizeList.map(v => [v, v] as const),
        ...[0, 8].flatMap(len => {
            const bytesList = getBytesDataList(len);
            return [
                ...bytesList.map(byte => [len, byte] as const),
                ...bytesList.map(byte => [byte, len] as const),
            ];
        }),
    ]);
    const byteSizeDiffCases = toIntAndBigintCases(
        byteSizeList
            .flatMap(v1 =>
                byteSizeList
                    .filter(v2 => v1 !== v2)
                    .map(v2 => [v1, v2])
            ),
    );

    describe('.toBeByteSize()', () => {
        describe('pass', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).toBeByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).toBeByteSize(expected);
                },
            );
            it.each(unshiftInspect(byteSizeDiffCases))(
                'expect(actual = %s).not.toBeByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).not.toBeByteSize(expected);
                },
            );
        });

        describe('fail', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).not.toBeByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).not.toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(byteSizeDiffCases))(
                'expect(actual = %s).toBeByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
                },
            );
        });
    });

    const smallAndBigCases = toIntAndBigintCases([
        [1, 2],
        [2 ** 10 - 1, 2 ** 10],
        [2 ** 20 - 1, 2 ** 20],
        [2 ** 30 - 1, 2 ** 30],
        [2 ** 40 - 1, 2 ** 40],
        [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER],
        ...getBytesDataList(0).map(byte => [byte, 1] as const),
        ...getBytesDataList(8).map(byte => [6, byte] as const),
        ...(() => {
            const bigByteList = getBytesDataList(16);
            return getBytesDataList(8)
                .flatMap(smallByte =>
                    bigByteList
                        .map(bigByte => [smallByte, bigByte] as const)
                );
        })(),
    ]);
    const bigAndSmallCases = smallAndBigCases.map(([small, big]) => [big, small] as const);

    describe('.toBeGreaterThanByteSize()', () => {
        describe('pass', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).not.toBeGreaterThanByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).not.toBeGreaterThanByteSize(expected);
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).toBeGreaterThanByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(big).toBeGreaterThanByteSize(small);
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).not.toBeGreaterThanByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(small).not.toBeGreaterThanByteSize(big);
                },
            );
        });

        describe('fail', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).toBeGreaterThanByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).toBeGreaterThanByteSize(expected)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).not.toBeGreaterThanByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(() => expect(big).not.toBeGreaterThanByteSize(small)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).toBeGreaterThanByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(() => expect(small).toBeGreaterThanByteSize(big)).toThrowErrorMatchingSnapshot();
                },
            );
        });
    });

    describe('.toBeGreaterThanOrEqualByteSize()', () => {
        describe('pass', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).toBeGreaterThanOrEqualByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).toBeGreaterThanOrEqualByteSize(expected);
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).toBeGreaterThanOrEqualByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(big).toBeGreaterThanOrEqualByteSize(small);
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).not.toBeGreaterThanOrEqualByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(small).not.toBeGreaterThanOrEqualByteSize(big);
                },
            );
        });

        describe('fail', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).not.toBeGreaterThanOrEqualByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).not.toBeGreaterThanOrEqualByteSize(expected))
                        .toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).not.toBeGreaterThanOrEqualByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(() => expect(big).not.toBeGreaterThanOrEqualByteSize(small)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).toBeGreaterThanOrEqualByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(() => expect(small).toBeGreaterThanOrEqualByteSize(big)).toThrowErrorMatchingSnapshot();
                },
            );
        });
    });

    describe('.toBeLessThanByteSize()', () => {
        describe('pass', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).not.toBeLessThanByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).not.toBeLessThanByteSize(expected);
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).toBeLessThanByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(small).toBeLessThanByteSize(big);
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).not.toBeLessThanByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(big).not.toBeLessThanByteSize(small);
                },
            );
        });

        describe('fail', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).toBeLessThanByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).toBeLessThanByteSize(expected)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).not.toBeLessThanByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(() => expect(small).not.toBeLessThanByteSize(big)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).toBeLessThanByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(() => expect(big).toBeLessThanByteSize(small)).toThrowErrorMatchingSnapshot();
                },
            );
        });
    });

    describe('.toBeLessThanOrEqualByteSize()', () => {
        describe('pass', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).toBeLessThanOrEqualByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(actual).toBeLessThanOrEqualByteSize(expected);
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).toBeLessThanOrEqualByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(small).toBeLessThanOrEqualByteSize(big);
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).not.toBeLessThanOrEqualByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(big).not.toBeLessThanOrEqualByteSize(small);
                },
            );
        });

        describe('fail', () => {
            it.each(unshiftInspect(byteSizeSameCases))(
                'expect(actual = %s).not.toBeLessThanOrEqualByteSize(expected = %s)',
                (_1, _2, actual, expected) => {
                    expect(() => expect(actual).not.toBeLessThanOrEqualByteSize(expected))
                        .toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(smallAndBigCases))(
                'expect(small = %s).not.toBeLessThanOrEqualByteSize(big = %s)',
                (_1, _2, small, big) => {
                    expect(() => expect(small).not.toBeLessThanOrEqualByteSize(big)).toThrowErrorMatchingSnapshot();
                },
            );
            it.each(unshiftInspect(bigAndSmallCases))(
                'expect(big = %s).toBeLessThanOrEqualByteSize(small = %s)',
                (_1, _2, big, small) => {
                    expect(() => expect(big).toBeLessThanOrEqualByteSize(small)).toThrowErrorMatchingSnapshot();
                },
            );
        });
    });
}

describe('.toBytesEqual()', () => {
    const cases1 = ((): Array<ArrayBuffer | DataView | NodeJS.TypedArray | Buffer> => {
        const arrayBuffer = new ArrayBuffer(16);
        const dataView = new DataView(arrayBuffer);
        const typedArrayList = getTypedArrayList(arrayBuffer);
        dataView.setFloat64(0, 0.01);
        return [arrayBuffer, dataView, ...typedArrayList];
    })();
    const cases2 = ((): Array<ArrayBuffer | DataView | NodeJS.TypedArray | Buffer> => {
        const arrayBuffer = new ArrayBuffer(16);
        const dataView = new DataView(arrayBuffer);
        const typedArrayList = getTypedArrayList(arrayBuffer);
        dataView.setFloat64(1, 0.02);
        return [arrayBuffer, dataView, ...typedArrayList];
    })();

    const sameCases = unshiftInspect(
        cases1.flatMap(actual =>
            cases1
                .map(expected => createTupleArray(actual, expected))
        ),
    );
    const diffCases = unshiftInspect(
        cases1.flatMap(actual =>
            cases2
                .map(expected => createTupleArray(actual, expected))
        ),
    );

    describe('pass', () => {
        it.each(sameCases)('expect(actual = %s).toBytesEqual(expected = %s)', (_1, _2, actual, expected) => {
            expect(actual).toBytesEqual(expected);
        });
        it.each(diffCases)('expect(actual = %s).not.toBytesEqual(expected = %s)', (_1, _2, actual, expected) => {
            expect(actual).not.toBytesEqual(expected);
        });
    });

    describe('fail', () => {
        it.each(sameCases)('expect(actual = %s).not.toBytesEqual(expected = %s)', (_1, _2, actual, expected) => {
            expect(() => expect(actual).not.toBytesEqual(expected)).toThrowErrorMatchingSnapshot();
        });
        it.each(diffCases)('expect(actual = %s).toBytesEqual(expected = %s)', (_1, _2, actual, expected) => {
            expect(() => expect(actual).toBytesEqual(expected)).toThrowErrorMatchingSnapshot();
        });
    });
});
