import { dirname, relative as relativePath } from 'path';

import findGitRoot from 'find-git-root';
import { getWorkspaces } from 'workspace-tools';

export interface PackageData {
    'path-git-relative': string;
    'package-name': string;
    'version': string;
    'is-private': boolean;
}

export async function getPackageDataList(cwd = process.cwd()): Promise<PackageData[]> {
    const gitRootPath = dirname(findGitRoot(cwd));
    const workspaceArray = getWorkspaces(cwd);
    const output = workspaceArray
        .map(workspaceData => ({
            'path-git-relative': relativePath(gitRootPath, workspaceData.path) || '.',
            'package-name': workspaceData.name,
            'version': workspaceData.packageJson.version ?? null,
            'is-private': workspaceData.packageJson.private ?? false,
        }));
    return output;
}
