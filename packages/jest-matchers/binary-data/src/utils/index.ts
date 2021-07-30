function isNotNull<T>(value: T): value is Exclude<T, null> {
    return value !== null;
}

function toArray<T>(value: T | readonly T[]): T[] {
    return ([] as T[]).concat(value);
}

type FixedIsInteger = (number: unknown) => number is number;

/**
 * @see https://github.com/facebook/jest/blob/v27.0.6/packages/jest-matcher-utils/src/index.ts#L224-L226
 */
export function isNonNegativeInteger(value: unknown): value is number | bigint {
    return (
        (Number.isSafeInteger as FixedIsInteger)(value)
        || typeof value === 'bigint'
    ) && (value >= 0 && !Object.is(value, -0));
}

export function toMessageFn(func: () => (string | ReadonlyArray<string | null>)): jest.CustomMatcherResult['message'] {
    return () => {
        const lines: string[] = toArray(func()).filter(isNotNull);
        return lines.join('\n');
    };
}

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

const byteSizeUnitList = Object.entries({
    YiB: BigInt(2) ** BigInt(80),
    ZiB: BigInt(2) ** BigInt(70),
    EiB: BigInt(2) ** BigInt(60),
    PiB: 2 ** 50,
    TiB: 2 ** 40,
    GiB: 2 ** 30,
    MiB: 2 ** 20,
    KiB: 2 ** 10,
});

export function byteSize(bytes: number | bigint): string {
    const [sign, absBytes] = bytes < 0 ? ['-', -bytes] : ['', bytes];
    const unitData = byteSizeUnitList.find(([, from]) => from <= absBytes);
    if (unitData) {
        const [unit, from] = unitData;
        const divedBytes = divide(absBytes, from).toFixed(2).replace(/\.?0+$/, '');
        return `${sign}${divedBytes} ${unit} (${sign}${String(absBytes)} B)`;
    }
    return `${sign}${String(absBytes)} B`;
}
