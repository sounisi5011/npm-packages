export interface hasOwnProperty {
    <O extends unknown, P extends keyof O>(obj: O, prop: P): obj is O & Pick<Required<O>, P>;
    <P extends PropertyKey>(obj: unknown, prop: P): obj is Record<P, unknown>;
}
