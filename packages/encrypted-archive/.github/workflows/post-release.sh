#!/bin/bash

# https://qiita.com/yudoufu/items/48cb6fb71e5b498b2532#comment-87e291b98f4cabf77138
readonly DIR_PATH="$(cd "$(dirname "${BASH_SOURCE:-${(%):-%N}}")"; pwd)"

# Commit encrypted archive generated by the current version when creating a release PR
cd "${DIR_PATH}/../../"
pnpm exec ultra --recursive --filter '+@sounisi5011/encrypted-archive' build
node ./examples/encrypted-archives/generate.cjs
git add './examples/encrypted-archives/v*'
git commit -m 'docs(encrypted-archive): add data encrypted by current version'