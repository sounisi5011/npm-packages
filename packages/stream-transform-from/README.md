# @sounisi5011/stream-transform-from

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/stream-transform-from.svg)](https://www.npmjs.com/package/@sounisi5011/stream-transform-from)
![Supported Node.js version: ^12.17.x || 14.x || 15.x || 16.x](https://img.shields.io/node/v/@sounisi5011/stream-transform-from)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/stream-transform-from)](https://bundlephobia.com/result?p=@sounisi5011/stream-transform-from) -->
<!-- [![Install Size Details](https://packagephobia.com/badge?p=@sounisi5011/stream-transform-from)](https://packagephobia.com/result?p=@sounisi5011/stream-transform-from) -->
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fstream-transform-from)](https://david-dm.org/sounisi5011/npm-packages?path=packages/stream-transform-from)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

[`stream.Transform` class]: https://nodejs.org/docs/latest/api/stream.html#stream_class_stream_transform
[`Buffer` object]: https://nodejs.org/api/buffer.html

Create a [transform stream][`stream.Transform` class] from an async iterator.
This is [the last piece](https://github.com/nodejs/node/issues/27140#issuecomment-533266638) needed to convert between streams and async iterators/generators.

## Features

* No dependencies

    This package uses only the Node.js built-in [`stream.Transform` class].

* Strict type definition

    The exact type definitions for arguments and return values will be generated based on the `objectMode` option.

* Encoding arguments can be used

    You can use `encoding`, which is passed as the second argument of the [`transform._transform()` method](https://nodejs.org/docs/latest/api/stream.html#stream_transform_transform_chunk_encoding_callback).
    This allows you to safely convert a string to [`Buffer` object].

## Installation

```sh
npm install @sounisi5011/stream-transform-from
```

```sh
yarn add @sounisi5011/stream-transform-from
```

```sh
pnpm add @sounisi5011/stream-transform-from
```

## Usage

### Convert [`Buffer` objects][`Buffer` object]

```js
const fs = require('fs');
const stream = require('stream');

const { transformFrom } = require('@sounisi5011/stream-transform-from');

stream.pipeline(
  fs.createReadStream('input.txt', 'utf8'),
  transformFrom(async function*(source) {
    for await (const { chunk } of source) {
      yield chunk.toString('utf8').toUpperCase();
    }
  }),
  fs.createWriteStream('output.txt'),
  error => {
    if (error) {
      console.error(error);
    } else {
      console.log('done!');
    }
  }
);
```

### Convert any type value

```js
const stream = require('stream');

const { transformFrom } = require('@sounisi5011/stream-transform-from');

stream.pipeline(
  stream.Readable.from([1, 2, 3]),
  transformFrom(
    async function*(source) {
      for await (const { chunk } of source) {
        yield chunk + 2;
      }
    },
    { objectMode: true }
  ),
  // ...
  error => {
    if (error) {
      console.error(error);
    } else {
      console.log('done!');
    }
  }
);
```

### Convert string to [`Buffer`][`Buffer` object] using encoding

```js
const stream = require('stream');

const { transformFrom } = require('@sounisi5011/stream-transform-from');

stream.pipeline(
  // ...
  transformFrom(
    async function*(source) {
      for await (const { chunk, encoding } of source) {
        if (typeof chunk === 'string') {
          yield Buffer.from(chunk, encoding);
        }
      }
    },
    { writableObjectMode: true }
  ),
  // ...
  error => {
    if (error) {
      console.error(error);
    } else {
      console.log('done!');
    }
  }
);
```

## API

```js
const { transformFrom } = require('@sounisi5011/stream-transform-from');

// The return value is a Transform stream.
const transformStream = transformFrom(
  async function*(source) {
    // `source` is `AsyncIterableIterator<{ chunk: Buffer, encoding: BufferEncoding }>`
    //          or `AsyncIterableIterator<{ chunk: unknown, encoding: BufferEncoding }>` type

    // The value returned by `yield` keyword will be passed as the first argument of `transform.push()` method.
  },

  // The second argument is an options for the Transform stream.
  // The options are passed to the constructor function of the Transform class.
  // However, the following fields are not allowed:
  // + `construct`
  // + `read`
  // + `write`
  // + `writev`
  // + `final`
  // + `destroy`
  // + `transform`
  // + `flush`
  // The fields listed above will be ignored if specified.
  {}
);
```

## Related

* [generator-transform-stream](https://github.com/bealearts/generator-transform-stream)
