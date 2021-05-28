import * as path from 'path';

import execa from 'execa';

import pkg from '../package.json';
import { getFixturesPath, PACKAGE_ROOT } from './helpers';

describe('cli', () => {
    beforeAll(async () => {
        await execa('pnpx', ['ultra', 'build'], { cwd: PACKAGE_ROOT });
    }, 60 * 1000);

    const CLI_PATH = path.resolve(PACKAGE_ROOT, 'dist/index.js');
    const binName = Object.keys(pkg.bin)[0] ?? 'run-if-supported';
    const version = String(pkg.version);

    describe('display help', () => {
        it.each([
            '-h',
            '--help',
            '--help --version',
            '--version --help',
        ])('%s', async option => {
            await expect(execa('node', [CLI_PATH, ...option.split(/\s+/)]))
                .resolves.toStrictEqual(expect.objectContaining({
                    stdout: [
                        `${binName} v${version}`,
                        '',
                        pkg.description,
                        '',
                        'Usage:',
                        `  $ ${binName} [--print-skip-message] [--verbose] <command> [...args]`,
                        '',
                        'Options:',
                        '  -v, -V, --version     Display version number',
                        '  -h, --help            Display this message',
                        '  --print-skip-message  If the command was not executed, print the reason',
                        '  --verbose             Enable the "--print-skip-message" option and print executed commands',
                        '',
                        'Examples:',
                        `  $ ${binName} jest`,
                        `  $ ${binName} jest --verbose`,
                    ].join('\n'),
                    stderr: '',
                }));
        });
    });

    describe('display version', () => {
        it.each([
            '-v',
            '-V',
            '--version',
        ])('%s', async option => {
            await expect(execa('node', [CLI_PATH, ...option.split(/\s+/)]))
                .resolves.toStrictEqual(expect.objectContaining({
                    stdout: version,
                    stderr: '',
                }));
        });
    });

    it('exec command', async () => {
        await expect(execa('node', [CLI_PATH, 'echo', 'foo']))
            .resolves.toStrictEqual(expect.objectContaining({
                stdout: 'foo',
                stderr: '',
            }));
    });

    it('exec command with space include args', async () => {
        await expect(execa('node', [CLI_PATH, 'echo', 'foo  bar']))
            .resolves.toStrictEqual(expect.objectContaining({
                stdout: 'foo  bar',
                stderr: '',
            }));
    });

    it('exec command with verbose', async () => {
        await expect(execa('node', [CLI_PATH, '--verbose', 'echo', 'foo'], { all: true }))
            .resolves.toStrictEqual(expect.objectContaining({
                stdout: 'foo',
                stderr: '> $ echo foo',
                all: [
                    '> $ echo foo',
                    'foo',
                ].join('\n'),
            }));
    });

    it('exec command with space include args and verbose', async () => {
        await expect(execa('node', [CLI_PATH, '--verbose', 'echo', 'foo  bar'], { all: true }))
            .resolves.toStrictEqual(expect.objectContaining({
                stdout: 'foo  bar',
                stderr: `> $ echo 'foo  bar'`,
                all: [
                    `> $ echo 'foo  bar'`,
                    'foo  bar',
                ].join('\n'),
            }));
    });

    describe('skip command exec', () => {
        describe.each<[string, string, string]>([
            [
                'not match node version',
                'old-node',
                `Skipped command execution. Node ${process.versions.node} is not included in supported range: 0.x`,
            ],
            [
                'not match os',
                'unknown-os',
                [
                    'Skipped command execution. Current platform is not included in supported list:',
                    '  os:',
                    `    current: ${process.platform}`,
                    '    required:',
                    '      - b-tron',
                ].join('\n'),
            ],
            [
                'not match cpu',
                'unknown-cpu',
                [
                    'Skipped command execution. Current platform is not included in supported list:',
                    '  cpu:',
                    `    current: ${process.arch}`,
                    '    required:',
                    '      - z80',
                ].join('\n'),
            ],
            [
                'not match os and cpu',
                'unknown-platform',
                [
                    'Skipped command execution. Current platform is not included in supported list:',
                    '  os:',
                    `    current: ${process.platform}`,
                    '    required:',
                    '      - TRON',
                    '  cpu:',
                    `    current: ${process.arch}`,
                    '    required:',
                    '      - i8080',
                    '      - z80',
                ].join('\n'),
            ],
        ])('%s', (_, subpath, skipMessage) => {
            it('with --print-skip-message', async () => {
                await expect(
                    execa('node', [CLI_PATH, '--print-skip-message', 'echo', 'foo'], { cwd: getFixturesPath(subpath) }),
                )
                    .resolves.toStrictEqual(expect.objectContaining({
                        stdout: '',
                        stderr: skipMessage,
                    }));
            });

            it('without --print-skip-message', async () => {
                await expect(execa('node', [CLI_PATH, 'echo', 'foo'], { cwd: getFixturesPath('old-node') }))
                    .resolves.toStrictEqual(expect.objectContaining({
                        stdout: '',
                        stderr: '',
                    }));
            });
        });
    });

    it('no command', async () => {
        await expect(execa('node', [CLI_PATH]))
            .rejects.toStrictEqual(expect.objectContaining({
                stdout: '',
                stderr: expect.stringMatching(/^Error: The "<command>" argument is required(?:$|\n)/),
            }));
    });

    it('no package.json', async () => {
        await expect(execa('node', [CLI_PATH, 'echo', 'foo'], { cwd: '/' }))
            .rejects.toStrictEqual(expect.objectContaining({
                stdout: '',
                stderr: expect.stringMatching(/^Error: "package.json" file is not found(?:$|\n)/),
            }));
    });
});
