import { ensureNumbers, EXPECTED_COLOR, matcherHint, RECEIVED_COLOR } from 'jest-matcher-utils';

import { byteSize, toMessageFn } from './utils';

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L74-L125
 */
export function toBeByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    const matcherName = toBeByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        message: toMessageFn(() => [
            matcherHint(matcherName, undefined, undefined, options),
            ``,
            `Expected:${isNot ? ' not' : ''} ${EXPECTED_COLOR(byteSize(expected))}`,
            `Received:${isNot ? '    ' : ''} ${RECEIVED_COLOR(byteSize(received))}`,
        ]),
        pass: received == expected, // eslint-disable-line eqeqeq
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
 */
export function toBeGreaterThanByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    const matcherName = toBeGreaterThanByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        pass: received > expected,
        message: toMessageFn(() => [
            matcherHint(matcherName, undefined, undefined, options),
            ``,
            `Expected:${isNot ? ' not' : ''} > ${EXPECTED_COLOR(byteSize(expected))}`,
            `Received:${isNot ? '    ' : ''}   ${RECEIVED_COLOR(byteSize(received))}`,
        ]),
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L258-L280
 */
export function toBeGreaterThanOrEqualByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    const matcherName = toBeGreaterThanOrEqualByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        pass: received >= expected,
        message: toMessageFn(() => [
            matcherHint(matcherName, undefined, undefined, options),
            ``,
            `Expected:${isNot ? ' not' : ''} >= ${EXPECTED_COLOR(byteSize(expected))}`,
            `Received:${isNot ? '    ' : ''}    ${RECEIVED_COLOR(byteSize(received))}`,
        ]),
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L332-L354
 */
export function toBeLessThanByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    const matcherName = toBeLessThanByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        pass: received < expected,
        message: toMessageFn(() => [
            matcherHint(matcherName, undefined, undefined, options),
            ``,
            `Expected:${isNot ? ' not' : ''} < ${EXPECTED_COLOR(byteSize(expected))}`,
            `Received:${isNot ? '    ' : ''}   ${RECEIVED_COLOR(byteSize(received))}`,
        ]),
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L356-L378
 */
export function toBeLessThanOrEqualByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    const matcherName = toBeLessThanOrEqualByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        pass: received <= expected,
        message: toMessageFn(() => [
            matcherHint(matcherName, undefined, undefined, options),
            ``,
            `Expected:${isNot ? ' not' : ''} <= ${EXPECTED_COLOR(byteSize(expected))}`,
            `Received:${isNot ? '    ' : ''}    ${RECEIVED_COLOR(byteSize(received))}`,
        ]),
    };
}
