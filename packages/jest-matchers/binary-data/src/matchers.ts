import { EXPECTED_COLOR, matcherHint, RECEIVED_COLOR } from 'jest-matcher-utils';

import { byteSize, toMessageFn } from './utils';
import { ensureByteSize } from './utils/jest';

function createCompareByteSizeMatcher(
    opts: {
        matcherName: string;
        operator?: string;
        passFn: (arg: {
            expected: number | bigint;
            received: number | bigint;
        }) => boolean;
    },
) {
    /**
     * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
     */
    return function(
        this: jest.MatcherContext,
        received: unknown,
        expected: number | bigint,
    ): jest.CustomMatcherResult {
        const isNot = this.isNot;
        const options: jest.MatcherHintOptions = {
            isNot,
            promise: this.promise,
        };

        const { matcherName } = opts;
        ensureByteSize(received, expected, matcherName, options);

        const operator: string = opts.operator ? ` ${opts.operator}` : '';
        const opIndent = ' '.repeat(operator.length);
        return {
            message: toMessageFn(() => [
                matcherHint(matcherName, undefined, undefined, options),
                ``,
                `Expected:${isNot ? ' not' : ''}${operator} ${EXPECTED_COLOR(byteSize(expected))}`,
                `Received:${isNot ? '    ' : ''}${opIndent} ${RECEIVED_COLOR(byteSize(received))}`,
            ]),
            pass: opts.passFn({ expected, received }),
        };
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L74-L125
 */
export const toBeByteSize = createCompareByteSizeMatcher({
    matcherName: 'toBeByteSize',
    passFn: ({ expected, received }) => received == expected, // eslint-disable-line eqeqeq
});

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 */
export const toBeGreaterThanByteSize = createCompareByteSizeMatcher({
    matcherName: 'toBeGreaterThanByteSize',
    operator: '>',
    passFn: ({ expected, received }) => received > expected,
});

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L258-L280
 */
export const toBeGreaterThanOrEqualByteSize = createCompareByteSizeMatcher({
    matcherName: 'toBeGreaterThanOrEqualByteSize',
    operator: '>=',
    passFn: ({ expected, received }) => received >= expected,
});

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L332-L354
 */
export const toBeLessThanByteSize = createCompareByteSizeMatcher({
    matcherName: 'toBeLessThanByteSize',
    operator: '<',
    passFn: ({ expected, received }) => received < expected,
});

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L356-L378
 */
export const toBeLessThanOrEqualByteSize = createCompareByteSizeMatcher({
    matcherName: 'toBeLessThanOrEqualByteSize',
    operator: '<=',
    passFn: ({ expected, received }) => received <= expected,
});
