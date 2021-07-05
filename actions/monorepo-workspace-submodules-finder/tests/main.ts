import { debug, group, info } from '@actions/core';
import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';
import { asyncMockedRun, mockProcessStderr, mockProcessStdout } from 'jest-mock-process';
import nock from 'nock';
import spawk from 'spawk';

import pkg from '../package.json';
import { excludeUnchangedSubmodules, getPackageDataList, PackageData } from '../src/main';

describe('getPackageDataList()', () => {
    it('package data should be included', async () => {
        const packageData: PackageData = {
            'path-git-relative': 'actions/monorepo-workspace-submodules-finder',
            'package-name': pkg.name,
            'no-scope-package-name': pkg.name,
            'version': pkg.version ?? null,
            // eslint-disable-next-line jest/no-if
            'is-private': (Object.prototype.hasOwnProperty.call as hasOwnProperty)(pkg, 'private')
                ? Boolean(pkg.private)
                : false,
        };
        await expect(getPackageDataList()).resolves.toContainEqual(packageData);
    });
});

describe('excludeUnchangedSubmodules()', () => {
    const gitRegExp = /(?:\/(?:[^/]+\/)*)?git/;
    const gitFullmatchRegExp = new RegExp(`^${gitRegExp.source}$`);
    const submoduleList = [
        { 'path-git-relative': 'mod1' },
        { 'path-git-relative': 'dir1/mod2' },
        { 'path-git-relative': 'mod3' },
        { 'path-git-relative': 'dir2/mod4' },
    ];

    const mockRun = (mockRun =>
        async (f: () => Promise<void>) => {
            const mocks = await mockRun(f);
            return Object.assign(mocks, {
                stdoutWrites: mocks['stdout']?.mock.calls.map(String),
                stderrWrites: mocks['stderr']?.mock.calls.map(String),
            });
        })(asyncMockedRun({
            stdout: mockProcessStdout,
            stderr: mockProcessStderr,
        }));

    beforeEach(() => {
        spawk.clean();
        spawk.preventUnmatched();

        nock.disableNetConnect();
    });

    it('since: initial commit', async () => {
        const mocks = await mockRun(async () => {
            const result = excludeUnchangedSubmodules(submoduleList, {
                api: {
                    owner: 'foo',
                    repo: 'bar',
                    token: 'hoge',
                },
                info,
                debug,
                group,
                since: 'initial commit',
            });
            await expect(result).resolves.toStrictEqual(submoduleList);
        });
        expect(mocks.stdoutWrites).toMatchObject([
            //
        ]);
        expect(mocks.stderrWrites).toMatchObject([]);
    });

    describe('since: latest release', () => {
        const since = 'latest release' as const;

        it('not released yet', async () => {
            const mocks = await mockRun(async () => {
                nock('https://api.github.com')
                    .get('/repos/foo/bar/releases/latest')
                    .reply(404, {
                        'message': 'Not Found',
                        'documentation_url': 'https://docs.github.com/rest/reference/repos#get-the-latest-release',
                    });

                const result = excludeUnchangedSubmodules(submoduleList, {
                    api: {
                        owner: 'foo',
                        repo: 'bar',
                        token: 'hoge',
                    },
                    info,
                    debug,
                    group,
                    since,
                });
                await expect(result).resolves.toStrictEqual(submoduleList);
            });
            expect(mocks.stdoutWrites).toMatchObject([
                `::group::Fetching latest release from GitHub\n`,
                `Request:\n`,
                `  GET https://api.github.com/repos/foo/bar/releases/latest\n`,
                `Response:\n`,
                `  HTTP 404\n`,
                `  content-type: application/json\n`,
                expect.stringMatching(/^Response Data:\n(?: {2}[^\n]+\n)+$/),
                `::endgroup::\n`,
                `::debug::latest release is Not Found\n`,
                `::debug::changes: null\n`,
            ]);
            expect(mocks.stderrWrites).toMatchObject([]);
        });

        it('no diff', async () => {
            const mocks = await mockRun(async () => {
                nock('https://api.github.com')
                    .get('/repos/foo/bar/releases/latest')
                    .reply(200, {
                        tag_name: 'fuga',
                    });
                spawk.spawn(gitFullmatchRegExp, ['fetch', '--no-tags', 'origin', 'tag', 'fuga']);
                spawk.spawn(gitFullmatchRegExp, ['diff', '--name-only', 'fuga'])
                    .stdout('');

                const result = excludeUnchangedSubmodules(submoduleList, {
                    api: {
                        owner: 'foo',
                        repo: 'bar',
                        token: 'hoge',
                    },
                    info,
                    debug,
                    group,
                    since,
                });
                await expect(result).resolves.toStrictEqual([]);
            });
            expect(mocks.stdoutWrites).toMatchObject([
                `::group::Fetching latest release from GitHub\n`,
                `Request:\n`,
                `  GET https://api.github.com/repos/foo/bar/releases/latest\n`,
                `Response:\n`,
                `  HTTP 200\n`,
                `  content-type: application/json\n`,
                expect.stringMatching(/^::debug::Response Data:(?:%0A {2}(?:(?!%0A).)+)+\n$/),
                `::endgroup::\n`,
                `::debug::latest release: { tag_name: 'fuga' }\n`,
                `::group::Fetching tag from repository\n`,
                expect.stringMatching(
                    new RegExp(`^\\[command\\]${gitRegExp.source} fetch --no-tags origin tag fuga\n$`),
                ),
                `::endgroup::\n`,
                `::group::Get the differences\n`,
                expect.stringMatching(
                    new RegExp(`^\\[command\\]${gitRegExp.source} diff --name-only fuga\n$`),
                ),
                `::endgroup::\n`,
                `::debug::changes: []\n`,
                `::group::Exclude unchanged submodules\n`,
                `detect changes:\n`,
                [
                    `no changes:`,
                    `  mod1`,
                    `  dir1/mod2`,
                    `  mod3`,
                    `  dir2/mod4`,
                    ``,
                ].join('\n'),
                `::endgroup::\n`,
            ]);
            expect(mocks.stderrWrites).toMatchObject([]);
        });

        it('has diff: same module', async () => {
            const mocks = await mockRun(async () => {
                nock('https://api.github.com')
                    .get('/repos/foo/bar/releases/latest')
                    .reply(200, {
                        tag_name: 'fuga',
                    });
                spawk.spawn(gitFullmatchRegExp, ['fetch', '--no-tags', 'origin', 'tag', 'fuga']);
                spawk.spawn(gitFullmatchRegExp, ['diff', '--name-only', 'fuga'])
                    .stdout([
                        'mod1/file',
                        'dir2/mod4',
                        'mod3',
                    ].join('\n'));

                const result = excludeUnchangedSubmodules(submoduleList, {
                    api: {
                        owner: 'foo',
                        repo: 'bar',
                        token: 'hoge',
                    },
                    info,
                    debug,
                    group,
                    since,
                });
                await expect(result).resolves.toStrictEqual([
                    { 'path-git-relative': 'mod1' },
                    { 'path-git-relative': 'mod3' },
                    { 'path-git-relative': 'dir2/mod4' },
                ]);
            });
            expect(mocks.stdoutWrites).toMatchObject([
                `::group::Fetching latest release from GitHub\n`,
                `Request:\n`,
                `  GET https://api.github.com/repos/foo/bar/releases/latest\n`,
                `Response:\n`,
                `  HTTP 200\n`,
                `  content-type: application/json\n`,
                expect.stringMatching(/^::debug::Response Data:(?:%0A {2}(?:(?!%0A).)+)+\n$/),
                `::endgroup::\n`,
                `::debug::latest release: { tag_name: 'fuga' }\n`,
                `::group::Fetching tag from repository\n`,
                expect.stringMatching(
                    new RegExp(`^\\[command\\]${gitRegExp.source} fetch --no-tags origin tag fuga\n$`),
                ),
                `::endgroup::\n`,
                `::group::Get the differences\n`,
                expect.stringMatching(
                    new RegExp(`^\\[command\\]${gitRegExp.source} diff --name-only fuga\n$`),
                ),
                `mod1/file\ndir2/mod4\nmod3`,
                `::endgroup::\n`,
                `::debug::changes: [ 'mod1/file', 'dir2/mod4', 'mod3' ]\n`,
                `::group::Exclude unchanged submodules\n`,
                [
                    `detect changes:`,
                    `  mod1`,
                    `  mod3`,
                    `  dir2/mod4`,
                    ``,
                ].join('\n'),
                [
                    `no changes:`,
                    `  dir1/mod2`,
                    ``,
                ].join('\n'),
                `::endgroup::\n`,
            ]);
            expect(mocks.stderrWrites).toMatchObject([]);
        });
    });
});
