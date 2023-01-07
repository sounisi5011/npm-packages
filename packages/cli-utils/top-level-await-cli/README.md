# @sounisi5011/cli-utils-top-level-await

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/cli-utils-top-level-await.svg)](https://www.npmjs.com/package/@sounisi5011/cli-utils-top-level-await)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/cli-utils-top-level-await)](https://bundlephobia.com/result?p=%40sounisi5011%2Fcli-utils-top-level-await)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Fcli-utils-top-level-await)](https://packagephobia.com/result?p=%40sounisi5011%2Fcli-utils-top-level-await)
![Dependencies Status](https://img.shields.io/librariesio/release/npm/@sounisi5011/cli-utils-top-level-await)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

If the async function fails, set the [process exit code] to 1 and output the error to stderr.

[process exit code]: https://nodejs.org/api/process.html#process_process_exitcode

## Installation

```sh
npm install @sounisi5011/cli-utils-top-level-await
```

```sh
yarn add @sounisi5011/cli-utils-top-level-await
```

```sh
pnpm add @sounisi5011/cli-utils-top-level-await
```

## Usage

```js
const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

awaitMainFn(async () => {
    // ...
});
```
