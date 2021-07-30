import { EXPECTED_COLOR, matcherHint, RECEIVED_COLOR } from 'jest-matcher-utils';

import { byteSize, toMessageFn } from './utils';
import { ensureByteSize } from './utils/jest';

function compareByteSize(
    context: jest.MatcherContext,
    opts: {
        matcherName: string;
        operator?: string;
        passFn: (arg: {
            expected: number | bigint;
            received: number | bigint;
        }) => boolean;
        received: unknown;
        expected: number | bigint;
    },
): jest.CustomMatcherResult {
    const isNot = context.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: context.promise,
    };

    const { matcherName, received, expected } = opts;
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
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L74-L125
 */
export function toBeByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    return compareByteSize(this, {
        matcherName: toBeByteSize.name,
        passFn: ({ expected, received }) => received == expected, // eslint-disable-line eqeqeq
        received,
        expected,
    });
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 */
export function toBeGreaterThanByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    return compareByteSize(this, {
        matcherName: toBeGreaterThanByteSize.name,
        operator: '>',
        passFn: ({ expected, received }) => received > expected,
        received,
        expected,
    });
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L258-L280
 */
export function toBeGreaterThanOrEqualByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    return compareByteSize(this, {
        matcherName: toBeGreaterThanOrEqualByteSize.name,
        operator: '>=',
        passFn: ({ expected, received }) => received >= expected,
        received,
        expected,
    });
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L332-L354
 */
export function toBeLessThanByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    return compareByteSize(this, {
        matcherName: toBeLessThanByteSize.name,
        operator: '<',
        passFn: ({ expected, received }) => received < expected,
        received,
        expected,
    });
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L356-L378
 */
export function toBeLessThanOrEqualByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    return compareByteSize(this, {
        matcherName: toBeLessThanOrEqualByteSize.name,
        operator: '<=',
        passFn: ({ expected, received }) => received <= expected,
        received,
        expected,
    });
}
