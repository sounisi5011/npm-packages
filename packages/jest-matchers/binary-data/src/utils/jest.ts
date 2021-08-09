import { diffLinesUnified2 } from 'jest-diff';
import {
    EXPECTED_COLOR,
    matcherErrorMessage,
    matcherHint,
    printExpected,
    printReceived,
    printWithType,
    RECEIVED_COLOR,
} from 'jest-matcher-utils';

import { bytes2DataView, BytesData, isBytesData, isNonNegativeInteger } from '.';

interface EnsureFuncPredicateOptions<T> {
    predicate: (value: unknown) => value is T;
    typeName: string;
}

type EnsureFunc<TActual> = (
    actual: unknown,
    expected: unknown,
    matcherName: string,
    options: jest.MatcherHintOptions,
) => asserts actual is TActual;

function printValues(valueNameList: readonly string[]): string {
    const prefix = valueNameList.join(' and ');
    const suffix = valueNameList.length > 1 ? 'values' : 'value';
    return `${prefix} ${suffix}`;
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L205-L216
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L163-L182
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L184-L203
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L218-L238
 */
function createEnsure<T>(opts: EnsureFuncPredicateOptions<T>): EnsureFunc<T> {
    return (actual, expected, matcherName, options) => {
        const isValidActual = opts.predicate(actual);
        const isValidExpected = opts.predicate(expected);
        if (isValidActual && isValidExpected) return;

        const labelList: string[] = [];
        const specificList: string[] = [];
        if (!isValidActual) {
            labelList.push(RECEIVED_COLOR('received'));
            specificList.push(printWithType('Received', actual, printReceived));
        }
        if (!isValidExpected) {
            labelList.push(EXPECTED_COLOR('expected'));
            specificList.push(printWithType('Expected', expected, printExpected));
        }

        throw new Error(matcherErrorMessage(
            matcherHint(matcherName, undefined, undefined, options),
            `${printValues(labelList)} must be ${opts.typeName}`,
            specificList.join('\n\n'),
        ));
    };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L163-L182
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L184-L203
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L218-L238
 */
export const ensureByteSize: EnsureFunc<number | bigint> = createEnsure({
    predicate: isNonNegativeInteger,
    typeName: 'a non-negative integer or non-negative bigint',
});

export const ensureBytes: EnsureFunc<BytesData> = createEnsure({
    predicate: isBytesData,
    typeName: 'a TypedArray, DataView, ArrayBuffer, or SharedArrayBuffer',
});

function getByteDataLines(byteData: BytesData): {
    onlyBytes: string[];
    withByteOffset: string[];
} {
    const byteDataView = bytes2DataView(byteData);
    const onlyBytes: string[] = [];
    const withByteOffset: string[] = [];
    const maxByteOffsetLength = String(byteDataView.byteLength - 1).length;

    for (let i = 0; i < byteDataView.byteLength; i++) {
        const hexCode = '0x' + byteDataView.getUint8(i).toString(16).toUpperCase().padStart(2, '0');
        const byteOffset = String(i).padStart(maxByteOffsetLength, '0');
        onlyBytes.push(hexCode);
        withByteOffset.push(`${byteOffset}: ${hexCode}`);
    }

    return { onlyBytes, withByteOffset };
}

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L315-L394
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/expect/src/matchers.ts#L955-L972
 */
export function printBytesDiff(
    expected: BytesData,
    received: BytesData,
    options: {
        expectedLabel: string;
        receivedLabel: string;
        expand: boolean;
        pass: boolean;
    },
): string {
    if (!options.pass) {
        const expectedLines = getByteDataLines(expected);
        const receivedLines = getByteDataLines(received);
        return diffLinesUnified2(
            ['<', ...expectedLines.withByteOffset.map(line => `  ${line},`), '>'],
            ['<', ...receivedLines.withByteOffset.map(line => `  ${line},`), '>'],
            ['', ...expectedLines.onlyBytes, ''],
            ['', ...receivedLines.onlyBytes, ''],
            {
                aAnnotation: options.expectedLabel,
                bAnnotation: options.receivedLabel,
                expand: options.expand,
                includeChangeCounts: true,
            },
        );
    }

    const lines = [`Expected: not ${printExpected(expected)}`];
    if (expected.constructor !== received.constructor) lines.push(`Received:     ${printReceived(received)}`);
    return lines.join('\n');
}
