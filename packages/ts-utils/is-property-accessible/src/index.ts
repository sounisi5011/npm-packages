export function isPropertyAccessible<T>(value: T): value is
    & Exclude<T, null | undefined>
    & Record<PropertyKey, unknown>
{
    return value !== null && value !== undefined;
}

export { isPropertyAccessible as isPropAccessible };
