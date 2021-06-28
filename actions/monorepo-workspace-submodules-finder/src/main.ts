import { dirname, relative as relativePath } from 'path';

import findGitRoot from 'find-git-root';
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
