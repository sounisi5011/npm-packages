#!/bin/bash

# https://qiita.com/yudoufu/items/48cb6fb71e5b498b2532#comment-87e291b98f4cabf77138
readonly DIR_PATH="$(cd "$(dirname "${BASH_SOURCE:-${(%):-%N}}")"; pwd)"

node "${DIR_PATH}/../../scripts/publish-convert-readme.js"
pnpm publish --access=public
