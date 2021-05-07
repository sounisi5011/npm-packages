import { inspect, types } from 'util';

import type { objectEntries } from './type';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

export function getPropFromValue<T extends string, U>(rec: Record<T, U>, value: U): T | null {
    const findEntry = (Object.entries as objectEntries)(rec).find(([, val]) => val === value);
    return findEntry ? findEntry[0] : null;
}

export function bufferFrom(value: Buffer | NodeJS.ArrayBufferView | ArrayBufferLike): Buffer;
export function bufferFrom(
    value: string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike,
    encoding: BufferEncoding,
): Buffer;
export function bufferFrom(
    value: string | Buffer | NodeJS.ArrayBufferView | ArrayBufferLike,
    encoding?: BufferEncoding,
): Buffer {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return Buffer.from(value, encoding);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L106-L109
     */
    if (types.isArrayBufferView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    /**
     * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
     */
    return Buffer.from(value);
}

/**
 * @see https://github.com/nodejs/node/blob/v12.22.1/lib/zlib.js#L109-L111
 */
export function anyArrayBuffer2Buffer<T>(value: T | ArrayBufferLike): T | Buffer {
    return types.isAnyArrayBuffer(value) ? Buffer.from(value) : value;
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
    /* eslint-disable @typescript-eslint/dot-notation */
    if (
        isObject(oldError)
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
    /* eslint-enable */
}

/**
 * The Node.js built-in function throws a pseudo Error object that does not extend the Error object.
 * Their stack trace is incomplete and errors are difficult to trace.
 * For example, the results of {@link https://jestjs.io/ Jest} do not show where the error occurred.
 * This function will fix the stack trace of the pseudo Error object to the proper one.
 */
export async function fixNodePrimordialsErrorStackTrace(oldError: unknown): Promise<never> {
    /* eslint-disable @typescript-eslint/no-throw-literal, @typescript-eslint/dot-notation */
    if (!(isObject(oldError) && !(oldError instanceof Error))) throw oldError;
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
            new RegExp(String.raw`^Error: [^\n]*(?:\n *at ${fixNodePrimordialsErrorStackTrace.name}\b[^\n]*)?`),
            '',
        );
    throw newError;
    /* eslint-enable */
}
