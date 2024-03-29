import { BytesData, bytesEqual, byteSize, isBytesData, padTextColumns, toMessageFn } from './utils';
import { ensureBytes, ensureByteSizeOrBytes, printBytesDiff } from './utils/jest';
import type { MatcherHintOptions } from './utils/jest';

/**
 * The optional property of matcher context is true if undefined.
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L57-L58
 */
const isExpand = (expand: boolean | undefined): boolean => expand !== false;

function createCompareByteSizeMatcher(
    opts: {
        matcherName: string;
        operator?: string;
        passFn: (arg: {
            expected: number | bigint;
            received: number | bigint;
        }) => boolean;
    },
): (
    this: jest.MatcherContext,
    received: unknown,
    expected: number | bigint | BytesData,
) => jest.CustomMatcherResult {
    const { matcherName, passFn } = opts;
    const operator: string = opts.operator ? opts.operator : '';

    /**
     * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L234-L256
     */
    return function(received, expected) {
        const isNot = this.isNot;
        const options: MatcherHintOptions = {
            isNot,
            promise: this.promise,
        };

        ensureByteSizeOrBytes(this.utils, received, expected, matcherName, options);
        const expectedByteLength = isBytesData(expected) ? expected.byteLength : expected;
        const receivedByteLength = isBytesData(received) ? received.byteLength : received;

        const message = toMessageFn(() => [
            this.utils.matcherHint(matcherName, undefined, undefined, options),
            ``,
            padTextColumns([
                ['Expected:', [isNot ? 'not' : '', operator], this.utils.EXPECTED_COLOR(byteSize(expectedByteLength))],
                ['Received:', '', this.utils.RECEIVED_COLOR(byteSize(receivedByteLength))],
            ]),
        ]);
        const pass = passFn({ expected: expectedByteLength, received: receivedByteLength });
        return { message, pass };
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

export function toBytesEqual(
    this: jest.MatcherContext,
    received: unknown,
    expected: BytesData,
): jest.CustomMatcherResult {
    const matcherName = toBytesEqual.name;
    const isNot = this.isNot;
    const options: MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };

    ensureBytes(this.utils, received, expected, matcherName, options);
    const pass = bytesEqual(expected, received);
    const message = toMessageFn(() => [
        this.utils.matcherHint(matcherName, undefined, undefined, options),
        ``,
        printBytesDiff(this.utils, expected, received, {
            expectedLabel: 'Expected',
            receivedLabel: 'Received',
            expand: isExpand(this.expand),
            pass,
        }),
    ]);

    return { message, pass };
}
