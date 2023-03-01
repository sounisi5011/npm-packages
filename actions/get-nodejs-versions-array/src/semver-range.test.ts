import * as semver from 'semver';
import { describe, expect, it } from 'vitest';

import { minVersionMap, specifiedMaxMajorVersion, toSemverRange } from './semver-range.js';

describe('toSemverRange()', () => {
    it('returns an instance of `semver.Range` if the correct version range is passed', () => {
        expect(toSemverRange('18.x')).toBeInstanceOf(semver.Range);
    });

    it('return `null` if an invalid version range is passed', () => {
        expect(toSemverRange('foo')).toBe(null);
    });
});

describe('minVersionMap()', () => {
    it('returns the minimum version for each major version', () => {
        expect(minVersionMap('^14.6 || 16 || >=18')).toStrictEqual(
            new Map([
                [14, new semver.SemVer('14.6.0')],
                [16, new semver.SemVer('16.0.0')],
                [18, new semver.SemVer('18.0.0')],
            ]),
        );

        expect(
            minVersionMap('14 || 16.8 || 18'),
            'Need a minimum version within each major version, not the minimum version for the entire range',
        ).toStrictEqual(
            new Map([
                [14, new semver.SemVer('14.0.0')],
                [16, new semver.SemVer('16.8.0')], // This minimum version may be missed, so a minimum version for each major version is required
                [18, new semver.SemVer('18.0.0')],
            ]),
        );

        expect(
            minVersionMap('14.6 - 18'),
            'It is possible that there is a major version that is included in the range but not returned',
        ).toStrictEqual(
            new Map([
                [14, new semver.SemVer('14.6.0')],
                // Other major versions are not included,
                // but that is not a problem since they can all be assumed to be "x.0.0"
            ]),
        );
    });

    it('throw `TypeError` if an invalid version range is passed', () => {
        expect(() => minVersionMap('foo')).toThrow(TypeError);
    });
});

describe('specifiedMaxMajorVersion()', () => {
    describe('returns the maximum major version specified explicitly', () => {
        it.each<
            {
                range: Parameters<typeof specifiedMaxMajorVersion>[0];
                expected: ReturnType<typeof specifiedMaxMajorVersion>;
            }
        >([
            { range: '14 || 16 || 18', expected: 18 },
            /**
             * The maximum major version of these ranges is 18, and 18 is included. So 18 is returned.
             */
            { range: '18', expected: 18 },
            { range: '18.4', expected: 18 },
            { range: '18.x', expected: 18 },
            { range: '18.4.7', expected: 18 },
            { range: '18.x.x', expected: 18 },
            { range: '^18', expected: 18 },
            { range: '~18', expected: 18 },
            { range: '<=18', expected: 18 },
            { range: '<=18.0.0', expected: 18 },
            { range: '< 18.1', expected: 18 },
            { range: '< 18.1.0', expected: 18 },
            { range: '< 18.0.1', expected: 18 },
            /**
             * The maximum major version included in these range strings is 16, but 16 is out of range. So 15 is returned.
             */
            { range: '<16', expected: 15 },
            { range: '<16.0', expected: 15 },
            { range: '<16.0.0', expected: 15 },
            /**
             * These ranges also include 15 and higher versions, but 14 is explicitly specified. So 14 is returned.
             */
            { range: '>= 14', expected: 14 },
            { range: '>= 14.x', expected: 14 },
            { range: '>= 14.0.0', expected: 14 },
            { range: '>= 14.0.1', expected: 14 },
            { range: '>= 14.1', expected: 14 },
            { range: '>  14.0', expected: 14 },
            { range: '>  14.0.0', expected: 14 },
            { range: '>  14.0.1', expected: 14 },
            /**
             * These ranges include only versions 16 and above, but 16 is not explicitly specified. So `Infinity` is returned.
             */
            { range: '> 15', expected: Infinity },
            { range: '> 15.x', expected: Infinity },
            { range: '> 15.x.2', expected: Infinity },
            // However, if other versions are included, `Infinity` will not be returned
            { range: '> 15 || 16', expected: 16 },
            { range: '17 || > 15.x', expected: 17 },
            { range: '> 15.x.2 || 14', expected: 14 },
            /**
             * These ranges exclude all versions. So `-Infinity` is returned.
             */
            { range: '<0', expected: -Infinity },
            { range: '<v0', expected: -Infinity },
            { range: '<0.0', expected: -Infinity },
            { range: '<v0.0', expected: -Infinity },
            { range: '<0.0.0', expected: -Infinity },
            { range: '<v0.0.0', expected: -Infinity },
            /**
             * These ranges are explicitly specified as 0. So 0 is returned.
             */
            { range: '0', expected: 0 },
            { range: 'v0', expected: 0 },
            { range: '=0', expected: 0 },
            { range: '=v0', expected: 0 },
            { range: '<0.0.1', expected: 0 },
            { range: '<v0.0.1', expected: 0 },
            { range: '<=0', expected: 0 },
            { range: '<=v0', expected: 0 },
            { range: '<=0.0', expected: 0 },
            { range: '<=v0.0', expected: 0 },
            { range: '<=0.0.0', expected: 0 },
            { range: '<=v0.0.0', expected: 0 },
            { range: '>0.0', expected: 0 },
            { range: '>v0.0', expected: 0 },
            { range: '>0.0.0', expected: 0 },
            { range: '>v0.0.0', expected: 0 },
            // The `semver.Range` class implementation converts these ranges (like `>=0.0.0`) to `*`.
            // see https://github.com/npm/node-semver/blob/v7.3.8/classes/range.js#L117-L118
            // This means that without parsing the original range string,
            // it is not possible to know if 0 is explicitly specified.
            // This tests checks whether these ranges also return 0.
            { range: '>=0', expected: 0 },
            { range: '>=v0', expected: 0 },
            { range: '>=0.0', expected: 0 },
            { range: '>=v0.0', expected: 0 },
            { range: '>=0.0.0', expected: 0 },
            { range: '>=v0.0.0', expected: 0 },
            /**
             * These ranges are not including explicitly specified major versions. So `undefined` is returned.
             */
            { range: '', expected: undefined },
            { range: '*', expected: undefined },
            { range: 'x', expected: undefined },
            { range: 'X', expected: undefined },
            { range: 'x.0', expected: undefined },
            { range: '*.1.2', expected: undefined },
            { range: '*.1.2', expected: undefined },
        ])('specifiedMaxMajorVersion($range) -> $expected', ({ range, expected }) => {
            expect(specifiedMaxMajorVersion(range)).toStrictEqual(expected);
        });
    });

    it('throw `TypeError` if an invalid version range is passed', () => {
        expect(() => specifiedMaxMajorVersion('foo')).toThrow(TypeError);
    });
});
