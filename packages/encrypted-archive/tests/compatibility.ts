import fs, { promises as fsAsync } from 'fs';
import path from 'path';
import { version as nodeVersion } from 'process';

import execa from 'execa';
import importFrom from 'import-from';
import semverSatisfies from 'semver/functions/satisfies';

import { version as latestPackageVersion } from '../package.json';
import {
    CompressOptions,
    CryptoAlgorithmName,
    decrypt,
    encryptIterator,
    EncryptOptions,
    KeyDerivationOptions,
} from '../src';
import { asyncIterable2Buffer } from '../src/utils';
import { buffer2chunkArray, isOneOrMoreArray } from './helpers';
import { optGen } from './helpers/combinations';

const supportedRuntimeFilepath = path.resolve(__dirname, '../docs/supported-runtime.md');
const dataDirpath = path.resolve(__dirname, '../examples/encrypted-archives');
const dataDirList = fs.readdirSync(dataDirpath, { withFileTypes: true })
    .filter(dirEntry => /^v\d+\.\d+\.\d+$/.test(dirEntry.name) && dirEntry.isDirectory())
    .map(({ name: dirname }) => ({
        dirname,
        dirpath: path.resolve(dataDirpath, dirname),
    }));
const cleartextPromise = fsAsync.readFile(path.resolve(dataDirpath, 'cleartext.txt'));
const passwordPromise = fsAsync.readFile(path.resolve(dataDirpath, 'password.txt'));

describe('backward compatibility (decrypt)', () => {
    const testTable = dataDirList
        .map(({ dirname, dirpath }) => {
            return fs.readdirSync(dirpath, { withFileTypes: true })
                .filter(subDirEntry => subDirEntry.isFile())
                .map(subDirEntry => ({ dirname, filepath: path.resolve(dirpath, subDirEntry.name) }));
        })
        .flat()
        .reduce((map, { dirname, filepath }) => {
            const basename = path.basename(filepath);
            const versionsMap = map.get(basename) ?? new Map<string, string>();
            versionsMap.set(dirname, filepath);
            map.set(basename, versionsMap);
            return map;
        }, new Map<string, Map<string, string>>());
    describe.each([...testTable])('%s', (_, versionsMap) => {
        it.each([...versionsMap])('%s', async (_, filepath) => {
            const encryptedData = await fsAsync.readFile(filepath);
            const decryptedData = await decrypt(encryptedData, await passwordPromise);
            expect(decryptedData.equals(await cleartextPromise)).toBeTrue();
        });
    });
});

describe('forward compatibility (encrypt(latest) -> decrypt(old versions))', () => {
    const inputChunkTypeRecord = {
        single: cleartextPromise.then(cleartext => [cleartext]),
        multi: cleartextPromise.then(buffer2chunkArray),
    };
    const packageVersionList = dataDirList.map(({ dirname }) => dirname.replace(/^v/, ''));
    const packageVersion2packageName = (packageVersion: string): string => `encrypted-archive-v${packageVersion}`;
    const supportedNodeVersionsRecord = (() => {
        const supportedRuntimeText = fs.readFileSync(supportedRuntimeFilepath, 'utf8');
        const supportedNodeTable =
            /^\| *`@sounisi5011\/encrypted-archive` version range *\| *Supported Node\.js version range *\|[^\n]*\n\|(?::?-+:?\|){2,}[^\n]*((?:\n\|(?:[^\n|]*\|){2,}[^\n]*)+)/m
                .exec(supportedRuntimeText)?.[1];
        if (!supportedNodeTable) throw new Error(`Parsing failed: ${supportedRuntimeFilepath}`);
        return Object.fromEntries([...supportedNodeTable.matchAll(/^\| *`([^`]+)` *\| *`([^`]+)` *\|/gm)]
            .flatMap(([, packageVersionRange, nodeVersionRange]) => {
                if (typeof packageVersionRange === 'string' && typeof nodeVersionRange === 'string') {
                    return [[packageVersionRange, nodeVersionRange]] as const;
                }
                return [] as const;
            }));
    })();
    /**
     * Checks if the specified version of `@sounisi5011/encrypted-archive` works with the current version of Node.js.
     * @param packageVersion target version of `@sounisi5011/encrypted-archive`
     * @returns if `@sounisi5011/encrypted-archive` works, return `true`
     */
    const isWorkWithCurrentNode = (packageVersion: string): boolean =>
        Object.entries(supportedNodeVersionsRecord)
            .filter(([packageVersionRange]) => semverSatisfies(packageVersion, packageVersionRange))
            .every(([, nodeVersionRange]) => semverSatisfies(nodeVersion, nodeVersionRange));

    const oldVersionsStoreDirpath = path.resolve(__dirname, 'fixtures/old-versions');
    /**
     * Install older versions of `@sounisi5011/encrypted-archive`
     */
    beforeAll(async () => {
        const testTargetPackageVersionList = packageVersionList.filter(isWorkWithCurrentNode);
        /**
         * If all published `@sounisi5011/encrypted-archive` do not support the current version of Node.js, skips installation.
         */
        if (testTargetPackageVersionList.length < 1) return;
        const oldPackageVersionList = testTargetPackageVersionList
            .filter(packageVersion => packageVersion !== latestPackageVersion);
        const latestPackageVersionList = testTargetPackageVersionList
            .filter(packageVersion => packageVersion === latestPackageVersion);

        /**
         * Create a directory
         */
        await fsAsync.mkdir(oldVersionsStoreDirpath, { recursive: true });
        /**
         * Create the files needed for installation
         */
        await Promise.all([
            /**
             * Create an empty JSON package.json file.
             * If it doesn't exist, the packages will be installed in the project root.
             */
            fsAsync.writeFile(path.resolve(oldVersionsStoreDirpath, 'package.json'), '{}', { flag: 'wx' })
                .catch(error => {
                    if (error.code !== 'EEXIST') throw error;
                }),
            fsAsync.writeFile(
                path.resolve(oldVersionsStoreDirpath, '.npmrc'),
                [
                    /**
                     * Disables project root lock file updates during installation.
                     * @see https://pnpm.io/ja/npmrc#lockfile
                     */
                    'lockfile=false',
                    /**
                     * Download the latest version of the package from npm instead of the local disk.
                     * @see https://pnpm.io/ja/workspaces#link-workspace-packages
                     */
                    'link-workspace-packages=false',
                ].join('\n'),
            ),
            /**
             * Disables temporary files created for testing from being added to Git.
             */
            fsAsync.writeFile(path.resolve(oldVersionsStoreDirpath, '.gitignore'), '*'),
        ]);

        const installOldPackages = (
            packageVersionList: [string, ...string[]],
            options?: Omit<execa.Options, 'cwd'>,
        ): execa.ExecaChildProcess => {
            const packageNameList = packageVersionList.map(packageVersion =>
                `${packageVersion2packageName(packageVersion)}@npm:@sounisi5011/encrypted-archive@${packageVersion}`
            );
            return execa(
                'pnpm',
                ['add', '--save-exact', ...packageNameList],
                { ...options, cwd: oldVersionsStoreDirpath },
            );
        };
        /**
         * Install the old packages.
         */
        if (isOneOrMoreArray(oldPackageVersionList)) {
            await installOldPackages(oldPackageVersionList);
        }
        /**
         * Install the latest package.
         * If failed, use latest package from local disk.
         * Note: For example, if we try to release a new version, only the latest version will not be able to be installed from npm.
         */
        if (isOneOrMoreArray(latestPackageVersionList)) {
            await installOldPackages(latestPackageVersionList, { all: true }).catch(async err => {
                if (!/\bERR_PNPM_NO_MATCHING_VERSION\b/.test(err.all ?? '')) throw err;
                /**
                 * Enable `link-workspace-packages` option
                 */
                await fsAsync.writeFile(
                    path.resolve(oldVersionsStoreDirpath, '.npmrc'),
                    '\nlink-workspace-packages=true',
                    { flag: 'a' },
                );
                /**
                 * Retry
                 */
                await installOldPackages(latestPackageVersionList);
            });
        }
    }, 30 * 1000);

    const testTable = optGen<{
        algorithm: CryptoAlgorithmName;
        keyDerivation: KeyDerivationOptions['algorithm'];
        compress: CompressOptions['algorithm'] | undefined;
        'input-chunk': 'single' | 'multi';
    }>({
        algorithm: ['aes-256-gcm', 'chacha20-poly1305'],
        keyDerivation: ['argon2d', 'argon2id'],
        compress: [undefined, 'gzip', 'brotli'],
        'input-chunk': ['single', 'multi'],
    });
    describe.each(testTable)('%s', (_, { 'input-chunk': inputChunkType, ...opts }) => {
        const options: Required<EncryptOptions> = { ...opts, keyDerivation: { algorithm: opts.keyDerivation } };
        for (const packageVersion of packageVersionList) {
            /**
             * If the target version of `@sounisi5011/encrypted-archives` does not support the current version of Node.js, skip the forward compatibility test.
             */
            if (!isWorkWithCurrentNode(packageVersion)) {
                // eslint-disable-next-line jest/no-disabled-tests, jest/expect-expect
                it.skip(`v${packageVersion}`, () => undefined);
                continue;
            }

            it(`v${packageVersion}`, async () => {
                const cleartext = await cleartextPromise;
                const cleartextChunkList = await inputChunkTypeRecord[inputChunkType];
                const password = await passwordPromise;
                const oldEncryptedArchive: Omit<typeof import('../src'), `encrypt${string}`> = importFrom(
                    oldVersionsStoreDirpath,
                    packageVersion2packageName(packageVersion),
                ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

                const encryptedData = await asyncIterable2Buffer(
                    encryptIterator(password, options)(cleartextChunkList),
                );
                const decryptedData = await oldEncryptedArchive.decrypt(encryptedData, password);
                expect(decryptedData.equals(cleartext)).toBeTrue();
            });
        }
    });
});
