import type { objectEntries, PartialWithUndefined } from './types/utils';
import { isFunction, isNotUndefined } from './utils/type-check';

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
