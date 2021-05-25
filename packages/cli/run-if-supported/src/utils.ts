export function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
    return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function filterObjectEntry<TValue>(validateValue: (value: unknown) => value is TValue) {
    return <TProp>(value: [TProp, unknown]): value is [TProp, TValue] => validateValue(value[1]);
}
