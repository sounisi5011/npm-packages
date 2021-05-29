export function isPropertyAccessible(value: unknown): value is Record<PropertyKey, unknown> {
    return value !== null && value !== undefined;
}

export { isPropertyAccessible as isPropAccessible };
