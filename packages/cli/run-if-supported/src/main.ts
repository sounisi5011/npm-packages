import { promises as fsAsync } from 'fs';
import { dirname, resolve as resolvePath } from 'path';

import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';
import { commandJoin } from 'command-join';
import { ArgumentError } from 'ow';
import parseJson from 'parse-json';
import pkgUp from 'pkg-up';
import type { JsonValue } from 'type-fest';

import { isNotSupported } from './is-supported';
import { parseOptions } from './options';
import { filterObjectEntry, isString } from './utils';

function getBinName(pkg: Record<PropertyKey, unknown>, pkgDirpath: string, entryFilepath: string): string | undefined {
    if (isPropAccessible(pkg['bin'])) {
        const binEntry = Object.entries(pkg['bin'])
            .filter(filterObjectEntry(isString))
            .map(([binName, binPath]) => ({ binName, binPath }))
            .find(({ binPath }) => {
                const binFullpath = resolvePath(pkgDirpath, binPath);
                return binFullpath === entryFilepath;
            });
        if (binEntry) return binEntry.binName;
    }
    if (typeof pkg['bin'] === 'string' && typeof pkg['name'] === 'string') {
        return pkg['name'].replace(/^@[^/]+\//, '');
    }
    return undefined;
}

function getCliData(entryFilepath: string): {
    binName: string | undefined;
    version: string | undefined;
    description: string;
} {
    const pkgPath = resolvePath(__dirname, '../package.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PKG: unknown = require(pkgPath);
    let version: string | undefined;
    let description = '';

    if (!isPropAccessible(PKG)) return { binName: undefined, version, description };

    const binName = getBinName(PKG, dirname(pkgPath), entryFilepath);
    if (typeof PKG['version'] === 'string') version = PKG['version'];
    if (typeof PKG['description'] === 'string') description = PKG['description'];

    return { binName, version, description };
}

async function readPkg(opts: { cwd: string }): Promise<{ pkgPath: string; pkg: JsonValue }> {
    const pkgPath = await pkgUp({ cwd: opts.cwd });
    if (!pkgPath) throw new Error(`"package.json" file is not found`);

    const pkgText = await fsAsync.readFile(pkgPath, 'utf8');
    const pkg: JsonValue = parseJson(pkgText, pkgPath);

    return { pkgPath, pkg };
}

function createHelpText(opts: {
    binName: string | undefined;
    version: string | undefined;
    description: string;
}): string {
    const helpTextLines: string[][] = [];
    if (opts.binName && opts.version) helpTextLines.push([`${opts.binName} v${opts.version}`]);
    if (opts.description) helpTextLines.push([opts.description]);
    if (opts.binName) {
        helpTextLines.push([
            'Usage:',
            `  $ ${opts.binName} [--print-skip-message] [--verbose] <command> [...args]`,
        ]);
    }
    helpTextLines.push([
        'Options:',
        '  -v, -V, --version     Display version number',
        '  -h, --help            Display this message',
        '  --print-skip-message  If the command was not executed, print the reason',
        '  --verbose             Enable the "--print-skip-message" option and print executed commands',
    ]);
    if (opts.binName) {
        helpTextLines.push([
            'Examples:',
            `  $ ${opts.binName} jest`,
            `  $ ${opts.binName} jest --verbose`,
        ]);
    }
    return helpTextLines.map(lines => lines.join('\n')).join('\n\n');
}

function printHelpAndVersion(opts: { options: Map<string, unknown>; entryFilepath: string }): boolean {
    if (opts.options.has('-h') || opts.options.has('--help')) {
        const { binName, version, description } = getCliData(opts.entryFilepath);
        console.log(createHelpText({ binName, version, description }));
        return true;
    }
    if (opts.options.has('-v') || opts.options.has('-V') || opts.options.has('--version')) {
        const { version } = getCliData(opts.entryFilepath);
        console.log(version ?? 'unknown');
        return true;
    }

    return false;
}

function validateCommandName(command: string | undefined): asserts command is string {
    if (command === undefined) throw new Error(`The "<command>" argument is required`);
    if (!command) throw new Error(`Invalid command: \`${command}\``);
}

function isSupported(
    opts: {
        pkgPath: string;
        pkg: unknown;
        nodeVersion: string;
    },
): ReturnType<typeof isNotSupported> {
    try {
        return isNotSupported(opts.pkg, opts.nodeVersion);
    } catch (err: unknown) {
        const error = err instanceof ArgumentError
            ? new Error(err.message)
            : err;
        if (error instanceof Error) {
            error.message = `Invalidly structured file: ${opts.pkgPath}\n${error.message.replace(/^(?!$)/gm, '  ')}`;
        }
        throw error;
    }
}

function printSkipMessage(opts: { isPrint: boolean; reasonMessage: string }): void {
    if (opts.isPrint) console.error(`Skipped command execution. ${opts.reasonMessage}`);
}

type SpawnAsyncFn = (
    command: string,
    args: readonly string[],
    options: { cwd: string },
) => Promise<{ exitCode: number | null }>;

async function execCommand(
    opts: { cwd: string; command: string; args: readonly string[]; isVerbose: boolean; spawnAsync: SpawnAsyncFn },
): Promise<{ exitCode: number | null }> {
    if (opts.isVerbose) {
        console.error(`> $ ${commandJoin([opts.command, ...opts.args])}`);
    }
    return await opts.spawnAsync(opts.command, opts.args, { cwd: opts.cwd });
}

export async function main(input: {
    cwd: string;
    entryFilepath: string;
    argv: readonly string[];
    nodeVersion: string;
    spawnAsync: SpawnAsyncFn;
}): Promise<void> {
    const { options, command, commandArgs } = parseOptions(input.argv);
    if (printHelpAndVersion({ options, entryFilepath: input.entryFilepath })) return;
    validateCommandName(command);

    const { pkgPath, pkg } = await readPkg({ cwd: input.cwd });
    const isPrintSkipMessage = options.has('--print-skip-message');
    const isVerbose = options.has('--verbose');

    const reasonMessage = isSupported({ pkgPath, pkg, nodeVersion: input.nodeVersion });
    if (reasonMessage) {
        printSkipMessage({
            isPrint: isPrintSkipMessage || isVerbose,
            reasonMessage,
        });
        return;
    }

    const { exitCode } = await execCommand({
        cwd: input.cwd,
        command,
        args: commandArgs,
        isVerbose,
        spawnAsync: input.spawnAsync,
    });
    process.exitCode = exitCode ?? 0;
}
