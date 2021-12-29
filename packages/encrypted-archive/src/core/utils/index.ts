import { inspect } from 'util';

import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

import type { EncodeStringFn } from '../types';
import type { AsyncIterableReturn, objectEntries, PartialWithUndefined } from '../types/utils';

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isFunction(value: unknown): value is () => void {
    return typeof value === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInstance<T extends abstract new (...args: any) => any>(instance: T) {
    return (value: unknown): value is InstanceType<T> => value instanceof instance;
}

export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
    return value !== undefined;
}

const isNever = (_: unknown): _ is never => false;

export function isOrType<T1, T2, T3 = never>(
    typeGuard1: (value: unknown) => value is T1,
    typeGuard2: (value: unknown) => value is T2,
    typeGuard3: (value: unknown) => value is T3 = isNever,
) {
    return (value: unknown): value is T1 | T2 | T3 => typeGuard1(value) || typeGuard2(value) || typeGuard3(value);
}

export const isArrayBufferLike = isOrType(isInstance(ArrayBuffer), isInstance(SharedArrayBuffer));

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
// eslint-disable-next-line @typescript-eslint/ban-types
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

const arrayBufferView2Uint8Array = (view: ArrayBufferView): Uint8Array =>
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

export function arrayBuffer2Uint8Array(value: ArrayBufferView | ArrayBufferLike): Uint8Array {
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (ArrayBuffer.isView(value)) return arrayBufferView2Uint8Array(value);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return new Uint8Array(value);
}

export function uint8arrayFrom(
    encodeString: EncodeStringFn,
    value: string | ArrayBufferView | ArrayBufferLike,
): Uint8Array {
    return arrayBuffer2Uint8Array(typeof value === 'string' ? encodeString(value) : value);
}

export async function asyncIterable2Uint8Array(iterable: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
    const chunkList: Uint8Array[] = [];
    for await (const chunk of iterable) {
        chunkList.push(chunk);
    }
    // The `uint8arrayConcat()` function will always copy the Uint8Array object.
    // However, if the length of the array is 1, there is no need to copy it.
    return isOneArray(chunkList)
        ? arrayBufferView2Uint8Array(chunkList[0])
        : uint8arrayConcat(...chunkList);
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

export function printObject(value: unknown, opts?: { passThroughString?: boolean | undefined }): string {
    return (opts?.passThroughString && typeof value === 'string') ? value : inspect(value, { breakLength: Infinity });
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

function isErrorConstructor(value: unknown): value is ErrorConstructor {
    /**
     * @see https://stackoverflow.com/a/14486171/4907315
     */
    return typeof value === 'function' && value.prototype instanceof Error;
}

export function fixNodePrimordialsErrorInstance(oldError: unknown): never {
    if (
        typeof oldError === 'object' && isPropAccessible(oldError)
        && !(oldError instanceof Error)
        && typeof oldError['name'] === 'string'
        && typeof oldError['message'] === 'string'
    ) {
        const name = oldError['name'];
        const detectConstructor = (globalThis as Record<string, unknown>)[name];
        const ErrorConstructor = isErrorConstructor(detectConstructor) ? detectConstructor : Error;
        const newError = new ErrorConstructor();
        Object.defineProperties(
            newError,
            Object.getOwnPropertyDescriptors(oldError),
        );
        throw newError;
    }
    throw oldError;
}

/**
 * The Node.js built-in function throws a pseudo Error object that does not extend the Error object.
 * Their stack trace is incomplete and errors are difficult to trace.
 * For example, the results of {@link https://jestjs.io/ Jest} do not show where the error occurred.
 * This function will fix the stack trace of the pseudo Error object to the proper one.
 */
export function fixNodePrimordialsErrorStackTrace(oldError: unknown): never {
    /* eslint-disable @typescript-eslint/no-throw-literal */
    if (!(typeof oldError === 'object' && isPropAccessible(oldError) && !(oldError instanceof Error))) throw oldError;
    const oldErrorStackTrace = oldError['stack'];

    if (!(isString(oldError['message']) && isString(oldErrorStackTrace))) throw oldError;
    const newError = new Error();
    const newErrorStackTrace = newError.stack;

    if (!isString(newErrorStackTrace)) throw oldError;
    const newErrorStackTraceLastLine = newErrorStackTrace.replace(/^(?:(?!\n[^\n]+$).)+/s, '');

    if (oldErrorStackTrace.includes(newErrorStackTraceLastLine)) throw oldError;
    Object.defineProperties(
        newError,
        Object.getOwnPropertyDescriptors(oldError),
    );
    newError.stack = oldErrorStackTrace
        + newErrorStackTrace.replace(
            new RegExp(
                String.raw`^Error: [^\n]*(?:\n *at (?:Object\.)?${fixNodePrimordialsErrorStackTrace.name}\b[^\n]*)?`,
            ),
            '',
        );
    throw newError;
    /* eslint-enable */
}
