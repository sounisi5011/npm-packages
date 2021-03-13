export type hasOwnProperty = <T extends PropertyKey>(obj: unknown, prop: T) => obj is Record<T, unknown>;
