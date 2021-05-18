import { inspect } from 'util';

import { getInput, setFailed, setOutput } from '@actions/core';

import { getPackageDataList } from './main';

function input2boolean(input: string): boolean {
    return (input || 'false').toLowerCase() === 'true';
}

async function main(): Promise<void> {
    const ignorePrivate = input2boolean(getInput('ignore-private'));
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
