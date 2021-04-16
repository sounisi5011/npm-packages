export function padStartArray<T, U>(array: readonly T[], length: number, value: U): Array<T | U> {
    if (length < array.length) return [...array];
    const newArray = Array<U>(length - array.length).fill(value);
    return [...newArray, ...array];
}

export function padEndArray<T, U>(array: readonly T[], length: number, value: U): Array<T | U> {
    if (length < array.length) return [...array];
    const newArray = Array<U>(length - array.length).fill(value);
    return [...array, ...newArray];
}
