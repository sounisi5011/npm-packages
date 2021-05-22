#!/bin/bash

# https://qiita.com/yudoufu/items/48cb6fb71e5b498b2532#comment-87e291b98f4cabf77138
readonly DIR_PATH="$(cd "$(dirname "${BASH_SOURCE:-${(%):-%N}}")"; pwd)"

rm "${DIR_PATH}/../../examples/package.json"
outputs_tag_name="${outputs_tag_name}" \
  node "${DIR_PATH}/../../scripts/publish-convert-readme.js"

# see https://stackoverflow.com/a/62675843/4907315
pnpm publish --access=public --no-git-checks
