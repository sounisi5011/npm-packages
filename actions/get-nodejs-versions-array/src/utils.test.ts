import { describe, expect, it } from 'vitest';

import { tryReplaceAbsolutePathPrefix } from './utils.js';

describe('tryReplaceAbsolutePathPrefix()', () => {
    it('do not replace targetAbsolutePath if a falsey value is passed to prefixAbsolutePath', () => {
        expect(tryReplaceAbsolutePathPrefix('/foo', undefined, '{hoge}')).toBe('/foo');
        expect(tryReplaceAbsolutePathPrefix('/foo', null, '{hoge}')).toBe('/foo');
        expect(tryReplaceAbsolutePathPrefix('/foo', '', '{hoge}')).toBe('/foo');
    });

    describe('if targetAbsolutePath starts with prefixAbsolutePath, replace with replaceValue', () => {
        it('unix paths', () => {
            expect(tryReplaceAbsolutePathPrefix('/foo', '/foo', '{hoge}')).toBe('{hoge}');
            // Trailing path segment separator is not removed for performance
            expect(tryReplaceAbsolutePathPrefix('/foo/', '/foo', '{hoge}')).toBe('{hoge}/');
            expect(tryReplaceAbsolutePathPrefix('/foo/', '/foo/', '{hoge}')).toBe('{hoge}');
            expect(tryReplaceAbsolutePathPrefix('/foo/bar', '/foo', '{hoge}')).toBe('{hoge}/bar');
            expect(tryReplaceAbsolutePathPrefix('/foo/bar/baz', '/foo', '{hoge}')).toBe('{hoge}/bar/baz');
            expect(tryReplaceAbsolutePathPrefix('/foo/bar/baz', '/foo/bar', '{hoge}')).toBe('{hoge}/baz');
        });
        it('windows paths', () => {
            expect(tryReplaceAbsolutePathPrefix('C:\\foo', 'C:\\foo', '{hoge}')).toBe('{hoge}');
            // Trailing path segment separator is not removed for performance
            expect(tryReplaceAbsolutePathPrefix('C:\\foo\\', 'C:\\foo', '{hoge}')).toBe('{hoge}\\');
            expect(tryReplaceAbsolutePathPrefix('C:\\foo\\bar', 'C:\\foo', '{hoge}')).toBe('{hoge}\\bar');
            expect(tryReplaceAbsolutePathPrefix('C:\\foo\\bar\\baz', 'C:\\foo', '{hoge}')).toBe('{hoge}\\bar\\baz');
            expect(tryReplaceAbsolutePathPrefix('C:\\foo\\bar\\baz', 'C:\\foo\\bar', '{hoge}')).toBe('{hoge}\\baz');
        });
    });

    it('if targetAbsolutePath does not start with prefixAbsolutePath, do not replace it', () => {
        expect(tryReplaceAbsolutePathPrefix('/foo', '/bar', '{hoge}')).toBe('/foo');
        expect(tryReplaceAbsolutePathPrefix('/foo/bar', '/bar/baz', '{hoge}')).toBe('/foo/bar');
    });

    it('if prefixAbsolutePath is not followed by a path segment separator, do not replace targetAbsolutePath', () => {
        expect(tryReplaceAbsolutePathPrefix('/fooo', '/foo', '{hoge}')).toBe('/fooo');
        // Trailing path segment separator is not removed for performance
        expect(tryReplaceAbsolutePathPrefix('/foo/bar', '/foo/', '{hoge}')).toBe('/foo/bar');
        expect(tryReplaceAbsolutePathPrefix('/foo/bar/baz', '/foo/', '{hoge}')).toBe('/foo/bar/baz');
        expect(tryReplaceAbsolutePathPrefix('/foo/bar/baz', '/foo/bar/', '{hoge}')).toBe('/foo/bar/baz');
    });
});
