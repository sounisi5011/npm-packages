import { dirname, relative as relativePath } from 'path';
import { inspect } from 'util';

import { exec, getExecOutput } from '@actions/exec';
import { getOctokit } from '@actions/github';
import findGitRoot from 'find-git-root';
import pathStartsWith from 'path-starts-with';
import validateNpmPackageName from 'validate-npm-package-name';
import { getWorkspaces } from 'workspace-tools';

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

/**
 * @see https://github.com/conventional-changelog/conventional-changelog/blob/f1f50f56626099e92efe31d2f8c5477abd90f1b7/.github/workflows/release-submodules.yaml#L25-L28
 */
async function getGitChangesSinceTag(
    tagName: string,
    options: {
        group: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
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

function filterChangedSubmodules<TSubmoduleData extends { 'path-git-relative': string }>(
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
export async function excludeUnchangedSubmodules<TSubmoduleData extends { 'path-git-relative': string }>(
    submoduleList: TSubmoduleData[],
    options: {
        api: {
            owner: string;
            repo: string;
            token: string;
        };
        info: (message: string) => void;
        debug: (message: string) => void;
        group: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    },
): Promise<TSubmoduleData[]> {
    const github = getOctokit(options.api.token);
    const latestRelease = await github.rest.repos.getLatestRelease({
        owner: options.api.owner,
        repo: options.api.repo,
    });
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
