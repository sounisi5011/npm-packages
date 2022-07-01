import { inspect } from 'util';

import { debug, getBooleanInput, getInput, group, info, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';

import { excludeUnchangedSubmodules, getPackageDataList } from './main';

function getEnumInput<T extends string>(name: string, enumList: readonly [T, ...T[]]): T {
    const enumSet = new Set(enumList);
    const val = getInput(name);
    if ((enumSet.has as (value: unknown) => value is T)(val)) return val;
    throw new RangeError(
        `Unsupported value was specified for input "${name}"\n`
            + `Support input list: \`${[...enumSet].join(' | ')}\``,
    );
}

async function main(): Promise<void> {
    const ignorePrivate = getBooleanInput('ignore-private');

    const output = (await getPackageDataList())
        .filter(data => !(ignorePrivate && data['is-private']));
    const onlyChangedSubmodules = await excludeUnchangedSubmodules(output, {
        since: getEnumInput('only-changed-since', ['initial commit', 'latest release']),
        api: {
            ...context.repo,
            token: getInput('token'),
        },
        info,
        debug,
        group,
    });

    setOutput('result', onlyChangedSubmodules);
    setOutput('length', onlyChangedSubmodules.length);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
