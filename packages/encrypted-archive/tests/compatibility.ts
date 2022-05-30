import fs, { promises as fsAsync } from 'fs';
import path from 'path';

import { decrypt } from '../src';

// eslint-disable-next-line jest/require-top-level-describe, jest/expect-expect, jest/valid-title
const isSemver = (str: string): boolean => /^v\d+\.\d+\.\d+$/.test(str);

describe('backward compatibility (decrypt)', () => {
    const dataDirpath = path.resolve(__dirname, '../examples/encrypted-archives');
    const cleartextPromise = fsAsync.readFile(path.resolve(dataDirpath, 'cleartext.txt'));
    const passwordPromise = fsAsync.readFile(path.resolve(dataDirpath, 'password.txt'));

    const testTable = fs.readdirSync(dataDirpath, { withFileTypes: true })
        .filter(dirEntry => isSemver(dirEntry.name) && dirEntry.isDirectory())
        .map(dirEntry => {
            const subDirpath = path.resolve(dataDirpath, dirEntry.name);
            return fs.readdirSync(subDirpath, { withFileTypes: true })
                .filter(subDirEntry => subDirEntry.isFile())
                .map(subDirEntry => ({ dirname: dirEntry.name, filepath: path.resolve(subDirpath, subDirEntry.name) }));
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
