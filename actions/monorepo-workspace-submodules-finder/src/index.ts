import { inspect } from 'util';

import { debug, getBooleanInput, getInput, group, setFailed, setOutput } from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
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

    await group('Fetching tag from repository', async () =>
        // see https://stackoverflow.com/a/54635270/4907315
        await exec('git fetch --no-tags origin tag', [latestRelease.data.tag_name]));
    const status = await group(
        'Get the differences',
        async () => await getExecOutput('git diff --name-only', [latestRelease.data.tag_name]),
    );
    const changes = status.stdout.split('\n');
    debug(`changes: ${inspect(changes)}`);

    setOutput('result', output);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
