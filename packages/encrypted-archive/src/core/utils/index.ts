import type { AsyncIterableReturn, objectEntries, PartialWithUndefined } from './type';

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isFunction(value: unknown): value is () => void {
    return typeof value === 'function';
}

export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
    return value !== undefined;
}

export function isInstance<T extends abstract new (...args: never) => unknown>(instance: T) {
    return (value: unknown): value is InstanceType<T> => value instanceof instance;
}

const isNever = (_: unknown): _ is never => false;

export function isOrType<T1, T2, T3 = never, T4 = never>(
    typeGuard1: (value: unknown) => value is T1,
    typeGuard2: (value: unknown) => value is T2,
    typeGuard3: (value: unknown) => value is T3 = isNever,
    typeGuard4: (value: unknown) => value is T4 = isNever,
) {
    return (value: unknown): value is T1 | T2 | T3 | T4 =>
        typeGuard1(value) || typeGuard2(value) || typeGuard3(value) || typeGuard4(value);
}

export function isOneArray<T>(value: T[]): value is [T];
export function isOneArray<T>(value: readonly T[]): value is readonly [T];
export function isOneArray<T>(value: readonly T[]): value is readonly [T] {
    return value.length === 1;
}

export function ifFuncThenExec<TArgs extends unknown[], TResult, TOther>(
    value: ((...args: TArgs) => TResult) | TOther,
    ...args: TArgs
): TResult | TOther {
    return isFunction(value) ? value(...args) : value;
}

export function getPropFromValue<T extends string, U>(rec: Record<T, U>, value: U): T | null {
    const findEntry = (Object.entries as objectEntries)(rec).find(([, val]) => val === value);
    return findEntry ? findEntry[0] : null;
}

/**
 * Normalize the input options to exclude properties with `undefined` values.
 * This is similar to copying an object with the spread syntax,
 * except that it excludes the `undefined` value of the source property.
 * @example
 * ```
 * const defaultOptions = { foo: 'bar', type: 'default' };
 * const inputOptions = { type: undefined };
 *
 * // Before:
 * const normalizedOptions = { ...defaultOptions, ...inputOptions };
 * //=> { foo: 'bar', type: undefined }
 * // Oops! The `type` property should not be overwritten!
 *
 * // After:
 * const normalizedOptions = normalizeOptions(defaultOptions, inputOptions);
 * //=> { foo: 'bar', type: 'default' }
 * // 👍
 * ```
 */
export function normalizeOptions<T extends object>(
    defaultOptions: Readonly<Required<T>>,
    ...optionsList: Array<Readonly<PartialWithUndefined<T>>>
): T {
    // Copy the objects in the `defaultOptions` argument using the spread syntax to avoid destructive updates.
    // This operation also removes non-enumerable properties contained in the `defaultOptions` argument value.
    const normalizedOptions: T = { ...defaultOptions };
    // The `Object.keys()` method does not read symbol properties.
    // Therefore, use the `Reflect.ownKeys()` method instead, which also reads the symbol properties.
    const optionNameList = Reflect.ownKeys(normalizedOptions) as Array<keyof T>;

    return optionsList.reduce<typeof normalizedOptions>(
        (normalizedOptions, partialOptions) =>
            optionNameList
                // Copies only enumerable properties.
                .filter(optionName => Object.prototype.propertyIsEnumerable.call(partialOptions, optionName))
                .reduce((normalizedOptions, optionName) => {
                    const value = partialOptions[optionName];
                    if (isNotUndefined(value)) normalizedOptions[optionName] = value;
                    return normalizedOptions;
                }, normalizedOptions),
        normalizedOptions,
    );
}

/**
 * @see https://stackoverflow.com/a/69998555/4907315
 */
export function uint8arrayConcat(...arrayList: ReadonlyArray<ArrayLike<number>>): Uint8Array {
    const totalLength = arrayList.map(array => array.length).reduce((a, b) => a + b, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const array of arrayList) {
        result.set(array, offset);
        offset += array.length;
    }

    return result;
}

export function bufferFrom(value: ArrayBufferView | ArrayBufferLike): Uint8Array;
export function bufferFrom(value: string | ArrayBufferView | ArrayBufferLike): Uint8Array | string;
export function bufferFrom(value: string | ArrayBufferView | ArrayBufferLike, encoding: BufferEncoding): Uint8Array;
export function bufferFrom(
    value: string | ArrayBufferView | ArrayBufferLike,
    encoding?: BufferEncoding,
): Uint8Array | string {
    if (typeof value === 'string') {
        return encoding !== undefined
            ? Buffer.from(value, encoding)
            : value;
    }
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return Buffer.from(value);
}

export async function* convertIterableValue<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    converter: (value: T) => U,
): AsyncIterableReturn<U, void> {
    for await (const value of iterable) yield converter(value);
}

export function number2hex(template: TemplateStringsArray, ...substitutions: number[]): string {
    return template
        .map((str, index) => {
            if (index === 0) return str;
            const value = substitutions[index - 1];
            if (typeof value === 'number') {
                const hexStr = value.toString(16).toUpperCase();
                const hexLen = hexStr.length + hexStr.length % 2;
                return `0x${hexStr.padStart(hexLen, '0')}${str}`;
            }
            return String(value) + str;
        })
        .join('');
}

export function passThroughString<T, U>(fn: (value: T) => U, value: T): string | U {
    return typeof value === 'string' ? value : fn(value);
}

interface CondResult<TArg, TPrevResult> {
    case: <Tvalue extends TArg, TResult>(
        typeGuard: (value: TArg) => value is Tvalue,
        convert: (value: Tvalue) => TResult,
    ) => CondResult<Exclude<TArg, Tvalue>, TPrevResult | TResult>;
    default: <TResult>(convert: (value: TArg) => TResult) => TPrevResult | TResult;
}

export function cond<T, U = never>(value: T): CondResult<T, U> {
    const result: CondResult<T, U> = {
        case(typeGuard, convert): any { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!typeGuard(value)) return result;

            const newValue = convert(value);
            const newResult = {
                case: () => newResult,
                default: () => newValue,
            };
            return newResult;
        },
        default: convert => convert(value),
    };
    return result;
}
