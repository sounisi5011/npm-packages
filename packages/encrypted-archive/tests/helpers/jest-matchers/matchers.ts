import {
    EXPECTED_COLOR,
    getLabelPrinter,
    matcherHint,
    printDiffOrStringify,
    printExpected,
    printReceived,
    RECEIVED_COLOR,
} from 'jest-matcher-utils';

function isNotNull<T>(value: T): value is Exclude<T, null> {
    return value !== null;
}

function toArray<T>(value: T | readonly T[]): T[] {
    return ([] as T[]).concat(value);
}

function createMatcherResult(
    { pass, message }: { pass: boolean; message: () => (string | ReadonlyArray<string | null>) },
): jest.CustomMatcherResult {
    return {
        pass,
        message: () => {
            const lines: string[] = toArray(message()).filter(isNotNull);
            return lines.join('\n');
        },
    };
}

function printConstructorName(
    label: string,
    constructor: Function, // eslint-disable-line @typescript-eslint/ban-types
    isNot: boolean,
    isExpected: boolean,
    expectedPrototype?: Function, // eslint-disable-line @typescript-eslint/ban-types
): string {
    /**
     * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/print.ts#L128-L142
     */
    const constructorName = constructor.name;
    if (typeof constructorName !== 'string') {
        return `${label} name is not a string`;
    }

    const colorFn = isExpected ? EXPECTED_COLOR : RECEIVED_COLOR;
    const prefix = `${label}: ${!isNot ? '' : isExpected ? 'not ' : '    '}`;
    let suffix = colorFn(constructorName || '(anonymous)');

    if (constructorName === '' || (expectedPrototype && constructor !== expectedPrototype)) {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const namedPrototypeFuncList: Function[] = [];
        for (let prototype: unknown = constructor; (prototype = Object.getPrototypeOf(prototype));) {
            if (typeof prototype === 'function' && typeof prototype.name === 'string' && prototype.name !== '') {
                namedPrototypeFuncList.push(prototype);
            }
        }

        const prototypeFunc = expectedPrototype && namedPrototypeFuncList.includes(expectedPrototype)
            ? expectedPrototype
            : constructorName === ''
            ? namedPrototypeFuncList[0]
            : undefined;
        if (prototypeFunc) {
            /**
             * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/print.ts#L119-L124
             */
            const prototypeName = prototypeFunc.name || '(anonymous)';
            const extendsStr = Object.getPrototypeOf(constructor) === prototypeFunc ? 'extends' : 'extends … extends';
            suffix = prototypeFunc === expectedPrototype
                ? `${suffix} ${extendsStr} ${EXPECTED_COLOR(prototypeName)}`
                : colorFn(`(anonymous) ${extendsStr} ${prototypeName}`);
        }
    }

    return prefix + suffix;
}

function printReceivedConstructorName(
    label: string,
    received: Function, // eslint-disable-line @typescript-eslint/ban-types
    expected: Function, // eslint-disable-line @typescript-eslint/ban-types
    isNot: boolean,
): string | null {
    if (received === expected) return null;
    if (isNot) {
        /**
         * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/print.ts#L110-L126
         */
        if (typeof expected.name === 'string' && typeof received.name === 'string') {
            return printConstructorName(label, received, true, false, expected);
        }
        return printConstructorName(label, received, false, false);
    }
    return printConstructorName(label, received, isNot, false, expected);
}

function printStringDiff(
    expected: string | RegExp,
    received: string,
    expectedLabel: string,
    receivedLabel: string,
    isNot: boolean,
): string[] {
    const printLabel = getLabelPrinter(expectedLabel, receivedLabel);
    if (expected instanceof RegExp) {
        return [
            printLabel(expectedLabel) + (isNot ? 'not ' : '') + printExpected(expected),
            printLabel(receivedLabel) + (isNot ? '    ' : '') + printReceived(received)
            + (expected.test(received) ? ' (match)' : ' (not match)'),
        ];
    } else if (expected === received) {
        return [
            printLabel(expectedLabel) + (isNot ? 'not ' : '') + printExpected(expected),
            `${receivedLabel} is the same string`,
        ];
    } else {
        return [
            printDiffOrStringify(expected, received, expectedLabel, receivedLabel, true),
        ];
    }
}

/**
 * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/toThrowMatchers.ts
 * @see https://github.com/jest-community/jest-extended/blob/v0.11.5/src/matchers/toThrowWithMessage/index.js
 */
export function toThrowWithMessageFixed(
    this: jest.MatcherContext,
    received: unknown,
    expectedType: ErrorConstructor,
    expectedMessage: string | RegExp,
): jest.CustomMatcherResult {
    const matcherName = toThrowWithMessageFixed.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };

    const printMessage = (notThrow = false): Array<string | null> => (
        received instanceof Error
            ? [
                matcherHint(matcherName, undefined, undefined, options),
                ``,
                printConstructorName('Expected constructor', expectedType, isNot, true),
                printReceivedConstructorName('Received constructor', received.constructor, expectedType, isNot),
                ``,
                ...printStringDiff(
                    expectedMessage,
                    received.message,
                    'Expected message',
                    'Received message',
                    isNot,
                ),
            ]
            : [
                matcherHint(matcherName, undefined, undefined, options),
                ``,
                printConstructorName('Expected constructor', expectedType, isNot, true),
                `Expected message: ${isNot ? 'not ' : ''}${printExpected(expectedMessage)}`,
                ``,
                notThrow
                    ? 'Received function did not throw'
                    : `Received value: ${printReceived(received)}`,
            ]
    );

    if (typeof received === 'function') {
        try {
            received();
            return createMatcherResult({
                message: () => printMessage(true),
                pass: false,
            });
        } catch (error) {
            received = error;
        }
    }

    if (!(received instanceof expectedType)) {
        return createMatcherResult({
            message: () => printMessage(),
            pass: false,
        });
    }

    if (expectedMessage instanceof RegExp) {
        return createMatcherResult({
            message: () => printMessage(),
            pass: expectedMessage.test(received.message),
        });
    } else {
        return createMatcherResult({
            message: () => printMessage(),
            pass: expectedMessage === received.message,
        });
    }
}
