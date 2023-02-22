import type * as stream from 'stream';

import { expectType } from 'tsd';

import { transformFrom } from '..';

expectType<stream.Transform>(transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<{ chunk: Buffer; encoding: BufferEncoding }>>(source);
    for await (const { chunk, encoding } of source) {
        expectType<Buffer>(chunk);
        expectType<BufferEncoding>(encoding);
    }
    yield '';
}));

declare const transformOpts: stream.TransformOptions;

declare const boolTypeObjectMode: { objectMode: boolean };

declare const boolIndexSignature: Record<string, boolean>;

/**
 * Output type
 */

// Object values are not allowed because the "objectMode" option has a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { objectMode: false });

// Object values are allowed because the "objectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { objectMode: true });

// Object values are not allowed because the "objectMode" option has a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { objectMode: undefined });

// Object values are not allowed because the "readableObjectMode" option has a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { readableObjectMode: false });

// Object values are allowed because the "readableObjectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { readableObjectMode: true });

// Object values are not allowed because the "readableObjectMode" option has a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { readableObjectMode: undefined });

// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { writableObjectMode: false });

// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { writableObjectMode: true });

// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { writableObjectMode: undefined });

// Object values are allowed because the "objectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { objectMode: true, readableObjectMode: false });

// Object values are allowed because the "readableObjectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { objectMode: false, readableObjectMode: true });

// Object values are allowed because the "objectMode" and "readableObjectMode" options have a value of `true`
transformFrom(async function*() {
    yield 42;
}, { objectMode: true, readableObjectMode: true });

// Object values are not allowed because the value may not be `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, transformOpts);

// Object values are allowed because the "objectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, objectMode: true });

// Object values are allowed because the "readableObjectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, readableObjectMode: true });

// Object values are allowed because the "objectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, objectMode: true, readableObjectMode: false });

// Object values are allowed because the "readableObjectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, objectMode: false, readableObjectMode: true });

// Object values are allowed because the "objectMode" and "readableObjectMode" options have a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, objectMode: true, readableObjectMode: true });

// Object values are not allowed because the "objectMode" and "readableObjectMode" options have a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { ...transformOpts, objectMode: undefined, writableObjectMode: undefined });

// Object values are not allowed because the value of the "objectMode" option may not be `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, boolTypeObjectMode);

// Object values are allowed because the "objectMode" option has a value of `true`
transformFrom(async function*() {
    yield 42;
}, { ...boolTypeObjectMode, objectMode: true });

// Object values are not allowed because the "objectMode" option has a value of not `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, { ...boolTypeObjectMode, objectMode: undefined });

// Object values are not allowed because the value may not be `true`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, boolIndexSignature);

declare const trueIndexSignature: Record<string, true>;

// Object values are not allowed because the value may be `undefined`
// @ts-expect-error TS2345
transformFrom(async function*() {
    yield 42;
}, trueIndexSignature);
