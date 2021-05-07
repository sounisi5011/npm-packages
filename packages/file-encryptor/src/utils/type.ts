export type Nullable<T> = T | null | undefined;

export type OneOrMoreReadonlyArray<T> = readonly [T, ...T[]];

export function assertType<T>(_: T): void {
    //
}

export type objectEntries = <T extends string, U>(o: Record<T, U>) => Array<[T, U]>;

export type OverrideProp<T, U extends Record<PropertyKey, unknown>> = Omit<T, keyof U> & U;

export type Cond<
    TCond extends Record<'actual' | 'expected', unknown>,
    TResult extends Record<'match' | 'notMatch', unknown>
> = [TCond['expected']] extends [TCond['actual']]
    ? [TCond['actual']] extends [TCond['expected']] ? TResult['match'] : TResult['notMatch']
    : TResult['notMatch'];

export type Cond2<
    T extends
        & Record<'allMatch' | 'notAllMatch', unknown>
        & Record<'cond1' | 'cond2', Record<'actual' | 'expected' | 'onlyMatch', unknown>>
> = Cond<
    T['cond1'],
    {
        match: Cond<
            T['cond2'],
            { match: T['allMatch']; notMatch: T['cond1']['onlyMatch'] }
        >;
        notMatch: Cond<
            T['cond2'],
            { match: T['cond2']['onlyMatch']; notMatch: T['notAllMatch'] }
        >;
    }
>;
