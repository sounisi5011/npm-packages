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
[`EncryptOptions`]: #encryptoptions
[`IteratorConverter` function]: #iteratorconvertersource

### `encrypt(cleartext, password, options?)`

Returns a Promise giving a [`Buffer` object].

#### `cleartext`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

#### `options`

see [`EncryptOptions`]

### `decrypt(encryptedData, password)`

Returns a Promise giving a [`Buffer` object].

#### `encryptedData`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `encryptStream(password, options?)`

Returns a [`Duplex` stream].

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

#### `options`

see [`EncryptOptions`]

### `decryptStream(password)`

Returns a [`Duplex` stream].

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `encryptIterator(password, options?)`

Returns an [`IteratorConverter` function].

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

#### `options`

see [`EncryptOptions`]

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `decryptIterator(password)`

Returns an [`IteratorConverter` function].

#### `password`

Type: `string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer`

### `IteratorConverter(source)`

Returns an AsyncIterableIterator giving a [`Buffer` object].

#### `source`

Type:

```ts
  Iterable<string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer>
| AsyncIterable<string | Buffer | TypedArray | DataView | ArrayBuffer | SharedArrayBuffer>
```

### `EncryptOptions`

## Structure of the encrypted archive

see [`docs/encrypted-archive-structure.md`](./docs/encrypted-archive-structure.md)
