import '../src';

import { plugins as prettyFormatPlugins } from 'pretty-format';

expect.addSnapshotSerializer(prettyFormatPlugins.ConvertAnsi);

const byteSizeList: number[] = [0, 1, 2 ** 10, 2 ** 20, 2 ** 30, 2 ** 40, 2 ** 50];
const sameCases = toIntAndBigintCases(byteSizeList.map(v => [v, v]));
const diffCases = toIntAndBigintCases(
    byteSizeList
        .flatMap(v1 =>
            byteSizeList
                .filter(v2 => v1 !== v2)
                .map(v2 => [v1, v2])
        ),
);
const smallAndBigCases = toIntAndBigintCases([
    [1, 2],
    [2 ** 10 - 1, 2 ** 10],
    [2 ** 20 - 1, 2 ** 20],
    [2 ** 30 - 1, 2 ** 30],
    [2 ** 40 - 1, 2 ** 40],
    [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER],
]);
const bigAndSmallCases = smallAndBigCases.map(([small, big]) => [big, small] as const);

function toIntAndBigintCases<TActual, TExpected>(
    cases: ReadonlyArray<readonly [TActual, TExpected]>,
): Array<[TActual | bigint, TExpected | bigint]> {
    return cases.flatMap(([v1, v2]) => {
        const newCases: Array<[TActual | bigint, TExpected | bigint]> = [
            [v1, v2],
        ];
        if (typeof v1 === 'number') newCases.push([BigInt(v1), v2]);
        if (typeof v2 === 'number') newCases.push([v1, BigInt(v2)]);
        if (typeof v1 === 'number' && typeof v2 === 'number') newCases.push([BigInt(v1), BigInt(v2)]);
        return newCases;
    });
}

describe('.toBeByteSize()', () => {
    describe('pass', () => {
        it.each(sameCases)('expect(actual = %p).toBeByteSize(expected = %p)', (actual, expected) => {
            expect(actual).toBeByteSize(expected);
        });
        it.each(diffCases)('expect(actual = %p).not.toBeByteSize(expected = %p)', (actual, expected) => {
            expect(actual).not.toBeByteSize(expected);
        });
    });

    describe('fail', () => {
        it.each(sameCases)('expect(actual = %p).not.toBeByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).not.toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
        it.each(diffCases)('expect(actual = %p).toBeByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
    });
});

describe('.toBeGreaterThanByteSize()', () => {
    describe('pass', () => {
        it.each(sameCases)('expect(actual = %p).not.toBeGreaterThanByteSize(expected = %p)', (actual, expected) => {
            expect(actual).not.toBeGreaterThanByteSize(expected);
        });
        it.each(bigAndSmallCases)('expect(big = %p).toBeGreaterThanByteSize(small = %p)', (big, small) => {
            expect(big).toBeGreaterThanByteSize(small);
        });
        it.each(smallAndBigCases)('expect(small = %p).not.toBeGreaterThanByteSize(big = %p)', (small, big) => {
            expect(small).not.toBeGreaterThanByteSize(big);
        });
    });

    describe('fail', () => {
        it.each(sameCases)('expect(actual = %p).toBeGreaterThanByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).toBeGreaterThanByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
        it.each(bigAndSmallCases)('expect(big = %p).not.toBeGreaterThanByteSize(small = %p)', (big, small) => {
            expect(() => expect(big).not.toBeGreaterThanByteSize(small)).toThrowErrorMatchingSnapshot();
        });
        it.each(smallAndBigCases)('expect(small = %p).toBeGreaterThanByteSize(big = %p)', (small, big) => {
            expect(() => expect(small).toBeGreaterThanByteSize(big)).toThrowErrorMatchingSnapshot();
        });
    });
});

describe('.toBeGreaterThanOrEqualByteSize()', () => {
    describe('pass', () => {
        it.each(sameCases)('expect(actual = %p).toBeGreaterThanOrEqualByteSize(expected = %p)', (actual, expected) => {
            expect(actual).toBeGreaterThanOrEqualByteSize(expected);
        });
        it.each(bigAndSmallCases)('expect(big = %p).toBeGreaterThanOrEqualByteSize(small = %p)', (big, small) => {
            expect(big).toBeGreaterThanOrEqualByteSize(small);
        });
        it.each(smallAndBigCases)('expect(small = %p).not.toBeGreaterThanOrEqualByteSize(big = %p)', (small, big) => {
            expect(small).not.toBeGreaterThanOrEqualByteSize(big);
        });
    });

    describe('fail', () => {
        it.each(sameCases)(
            'expect(actual = %p).not.toBeGreaterThanOrEqualByteSize(expected = %p)',
            (actual, expected) => {
                expect(() => expect(actual).not.toBeGreaterThanOrEqualByteSize(expected))
                    .toThrowErrorMatchingSnapshot();
            },
        );
        it.each(bigAndSmallCases)('expect(big = %p).not.toBeGreaterThanOrEqualByteSize(small = %p)', (big, small) => {
            expect(() => expect(big).not.toBeGreaterThanOrEqualByteSize(small)).toThrowErrorMatchingSnapshot();
        });
        it.each(smallAndBigCases)('expect(small = %p).toBeGreaterThanOrEqualByteSize(big = %p)', (small, big) => {
            expect(() => expect(small).toBeGreaterThanOrEqualByteSize(big)).toThrowErrorMatchingSnapshot();
        });
    });
});

describe('.toBeLessThanByteSize()', () => {
    describe('pass', () => {
        it.each(sameCases)('expect(actual = %p).not.toBeLessThanByteSize(expected = %p)', (actual, expected) => {
            expect(actual).not.toBeLessThanByteSize(expected);
        });
        it.each(smallAndBigCases)('expect(small = %p).toBeLessThanByteSize(big = %p)', (small, big) => {
            expect(small).toBeLessThanByteSize(big);
        });
        it.each(bigAndSmallCases)('expect(big = %p).not.toBeLessThanByteSize(small = %p)', (big, small) => {
            expect(big).not.toBeLessThanByteSize(small);
        });
    });

    describe('fail', () => {
        it.each(sameCases)('expect(actual = %p).toBeLessThanByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).toBeLessThanByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
        it.each(smallAndBigCases)('expect(small = %p).not.toBeLessThanByteSize(big = %p)', (small, big) => {
            expect(() => expect(small).not.toBeLessThanByteSize(big)).toThrowErrorMatchingSnapshot();
        });
        it.each(bigAndSmallCases)('expect(big = %p).toBeLessThanByteSize(small = %p)', (big, small) => {
            expect(() => expect(big).toBeLessThanByteSize(small)).toThrowErrorMatchingSnapshot();
        });
    });
});

describe('.toBeLessThanOrEqualByteSize()', () => {
    describe('pass', () => {
        it.each(sameCases)('expect(actual = %p).toBeLessThanOrEqualByteSize(expected = %p)', (actual, expected) => {
            expect(actual).toBeLessThanOrEqualByteSize(expected);
        });
        it.each(smallAndBigCases)('expect(small = %p).toBeLessThanOrEqualByteSize(big = %p)', (small, big) => {
            expect(small).toBeLessThanOrEqualByteSize(big);
        });
        it.each(bigAndSmallCases)('expect(big = %p).not.toBeLessThanOrEqualByteSize(small = %p)', (big, small) => {
            expect(big).not.toBeLessThanOrEqualByteSize(small);
        });
    });

    describe('fail', () => {
        it.each(sameCases)('expect(actual = %p).not.toBeLessThanOrEqualByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).not.toBeLessThanOrEqualByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
        it.each(smallAndBigCases)('expect(small = %p).not.toBeLessThanOrEqualByteSize(big = %p)', (small, big) => {
            expect(() => expect(small).not.toBeLessThanOrEqualByteSize(big)).toThrowErrorMatchingSnapshot();
        });
        it.each(bigAndSmallCases)('expect(big = %p).toBeLessThanOrEqualByteSize(small = %p)', (big, small) => {
            expect(() => expect(big).toBeLessThanOrEqualByteSize(small)).toThrowErrorMatchingSnapshot();
        });
    });
});
