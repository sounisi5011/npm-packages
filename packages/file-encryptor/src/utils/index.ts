import { inspect } from 'util';

import type { GuardType, objectEntries } from './type';

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

export function printObject(value: unknown): string {
    return inspect(value, { breakLength: Infinity });
}

interface CaseProcess<TOrigArg, TExpectedResult, TCurrentArg, TPrevResult> {
    case: <T extends TCurrentArg, U extends TExpectedResult>(
        typeGuard: (value: TCurrentArg) => value is T,
        resultFn: (value: T) => U,
    ) => CaseProcess<TOrigArg, TExpectedResult, Exclude<TCurrentArg, T>, TPrevResult | U>;
    finish: <U extends TExpectedResult>(resultFn: (value: TCurrentArg) => U) => (value: TOrigArg) => TPrevResult | U;
}

function createCaseProcessor<TOrigArg, TExpectedResult, TCurrentArg, TPrevResult>(
    processFn: (value: TOrigArg) => { result: TPrevResult } | { value: TCurrentArg },
): CaseProcess<TOrigArg, TExpectedResult, TCurrentArg, TPrevResult> {
    return {
        case(typeGuard, resultFn) {
            type TNextArg = Exclude<TCurrentArg, GuardType<typeof typeGuard>>;
            type TNextResult = TPrevResult | ReturnType<typeof resultFn>;
            return createCaseProcessor<TOrigArg, TExpectedResult, TNextArg, TNextResult>(value => {
                const res = processFn(value);
                if ('result' in res) return res;
                return typeGuard(res.value)
                    ? { result: resultFn(res.value) }
                    : { value: res.value as TNextArg };
            });
        },
        finish(resultFn) {
            return value => {
                const res = processFn(value);
                return 'result' in res ? res.result : resultFn(res.value);
            };
        },
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const createConvertFunc = <TOrigArg, TExpectedResult>() =>
    createCaseProcessor<TOrigArg, TExpectedResult, TOrigArg, never>(value => ({ value }));

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
