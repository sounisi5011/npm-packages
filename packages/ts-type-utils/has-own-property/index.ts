export interface hasOwnProperty {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error TS2677: A type predicate's type must be assignable to its parameter's type.
    //                    Type 'Pick<Required<O>, P>' is not assignable to type 'O'.
    //                      'Pick<Required<O>, P>' is assignable to the constraint of type 'O', but 'O' could be instantiated with a different subtype of constraint 'unknown'.
    <O extends unknown, P extends keyof O>(obj: O, prop: P): obj is Pick<Required<O>, P>;
    <P extends PropertyKey>(obj: unknown, prop: P): obj is Record<P, unknown>;
}
