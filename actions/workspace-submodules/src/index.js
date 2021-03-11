// @ts-check
const path = require('path');

const core = require('@actions/core');
const findGitRoot = require('find-git-root');
const { getWorkspaces } = require('workspace-tools');

async function main() {
  const cwd = process.cwd();
  const gitRootPath = path.dirname(findGitRoot(cwd));
  const workspaceArray = getWorkspaces(cwd);
  const output = workspaceArray
    .map(workspaceData => ({
      'package-name': workspaceData.name,
      'path-absolute': workspaceData.path,
      'path-git-relative': path.relative(gitRootPath, workspaceData.path) || '.',
      'version': workspaceData.packageJson.version,
      'is-private': workspaceData.packageJson.private || false,
    }));
  core.setOutput('result', output);
}

function handleError(error) {
  console.error(error);
  core.setFailed(`Unhandled error: ${error}`);
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
