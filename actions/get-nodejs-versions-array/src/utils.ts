export function tryReplaceAbsolutePathPrefix(
    targetAbsolutePath: string,
    prefixAbsolutePath: string | null | undefined,
    replaceValue: string,
): string {
    if (!prefixAbsolutePath) return targetAbsolutePath;

    const prefixLen = prefixAbsolutePath.length;
    if (
        targetAbsolutePath.startsWith(prefixAbsolutePath)
        && ['/', '\\', undefined].includes(targetAbsolutePath[prefixLen])
    ) return `${replaceValue}${targetAbsolutePath.substring(prefixLen)}`;

    return targetAbsolutePath;
}
