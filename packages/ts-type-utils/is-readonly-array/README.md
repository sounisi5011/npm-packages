# @sounisi5011/ts-type-util-is-readonly-array

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/ts-type-util-is-readonly-array.svg)](https://www.npmjs.com/package/@sounisi5011/ts-type-util-is-readonly-array)

Fix the type definition of [`Array.isArray()`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) method to accept readonly arrays.

## Installation

```sh
npm install @sounisi5011/ts-type-util-is-readonly-array
```

```sh
yarn add @sounisi5011/ts-type-util-is-readonly-array
```

```sh
pnpm add @sounisi5011/ts-type-util-is-readonly-array
```

## Usage

```ts
import { isReadonlyArray } from '@sounisi5011/ts-type-util-is-readonly-array';

const isArray = Array.isArray as isReadonlyArray;

if (isArray(value)) {
    // ...
}

function fn(param: string | readonly string[]) {
    if (isArray(param)) {
        // ...
    } else {
        // ...
    }
}
```

or

```ts
import { isReadonlyArray } from '@sounisi5011/ts-type-util-is-readonly-array';

if ((Array.isArray as isReadonlyArray)(value)) {
    // ...
}

function fn(param: string | readonly string[]) {
    if ((Array.isArray as isReadonlyArray)(param)) {
        // ...
    } else {
        // ...
    }
}
```
