import { dirname, relative as relativePath } from 'path';
import { inspect } from 'util';

import { setFailed, setOutput } from '@actions/core';
import findGitRoot from 'find-git-root';
import { getWorkspaces } from 'workspace-tools';

async function main(): Promise<void> {
    const cwd = process.cwd();
    const gitRootPath = dirname(findGitRoot(cwd));
    const workspaceArray = getWorkspaces(cwd);
    const output = workspaceArray
        .map(workspaceData => ({
            'path-git-relative': relativePath(gitRootPath, workspaceData.path) || '.',
            'package-name': workspaceData.name,
            'version': workspaceData.packageJson.version ?? null,
            'is-private': workspaceData.packageJson.private ?? false,
        }));
    setOutput('result', output);
}

function handleError(error: unknown): void {
    console.error(error);
    setFailed(`Unhandled error: ${error instanceof Error ? String(error) : inspect(error)}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
