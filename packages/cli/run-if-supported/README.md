# @sounisi5011/run-if-supported

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/run-if-supported.svg)](https://www.npmjs.com/package/@sounisi5011/run-if-supported)
![Supported Node.js version: ^12.17.x || ^14.15.0 || 16.x || 17.x || >=18.x](https://img.shields.io/static/v1?label=node&message=%5E12.17.x%20%7C%7C%20%5E14.15.0%20%7C%7C%2016.x%20%7C%7C%2017.x%20%7C%7C%20%3E%3D18.x&color=brightgreen)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/run-if-supported)](https://bundlephobia.com/result?p=%40sounisi5011%2Frun-if-supported)
[![Install Size Details](https://packagephobia.com/badge?p=%40sounisi5011%2Frun-if-supported)](https://packagephobia.com/result?p=%40sounisi5011%2Frun-if-supported)
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fcli%2Frun-if-supported)](https://david-dm.org/sounisi5011/npm-packages?path=packages%2Fcli%2Frun-if-supported)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

Execute the command only if you are running on a supported version of Node and platform.
By using this CLI, you can run tests only on the supported node versions and platforms, for example, when testing in multiple environments with CI.

## Installation

```sh
npm install --save-dev @sounisi5011/run-if-supported
```

```sh
yarn add @sounisi5011/run-if-supported --dev
```

```sh
pnpm add --save-dev @sounisi5011/run-if-supported
```

## Usage

For example, if you want to run the command `jest`:

```console
$ run-if-supported jest
# ...
# jest's result
# ...
```

Add the `--verbose` option if you want to display the executed command and the reason why it was skipped.

```console
$ run-if-supported --verbose jest
> $ jest
# ...
# jest's result
# ...
```

```console
$ run-if-supported --verbose jest
Skipped command execution. ...
```

If you want to show only the reason for skipping, add the `--print-skip-message` option.

```console
$ run-if-supported --print-skip-message jest
# ...
# jest's result
# ...
```

```console
$ run-if-supported --print-skip-message jest
Skipped command execution. ...
```

For more information, use the `--help` option to see how to use it, or refer to the [`tests/cli.ts` file](./tests/cli.ts).

## Define supported versions

[npm-install-checks]: https://github.com/npm/npm-install-checks

To define the supported Node.js versions, use the [`engines.node` field](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#engines) of `package.json`.

```json
{
  "engines": {
    "node": "12.x || 14.x || 16.x"
  }
}
```

This CLI uses the [same logic as the npm CLI][npm-install-checks] to check the supported versions.

## Define supported platforms

To define the supported platforms, use the [`os` field](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#os) and [`cpu` field](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#cpu) of `package.json`.

```json
{
  "os": [
    "win32",
    "darwin",
    "linux"
  ],
  "cpu": [
    "any"
  ]
}
```

This CLI uses the [same logic as the npm CLI][npm-install-checks] to check the supported platforms.
