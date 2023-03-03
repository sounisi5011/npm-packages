import os from 'node:os';
import path from 'node:path';

import { execa, execaNode, Options as ExecaOptions } from 'execa';
import { beforeAll, describe, expect, it, test } from 'vitest';

import pkg from '../package.json';
import { cachedPromise, createTempDir, createTempFile, getDirpath } from '../tests/helpers/utils.js';

const PACKAGE_ROOT = getDirpath(import.meta, '..');
const MAIN_FILE_PATH = path.resolve(PACKAGE_ROOT, './dist/index.js');

/**
 * @see https://github.com/vitest-dev/vitest/blob/v0.29.2/packages/expect/src/jest-asymmetric-matchers.ts
 * @see https://github.com/facebook/jest/blob/v29.4.3/packages/expect/src/types.ts#L76-L81
 */
interface AsymmetricMatcherInterface {
    asymmetricMatch: (other: unknown) => boolean;
    toString: () => string;
    getExpectedType?: () => string;
    toAsymmetricMatcher?: () => string;
}

// eslint-disable-next-line vitest/no-hooks
beforeAll(async () => {
    await execa('pnpm', ['run', 'build-with-cache', '--', '--output-logs=errors-only'], { cwd: PACKAGE_ROOT });
}, 60 * 1000);

// Cache the results of command execution
const execMain = cachedPromise((opt: ExecaOptions = {}) =>
    execaNode(
        MAIN_FILE_PATH,
        // When running unit tests on GitHub Actions, the tests fail due to passed environment variables.
        // So, disallow inheritance of environment variables.
        Object.assign(opt, {
            extendEnv: false,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            env: opt.env || {}, // see https://github.com/sindresorhus/execa/issues/527
        }),
    )
);

function parseGitHubError(stdout: string | undefined): string[] {
    if (typeof stdout !== 'string') return [];
    return [...stdout.matchAll(/(?:^|[\r\n])::error(?: [^:\r\n]*)?::(?<error>[^\r\n]*)/gi)]
        .flatMap(({ groups }) =>
            (!groups || typeof groups['error'] !== 'string')
                ? []
                : [
                    groups['error'].replace(/%([0-9a-f]{2})/gi, (_, charCode: string) =>
                        String.fromCodePoint(Number.parseInt(charCode, 16))),
                ]
        );
}

/**
 * A regular expression that matches the contents of `GITHUB_OUTPUT` file.
 * @see https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable
 * @see https://gotohayato.com/content/558/
 * Note: As you can see, we recommend that you do not edit while looking directly at this regular expression.
 *       If you do edit this, please debug it using Regexper.
 *       @see https://regexper.com/
 */
const outputFileRegExp: RegExp = (() => {
    // Line Terminator Sequence
    // ECMAScript regular expressions treat not only LF and CRLD, but also single CR, LS, and PS as line terminators.
    // So we do not use `^` and `$`, we use this pattern.
    const lts = String.raw`\r?\n`;
    // Single character that is not the start of an Line Terminator Sequence
    const nonLtChar = String.raw`(?:(?!${lts}).)`;
    // Beginning Of String
    // This is a pattern that always matches the beginning of string even if the `m` flag is used.
    const bos = String.raw`(?<!.)`;
    // End Of String
    // This is a pattern that always matches the end of string even if the `m` flag is used.
    const eos = String.raw`(?!.)`;
    // Beginning Of Line
    const bol = String.raw`(?:${bos}|(?<=${lts}))`;
    // End Of Line
    const eol = String.raw`(?:(?=${lts})|${eos})`;

    const name = String.raw`(?:(?!=|<<${nonLtChar})${nonLtChar})+`;
    const multiLineValueOneLine = String.raw`(?!\3${eol})${nonLtChar}*`;
    const multiLineValue = String.raw`(?:(?:${lts})+(?:${multiLineValueOneLine})?)+`;

    const nameGroup = String.raw`(?<name>${name})`;
    const singleLineValueGroup = String.raw`(?<singleLineValue>${nonLtChar}*)`;
    const delimiterGroup = String.raw`(?<delimiter>${nonLtChar}+)`;
    const multiLineValueGroup = String.raw`(?<multiLineValue>${multiLineValue})`;
    const value = String.raw`(?:=${singleLineValueGroup}|<<${delimiterGroup}${multiLineValueGroup}\3)`;

    return new RegExp(String.raw`${bol}${nameGroup}${value}${eol}`, 'gms');
})();

function parseGitHubOutputFile(fileData: string): Array<{
    name: string;
    value: string;
    delimiter: string | undefined;
}> {
    return [...fileData.matchAll(outputFileRegExp)].map(({ groups }) => ({
        name: groups?.['name'] ?? '',
        value: groups?.['singleLineValue'] ?? groups?.['multiLineValue'] ?? '',
        delimiter: groups?.['delimiter'],
    }));
}

test('print readable info', async () => {
    const { stdout, stderr, githubOutput } = await createTempFile(async ({ tempFilepath, readTempFile }) =>
        Object.assign(
            await execMain({
                cwd: PACKAGE_ROOT,
                env: {
                    GITHUB_WORKSPACE: PACKAGE_ROOT,
                    GITHUB_OUTPUT: tempFilepath,
                },
            }),
            { githubOutput: await readTempFile() },
        )
    );

    const stdoutLines = stdout
        // `@actions/core@1.10.0` uses `os.EOL` instead of `"\n"` for the line break character.
        // This test also follows `@actions/core` and uses `os.EOL` to split lines.
        // see https://github.com/actions/toolkit/blob/1f4b3fac06b689186037c0a52e1e876e18de521d/packages/core/__tests__/core.test.ts#L496-L504
        .split(os.EOL);
    const versionsList = {
        startLine: 4,
        endLine: -1,
    };
    expect([
        stdoutLines.slice(0, versionsList.startLine),
        stdoutLines.slice(versionsList.startLine, versionsList.endLine),
        stdoutLines.slice(versionsList.endLine),
    ]).toStrictEqual([
        [
            `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
            `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
            `Detected Node.js version range: "${pkg.engines.node}"`,
            '::group::Got these Node.js versions',
        ],
        // Node.js versions should be printed as a list in Markdown format with "- " prefixed
        // The nested `.not` used here means:
        //     all element of actual array value is a string matching this pattern
        expect.not.arrayContaining([
            expect.not.stringMatching(/^- \d+\.(?:x|\d+\.\d+)$/),
        ]),
        [
            '::endgroup::',
        ],
    ]);

    expect(stderr).toBe('');

    expect(parseGitHubOutputFile(githubOutput))
        .toContainEqual(expect.objectContaining({
            name: 'versions-json',
            value: expect.stringMatching(/^\s*\[\s*"[^"]+"(?:\s*,\s*"[^"]+")*\s*\]\s*$/),
        }));
});

describe('if the GITHUB_WORKSPACE environment variable is exists, display readable filepaths', () => {
    it('if GITHUB_WORKSPACE env is exists', async () => {
        const result = execMain({ cwd: PACKAGE_ROOT, env: { GITHUB_WORKSPACE: PACKAGE_ROOT } });
        await expect(result)
            .resolves.toMatchObject({
                stdout: expect.stringContaining(`"\${GITHUB_WORKSPACE}${path.sep}package.json"`),
            });
        await expect(result)
            .resolves.toMatchObject({
                stdout: expect.not.stringContaining(`"${PACKAGE_ROOT}${path.sep}package.json"`),
            });
    });

    it('if GITHUB_WORKSPACE env is not exists', async () => {
        const result = execMain({ cwd: PACKAGE_ROOT });
        await expect(result)
            .resolves.toMatchObject({
                stdout: expect.stringContaining(`"${PACKAGE_ROOT}${path.sep}package.json"`),
            });
        await expect(result)
            .resolves.toMatchObject({
                stdout: expect.not.stringContaining(`"\${GITHUB_WORKSPACE}${path.sep}package.json"`),
            });
    });
});

describe('show errors', () => {
    interface ErrorTestCase {
        pkgJson: unknown;
        expected: {
            stdoutAndStderr: ReadonlyArray<string | AsymmetricMatcherInterface>;
            error: string | AsymmetricMatcherInterface | ReadonlyArray<string | AsymmetricMatcherInterface>;
        };
    }

    it('package.json file does not exist', async () => {
        const { githubWorkspace, result } = await createTempDir(async ({ tempDirpath }) => {
            const result = execaNode(MAIN_FILE_PATH, {
                cwd: tempDirpath,
                env: { GITHUB_WORKSPACE: tempDirpath },
                all: true,
                // When running unit tests on GitHub Actions, the tests fail due to passed environment variables.
                // So, disallow inheritance of environment variables.
                extendEnv: false,
            });
            await result.catch(() => null);
            return { githubWorkspace: tempDirpath, result };
        });
        await expect(result)
            .rejects.toMatchObject({
                all: [
                    `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                    `::error::Unhandled error: Error: ENOENT: no such file or directory, open '${githubWorkspace}${path.sep}package.json'`,
                ].join(os.EOL),
            });
    });

    it.each(
        Object.entries<ErrorTestCase>({
            'package.json file with invalid JSON': {
                pkgJson: '{\n  "foo": 42,\r  "bar": \r\n}',
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        expect.stringMatching(/^::error::/),
                    ],
                    error: expect.stringMatching(
                        new RegExp(
                            [
                                /^/,
                                // `parse-json@6.0.2` changes the error message to be more readable as follows:
                                //
                                // + Add hex notation for unexpected tokens
                                //   This is performed within the `json-parse-even-better-errors@^2.3.1` package of dependencies.
                                //   see https://github.com/sindresorhus/parse-json/blob/v6.0.2/index.js#L21
                                //   see see https://github.com/sindresorhus/parse-json/blob/v6.0.2/package.json#L39
                                //   see https://github.com/npm/json-parse-even-better-errors/blob/v2.3.1/index.js#L20-L22
                                /Unexpected token "." \(0x[0-9A-F]{2}\) in JSON at position \d+/,
                                // + Quote the JSON string at error location using "while parsing ..." format
                                //   This is performed within the `json-parse-even-better-errors@^2.3.1` package of dependencies.
                                //   see https://github.com/sindresorhus/parse-json/blob/v6.0.2/index.js#L21
                                //   see see https://github.com/sindresorhus/parse-json/blob/v6.0.2/package.json#L39
                                //   see https://github.com/npm/json-parse-even-better-errors/blob/v2.3.1/index.js#L38-L46
                                / while parsing near "(?:[^"\\]|\\.)+"/,
                                // + Add a JSON filename using "in {filename}" format
                                //   see https://github.com/sindresorhus/parse-json/blob/v6.0.2/index.js#L7
                                / in \${GITHUB_WORKSPACE}\/package\.json/,
                                // + Add a code frame
                                //   see https://github.com/sindresorhus/parse-json/blob/v6.0.2/index.js#L8
                                //
                                //   Note: We do not test for the inclusion of code frames in error messages.
                                //         If code frames are lost in the future, JSON errors are already readable.
                                / ?(?:\r?\n|$)/,
                            ].map(regexp => regexp.source).join(''),
                            's',
                        ),
                    ),
                },
            },
            'package.json file does not have "engines" field': {
                pkgJson: {},
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        `Invalid "package.json" file detected: Required at "engines" in '\${GITHUB_WORKSPACE}${path.sep}package.json'`,
                    ],
                },
            },
            'package.json file does not have "engines.node" field': {
                pkgJson: {
                    'engines': {},
                },
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        `Invalid "package.json" file detected: Required at "engines.node" in '\${GITHUB_WORKSPACE}${path.sep}package.json'`,
                    ],
                },
            },
            'an invalid semver range is specified': {
                pkgJson: {
                    'engines': {
                        'node': 'foo',
                    },
                },
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        'Invalid Node.js version range detected: "foo"',
                    ],
                },
            },
            'all versions are supported, but the maximum major version is not explicitly specified': {
                pkgJson: {
                    'engines': {
                        'node': '*',
                    },
                },
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        'Detected Node.js version range: "*"',
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        'The Node.js version range is not including an explicitly specified major version.',
                        'This version range includes all versions: "*"',
                        'However, you should include the maximum version that your repository explicitly supports into Node.js version range.',
                        'For example, use the following version range: ">=0.x"',
                    ],
                },
            },
            'maximum major version explicitly specified not included in supported range': {
                pkgJson: {
                    'engines': {
                        'node': '>15.x',
                    },
                },
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        'Detected Node.js version range: ">15.x"',
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        'The Node.js version range does not include an explicitly specified major version.',
                        'This version range includes only newer versions: ">15.x"',
                        'However, you should include the maximum version that your repository explicitly supports into Node.js version range.',
                        'For example, use the following version range: ">=18.x"',
                    ],
                },
            },
            'supported range to exclude all versions': {
                pkgJson: {
                    'engines': {
                        'node': '<0.x',
                    },
                },
                expected: {
                    stdoutAndStderr: [
                        `Reading "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        `Parsing "\${GITHUB_WORKSPACE}${path.sep}package.json"`,
                        'Detected Node.js version range: "<0.x"',
                        expect.stringMatching(/^::error::/),
                    ],
                    error: [
                        'This version range excludes all versions: "<0.x"',
                        'You should specify a valid version range for the "engines.node" field in `package.json` file.',
                        'For example, specify a version range like this: "16.x || >=18.x"',
                    ],
                },
            },
        }).map(([name, testCase]) => ({ ...testCase, name })),
    )('$name', async ({ name, pkgJson, expected }) => {
        const { result } = await createTempDir(
            async ({ tempDirpath, writeFile }) => {
                /**
                 * Create `package.json` files in the temporary directory.
                 */
                await writeFile(
                    'package.json',
                    // eslint-disable-next-line vitest/no-conditional-in-test
                    typeof pkgJson === 'string' ? pkgJson : JSON.stringify(pkgJson),
                );
                /**
                 * Execute `dist/index.js`.
                 * This should detect `package.json` files in the temporary directory.
                 */
                const result = execaNode(MAIN_FILE_PATH, {
                    cwd: tempDirpath,
                    env: { GITHUB_WORKSPACE: tempDirpath },
                    all: true,
                    // When running unit tests on GitHub Actions, the tests fail due to passed environment variables.
                    // So, disallow inheritance of environment variables.
                    extendEnv: false,
                });
                /**
                 * Wait until the `dist/index.js` execution is complete.
                 * This always fails, so ignore the rejected `Promise` using the `.catch()` method.
                 */
                await result.catch(() => null);
                /**
                 * Return a plain object with `result` instead of `result`,
                 * since `result` should not be resolved here.
                 */
                return { result };
            },
            { tempDirname: name, allowDuplicateDir: true, autoClean: false },
        );
        await expect(result).rejects.toThrow();

        const { all: stdoutAndStderr } = await result.catch(error => error);
        expect(stdoutAndStderr?.split(os.EOL)).toStrictEqual(expected.stdoutAndStderr);

        const errorList = parseGitHubError(stdoutAndStderr);
        // eslint-disable-next-line vitest/no-conditional-in-test
        const errorLinesList = Array.isArray(expected.error)
            ? errorList.map(msg => msg.split(os.EOL))
            : errorList;
        expect(errorLinesList).toStrictEqual([expected.error]);
    });
});
