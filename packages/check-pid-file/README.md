# @sounisi5011/check-pid-file

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/check-pid-file.svg)](https://www.npmjs.com/package/@sounisi5011/check-pid-file)
![Supported Node.js version: ^12.17.x || 14.x || 15.x || 16.x || 17.x || >=18.x](https://img.shields.io/static/v1?label=node&message=%5E12.17.x%20%7C%7C%2014.x%20%7C%7C%2015.x%20%7C%7C%2016.x%20%7C%7C%2017.x%20%7C%7C%20%3E%3D18.x&color=brightgreen)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/check-pid-file)](https://bundlephobia.com/result?p=%40sounisi5011%2Fcheck-pid-file)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Fcheck-pid-file)](https://packagephobia.com/result?p=%40sounisi5011%2Fcheck-pid-file)
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fcheck-pid-file)](https://david-dm.org/sounisi5011/npm-packages?path=packages%2Fcheck-pid-file)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

Use the PID file to check which processes have already started and prevent multiple executions.

## Attention

This package **DOES NOT use the file locking provided by the file system**.
Because Node.js does not provide an API for file locking.

## Features

* Automatically creates PID files and deletes them when the program is terminated.

* Overwrites a PID file specified with a non-existent process id.

## Installation

```sh
npm install @sounisi5011/check-pid-file
```

```sh
yarn add @sounisi5011/check-pid-file
```

```sh
pnpm add @sounisi5011/check-pid-file
```

## Usage

```js
const { isProcessExist } = require('@sounisi5011/check-pid-file');

// ----- //

(async () => {
  try {
    // Read the PID file and check if the specified process exists.
    // If it does not exist, recreate the PID file.
    // It also automatically deletes the PID file when the program is terminated.
    if (await isProcessExist('/path/to/pid-file.pid')) {
      // The process exists with the number specified in the PID file.
      // In this case, the program SHOULD NOT continue processing because there is already another process running.
    } else {
      // The following cases are applicable:
      // + The process does not exist with the number specified in the PID file.
      // + The same number as the current process id is specified in the PID file.
      // + The structure of the PID file is unknown.
      // In this case, the program SHOULD continue processing because no other processes are running.
    }
  } catch (error) {
    // Exceptions may be thrown due to file system errors, etc.
  }
})();
```

## References

* [Preventing duplicate cron job executions - Benjamin Cane](https://bencane.com/2015/09/22/preventing-duplicate-cron-job-executions/)
