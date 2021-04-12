import { expectType } from 'tsd';

import type { isReadonlyArray } from '.';

const isArray = Array.isArray as isReadonlyArray;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export function test1(param: string | readonly string[]): void {
    if (isArray(param)) {
        expectType<readonly string[]>(param);
    } else {
        expectType<string>(param);
    }

    if ((Array.isArray as isReadonlyArray)(param)) {
        expectType<readonly string[]>(param);
    } else {
        expectType<string>(param);
    }
}

export function test2(param: string | string[]): void {
    if (isArray(param)) {
        expectType<string[]>(param);
    } else {
        expectType<string>(param);
    }

    if ((Array.isArray as isReadonlyArray)(param)) {
        expectType<string[]>(param);
    } else {
        expectType<string>(param);
    }
}

export function test3(param: boolean | string[] | readonly number[]): void {
    if (isArray(param)) {
        expectType<string[] | readonly number[]>(param);
    } else {
        expectType<boolean>(param);
    }

    if ((Array.isArray as isReadonlyArray)(param)) {
        expectType<string[] | readonly number[]>(param);
    } else {
        expectType<boolean>(param);
    }
}

export function test4(param: unknown): void {
    if (isArray(param)) {
        expectType<readonly unknown[]>(param);
    } else {
        expectType<unknown>(param);
    }
}

export function test5<T>(param: T): void {
    if (isArray(param)) {
        expectType<T & readonly unknown[]>(param);
    } else {
        expectType<T>(param);
    }
}

/* eslint-disable @typescript-eslint/ban-types */
export function test6(param: {}): void {
    if (isArray(param)) {
        expectType<readonly unknown[]>(param);
    } else {
        expectType<{}>(param);
    }
    /* eslint-enable */
}

/*
 * see https://github.com/orta/TypeScript/blob/c69b255bf69469838a3b755961471a2cdd63fea7/tests/cases/compiler/consistentUnionSubtypeReduction.ts
 */

declare const a: readonly string[] | string;
declare const b: string[] | string;
declare const c: unknown;

if (isArray(a)) {
    expectType<readonly string[]>(a);
} else {
    expectType<string>(a);
}
expectType<readonly string[] | string>(a);

if (isArray(b)) {
    expectType<string[]>(b);
} else {
    expectType<string>(b);
}
expectType<string[] | string>(b);

if (isArray(c)) {
    expectType<readonly unknown[]>(c);
}

export function f<T>(_x: T): void {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const a: readonly T[] | string = null as any;
    const b: T[] | string = null as any;
    const c: T = null as any;
    /* eslint-enable */

    if (isArray(a)) {
        expectType<readonly T[]>(a);
    } else {
        expectType<string>(a);
    }
    expectType<readonly T[] | string>(a);

    if (isArray(b)) {
        expectType<T[]>(b);
    } else {
        expectType<string>(b);
    }
    expectType<T[] | string>(b);

    if (isArray(c)) {
        expectType<T & readonly unknown[]>(c);
    }
}
