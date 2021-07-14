import '../src';

import { plugins as prettyFormatPlugins } from 'pretty-format';

expect.addSnapshotSerializer(prettyFormatPlugins.ConvertAnsi);

const byteSizeList: number[] = [0, 1, 2 ** 10, 2 ** 20, 2 ** 30, 2 ** 40, 2 ** 50];

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
    describe('{pass: true}', () => {
        const cases = toIntAndBigintCases(byteSizeList.map(v => [v, v]));
        it.each(cases)('expect(actual = %p).toBeByteSize(expected = %p)', (actual, expected) => {
            expect(actual).toBeByteSize(expected);
        });
        it.each(cases)('expect(actual = %p).not.toBeByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).not.toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
    });

    describe('{pass: false}', () => {
        const cases = toIntAndBigintCases(
            byteSizeList
                .flatMap(v1 =>
                    byteSizeList
                        .filter(v2 => v1 !== v2)
                        .map(v2 => [v1, v2])
                ),
        );
        it.each(cases)('expect(actual = %p).not.toBeByteSize(expected = %p)', (actual, expected) => {
            expect(actual).not.toBeByteSize(expected);
        });
        it.each(cases)('expect(actual = %p).toBeByteSize(expected = %p)', (actual, expected) => {
            expect(() => expect(actual).toBeByteSize(expected)).toThrowErrorMatchingSnapshot();
        });
    });
});
