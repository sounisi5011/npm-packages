import { ensureNumbers, matcherHint, printExpected, printReceived } from 'jest-matcher-utils';

function divide(dividend: number | bigint, divisor: number | bigint): number {
    if (typeof dividend === 'bigint' || typeof divisor === 'bigint') {
        const shift = 2 ** 52;
        return Number(
            (
                BigInt(dividend) * BigInt(shift)
            ) / BigInt(divisor),
        ) / shift;
    } else {
        return dividend / divisor;
    }
}

function byteSize(bytes: number | bigint): string {
    // if (typeof bytes === 'bigint' && bytes <= Number.MAX_SAFE_INTEGER){
    //     bytes = Number(bytes);
    // }
    const [sign, absBytes] = bytes < 0 ? ['-', -bytes] : ['', bytes];
    const unitData = Object.entries({
        YiB: BigInt(2) ** BigInt(80),
        ZiB: BigInt(2) ** BigInt(70),
        EiB: BigInt(2) ** BigInt(60),
        PiB: 2 ** 50,
        TiB: 2 ** 40,
        GiB: 2 ** 30,
        MiB: 2 ** 20,
        KiB: 2 ** 10,
    }).find(([, from]) => from <= absBytes);
    if (unitData) {
        const [unit, from] = unitData;
        const divedBytes = divide(absBytes, from).toFixed(2).replace(/\.?0+$/, '');
        return `${sign}${divedBytes} ${unit} (${sign}${absBytes} B)`;
    }
    return `${sign}${absBytes} B`;
}

function printStr(printFunc: (typeof printExpected) | (typeof printReceived), value: string): string {
    return printFunc(value).replace(/(".*")/, (_, v) => JSON.parse(v));
}

export function toBeByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    /**
     * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/matchers.ts#L333-L355
     * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/matchers.ts#L74-L125
     */
    const matcherName = toBeByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        message: () =>
            [
                matcherHint(matcherName, undefined, undefined, options),
                ``,
                `Expected:${isNot ? ' not' : ''} ${printStr(printExpected, byteSize(expected))}`,
                `Received:${isNot ? '    ' : ''} ${printStr(printReceived, byteSize(received))}`,
            ].join('\n'),
        pass: received == expected, // eslint-disable-line eqeqeq
    };
}

export function toBeLessThanByteSize(
    this: jest.MatcherContext,
    received: number | bigint,
    expected: number | bigint,
): jest.CustomMatcherResult {
    /**
     * @see https://github.com/facebook/jest/blob/v26.6.3/packages/expect/src/matchers.ts#L333-L355
     */
    const matcherName = toBeLessThanByteSize.name;
    const isNot = this.isNot;
    const options: jest.MatcherHintOptions = {
        isNot,
        promise: this.promise,
    };
    ensureNumbers(received, expected, matcherName, options);

    return {
        message: () =>
            [
                matcherHint(matcherName, undefined, undefined, options),
                ``,
                `Expected:${isNot ? ' not' : ''} < ${printStr(printExpected, byteSize(expected))}`,
                `Received:${isNot ? '    ' : ''}   ${printStr(printReceived, byteSize(received))}`,
            ].join('\n'),
        pass: received < expected,
    };
}
