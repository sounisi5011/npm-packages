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
