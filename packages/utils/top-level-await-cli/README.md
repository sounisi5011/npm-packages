# @sounisi5011/utils-top-level-await-cli

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/utils-top-level-await-cli.svg)](https://www.npmjs.com/package/@sounisi5011/utils-top-level-await-cli)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/utils-top-level-await-cli)](https://bundlephobia.com/result?p=%40sounisi5011%2Futils-top-level-await-cli)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Futils-top-level-await-cli)](https://packagephobia.com/result?p=%40sounisi5011%2Futils-top-level-await-cli)
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Futils%2Ftop-level-await-cli)](https://david-dm.org/sounisi5011/npm-packages?path=packages%2Futils%2Ftop-level-await-cli)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

If the async function fails, set the [process exit code] to 1 and output the error to stderr.

[process exit code]: https://nodejs.org/api/process.html#process_process_exitcode

## Installation

```sh
npm install @sounisi5011/utils-top-level-await-cli
```

```sh
yarn add @sounisi5011/utils-top-level-await-cli
```

```sh
pnpm add @sounisi5011/utils-top-level-await-cli
```

## Usage

```js
const { awaitMainFn } = require('@sounisi5011/utils-top-level-await-cli');

awaitMainFn(async () => {
    // ...
});
```
