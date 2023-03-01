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

/**
 * Get the maximum major version that is explicitly included in the passed semver range.
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
 * // These ranges are not including explicitly specified major versions. So `undefined` is returned.
 * specifiedMaxMajorVersion('*')   === undefined
 * specifiedMaxMajorVersion('x')   === undefined
 * specifiedMaxMajorVersion('')    === undefined
 * specifiedMaxMajorVersion('x.1') === undefined
 * specifiedMaxMajorVersion('*.2') === undefined
 *
 * // This range is explicitly specified as 0. So 0 is returned.
 * specifiedMaxMajorVersion('>=0.0.0') === 0
 */
export function specifiedMaxMajorVersion(semverRange: string | SemverRange): number | undefined {
    const range = semverRange instanceof SemverRange ? semverRange : new SemverRange(semverRange);
    const maxMajorVersion = range.set.flat().reduce<number | undefined>((maxMajorVersion, semverComparator) => {
        /**
         * The `semver` property may be the symbol value `semver.Comparator.ANY`.
         * This means that the range is `*`.
         */
        if (!(semverComparator.semver instanceof SemVer)) {
            return maxMajorVersion;
        }

        const majorVersion = (
                semverComparator.operator === '<'
                && semverComparator.semver.minor === 0
                && semverComparator.semver.patch === 0
            )
            ? semverComparator.semver.major - 1
            : semverComparator.semver.major;
        return Math.max(maxMajorVersion ?? -Infinity, majorVersion);
    }, undefined);

    /**
     * The `semver.Range` implementation converts `>=0.0.0` to `*`.
     * @see https://github.com/npm/node-semver/blob/v7.3.8/classes/range.js#L117-L118
     * This means that the above code cannot identify the difference between
     * a range where 0 is explicitly specified
     * and a range where the major version is not included.
     * Therefore, we use a regular expression on the input range string to check if the major version of 0 is explicitly included in it.
     */
    if (
        maxMajorVersion === undefined
        && />\s*=\s*(?:v\s*)?0+(?!\d)/.test(range.raw)
    ) return 0;

    return maxMajorVersion;
}
