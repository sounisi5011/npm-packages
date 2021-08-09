import { types } from 'util';

import type { isReadonlyArray } from '@sounisi5011/ts-type-util-is-readonly-array';

function isNotNull<T>(value: T): value is Exclude<T, null> {
    return value !== null;
}

function isNotEmptyString<T extends unknown>(value: T): value is Exclude<T, ''> {
    return value !== '';
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

export type BytesData = ArrayBufferLike | NodeJS.ArrayBufferView;

export function isBytesData(value: unknown): value is BytesData {
    return types.isArrayBufferView(value) || types.isAnyArrayBuffer(value);
}

export function bytesEqual(bytes1: BytesData, bytes2: BytesData): boolean {
    if (bytes1 === bytes2) return true;
    if (bytes1.byteLength !== bytes2.byteLength) return false;

    const view1 = bytes2DataView(bytes1);
    const view2 = bytes2DataView(bytes2);

    for (let i = view1.byteLength; i--;) {
        if (view1.getUint8(i) !== view2.getUint8(i)) return false;
    }

    return true;
}

export function bytes2DataView(value: BytesData): DataView {
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (types.isArrayBufferView(value)) {
        return new DataView(value.buffer, value.byteOffset, value.byteLength);
    }
    return new DataView(value);
}

export function padTextColumns(
    lines: ReadonlyArray<readonly [string, string | readonly string[], string] | null>,
    options: { fillString?: string; gapString?: string } = {},
): string {
    const { fillString = ' ', gapString = ' ' } = options;
    const filteredLines = lines
        .filter(isNotNull)
        .map(([firstColumn, secondColumn, lastColumn]) =>
            [
                firstColumn,
                (Array.isArray as isReadonlyArray)(secondColumn)
                    ? secondColumn.filter(isNotEmptyString).join(gapString)
                    : secondColumn,
                lastColumn,
            ] as const
        );
    const firstColumnMaxLength = filteredLines.reduce((len, [column]) => Math.max(len, column.length), 0);
    const secondColumnMaxLength = filteredLines.reduce((len, [, column]) => Math.max(len, column.length), 0);
    return filteredLines
        .map(([firstColumn, secondColumn, lastColumn]) =>
            [
                firstColumn.padEnd(firstColumnMaxLength, fillString),
                secondColumn.padStart(secondColumnMaxLength, fillString),
                lastColumn,
            ].filter(isNotEmptyString).join(gapString)
        )
        .join('\n');
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
