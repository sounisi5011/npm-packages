export function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
    return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}
