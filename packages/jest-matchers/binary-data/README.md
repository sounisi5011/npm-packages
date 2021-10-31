# @sounisi5011/jest-binary-data-matchers

<!-- [![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/jest-binary-data-matchers.svg)](https://www.npmjs.com/package/@sounisi5011/jest-binary-data-matchers) -->
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/jest-binary-data-matchers)](https://bundlephobia.com/result?p=%40sounisi5011%2Fjest-binary-data-matchers)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Fjest-binary-data-matchers)](https://packagephobia.com/result?p=%40sounisi5011%2Fjest-binary-data-matchers) -->
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fjest-matchers%2Fbinary-data)](https://david-dm.org/sounisi5011/npm-packages?path=packages%2Fjest-matchers%2Fbinary-data)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

Custom jest matchers to test binary data.

## Installation

```sh
npm install @sounisi5011/jest-binary-data-matchers
```

```sh
yarn add @sounisi5011/jest-binary-data-matchers
```

```sh
pnpm add @sounisi5011/jest-binary-data-matchers
```

## Setup

Add `"@sounisi5011/jest-binary-data-matchers"` to your [Jest `setupFilesAfterEnv` configuration](https://jestjs.io/docs/configuration#setupfilesafterenv-array).

```json
"jest": {
  "setupFilesAfterEnv": ["@sounisi5011/jest-binary-data-matchers"]
}
```

### TypeScript

In addition to the steps above, add to [the `types` flag](https://www.staging-typescript.org/tsconfig#types) in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    "types": ["@sounisi5011/jest-binary-data-matchers"]
  }
}
```

## API

### Byte size

Compare number of bytes.
If the comparison fails, display the human readable byte size.

#### `.toBeByteSize(expected: number | bigint | ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the number of bytes in `received` and `expected` are equal.
If the comparison fails, display the human readable byte size.

```js
expect(12).toBeByteSize(12);
expect(12n).toBeByteSize(12);
expect(new ArrayBuffer(12)).toBeByteSize(12);
expect(new Uint8Array(12)).toBeByteSize(12);
expect(Buffer.alloc(12)).toBeByteSize(12);
expect(Buffer.from('abcdefghijkl')).toBeByteSize(12);

expect(Buffer.from('abcdefghijkl')).toBeByteSize(12n);
expect(Buffer.from('abcdefghijkl')).toBeByteSize(new Uint8Array(12));
expect(Buffer.from('abcdefghijkl')).toBeByteSize(new Uint16Array(6));
expect(Buffer.from('abcdefghijkl')).toBeByteSize(new Uint32Array(3));

expect(13).not.toBeByteSize(12);
expect(11n).not.toBeByteSize(12);
expect(new ArrayBuffer(16)).not.toBeByteSize(12);
expect(Buffer.from('vore')).not.toBeByteSize(12);
```

#### `.toBeGreaterThanByteSize(expected: number | bigint | ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the number of bytes in `received` and `expected` are `received > expected`.
If the comparison fails, display the human readable byte size.

#### `.toBeGreaterThanOrEqualByteSize(expected: number | bigint | ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the number of bytes in `received` and `expected` are `received >= expected`.
If the comparison fails, display the human readable byte size.

#### `.toBeLessThanByteSize(expected: number | bigint | ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the number of bytes in `received` and `expected` are `received < expected`.
If the comparison fails, display the human readable byte size.

#### `.toBeLessThanOrEqualByteSize(expected: number | bigint | ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the number of bytes in `received` and `expected` are `received <= expected`.
If the comparison fails, display the human readable byte size.

### Binary data structure

#### `.toBytesEqual(expected: ArrayBuffer | SharedArrayBuffer | TypedArray | DataView)`

Compare whether the binary data of `received` and `expected` are equal.
If the comparison fails, display the difference in binary data.

```js
expect(Buffer.from('1234')).toBytesEqual(Buffer.from('1234'));
expect(new Uint8Array([0x31, 0x32, 0x33, 0x34])).toBytesEqual(Buffer.from('1234'));
expect(new Uint32Array([0x34333231])).toBytesEqual(Buffer.from('1234'));

expect(Buffer.from('123')).not.toBytesEqual(Buffer.from('1234'));
expect(Buffer.from('abcd')).not.toBytesEqual(Buffer.from('1234'));
expect(new Uint32Array([42])).not.toBytesEqual(new Uint8Array([42]));
expect(new Float32Array([42])).not.toBytesEqual(new Uint8Array([42]));
```
