export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function filterObjectEntry<TValue>(validateValue: (value: unknown) => value is TValue) {
    return <TProp,>(value: [TProp, unknown]): value is [TProp, TValue] => validateValue(value[1]);
}
