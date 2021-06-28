import { inspect } from 'util';

import { getBooleanInput, setFailed, setOutput } from '@actions/core';

import { getPackageDataList } from './main';

async function main(): Promise<void> {
    const ignorePrivate = getBooleanInput('ignore-private');
    const output = (await getPackageDataList())
        .filter(data => !(ignorePrivate && data['is-private']));
    setOutput('result', output);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
