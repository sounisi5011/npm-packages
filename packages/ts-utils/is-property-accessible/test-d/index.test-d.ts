/* eslint-disable @typescript-eslint/no-unused-expressions, @typescript-eslint/no-explicit-any */

import { expectType } from 'tsd';
import { isPropertyAccessible } from '..';

declare const unknownValue: unknown;

// @ts-expect-error TS2571: Object is of type 'unknown'.
unknownValue.foo;

if (isPropertyAccessible(unknownValue)) {
    expectType<unknown & Record<PropertyKey, unknown>>(unknownValue);
    expectType<unknown>(unknownValue['foo']);
}

[unknownValue]
    .filter(isPropertyAccessible)
    .forEach(value => {
        expectType<unknown & Record<PropertyKey, unknown>>(value);
        expectType<unknown>(value['foo']);
    });

// ----- ----- ----- ----- ----- //

declare const anyValue: any;

anyValue.foo;

if (isPropertyAccessible(anyValue)) {
    expectType<any>(anyValue);
    expectType<any>(anyValue.foo);
}

[anyValue]
    .filter(isPropertyAccessible)
    .forEach(value => {
        expectType<any>(value);
        expectType<any>(value.foo);
    });

// ----- ----- ----- ----- ----- //

declare const strValue: string;

expectType<number>(strValue.length);

// @ts-expect-error TS2339: Property 'foo' does not exist on type 'string'.
strValue.foo;

if (isPropertyAccessible(strValue)) {
    expectType<string & Record<PropertyKey, unknown>>(strValue);
    expectType<number>(strValue.length);
    expectType<unknown>(strValue['foo']);
}

[strValue]
    .filter(isPropertyAccessible)
    .forEach(value => {
        expectType<string & Record<PropertyKey, unknown>>(value);
        expectType<number>(value.length);
        expectType<unknown>(value['foo']);
    });

// ----- ----- ----- ----- ----- //

declare const numOrNullValue: number | null;

// @ts-expect-error TS2339: Property 'foo' does not exist on type 'number'.
numOrNullValue?.foo;

if (isPropertyAccessible(numOrNullValue)) {
    expectType<number & Record<PropertyKey, unknown>>(numOrNullValue);
    expectType<number>(numOrNullValue.valueOf());
    expectType<unknown>(numOrNullValue['foo']);
}

[numOrNullValue]
    .filter(isPropertyAccessible)
    .forEach(value => {
        expectType<number & Record<PropertyKey, unknown>>(value);
        expectType<number>(value.valueOf());
        expectType<unknown>(value['foo']);
    });

// ----- ----- ----- ----- ----- //

declare const multiValue: number | string | null | undefined;

// @ts-expect-error TS2339: Property 'foo' does not exist on type 'string | number'.
multiValue?.foo;

if (isPropertyAccessible(multiValue)) {
    expectType<(number | string) & Record<PropertyKey, unknown>>(multiValue);
    expectType<number | string>(multiValue.valueOf());
    expectType<unknown>(multiValue['foo']);
}

[multiValue]
    .filter(isPropertyAccessible)
    .forEach(value => {
        expectType<(number | string) & Record<PropertyKey, unknown>>(value);
        expectType<number | string>(value.valueOf());
        expectType<unknown>(value['foo']);
    });
