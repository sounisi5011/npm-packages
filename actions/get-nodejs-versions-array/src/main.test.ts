import os from 'node:os';
import path from 'node:path';

import { execa, execaNode, Options as ExecaOptions } from 'execa';
import { beforeAll, describe, expect, it, test } from 'vitest';

import pkg from '../package.json';
import { cachedPromise, createTempFile, getDirpath } from '../tests/helpers/utils.js';

const PACKAGE_ROOT = getDirpath(import.meta, '..');
const MAIN_FILE_PATH = path.resolve(PACKAGE_ROOT, './dist/index.js');

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
