import { dirname, relative as relativePath } from 'path';
import { inspect } from 'util';

import { exec, getExecOutput } from '@actions/exec';
import { getOctokit } from '@actions/github';
import { endpoint } from '@octokit/endpoint';
import findGitRoot from 'find-git-root';
import pathStartsWith from 'path-starts-with';
import validateNpmPackageName from 'validate-npm-package-name';
import { getWorkspaces } from 'workspace-tools';

type LogFunc = (message: string) => void;
type GroupFunc = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

export interface PackageData {
    'path-git-relative': string;
    'package-name': string;
    'no-scope-package-name': string;
    'version': string;
    'is-private': boolean;
}

function omitPackageScope<T extends string | null | undefined>(packageName: T): T {
    return typeof packageName === 'string' && validateNpmPackageName(packageName).validForOldPackages
        ? packageName.replace(/^@[^/]+\//, '') as T & string
        : packageName;
}

export async function getPackageDataList(cwd = process.cwd()): Promise<PackageData[]> {
    const gitRootPath = dirname(findGitRoot(cwd));
    const workspaceArray = getWorkspaces(cwd);
    const output = workspaceArray
        .map(workspaceData => ({
            'path-git-relative': relativePath(gitRootPath, workspaceData.path) || '.',
            'package-name': workspaceData.name,
            'no-scope-package-name': omitPackageScope(workspaceData.name),
            'version': workspaceData.packageJson.version ?? null,
            'is-private': workspaceData.packageJson.private ?? false,
        }));
    return output;
}

function getGithub(
    token: string,
    options: {
        log: LogFunc;
        debug: LogFunc;
    },
): ReturnType<typeof getOctokit> {
    const printResponse = (response: {
        status: number;
        headers: Record<string, string | number | undefined>;
        data: unknown;
    }): void => {
        options.log(`Response:`);
        options.log(`  HTTP ${response.status}`);
        for (const [name, value] of Object.entries(response.headers)) {
            if (value !== undefined) {
                options.log(`  ${name}: ${value}`);
            }
        }
        options.debug(`Response Data:\n${inspect(response.data).replace(/^(?!$)/mg, '  ')}`);
    };

    const github = getOctokit(token);
    github.hook.before('request', requestOptions => {
        const { method, url } = endpoint(requestOptions);
        options.log(`Request:`);
        options.log(`  ${method} ${url}`);
    });
    github.hook.after('request', printResponse);
    github.hook.error('request', error => {
        if ('response' in error && error.response) printResponse(error.response);
        throw error;
    });

    return github;
}

/**
 * @see https://github.com/conventional-changelog/conventional-changelog/blob/f1f50f56626099e92efe31d2f8c5477abd90f1b7/.github/workflows/release-submodules.yaml#L25-L28
 */
async function getGitChangesSinceTag(
    tagName: string,
    options: {
        group: GroupFunc;
    },
): Promise<string[]> {
    await options.group(
        'Fetching tag from repository',
        async () =>
            /** @see https://stackoverflow.com/a/54635270/4907315 */
            await exec('git fetch --no-tags origin tag', [tagName]),
    );

    const status = await options.group(
        'Get the differences',
        async () => await getExecOutput('git diff --name-only', [tagName]),
    );

    return status.stdout.split('\n').filter(line => line !== '');
}

function filterChangedSubmodules<TSubmoduleData extends Pick<PackageData, 'path-git-relative'>>(
    submoduleList: readonly TSubmoduleData[],
    changedPathList: readonly string[],
): Record<'changedSubmodules' | 'unchangedSubmodules', TSubmoduleData[]> {
    const submoduleWithChangeFlagList = submoduleList.map(data => {
        const submodulePath = data['path-git-relative'];
        const hasChange = changedPathList.some(changedPath => pathStartsWith(changedPath, submodulePath));
        return { data, hasChange };
    });
    const changedSubmodules = submoduleWithChangeFlagList
        .filter(({ hasChange }) => hasChange)
        .map(({ data }) => data);
    const unchangedSubmodules = submoduleWithChangeFlagList
        .filter(({ hasChange }) => !hasChange)
        .map(({ data }) => data);
    return { changedSubmodules, unchangedSubmodules };
}

/**
 * @see https://github.com/conventional-changelog/conventional-changelog/blob/f1f50f56626099e92efe31d2f8c5477abd90f1b7/.github/workflows/release-submodules.yaml#L20-L36
 */
export async function excludeUnchangedSubmodules<TSubmoduleData extends Pick<PackageData, 'path-git-relative'>>(
    submoduleList: TSubmoduleData[],
    options: {
        api: {
            owner: string;
            repo: string;
            token: string;
        };
        info: LogFunc;
        debug: LogFunc;
        group: GroupFunc;
    },
): Promise<TSubmoduleData[]> {
    const github = getGithub(options.api.token, { log: options.info, debug: options.debug });
    const latestRelease = await options.group(
        'Fetching latest release from GitHub',
        async () =>
            await github.rest.repos.getLatestRelease({
                owner: options.api.owner,
                repo: options.api.repo,
            }),
    );
    options.debug(`latest release: ${inspect(latestRelease.data)}`);

    const changes = await getGitChangesSinceTag(latestRelease.data.tag_name, options);
    options.debug(`changes: ${inspect(changes)}`);

    const { changedSubmodules, unchangedSubmodules } = filterChangedSubmodules(submoduleList, changes);
    await options.group('Exclude unchanged submodules', async () => {
        const toPathListStr = (label: string, submoduleList: readonly TSubmoduleData[]): string =>
            [
                `${label}:`,
                ...submoduleList.map(data => `  ${data['path-git-relative']}`),
            ].join('\n');
        options.info(toPathListStr('detect changes', changedSubmodules));
        options.info(toPathListStr('no changes', unchangedSubmodules));
    });

    return changedSubmodules;
}
