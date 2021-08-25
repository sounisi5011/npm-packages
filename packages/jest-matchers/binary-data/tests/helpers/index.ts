import { inspect } from 'util';

const inspect1line = (value: unknown): string =>
    inspect(
        value,
        {
            breakLength: Infinity,
            compact: true,
        },
    );

export function createTupleArray<T extends readonly [...unknown[]]>(...args: T): [...T] {
    return [...args];
}

export function getTypedArrayList(arrayBuffer: ArrayBufferLike): Array<NodeJS.TypedArray | Buffer> {
    return [
        new Int8Array(arrayBuffer),
        new Uint8Array(arrayBuffer),
        new Uint8ClampedArray(arrayBuffer),
        new Int16Array(arrayBuffer),
        new Uint16Array(arrayBuffer),
        new Int32Array(arrayBuffer),
        new Uint32Array(arrayBuffer),
        new BigInt64Array(arrayBuffer),
        new BigUint64Array(arrayBuffer),
        new Float32Array(arrayBuffer),
        new Float64Array(arrayBuffer),
        Buffer.from(arrayBuffer),
    ];
}

export function getBytesDataList(
    byteLength: number,
    updateFn?: (data: DataView) => void,
): Array<ArrayBufferLike | DataView | NodeJS.TypedArray | Buffer> {
    const arrayBuffer = new ArrayBuffer(byteLength);
    const sharedArrayBuffer = new SharedArrayBuffer(byteLength);
    const dataView = new DataView(arrayBuffer);

    if (updateFn) {
        updateFn(dataView);
        updateFn(new DataView(sharedArrayBuffer));
    }

    return [
        arrayBuffer,
        sharedArrayBuffer,
        ...getTypedArrayList(arrayBuffer),
        dataView,
    ];
}

export function toIntAndBigintCases<TActual, TExpected>(
    cases: ReadonlyArray<readonly [TActual, TExpected]>,
): Array<[TActual | bigint, TExpected | bigint]>;
export function toIntAndBigintCases<TCase extends readonly [unknown, unknown]>(
    cases: readonly TCase[],
): Array<[TCase[0] | bigint, TCase[1] | bigint]>;
export function toIntAndBigintCases<TActual, TExpected>(
    cases: ReadonlyArray<readonly [TActual, TExpected]>,
): Array<[TActual | bigint, TExpected | bigint]> {
    return cases.flatMap(([v1, v2]) => {
        const newCases: Array<[TActual | bigint, TExpected | bigint]> = [
            [v1, v2],
        ];
        if (typeof v1 === 'number') newCases.push([BigInt(v1), v2]);
        if (typeof v2 === 'number') newCases.push([v1, BigInt(v2)]);
        if (typeof v1 === 'number' && typeof v2 === 'number') newCases.push([BigInt(v1), BigInt(v2)]);
        return newCases;
    });
}

function unshiftTestCases<
    T extends readonly [...unknown[]],
    U extends readonly [...unknown[]]
>(
    cases: readonly T[],
    pushFn: (...args: T) => [...U],
): Array<[...U, ...T]> {
    return cases
        .map(caseValues => [
            ...pushFn(...caseValues),
            ...caseValues,
        ]);
}

export const unshiftInspect = <TActual, TExpected>(
    cases: ReadonlyArray<readonly [TActual, TExpected]>,
): Array<[string, string, TActual, TExpected]> =>
    unshiftTestCases(
        cases,
        (actual, expected) => [inspect1line(actual), inspect1line(expected)],
    );
