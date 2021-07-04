import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';
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
    const gitRegExp = /^\/?(?:[^/]+\/)*git$/;
    const submoduleList = [
        { 'path-git-relative': 'mod1' },
        { 'path-git-relative': 'dir1/mod2' },
        { 'path-git-relative': 'mod3' },
        { 'path-git-relative': 'dir2/mod4' },
    ];

    beforeEach(() => {
        spawk.clean();
        spawk.preventUnmatched();

        nock.disableNetConnect();
    });

    it('since: initial commit', async () => {
        const result = excludeUnchangedSubmodules(submoduleList, {
            api: {
                owner: 'foo',
                repo: 'bar',
                token: 'hoge',
            },
            info: () => null,
            debug: () => null,
            group: async (_, fn) => await fn(),
            since: 'initial commit',
        });
        await expect(result).resolves.toStrictEqual(submoduleList);
    });

    describe('since: latest release', () => {
        const since = 'latest release' as const;

        it('not released yet', async () => {
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
                info: () => null,
                debug: () => null,
                group: async (_, fn) => await fn(),
                since,
            });
            await expect(result).resolves.toStrictEqual(submoduleList);
        });

        it('no diff', async () => {
            nock('https://api.github.com')
                .get('/repos/foo/bar/releases/latest')
                .reply(200, {
                    tag_name: 'fuga',
                });
            spawk.spawn(gitRegExp, ['fetch', '--no-tags', 'origin', 'tag', 'fuga']);
            spawk.spawn(gitRegExp, ['diff', '--name-only', 'fuga'])
                .stdout('');

            const result = excludeUnchangedSubmodules(submoduleList, {
                api: {
                    owner: 'foo',
                    repo: 'bar',
                    token: 'hoge',
                },
                info: () => null,
                debug: () => null,
                group: async (_, fn) => await fn(),
                since,
            });
            await expect(result).resolves.toStrictEqual([]);
        });

        it('has diff: same module', async () => {
            nock('https://api.github.com')
                .get('/repos/foo/bar/releases/latest')
                .reply(200, {
                    tag_name: 'fuga',
                });
            spawk.spawn(gitRegExp, ['fetch', '--no-tags', 'origin', 'tag', 'fuga']);
            spawk.spawn(gitRegExp, ['diff', '--name-only', 'fuga'])
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
                info: () => null,
                debug: () => null,
                group: async (_, fn) => await fn(),
                since,
            });
            await expect(result).resolves.toStrictEqual([
                { 'path-git-relative': 'mod1' },
                { 'path-git-relative': 'mod3' },
                { 'path-git-relative': 'dir2/mod4' },
            ]);
        });
    });
});
