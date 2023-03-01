import type SemverComparator from 'semver/classes/comparator.js';
import SemverRange from 'semver/classes/range.js';
import SemVer from 'semver/classes/semver.js';
import semverLt from 'semver/functions/lt.js';
import semverMinVersion from 'semver/ranges/min-version.js';

export function toSemverRange(semverRange: string): SemverRange | null {
    try {
        return new SemverRange(semverRange);
    } catch {
        return null;
    }
}

/**
 * @throws {TypeError} If an invalid `semverRange` string is passed, this error will be thrown from within `semver` package
 */
export function minVersionMap(semverRange: string | SemverRange): Map<number, SemVer> {
    const range = semverRange instanceof SemverRange ? semverRange : { raw: semverRange };
    return range.raw.split('||')
        .flatMap(singleRange => semverMinVersion(singleRange) ?? [])
        .reduce<Map<number, SemVer>>((map, newSemver) => {
            const existedSemver = map.get(newSemver.major);
            if (!existedSemver || semverLt(newSemver, existedSemver)) {
                map.set(newSemver.major, newSemver);
            }
            return map;
        }, new Map());
}

const SEMVER_MAJOR_VERSION_REGEXP = /(?<!(?:[-.+][0-9a-z]*?))\d+/ig;

const isExcludeAllComparator = (comparator: SemverComparator): boolean => (
    comparator.operator === '<'
    && comparator.semver.major === 0
    && comparator.semver.minor === 0
    && comparator.semver.patch === 0
);

/**
 * Get the maximum major version that is explicitly included in the passed semver range.
 * @returns 0 or more integers, `Infinity`, `-Infinity` or `undefined`
 * @throws {TypeError} If an invalid `semverRange` string is passed, this error will be thrown from within `semver` package
 * @example
 * specifiedMaxMajorVersion('14 || 16 || 18') === 18
 *
 * // The maximum major version of these ranges is 18, and 18 is included. So 18 is returned.
 * specifiedMaxMajorVersion('18')        === 18
 * specifiedMaxMajorVersion('^18')       === 18
 * specifiedMaxMajorVersion('~18')       === 18
 * specifiedMaxMajorVersion('<  18.1.0') === 18
 * specifiedMaxMajorVersion('<= 18.0.0') === 18
 * specifiedMaxMajorVersion('18.4.7')    === 18
 *
 * // The maximum major version of this range is 19, but 19 is not included. So 18 is returned.
 * specifiedMaxMajorVersion('< 19.0.0') === 18
 *
 * // These ranges also include 19, 20 and higher versions, but 18 is explicitly specified. So 18 is returned.
 * specifiedMaxMajorVersion('>= 18.0.0') === 18
 * specifiedMaxMajorVersion('>  18.0.0') === 18
 *
 * // These ranges include only versions 16 and above, but 16 is not explicitly specified. So `Infinity` is returned.
 * specifiedMaxMajorVersion('> 15')   === Infinity
 * specifiedMaxMajorVersion('> 15.x') === Infinity
 *
 * // These ranges exclude all versions. So `-Infinity` is returned.
 * specifiedMaxMajorVersion('< 0')     === -Infinity
 * specifiedMaxMajorVersion('< 0.0')   === -Infinity
 * specifiedMaxMajorVersion('< 0.0.0') === -Infinity
 *
 * // These ranges are not including explicitly specified major versions. So `undefined` is returned.
 * specifiedMaxMajorVersion('*')   === undefined
 * specifiedMaxMajorVersion('x')   === undefined
 * specifiedMaxMajorVersion('')    === undefined
 * specifiedMaxMajorVersion('x.1') === undefined
 * specifiedMaxMajorVersion('*.2') === undefined
 */
export function specifiedMaxMajorVersion(semverRange: string | SemverRange): number | undefined {
    const range = semverRange instanceof SemverRange ? semverRange : new SemverRange(semverRange);

    /**
     * Returns `-Infinity` if passed range excludes all versions
     */
    if (
        range.set.every(comparatorsList => (
            // Check if comparatorsList include `< 0.0.0`
            // These comparators are logical-and, so if even one `< 0.0.0` is included, this is the "range to exclude all versions"
            comparatorsList.some(isExcludeAllComparator)
        ))
    ) return -Infinity;

    /**
     * Detects all major versions included in the passed range string
     */
    const majorVersionsSet = new Set(
        [...range.raw.matchAll(SEMVER_MAJOR_VERSION_REGEXP)]
            .flatMap(([majorVersion]) => [
                Number(majorVersion),
                // Include a decremented version to detect ranges such as `<16.0.0`
                Math.max(0, Number(majorVersion) - 1),
            ]),
    );

    /**
     * If no major version is found, returns `undefined` because passed range is like `*`
     */
    if (majorVersionsSet.size < 1) return undefined;

    /**
     * Get only major versions included in the passed range
     */
    const includedMajorVersionsList = [...majorVersionsSet]
        .filter(majorVersion =>
            range.intersects(
                new SemverRange(`${majorVersion}.x.x`),
            )
        );

    /**
     * If there is no major version included in the passed range,
     * return `Infinity` because this range cannot include the explicitly specified major version.
     */
    if (includedMajorVersionsList.length < 1) return Infinity;

    return Math.max(...includedMajorVersionsList);
}
