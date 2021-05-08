import type { ConditionalExcept } from 'type-fest';

/**
 * @see https://stackoverflow.com/a/49683575/4907315
 */
type Writable<T> = T extends infer U ? { -readonly [P in keyof U]: U[P] } : never;

/**
 * @see https://stackoverflow.com/a/49683575/4907315
 */
// eslint-disable-next-line @typescript-eslint/ban-types
type OptionalPropertyNames<T> = { [K in keyof T]-?: ({} extends { [P in K]: T[K] } ? K : never) }[keyof T];

type RequiredPropertyNames<T> = Exclude<keyof T, OptionalPropertyNames<T>>;

/**
 * @see https://stackoverflow.com/a/49683575/4907315
 */
type SpreadProperties<L, R, K extends keyof L & keyof R> = { [P in K]: L[P] | R[P] };

/**
 * Removes the specified type from the value of properties of the target object type.
 * @example
 * ```ts
 * interface Obj {
 *     prop1: string;
 *     prop2: string | boolean;
 * }
 * type ExcludeBoolObj = ExcludePropValue<Obj, boolean>;
 * //=> { prop1: string; prop2: string }
 * ```
 */
type ExcludePropValue<T, U> = T extends infer O ? { [K in keyof O]: Exclude<O[K], U> } : unknown;

/**
 * 1. Remove properties that have only `undefined` type
 * 2. Remove `undefined` type from union type of each property
 * Note: This type function does NOT REMOVE optional properties!
 */
type OmitUndefProp<T> = ExcludePropValue<ConditionalExcept<T, undefined>, undefined>;

/**
 * @see https://stackoverflow.com/a/49683575/4907315
 */
type SpreadTwo<L, R> = Writable<
    // Remove `undefined` types from properties in L that don't exist in R.
    // If R is of type `unknown`, then all properties of L are targeted.
    & OmitUndefProp<Pick<L, Exclude<keyof L, keyof R>>>
    // Properties in R that don't exist in L
    // If R is of type `unknown`, then type `{}` will be returned.
    // Since R has already been processed as L, the value of the property does not contain the type `undefined`.
    // Therefore, there is no need to use `OmitUndefProp<T>`.
    & Pick<R, Exclude<keyof R, keyof L>>
    // Required properties in R will always override properties in L.
    & Pick<R, RequiredPropertyNames<R>>
    // Required properties in L and optional properties in R are merged into a single required property.
    & OmitUndefProp<SpreadProperties<L, R, RequiredPropertyNames<L> & OptionalPropertyNames<R>>>
    // Optional properties present in both L and R convert the value to a union type.
    // These properties are still optional because they can be abbreviated with L and R.
    & Partial<SpreadProperties<L, R, OptionalPropertyNames<L> & OptionalPropertyNames<R>>>
>;

/**
 * @see https://stackoverflow.com/a/49683575/4907315
 */
type Spread<A extends readonly [...unknown[]]> = (
    // @ts-expect-error TS2589: Type instantiation is excessively deep and possibly infinite.
    A extends [infer L, ...infer R] ? SpreadTwo<L, Spread<R>> : unknown
);

function objectEntriesWithSymbol<T extends PropertyKey, U>(o: Record<T, U>): Array<[T, U]> {
    return (Reflect.ownKeys(o) as T[])
        .filter(prop => Object.prototype.propertyIsEnumerable.call(o, prop))
        .map(prop => [prop, o[prop]]);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function mergeObjectWithoutUndefined<T extends object[]>(...objList: T): Spread<T>;
export function mergeObjectWithoutUndefined(
    ...objList: Array<Record<PropertyKey, unknown>>
): Record<PropertyKey, unknown> {
    return Object.fromEntries(
        objList
            .flatMap(objectEntriesWithSymbol)
            .filter(([, value]) => value !== undefined),
    );
}
