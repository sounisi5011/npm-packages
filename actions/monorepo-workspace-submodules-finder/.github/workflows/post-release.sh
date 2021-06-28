#!/bin/bash

exec_group() {
  local quoted_args=() exit_code

  # see https://qiita.com/kawaz/items/f8d68f11d31aa3ea3d1c
  for arg in "$@"; do
    # see https://stackoverflow.com/a/229606/4907315
    if [[ "${arg}" == *' '* ]]; then
      quoted_args+=("'${arg}'")
    else
      quoted_args+=("${arg}")
    fi
  done

  # see https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions#grouping-log-lines
  echo '::group::$' "${quoted_args[*]}"
  "$@"
  exit_code=$?
  echo '::endgroup::'

  return $exit_code
}

exec_group pnpm run -w build:scripts || true
exec_group pnpm run -w build:package-list || true
exec_group git add ../../README.md || true
exec_group git commit -m 'docs: update package list' || true
