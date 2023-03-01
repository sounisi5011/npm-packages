import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';

import * as core from '@actions/core';
import semverRangeSubset from 'semver/ranges/subset.js';
import { isValidationErrorLike } from 'zod-validation-error';

import { isJSONErrorLike, parsePackageJson } from './package-json-parser.js';
import { minVersionMap, specifiedMaxMajorVersion, toSemverRange } from './semver-range.js';
import { tryReplaceAbsolutePathPrefix } from './utils.js';

async function run(): Promise<void> {
    const githubWorkspacePath = process.env['GITHUB_WORKSPACE']
        ? path.resolve(process.env['GITHUB_WORKSPACE'])
        : null;
    const pkgJsonFilepath = path.resolve(process.cwd(), 'package.json');
    const pkgJsonReadableFilepath = tryReplaceAbsolutePathPrefix(
        pkgJsonFilepath,
        githubWorkspacePath,
        `\${GITHUB_WORKSPACE}`,
    );

    core.info(`Reading "${pkgJsonReadableFilepath}"`);
    const pkgJsonText = await fs.readFile(pkgJsonFilepath, 'utf8');
    core.info(`Parsing "${pkgJsonReadableFilepath}"`);
    const pkgJson = parsePackageJson({ pkgJsonText, pkgJsonFilename: pkgJsonReadableFilepath });
    const supportedNodeVersionRange = toSemverRange(pkgJson.engines.node);
    if (!supportedNodeVersionRange) {
        core.setFailed(`Invalid Node.js version range detected: "${pkgJson.engines.node}"`);
        return;
    }
    core.info(`Detected Node.js version range: "${supportedNodeVersionRange.raw}"`);

    const supportedMinVersionMap = minVersionMap(supportedNodeVersionRange);
    const supportedMinMajorVersion = Math.min(...supportedMinVersionMap.keys());
    const supportedMaxMajorVersion = specifiedMaxMajorVersion(supportedNodeVersionRange);
    if (typeof supportedMaxMajorVersion !== 'number') {
        core.setFailed([
            'The Node.js version range is not including an explicitly specified major version.',
            `This version range includes all versions: "${supportedNodeVersionRange.raw}"`,
            'However, you should include in the version range the maximum version that your repository explicitly supports.',
            'For example, use the following version range: ">= 0.x"',
        ].join('\n'));
        return;
    }
    if (supportedMaxMajorVersion === Infinity) {
        core.setFailed([
            'The Node.js version range does not include an explicitly specified major version.',
            `This version range includes only newer versions: "${supportedNodeVersionRange.raw}"`,
            'However, you should include in the version range the maximum version that your repository explicitly supports.',
            'For example, specify a version range like this: ">=18.x"',
        ].join('\n'));
        return;
    }
    if (supportedMaxMajorVersion === -Infinity) {
        core.setFailed([
            `This version range excludes all versions: "${supportedNodeVersionRange.raw}"`,
            'You should specify a valid version range for the "engines.node" field in `package.json` file.',
            'For example, specify a version range like this: "16.x || >=18.x"',
        ].join('\n'));
        return;
    }

    const versionSpecList: string[] = [];
    for (let majorVersion = supportedMinMajorVersion; majorVersion <= supportedMaxMajorVersion; majorVersion++) {
        const minVersion = supportedMinVersionMap.get(majorVersion)?.version ?? `${majorVersion}.0.0`;
        if (supportedNodeVersionRange.test(minVersion)) {
            versionSpecList.push(minVersion);
        }
        // Note: The "maximum supported version" cannot be determined using only the major versions.
        //       For example, in the range "<= 18.0", the maximum version is "18.0.x".
        //       However, this logic does not distinguish it from "18.x".
        //       We thought such a version range was an edge case, so now it is still not exact logic.
        // TODO: Fix this bug
        const maxVersionSpec = `${majorVersion}.x`;
        if (semverRangeSubset(`${minVersion} - ${maxVersionSpec}`, supportedNodeVersionRange)) {
            versionSpecList.push(maxVersionSpec);
        }
    }

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
    if (isJSONErrorLike(error) || isValidationErrorLike(error)) {
        core.setFailed(error.message);
        return;
    }
    handleError(error);
});
