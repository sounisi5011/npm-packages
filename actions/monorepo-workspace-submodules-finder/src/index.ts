import { inspect } from 'util';

import { debug, getBooleanInput, getInput, group, info, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';

import { excludeUnchangedSubmodules, getPackageDataList } from './main';

async function main(): Promise<void> {
    const ignorePrivate = getBooleanInput('ignore-private');

    const output = (await getPackageDataList())
        .filter(data => !(ignorePrivate && data['is-private']));
    const onlyChangedSubmodules = await excludeUnchangedSubmodules(output, {
        api: {
            ...context.repo,
            token: getInput('token'),
        },
        info,
        debug,
        group,
    });

    setOutput('result', onlyChangedSubmodules);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
