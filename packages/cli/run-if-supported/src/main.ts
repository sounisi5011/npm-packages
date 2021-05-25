import { promises as fsAsync } from 'fs';
import { dirname, resolve as resolvePath } from 'path';

import { commandJoin } from 'command-join';
import parseJson from 'parse-json';
import pkgUp from 'pkg-up';

import { isNotSupported } from './is-supported';
import { parseOptions } from './options';
import { filterObjectEntry, isRecordLike, isString } from './utils';

function getBinName(pkg: Record<PropertyKey, unknown>, entryFilepath: string): string | undefined {
    if (isRecordLike(pkg['bin'])) {
        const binEntry = Object.entries(pkg['bin'])
            .filter(filterObjectEntry(isString))
            .map(([binName, binPath]) => ({ binName, binPath }))
            .find(({ binPath }) => {
                const binFullpath = resolvePath(dirname(entryFilepath), '..', binPath);
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PKG: unknown = require('../package.json');
    let version: string | undefined;
    let description = '';

    if (!isRecordLike(PKG)) return { binName: undefined, version, description };

    const binName = getBinName(PKG, entryFilepath);
    if (typeof PKG['version'] === 'string') version = PKG['version'];
    if (typeof PKG['description'] === 'string') description = PKG['description'];

    return { binName, version, description };
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

export async function main(input: {
    cwd: string;
    entryFilepath: string;
    argv: readonly string[];
    nodeVersion: string;
    spawnAsync: (command: string, args: readonly string[]) => Promise<{ exitCode: number | null }>;
}): Promise<void> {
    const { binName, version, description } = getCliData(input.entryFilepath);
    const { options, command, commandArgs } = parseOptions(input.argv);

    if (options.has('-h') || options.has('--help')) {
        console.log(createHelpText({ binName, version, description }));
        return;
    }
    if (options.has('-v') || options.has('-V') || options.has('--version')) {
        console.log(version ?? 'unknown');
        return;
    }

    if (command === undefined) throw new Error(`The "<command>" argument is required`);
    if (!command) throw new Error(`Invalid command: \`${command}\``);

    const pkgPath = await pkgUp({ cwd: input.cwd });
    if (!pkgPath) throw new Error(`"package.json" file is not found`);

    const pkgText = await fsAsync.readFile(pkgPath, 'utf8');
    const pkg: unknown = parseJson(pkgText, pkgPath);
    if (!isRecordLike(pkg)) throw new Error(`Invalidly structured file: ${pkgPath}`);

    const isPrintSkipMessage = options.has('--print-skip-message');
    const isVerbose = options.has('--verbose');

    const reasonMessage = isNotSupported(pkg, input.nodeVersion);
    if (reasonMessage) {
        if (isPrintSkipMessage || isVerbose) console.error(`Skipped command execution. ${reasonMessage}`);
        return;
    }

    if (isVerbose) {
        const argsText = commandJoin(commandArgs);
        console.error(`> $ ${command}${argsText ? ` ${argsText}` : ''}`);
    }
    const { exitCode } = await input.spawnAsync(command, commandArgs);
    process.exitCode = exitCode ?? 0;
}
