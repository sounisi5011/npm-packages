import { inspect, types } from 'util';

import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

import type { AsyncIterableReturn, objectEntries } from './type';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isFunction(value: unknown): value is () => void {
    return typeof value === 'function';
}

export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
    return value !== undefined;
}

function isOneArray<T>(value: T[]): value is [T];
function isOneArray<T>(value: readonly T[]): value is readonly [T];
function isOneArray<T>(value: readonly T[]): value is readonly [T] {
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
    ...optionsList: Array<Readonly<Partial<T>>>
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

export function bufferFrom(value: Buffer | NodeJS.ArrayBufferView | ArrayBufferLike): Buffer;
export function bufferFrom(value: string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike): Buffer | string;
export function bufferFrom(
    value: string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike,
    encoding: BufferEncoding,
): Buffer;
export function bufferFrom(
    value: string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike,
    encoding?: BufferEncoding,
): Buffer | string {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') {
        return encoding !== undefined
            ? Buffer.from(value, encoding)
            : value;
    }
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (types.isArrayBufferView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return Buffer.from(value);
}

export async function asyncIterable2Buffer(iterable: AsyncIterable<Buffer>): Promise<Buffer> {
    const chunkList: Buffer[] = [];
    for await (const chunk of iterable) {
        chunkList.push(chunk);
    }
    // The `Buffer.concat()` function will always copy the Buffer object.
    // However, if the length of the array is 1, there is no need to copy it.
    return isOneArray(chunkList) ? chunkList[0] : Buffer.concat(chunkList);
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

export function printObject(value: unknown, opts?: { passThroughString?: boolean }): string {
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
