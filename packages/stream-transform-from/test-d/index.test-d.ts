import { expectType } from 'tsd';

import { transformFrom } from '../src';

import type * as stream from 'stream';

expectType<stream.Transform>(transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    for await (const chunk of source) {
        expectType<Buffer>(chunk);
    }
    yield '';
}));

/**
 * Source type
 */

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { objectMode: false });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<unknown>>(source);
    yield '';
}, { objectMode: true });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { objectMode: undefined });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { readableObjectMode: false });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { readableObjectMode: true });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { readableObjectMode: undefined });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { writableObjectMode: false });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<unknown>>(source);
    yield '';
}, { writableObjectMode: true });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { writableObjectMode: undefined });

declare const transformOpts: stream.TransformOptions;

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<unknown>>(source);
    yield '';
}, transformOpts);

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { ...transformOpts, objectMode: false, writableObjectMode: false });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { ...transformOpts, objectMode: undefined, writableObjectMode: undefined });

declare const boolTypeObjectMode: { objectMode: boolean };

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<unknown>>(source);
    yield '';
}, boolTypeObjectMode);

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { ...boolTypeObjectMode, objectMode: false });

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, { ...boolTypeObjectMode, objectMode: undefined });

declare const boolIndexSignature: Record<string, boolean>;

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<unknown>>(source);
    yield '';
}, boolIndexSignature);

declare const falseIndexSignature: Record<string, false>;

transformFrom(async function*(source) {
    expectType<AsyncIterableIterator<Buffer>>(source);
    yield '';
}, falseIndexSignature);
