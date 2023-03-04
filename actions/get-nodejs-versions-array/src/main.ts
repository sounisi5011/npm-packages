import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';

import * as core from '@actions/core';
import type * as semver from 'semver';
import semverRangeSubset from 'semver/ranges/subset.js';
import { isValidationErrorLike } from 'zod-validation-error';

import { isJSONErrorLike, parsePackageJson } from './package-json-parser.js';
import { minVersionMap, specifiedMaxMajorVersion, toSemverRange } from './semver-range.js';
import { tryReplaceAbsolutePathPrefix } from './utils.js';

type IndexAccessibleUnknown = Record<PropertyKey, unknown> | null | undefined;

class FailedError extends Error {
    constructor(message: string | readonly string[]) {
        super(([] as string[]).concat(message).join('\n'));
    }
}

async function getSupportedNodeVersionRange(arg: {
    cwd: string;
    env: Record<string, string | undefined>;
}): Promise<semver.Range> {
    const githubWorkspacePath = arg.env['GITHUB_WORKSPACE']
        ? path.resolve(arg.env['GITHUB_WORKSPACE'])
        : null;
    const pkgJsonFilepath = path.resolve(arg.cwd, 'package.json');
    const pkgJsonReadableFilepath = tryReplaceAbsolutePathPrefix(
        pkgJsonFilepath,
        githubWorkspacePath,
        `\${GITHUB_WORKSPACE}`,
    );

    core.info(`Reading "${pkgJsonReadableFilepath}"`);
    const pkgJsonText = await fs.readFile(pkgJsonFilepath, 'utf8')
        .catch((error: IndexAccessibleUnknown) => {
            if (error?.['code'] !== 'ENOENT') {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal
                throw error;
            }
            throw new FailedError(`"${pkgJsonReadableFilepath}" file does not exist`);
        });
    core.info(`Parsing "${pkgJsonReadableFilepath}"`);
    const pkgJson = parsePackageJson({ pkgJsonText, pkgJsonFilename: pkgJsonReadableFilepath });

    const supportedNodeVersionRange = toSemverRange(pkgJson.engines.node);
    if (!supportedNodeVersionRange) {
        throw new FailedError(`Invalid Node.js version range detected: "${pkgJson.engines.node}"`);
    }
    core.info(`Detected Node.js version range: "${supportedNodeVersionRange.raw}"`);

    return supportedNodeVersionRange;
}

function getSupportedMaxMajorVersion(
    { supportedNodeVersionRange }: { supportedNodeVersionRange: semver.Range },
): number {
    const supportedMaxMajorVersion = specifiedMaxMajorVersion(supportedNodeVersionRange);
    if (typeof supportedMaxMajorVersion !== 'number') {
        throw new FailedError([
            'The Node.js version range is not including an explicitly specified major version.',
            `This version range includes all versions: "${supportedNodeVersionRange.raw}"`,
            'However, you should include the maximum version that your repository explicitly supports into Node.js version range.',
            'For example, use the following version range: ">=0.x"',
        ]);
    }
    if (supportedMaxMajorVersion === Infinity) {
        throw new FailedError([
            'The Node.js version range does not include an explicitly specified major version.',
            `This version range includes only newer versions: "${supportedNodeVersionRange.raw}"`,
            'However, you should include the maximum version that your repository explicitly supports into Node.js version range.',
            'For example, use the following version range: ">=18.x"',
        ]);
    }
    if (supportedMaxMajorVersion === -Infinity) {
        throw new FailedError([
            `This version range excludes all versions: "${supportedNodeVersionRange.raw}"`,
            'You should specify a valid version range for the "engines.node" field in `package.json` file.',
            'For example, specify a version range like this: "16.x || >=18.x"',
        ]);
    }
    return supportedMaxMajorVersion;
}

function getVersionSpecList(
    { supportedNodeVersionRange }: {
        supportedNodeVersionRange: semver.Range;
    },
): string[] {
    const supportedMaxMajorVersion = getSupportedMaxMajorVersion({ supportedNodeVersionRange });
    const supportedMinVersionMap = minVersionMap(supportedNodeVersionRange);
    const supportedMinMajorVersion = Math.min(...supportedMinVersionMap.keys());

    const versionSpecList = [...Array(supportedMaxMajorVersion - supportedMinMajorVersion + 1).keys()]
        .flatMap(i => {
            const majorVersion = supportedMinMajorVersion + i;
            const minVersion = supportedMinVersionMap.get(majorVersion)?.version ?? `${majorVersion}.0.0`;
            // Note: The "maximum supported version" cannot be determined using only the major versions.
            //       For example, in the range "<= 18.0", the maximum version is "18.0.x".
            //       However, this logic does not distinguish it from "18.x".
            //       We thought such a version range was an edge case, so now it is still not exact logic.
            // TODO: Fix this bug
            const maxVersionSpec = `${majorVersion}.x`;

            return ([] as string[]).concat(
                supportedNodeVersionRange.test(minVersion)
                    ? minVersion
                    : [],
                semverRangeSubset(`${minVersion} - ${maxVersionSpec}`, supportedNodeVersionRange)
                    ? maxVersionSpec
                    : [],
            );
        });
    return versionSpecList;
}

async function run(): Promise<void> {
    const supportedNodeVersionRange = await getSupportedNodeVersionRange({
        cwd: process.cwd(),
        env: process.env,
    });

    const versionSpecList = getVersionSpecList({
        supportedNodeVersionRange,
    });

    await core.group('Got these Node.js versions', async () => {
        core.info(versionSpecList.map(v => `- ${v}`).join('\n'));
    });
    core.setOutput('versions-json', versionSpecList);
}

function handleError(error: unknown): void {
    core.setFailed(`Unhandled error: ${error instanceof Error ? String(error) : util.inspect(error)}`);
}

process.on('unhandledRejection', handleError);
run().catch((error: unknown) => {
    if (error instanceof FailedError || isJSONErrorLike(error) || isValidationErrorLike(error)) {
        core.setFailed(error.message);
        return;
    }
    handleError(error);
});
