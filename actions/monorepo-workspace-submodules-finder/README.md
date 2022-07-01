# monorepo-workspace-submodules-finder-action

## Supported monorepo

All monorepos that are supported by [`workspace-tools@0.17.0`](https://github.com/microsoft/workspace-tools).

* [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
* [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)
* [pnpm workspaces](https://pnpm.js.org/workspaces/)
* [rush](https://rushjs.io/)

## Inputs

### `ignore-private`

If you want to exclude submodules whose [`"private"` field](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#private) is set to `true`, set this option to `true`.

### `only-changed-since`

Returns only submodules that have changed since the specified point in time.
Currently, the following values are supported:

* `initial commit`

    This means the initial commit of the repository.
    If this value is specified, all submodules will be returned.
    In other words, it will not detect any changes.

* `latest release`

    This means the latest release of the repository.
    If this value is specified, it will use [the GitHub API's "Get the latest release"](https://docs.github.com/en/rest/reference/repos#get-the-latest-release) to detect the latest published full release and return all submodules containing files that have changed since then.

Default: `initial commit`

### `token`

[Personal access token (PAT)](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) used to fetch data from the repository.

Default: [`github.token`](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#github-context) - functionally equivalent to [the `GITHUB_TOKEN` secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret)

## Outputs

### `result`

A JSON string of an array of objects containing information about each submodule in the project.
The content is as follows:

```json
[
  {
    "path-git-relative": "packages/ts-type-utils/has-own-property",
    "package-name": "@sounisi5011/ts-type-util-has-own-property",
    "no-scope-package-name": "ts-type-util-has-own-property",
    "version": "1.0.0",
    "is-private": false
  },
  {
    "path-git-relative": "actions/monorepo-workspace-submodules-finder",
    "package-name": "monorepo-workspace-submodules-finder-action",
    "no-scope-package-name": "monorepo-workspace-submodules-finder-action",
    "version": "1.0.0",
    "is-private": false
  }
]
```

#### `path-git-relative` property

A string indicating the location of the submodule as a path relative to the project root.

#### `package-name` property

[The package name] defined in [the `package.json` file] for each submodule.

[The package name]: https://docs.npmjs.com/cli/v6/configuring-npm/package-json#name
[the `package.json` file]: https://docs.npmjs.com/cli/v6/configuring-npm/package-json

#### `no-scope-package-name` property

[The package name] without [scope](https://docs.npmjs.com/cli/v6/using-npm/scope).

#### `version` property

[The package version](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#version) defined in [the `package.json` file] for each submodule.

#### `is-private` property

The value of [the `private` property](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#private) as defined in [the `package.json` file] for each submodule.
If undefined, the value is `false`.

### `submodule-exists`

If `result` contains one or more submodules, it is `true`.

The `submodule-exists` output is intended to be used when a list of submodules is set to [the matrix strategy](https://docs.github.com/actions/using-jobs/using-a-matrix-for-your-jobs).
If no submodules are found (which can happen if the `only-changed-since` input is set to `latest release`), the matrix strategy will fail because it will be set to empty, and the entire workflow containing it will also fail.
To prevent this, you can skip jobs that use the matrix strategy by using the `submodule-exists` output.

## Example usage

```yaml
jobs:
  submodules-finder:
    runs-on: ubuntu-latest
    outputs:
      result-json: ${{ steps.interrogate.outputs.result }}
      exists: ${{ steps.interrogate.outputs.submodule-exists }}
    steps:
      - uses: actions/checkout@v2
      - id: interrogate
        uses: sounisi5011/npm-packages/actions/monorepo-workspace-submodules-finder@monorepo-workspace-submodules-finder-action-v1
  job-for-each-submodule:
    runs-on: ubuntu-latest
    needs: submodules-finder
    if: needs.submodules-finder.outputs.exists
    strategy:
      fail-fast: false
      matrix:
        include: ${{fromJson(needs.submodules-finder.outputs.result-json)}}
    steps:
      - run: |
          echo 'path:' '${{ matrix.path-git-relative }}'
          echo 'package name:' '${{ matrix.package-name }}'
          if [ '${{ matrix.package-name }}' != '${{ matrix.no-scope-package-name }}' ]; then
            echo 'package name (no scope):' '${{ matrix.no-scope-package-name }}'
          fi
          echo 'version:' '${{ matrix.version }}'
          echo 'private:' '${{ matrix.is-private }}'
```
