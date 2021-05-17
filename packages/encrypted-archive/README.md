# @sounisi5011/encrypted-archive

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/encrypted-archive.svg)](https://www.npmjs.com/package/@sounisi5011/encrypted-archive)
![Supported Node.js version: ^12.3.0 || 14.x || 15.x || 16.x](https://img.shields.io/node/v/@sounisi5011/encrypted-archive)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/@sounisi5011/encrypted-archive)](https://bundlephobia.com/result?p=@sounisi5011/encrypted-archive) -->
<!-- [![Install Size Details](https://packagephobia.com/badge?p=@sounisi5011/encrypted-archive)](https://packagephobia.com/result?p=@sounisi5011/encrypted-archive) -->
[![Dependencies Status](https://status.david-dm.org/gh/sounisi5011/npm-packages.svg?path=packages%2Fencrypted-archive)](https://david-dm.org/sounisi5011/npm-packages?path=packages/encrypted-archive)
[![Build Status](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/npm-packages/actions/workflows/ci.yaml)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/26495b68302f7ff963c3/maintainability)](https://codeclimate.com/github/sounisi5011/npm-packages/maintainability)

Convert data into a single encrypted archive data that contains all metadata needed for decryption.

## Installation

```sh
npm install @sounisi5011/encrypted-archive
```

```sh
yarn add @sounisi5011/encrypted-archive
```

```sh
pnpm add @sounisi5011/encrypted-archive
```

## Usage

### Small data

If you have a short string or a small file of data to encrypt, you can use a simple function.

```js
const { encrypt, decrypt } = require('@sounisi5011/encrypted-archive');

const cleartext = 'Hello World!';
const password = '1234';

encrypt(cleartext, password, {
    // These options are optional, but it is recommended that you specify the appropriate options for your application.
    algorithm: 'chacha20-poly1305',
    keyDerivation: {
        algorithm: 'argon2d',
        iterations: 3,
        memory: 12,
        parallelism: 1,
    },
    // If the data to be encrypted is text, you can also compress the data.
    // Binary data (e.g. images, videos, etc.) can also be compressed,
    // but the effect of compression is often small and is not recommended.
    compress: 'gzip',
})
    .then(encryptedData => {
        // ...
    })
    .catch(error => {
        // ...
    });

// ----- //

const encryptedData = Buffer.from( ... );
decrypt(encryptedData, password)
    .then(decryptedData => {
        // ...
    })
    .catch(error => {
        // ...
    });
```

### Huge data

For huge files or data (e.g., hundreds of megabytes or tens of gigabytes), you can use [Node.js Stream](https://nodejs.org/docs/latest/api/stream.html) or Async Iteration.

#### Stream

```js
const fs = require('fs');
const stream = require('stream');
const { encryptStream, decryptStream } = require('@sounisi5011/encrypted-archive');

const password = '1234';

const inputStream = fs.createReadStream('very-large.mp4');
const outputStream = fs.createWriteStream('very-large.mp4.enc');

stream.pipeline(
    inputStream,
    encryptStream(password, {
        // These options are optional, but it is recommended that you specify the appropriate options for your application.
        algorithm: 'aes-256-gcm',
        keyDerivation: {
            algorithm: 'argon2d',
            iterations: 3,
            memory: 12,
            parallelism: 1,
        },
        // If the data to be encrypted is text, you can also compress the data.
        // Binary data (e.g. images, videos, etc.) can also be compressed,
        // but the effect of compression is often small and is not recommended.
        //compress: 'gzip',
    }),
    outputStream,
    error => {
        if (error) {
            // ...
        } else {
            // ...
        }
    },
);

// ----- //

stream.pipeline(
    fs.createReadStream('very-large.mp4.enc'),
    decryptStream(password),
    fs.createWriteStream('very-large.mp4'),
    error => {
        if (error) {
            // ...
        } else {
            // ...
        }
    },
);
```

#### Async Iteration

```js
const fs = require('fs');
const stream = require('stream');
const { encryptIterator, decryptIterator } = require('@sounisi5011/encrypted-archive');

const password = '1234';

const inputIterator = (async function*() {
    for await (const chunk of fs.createReadStream('very-large.mp4')) {
        yield chunk;
    }
})();
const encryptor = encryptIterator(password, {
    // These options are optional, but it is recommended that you specify the appropriate options for your application.
    algorithm: 'aes-256-gcm',
    keyDerivation: {
        algorithm: 'argon2d',
        iterations: 3,
        memory: 12,
        parallelism: 1,
    },
    // If the data to be encrypted is text, you can also compress the data.
    // Binary data (e.g. images, videos, etc.) can also be compressed,
    // but the effect of compression is often small and is not recommended.
    //compress: 'gzip',
});

(async () => {
    try {
        for await (const encryptedDataChunk of encryptor(inputIterator)) {
            // ...
        }
    } catch (error) {
        // ...
    }
})();

// ----- //

const inputEncryptedIterator = (async function*() {
    for await (const chunk of fs.createReadStream('very-large.mp4.enc')) {
        yield chunk;
    }
})();
const decryptor = decryptIterator(password);

(async () => {
    try {
        for await (const decryptedDataChunk of decryptor(inputEncryptedIterator)) {
            // ...
        }
    } catch (error) {
        // ...
    }
})();
```

## API

[`Buffer` object]: https://nodejs.org/api/buffer.html
[`Duplex` stream]: https://nodejs.org/api/stream.html#stream_class_stream_duplex
[`EncryptOptions`]: #type-encrypt-options
[`IteratorConverter` function]: #type-iterator-converter

### `encrypt(cleartext, password, options?)`

Returns a Promise giving a [`Buffer` object].

* `cleartext`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

* `options`

    see [`EncryptOptions`]

### `decrypt(encryptedData, password)`

Returns a Promise giving a [`Buffer` object].

* `encryptedData`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `encryptStream(password, options?)`

Returns a [`Duplex` stream].

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

* `options`

    see [`EncryptOptions`]

### `decryptStream(password)`

Returns a [`Duplex` stream].

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `encryptIterator(password, options?)`

Returns an [`IteratorConverter` function].

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

* `options`

    see [`EncryptOptions`]

### `decryptIterator(password)`

Returns an [`IteratorConverter` function].

* `password`

    Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

<h3 id="type-iterator-converter"><code>IteratorConverter(source)</code></h3>

Returns an AsyncIterableIterator giving a [`Buffer` object].

* `source`

    Type:

    ```ts
      Iterable<string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer>
    | AsyncIterable<string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer>
    ```

<h3 id="type-encrypt-options"><code>EncryptOptions</code></h3>

An object with the following properties:

* [`algorithm`](#type-encrypt-options--algorithm)
* [`keyDerivation`](#type-encrypt-options--key-derivation)
* [`compress`](#type-encrypt-options--compress)

All properties are optional.

<h4 id="type-encrypt-options--algorithm"><code>algorithm</code></h4>

Type: `CryptoAlgorithmName`

An encryption algorithm name string. Specify one of the following:

* `"aes-256-gcm"`
* `"chacha20-poly1305"` (default)

<h4 id="type-encrypt-options--key-derivation"><code>keyDerivation</code></h4>

Type: `KeyDerivationOptions`

[key derivation function]: https://en.wikipedia.org/wiki/Key_derivation_function

An object with the [key derivation function] name and options.
The key derivation function name is specified as a string in the `algorithm` property.
The other properties are options for the key derivation function.

Currently, the following key derivation functions are supported:

[Argon2]: https://github.com/P-H-C/phc-winner-argon2

* [Argon2]
    * `algorithm`
        * `"argon2d"` (default)
        * `"argon2id"`
    * `iterations`

        Type: `number`

        the number of iterations. default: `3`
    * `memory`

        Type: `number`

        used memory, in KiB. default: `12`
    * `parallelism`

        Type: `number`

        desired parallelism. default: `1`

<h4 id="type-encrypt-options--compress"><code>compress</code></h4>

Type: `CompressOptions | CompressOptions['algorithm']`

A compression algorithm name string, or an options object for the compression algorithm.
When specifying an object, the compression algorithm name is specified as a string in the `algorithm` property.
The other properties are options for the compression algorithm.

Currently, the following compression algorithm are supported:

[zlib options]: https://nodejs.org/docs/latest/api/zlib.html#zlib_class_options
[brotli options]: https://nodejs.org/docs/latest/api/zlib.html#zlib_class_brotlioptions

* Gzip
    * `algorithm`
        * `"gzip"`

    Other properties are passed to [zlib options].
    However, the following properties are not allowed:
    * `flush`
    * `finishFlush`
    * `dictionary`
    * `info`
    * `maxOutputLength`
* Brotli
    * `algorithm`
        * `"brotli"`

    Other properties are passed to [brotli options].
    However, the following properties are not allowed:
    * `flush`
    * `finishFlush`
    * `maxOutputLength`

## Structure of the encrypted archive

see [`docs/encrypted-archive-structure.md`](./docs/encrypted-archive-structure.md)
