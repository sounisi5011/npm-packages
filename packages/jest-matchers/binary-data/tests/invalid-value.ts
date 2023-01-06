import '../src';

import ansiEscapesSerializer from 'jest-serializer-ansi-escapes';

import * as matcherList from '../src/matchers';

expect.addSnapshotSerializer(ansiEscapesSerializer);

const invalidValueList = [
    undefined,
    null,

    /* boolean */
    true,
    false,

    /* number */
    // negative numbers
    -0,
    -1,
    // non finite number
    NaN,
    Infinity,
    -Infinity,
    // non integer
    0.1,

    /* string */
    '',
    'foo',
    '42',

    /* bigint */
    // negative numbers
    BigInt(-1),

    /* symbol */
    Symbol('vore'),

    /* object */
    {},
    [],
    /bar/,

    /* function */
    () => null,
];
const invalidValuePairList = invalidValueList.map(value => [value, value] as const);

const matcherNameList = Reflect.ownKeys(matcherList)
    .filter((key): key is keyof typeof matcherList => (
        // @ts-expect-error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Expect'.
        typeof expect[key] === 'function'
    ));

describe.each(matcherNameList)('.%s()', matcherName => {
    describe('invalid type actual', () => {
        const expectedValue = new Uint8Array();
        it.each(invalidValueList)(`expect(actual = %p).${matcherName}(…)`, actual => {
            expect(() => {
                expect(actual)[matcherName](expectedValue);
            }).toThrowErrorMatchingSnapshot();
        });
        it.each(invalidValueList)(`expect(actual = %p).not.${matcherName}(…)`, actual => {
            expect(() => {
                expect(actual).not[matcherName](expectedValue);
            }).toThrowErrorMatchingSnapshot();
        });
    });
    describe('invalid type expected', () => {
        const actualValue = new Uint8Array();
        it.each(invalidValueList)(`expect(…).${matcherName}(expected = %p)`, expected => {
            expect(() => {
                expect(actualValue)[matcherName](
                    // @ts-expect-error TS2345: Argument of type '{} | null | undefined' is not assignable to parameter of type 'BytesData'.
                    expected,
                );
            }).toThrowErrorMatchingSnapshot();
        });
        it.each(invalidValueList)(`expect(…).not.${matcherName}(expected = %p)`, expected => {
            expect(() => {
                expect(actualValue).not[matcherName](
                    // @ts-expect-error TS2345: Argument of type '{} | null | undefined' is not assignable to parameter of type 'BytesData'.
                    expected,
                );
            }).toThrowErrorMatchingSnapshot();
        });
    });
    describe('invalid type actual & expected', () => {
        it.each(invalidValuePairList)(`expect(actual = %p).${matcherName}(expected = %p)`, (actual, expected) => {
            expect(() => {
                expect(actual)[matcherName](
                    // @ts-expect-error TS2345: Argument of type '{} | null | undefined' is not assignable to parameter of type 'BytesData'.
                    expected,
                );
            }).toThrowErrorMatchingSnapshot();
        });
        it.each(invalidValuePairList)(`expect(actual = %p).not.${matcherName}(expected = %p)`, (actual, expected) => {
            expect(() => {
                expect(actual).not[matcherName](
                    // @ts-expect-error TS2345: Argument of type '{} | null | undefined' is not assignable to parameter of type 'BytesData'.
                    expected,
                );
            }).toThrowErrorMatchingSnapshot();
        });
    });
});
