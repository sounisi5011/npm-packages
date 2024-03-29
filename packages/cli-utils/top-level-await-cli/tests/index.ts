import * as path from 'path';

import execa from 'execa';

const PACKAGE_ROOT = path.resolve(__dirname, '..');

describe('awaitMainFn()', () => {
    beforeAll(async () => {
        await execa('pnpm', ['run', 'build-with-cache', '--', '--output-logs=errors-only'], { cwd: PACKAGE_ROOT });
    }, 60 * 1000);

    const execaOptions: execa.Options = { cwd: PACKAGE_ROOT, reject: false };

    it('if an error, set 1 for the exit code', async () => {
        const result = await execa(
            'node',
            ['-e', `require('.').awaitMainFn(async () => { throw new Error })`],
            execaOptions,
        );
        expect(result.exitCode).toBe(1);
    });

    it('should print error', async () => {
        const result = await execa(
            'node',
            ['-e', `require('.').awaitMainFn(async () => { throw new Error('ok') })`],
            execaOptions,
        );
        expect(result.stderr).toMatch(/^Error: ok(?=[\r\n]|$)/);
        expect(result.stdout).toBe('');
    });

    it('wait for the function to complete', async () => {
        const result = await execa('node', [
            '-e',
            `const { promisify } = require('util'); require('.').awaitMainFn(async () => { console.log('init'); await promisify(setTimeout)(1000); console.log('done!') })`,
        ], execaOptions);
        expect(result.stdout).toBe([
            'init',
            'done!',
        ].join('\n'));
    }, 1000 * 1.5);

    it('allow non async function', async () => {
        const result = await execa('node', ['-e', `require('.').awaitMainFn(() => { throw new Error })`], execaOptions);
        expect(result.exitCode).toBe(1);
    });

    describe('if not an error, do not change the exit code', () => {
        it.each([0, 1, 2, 42])('%i', async (expected: number) => {
            const result = await execa('node', [
                '-e',
                `require('.').awaitMainFn(async () => { process.exitCode = ${expected} })`,
            ], execaOptions);
            expect(result.exitCode).toBe(expected);
        });
    });

    it('exit codes should be overwritable', async () => {
        const result = await execa('node', [
            '-e',
            `require('.').awaitMainFn(async () => { process.exitCode = 42; throw new Error })`,
        ], execaOptions);
        expect(result.exitCode).toBe(42);
    });

    it.each([0, NaN, 256, 256 * 2, -256, -256 * 2])(
        'if the exit code is already set to %p, overwrite it',
        async (exitCode: number) => {
            const result = await execa('node', [
                '-e',
                `require('.').awaitMainFn(async () => { process.exitCode = ${exitCode}; throw new Error })`,
            ], execaOptions);
            expect(result.exitCode).toBe(1);
        },
    );
});

describe('process.exitCode', () => {
    it.each<[number, number]>([
        [0, 0],
        [1, 1],
        [99, 99],
        [255, 255],
        [256, 0],
        [257, 1],
        [-1, 255],
        [-255, 1],
        [-256, 0],
        [-257, 255],
        [NaN, 0],
    ])('%o', async (code, expected) => {
        const result = await execa('node', [
            '-e',
            `require('.').awaitMainFn(async () => { process.exitCode = ${String(code)} })`,
        ], { reject: false });
        expect(result.exitCode).toBe(expected);
    });
});
