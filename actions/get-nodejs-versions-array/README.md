# get-nodejs-versions-array-action

Get an array of Node.js versions supported by your repository.

Detects supported Node.js by reading [the `engines.node` field in `package.json` file] in your repository.

[the `engines.node` field in `package.json` file]: https://docs.npmjs.com/cli/configuring-npm/package-json#engines

## Outputs

### `versions-json`

A JSON string. This value is an array of semver strings, meaning Node.js version.

For example, if [the `engines.node` field][the `engines.node` field in `package.json` file] has the following value:

```json
{
  "engines": {
    "node": "^14.18 || 16 || >=18"
  }
}
```

the content of this output will be JSON like this:

```json
[
  "14.18.0",
  "14.x",
  "16.0.0",
  "16.x",
  "18.0.0",
  "18.x"
]
```

> **Note**
> The version range `^14.18 || 16 || >=18` in this example also includes Node.js 19, 20, and higher versions.
> However, the maximum version explicitly specified is `18`.
> Therefore, the output will include versions up to 18.

## Example usage

```yaml
jobs:
  detect-supported-node:
    runs-on: ubuntu-latest
    outputs:
      versions-json: ${{ steps.detector.outputs.versions-json }}
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - id: detector
        uses: sounisi5011/npm-packages/actions/get-nodejs-versions-array@get-nodejs-versions-array-action-v0
        # Alternatively, you can use short references
        # uses: sounisi5011/npm-packages@actions/get-nodejs-versions-array-v0
        # uses: sounisi5011/npm-packages@actions/get-nodejs-versions-array-v0.0
        # uses: sounisi5011/npm-packages@actions/get-nodejs-versions-array-v0.0.2
        # uses: sounisi5011/npm-packages@actions/get-nodejs-versions-array-latest
  unit-test:
    needs: detect-supported-node
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ${{ fromJson(needs.detect-supported-node.outputs.versions-json) }}
    steps:
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
```
