import { inspect } from 'util';

import { debug, getBooleanInput, getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

import { getPackageDataList } from './main';

async function main(): Promise<void> {
    const ignorePrivate = getBooleanInput('ignore-private');
    const apiToken = getInput('token');

    const output = (await getPackageDataList())
        .filter(data => !(ignorePrivate && data['is-private']));

    const github = getOctokit(apiToken);
    const { owner, repo } = context.repo;
    const latestRelease = await github.rest.repos.getLatestRelease({
        owner,
        repo,
    });
    debug(`latest release: ${inspect(latestRelease.data)}`);

    setOutput('result', output);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
