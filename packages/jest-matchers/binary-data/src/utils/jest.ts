import {
    EXPECTED_COLOR,
    matcherErrorMessage,
    matcherHint,
    printExpected,
    printReceived,
    printWithType,
    RECEIVED_COLOR,
} from 'jest-matcher-utils';

import { isNonNegativeInteger } from '.';

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L205-L216
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L163-L182
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L184-L203
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L218-L238
 */
export function ensureByteSize(
    actual: unknown,
    expected: unknown,
    matcherName: string,
    options?: jest.MatcherHintOptions,
): asserts actual is number | bigint {
    const errorList: Array<{ label: string; specific: string }> = [];
    if (!isNonNegativeInteger(actual)) {
        errorList.push({
            label: RECEIVED_COLOR('received'),
            specific: printWithType('Received', actual, printReceived),
        });
    }
    if (!isNonNegativeInteger(expected)) {
        errorList.push({
            label: EXPECTED_COLOR('expected'),
            specific: printWithType('Expected', expected, printExpected),
        });
    }

    if (errorList.length === 0) return;

    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
        matcherErrorMessage(
            matcherHint(matcherString, undefined, undefined, options),
            `${errorList.map(({ label }) => label).join(' and ')} ${errorList.length > 1 ? 'values' : 'value'}`
                + ' must be a non-negative integer or non-negative bigint',
            errorList.map(({ specific }) => specific).join('\n\n'),
        ),
    );
}
