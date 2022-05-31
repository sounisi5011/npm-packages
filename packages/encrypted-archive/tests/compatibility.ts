import fs, { promises as fsAsync } from 'fs';
import path from 'path';

import execa from 'execa';
import importFrom from 'import-from';

import {
    CompressOptions,
    CryptoAlgorithmName,
    decrypt,
    encryptIterator,
    EncryptOptions,
    KeyDerivationOptions,
} from '../src';
import { asyncIterable2Buffer } from '../src/utils';
import { buffer2chunkArray } from './helpers';
import { optGen } from './helpers/combinations';

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
    const versionsList = dataDirList.map(({ dirname }) => dirname);

    const oldVersionsStoreDirpath = path.resolve(__dirname, 'fixtures/old-versions');
    /**
     * Install older versions of `@sounisi5011/encrypted-archive`
     */
    beforeAll(async () => {
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
        /**
         * Install the old packages.
         */
        await execa(
            'pnpm',
            ['add', '--save-exact'].concat(
                versionsList.map(version =>
                    version.replace(/^v(.+)$/, 'encrypted-archive-$&@npm:@sounisi5011/encrypted-archive@$1')
                ),
            ),
            { cwd: oldVersionsStoreDirpath },
        );
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
        it.each(versionsList)('%s', async version => {
            const cleartext = await cleartextPromise;
            const cleartextChunkList = await inputChunkTypeRecord[inputChunkType];
            const password = await passwordPromise;
            const oldEncryptedArchive: Omit<typeof import('../src'), `encrypt${string}`> = importFrom(
                oldVersionsStoreDirpath,
                `encrypted-archive-${version}`,
            ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            const encryptedData = await asyncIterable2Buffer(encryptIterator(password, options)(cleartextChunkList));
            const decryptedData = await oldEncryptedArchive.decrypt(encryptedData, password);
            expect(decryptedData.equals(cleartext)).toBeTrue();
        });
    });
});
