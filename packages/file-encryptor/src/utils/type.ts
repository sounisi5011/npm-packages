export function assertType<T>(_: T): void {
    //
}

export type objectEntries = <T extends string, U>(o: Record<T, U>) => Array<[T, U]>;

export type OverrideProp<T, U extends Record<PropertyKey, unknown>> = Omit<T, keyof U> & U;
