# workspace-submodules

## Supported monorepo

All monorepos that are supported by [`workspace-tools@^0.12.3`](https://github.com/microsoft/workspace-tools).

* [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
* [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)
* [pnpm workspaces](https://pnpm.js.org/workspaces/)
* [rush](https://rushjs.io/)

## Outputs

### `result`

A JSON string of an array of objects containing information about each submodule in the project.
The content is as follows:

```json
[
  {
    "path-git-relative": "packages/ts-type-utils/has-own-property",
    "package-name": "@sounisi5011/ts-type-util-has-own-property",
    "version": "1.0.0",
    "is-private": false
  },
  {
    "path-git-relative": "actions/workspace-submodules",
    "package-name": "workspace-submodules",
    "version": "1.0.0",
    "is-private": false
  }
]
```

#### `path-git-relative` property

A string indicating the location of the submodule as a path relative to the project root.

#### `package-name` property

[The package name](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#name) defined in [the `package.json` file] for each submodule.

[the `package.json` file]: https://docs.npmjs.com/cli/v6/configuring-npm/package-json

#### `version` property

[The package version](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#version) defined in [the `package.json` file] for each submodule.

#### `is-private` property

The value of [the `private` property](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#private) as defined in [the `package.json` file] for each submodule.
If undefined, the value is `false`.

## Example usage

```yaml
jobs:
  submodules-finder:
    runs-on: ubuntu-latest
    outputs:
      result-json: ${{ steps.interrogate.outputs.result }}
    steps:
      - uses: actions/checkout@v2
      - id: interrogate
        uses: sounisi5011/npm-packages/actions/workspace-submodules@workspace-submodules-v1
  job-for-each-submodule:
    runs-on: ubuntu-latest
    needs: submodules-finder
    strategy:
      fail-fast: false
      matrix:
        include: ${{fromJson(needs.submodules-finder.outputs.result-json)}}
    steps:
      - run: |
          echo 'path:' '${{ matrix.path-git-relative }}'
          echo 'package name:' '${{ matrix.package-name }}'
          echo 'version:' '${{ matrix.version }}'
          echo 'private:' '${{ matrix.is-private }}'
```
