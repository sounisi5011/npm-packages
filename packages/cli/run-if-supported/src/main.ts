import { promises as fsAsync } from 'fs';
import { dirname, resolve as resolvePath } from 'path';

import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';
import { BaseContext, Builtins, Cli, Command, Option } from 'clipanion';
import { commandJoin } from 'command-join';
import { ArgumentError } from 'ow';
import parseJson from 'parse-json';
import pkgUp from 'pkg-up';
import type { JsonValue, Mutable } from 'type-fest';

import { isNotSupported } from './is-supported';
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

class VersionCommandWithUppercase extends Builtins.VersionCommand {
    static override paths = [['-v'], ['-V'], ['--version']];
}

class RunIfSupportedCommand extends Command<RunIfSupportedContext> {
    static override usage = Command.Usage({
        /** @todo read this value from package.json */
        description: 'Execute the command only if you are running on a supported version of Node and platform',
        examples: [[
            'Run Jest CLI',
            '$0 jest',
        ], [
            'Run Jest CLI and print verbose details',
            '$0 --verbose jest',
        ]],
    });

    isPrintSkipMessage = Option.Boolean('--print-skip-message', false, {
        description: 'If the command was not executed, print the reason',
    });

    isVerbose = Option.Boolean('--verbose', false, {
        description: 'Enable the "--print-skip-message" option and print executed commands',
    });

    command = Option.String();
    commandArgs = Option.Proxy();

    async execute(): Promise<number | undefined> {
        const { pkgPath, pkg } = await readPkg({ cwd: this.context.cwd });
        const reasonMessage = isSupported({ pkgPath, pkg, nodeVersion: this.context.nodeVersion });

        if (reasonMessage) {
            printSkipMessage({
                isPrint: this.isPrintSkipMessage || this.isVerbose,
                reasonMessage,
            });
            return;
        }

        const { exitCode } = await execCommand({
            cwd: this.context.cwd,
            command: this.command,
            args: this.commandArgs,
            isVerbose: this.isVerbose,
            spawnAsync: this.context.spawnAsync,
        });
        return exitCode ?? 0;
    }
}

interface RunIfSupportedContext extends BaseContext {
    cwd: string;
    entryFilepath: string;
    nodeVersion: string;
    spawnAsync: SpawnAsyncFn;
}

export async function main(input: {
    cwd: string;
    entryFilepath: string;
    argv: readonly string[];
    nodeVersion: string;
    spawnAsync: SpawnAsyncFn;
}): Promise<void> {
    const { binName, version } = getCliData(input.entryFilepath);
    const cliOptions: Mutable<Exclude<ConstructorParameters<typeof Cli>[0], undefined>> = {};
    if (binName) cliOptions.binaryName = binName;
    if (version) cliOptions.binaryVersion = version;
    const cli = new Cli<RunIfSupportedContext>(cliOptions);

    cli.register(VersionCommandWithUppercase);
    cli.register(RunIfSupportedCommand);
    await cli.runExit([...input.argv], input);
}
