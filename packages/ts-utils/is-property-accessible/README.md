# @sounisi5011/ts-utils-is-property-accessible

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/ts-utils-is-property-accessible.svg)](https://www.npmjs.com/package/@sounisi5011/ts-utils-is-property-accessible)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/ts-utils-is-property-accessible)](https://bundlephobia.com/result?p=%40sounisi5011%2Fts-utils-is-property-accessible)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Fts-utils-is-property-accessible)](https://packagephobia.com/result?p=%40sounisi5011%2Fts-utils-is-property-accessible)
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fts-utils%2Fis-property-accessible)](https://david-dm.org/sounisi5011/npm-packages?path=packages%2Fts-utils%2Fis-property-accessible)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

Check if a value is property accessible.

## Installation

```sh
npm install @sounisi5011/ts-utils-is-property-accessible
```

```sh
yarn add @sounisi5011/ts-utils-is-property-accessible
```

```sh
pnpm add @sounisi5011/ts-utils-is-property-accessible
```

## Usage

### TypeScript

```ts
import { isPropertyAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

if (isPropertyAccessible(value)) {
    // `value.anyProperty` is available!
    // Because the value is neither null nor undefined.
    // In addition, an index signature type will be added so that any property can be read.
} else {
    // If you try to read or write any property, a TypeError will probably be thrown.
    // Because the value is null or undefined.
}
```

### JavaScript (ES Modules)

```js
import { isPropertyAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

if (isPropertyAccessible(value)) {
    // `value.anyProperty` is available!
    // Because the value is neither null nor undefined.
} else {
    // If you try to read or write any property, a TypeError will probably be thrown.
    // Because the value is null or undefined.
}
```

### JavaScript (CommonJS)

```js
const { isPropertyAccessible } = require('@sounisi5011/ts-utils-is-property-accessible');

if (isPropertyAccessible(value)) {
    // `value.anyProperty` is available!
    // Because the value is neither null nor undefined.
} else {
    // If you try to read or write any property, a TypeError will probably be thrown.
    // Because the value is null or undefined.
}
```
