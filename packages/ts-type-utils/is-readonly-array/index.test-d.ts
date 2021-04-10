import { expectType } from 'tsd';

import type { isReadonlyArray } from '.';

const isArray = Array.isArray as isReadonlyArray;

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

const data1: string | readonly string[] = [];

if (isArray(data1)) {
    expectType<readonly string[]>(data1);
} else {
    expectType<string>(data1);
}

if ((Array.isArray as isReadonlyArray)(data1)) {
    expectType<readonly string[]>(data1);
} else {
    expectType<string>(data1);
}

const data2: string | string[] = [];

if (isArray(data2)) {
    expectType<string[]>(data2);
} else {
    expectType<string>(data2);
}

if ((Array.isArray as isReadonlyArray)(data2)) {
    expectType<string[]>(data2);
} else {
    expectType<string>(data2);
}

const data3: boolean | string[] | readonly number[] = [];

if (isArray(data3)) {
    expectType<string[] | readonly number[]>(data3);
} else {
    expectType<boolean>(data3);
}

if ((Array.isArray as isReadonlyArray)(data3)) {
    expectType<string[] | readonly number[]>(data3);
} else {
    expectType<boolean>(data3);
}

const data4: unknown = [];

if (isArray(data4)) {
    expectType<readonly unknown[]>(data4);
} else {
    expectType<unknown>(data4);
}
