export type Nullable<T> = T | null | undefined;

export type OneOrMoreReadonlyArray<T> = readonly [T, ...T[]];

export type PartialWithUndefined<T> = {
    [P in keyof T]?: T[P] | undefined;
};

export type RequiredExcludeUndefined<T> = {
    [P in keyof T]-?: Exclude<T[P], undefined>;
};

export type Expand<T> = T extends infer U ? U : never;

/**
 * The built-in `AsyncIterable` type does not have the `TReturn` and `TNext` arguments.
 * This type fixes that problem and makes it easier to use with function return types.
 *
 * Note: Do not specify the `never` type for the `TNext` argument!
 *       It will not be available for the for-await-of statement.
 */
export interface AsyncIterableReturn<T, TReturn, TNext = undefined> {
    [Symbol.asyncIterator]: () => AsyncIterator<T, TReturn, TNext>;
}

/**
 * The built-in `AsyncIterableIterator` type does not have the `TReturn` and `TNext` arguments.
 * This type fixes that problem and makes it easier to use with function return types.
 *
 * Note: Do not specify the `never` type for the `TNext` argument!
 *       It will not be available for the for-await-of statement.
 */
export interface AsyncIterableIteratorReturn<T, TReturn, TNext = undefined> extends AsyncIterator<T, TReturn, TNext> {
    [Symbol.asyncIterator]: () => AsyncIterableIteratorReturn<T, TReturn, TNext>;
}

export function assertType<T>(_: T): void {
    //
}

export type isInteger = (value: unknown) => value is number;

export type objectEntries = <T extends string, U>(o: Record<T, U>) => Array<[T, U]>;

export type objectFromEntries = <K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>) => Record<K, T>;

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
