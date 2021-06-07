import { once } from 'events';
import { promises as fsPromises } from 'fs';
import { constants as osConstants } from 'os';
import * as path from 'path';
import { promisify } from 'util';

import execa from 'execa';

import { isProcessExist } from '../src';

const { signals } = osConstants;

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

const sleep = promisify(setTimeout);

const createPidfilePath = (() => {
    const pidfileSet = new Set<string>();
    return (basename: string) => {
        basename = basename
            .replace(/\//g, '／')
            .replace(/\\/g, '＼');

        if (pidfileSet.has(basename)) throw new Error(`Duplicate pid file basename: ${basename}`);
        pidfileSet.add(basename);

        return path.resolve(FIXTURES_DIR, `${basename}.pid`);
    };
})();

describe('isProcessExist()', () => {
    beforeAll(async () => {
        await execa('pnpx', ['ultra', 'build'], { cwd: PACKAGE_ROOT });
        await execa('git', ['clean', '-fX', FIXTURES_DIR]);
    }, 60 * 1000);

    const processJsPath = path.resolve(FIXTURES_DIR, 'process.js');
    const pidResultPath = (processName: string): string => path.resolve(FIXTURES_DIR, 'pid-result', processName);

    it('create new pid file', async () => {
        const pidFilepath = createPidfilePath('new');
        await expect(isProcessExist(pidFilepath, {})).resolves.toBe(false);
    });

    describe('remove pid file on finish', () => {
        it.each<[string, NodeJS.Signals | number | null]>([
            ['success', null],
            ['ctrl-c', signals.SIGINT],
            ['kill', signals.SIGTERM],
            ['SIGHUP', signals.SIGHUP],
            ['SIGQUIT', signals.SIGQUIT],
        ])('%s', async (testName, killSignal) => {
            const pidFilepath = createPidfilePath(testName);
            const child = execa(
                'node',
                ['-e', `require('.').isProcessExist(process.argv.pop(), {}); setTimeout(() => {}, 1000)`, pidFilepath],
                { cwd: PACKAGE_ROOT },
            );
            if (killSignal === null) {
                await child;
            } else {
                await sleep(100);
                child.kill(killSignal);
                await once(child, 'close');
            }
            await expect(fsPromises.access(pidFilepath)).rejects
                .toStrictEqual(expect.objectContaining({
                    code: 'ENOENT',
                }));
        });
    });

    it('detect existing pid', async () => {
        const pidFilepath = createPidfilePath('exist');

        const child = execa('node', ['-e', 'setTimeout(() => {}, 60 * 1000)']);
        await fsPromises.writeFile(pidFilepath, String(child.pid), { flag: 'wx' });

        await expect(isProcessExist(pidFilepath, {})).resolves.toBe(true);

        child.kill(signals.SIGKILL);
        await once(child, 'close');
    });

    describe('overwrite pid file', () => {
        it('invalid content', async () => {
            const pidFilepath = createPidfilePath('invalid-int');
            await fsPromises.writeFile(pidFilepath, 'foo', { flag: 'wx' });

            await expect(isProcessExist(pidFilepath, {})).resolves.toBe(false);
        });

        it('same pid', async () => {
            const pidFilepath = createPidfilePath('same');
            await fsPromises.writeFile(pidFilepath, String(process.pid), { flag: 'wx' });

            await expect(isProcessExist(pidFilepath, {})).resolves.toBe(false);
        });

        it('finished pid', async () => {
            const pidFilepath = createPidfilePath('finished');

            const child = execa('node', ['--version']);
            await fsPromises.writeFile(pidFilepath, String(child.pid), { flag: 'wx' });
            await child;

            await expect(isProcessExist(pidFilepath, {})).resolves.toBe(false);
        });
    });

    describe('should fail overwrite pid file', () => {
        it('permission error', async () => {
            const pidFilepath = createPidfilePath('permission');
            await fsPromises.writeFile(pidFilepath, '', { mode: 0, flag: 'wx' });

            const result = isProcessExist(pidFilepath, {});
            await expect(result).rejects.toThrow(Error);
            await expect(result).rejects
                .toStrictEqual(expect.objectContaining({
                    code: 'EACCES',
                }));
        });

        it('directory exists', async () => {
            const pidFilepath = createPidfilePath('dir');
            await fsPromises.mkdir(pidFilepath);

            const result = isProcessExist(pidFilepath, {});
            await expect(result).rejects.toThrow(Error);
            await expect(result).rejects
                .toStrictEqual(expect.objectContaining({
                    code: 'EISDIR',
                }));
        });
    });

    it('exec multiple processes', async () => {
        const processName = 'multi';
        await Promise.all(
            Array.from(
                { length: 10 },
                () => execa('node', [processJsPath, processName]),
            ),
        );
        const files = await fsPromises.readdir(pidResultPath(processName));
        expect(files).toHaveLength(1);
    });
});
