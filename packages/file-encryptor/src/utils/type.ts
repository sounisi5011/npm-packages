export type OverrideProp<T, U extends Record<PropertyKey, unknown>> = Omit<T, keyof U> & U;
