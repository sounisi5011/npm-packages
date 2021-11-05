export interface hasOwnProperty {
    <O, P extends keyof O>(obj: O, prop: P): obj is O & Pick<Required<O>, P>;
    <P extends PropertyKey>(obj: unknown, prop: P): obj is Record<P, unknown>;
}
