import { isPropertyAccessible } from '../src';

const numList = [0, -0, 1, -1];
const anyValues: ReadonlyArray<
    undefined | null | boolean | number | bigint | string | Record<PropertyKey, unknown> | unknown[]
> = [
    undefined,
    null,
    true,
    false,
    ...numList,
    // eslint-disable-next-line node/no-unsupported-features/es-builtins
    ...(typeof BigInt === 'function' ? numList.map(v => BigInt(v)) : []),
    NaN,
    Infinity,
    -Infinity,
    '',
    'foo',
    {},
    [],
    Object.create(null),
    /(?:)/,
];

describe('isPropertyAccessible()', () => {
    describe('accessible', () => {
        it.each(anyValues.filter(isPropertyAccessible))('%p', value => {
            // eslint-disable-next-line @typescript-eslint/dot-notation
            expect(() => value['foo']).not.toThrow();
        });
    });
    describe('not accessible', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        it.each(anyValues.filter(v => !isPropertyAccessible(v)))('%p', (value: any) => {
            expect(() => value.foo).toThrow(TypeError);
            // Starting with Node.js 16.9.0, the format of error messages has been changed
            expect(() => value.foo).toThrow(/^Cannot read property 'foo'|^Cannot read properties .*\(reading 'foo'\)$/);
        });
    });
});
