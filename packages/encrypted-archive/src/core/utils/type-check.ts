export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isFunction(value: unknown): value is () => void {
    return typeof value === 'function';
}

export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
    return value !== undefined;
}

export function isInstance<T extends abstract new (...args: never) => unknown>(instance: T) {
    return (value: unknown): value is InstanceType<T> => value instanceof instance;
}

export function isAsyncIterable(value: object): value is AsyncIterable<unknown> {
    return Symbol.asyncIterator in value;
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
