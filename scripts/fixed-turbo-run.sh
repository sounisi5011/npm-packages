#!/bin/bash

# The `turbo run` command seems to be intended only to be executed in the monorepo root directory.
# In `turbo@1.8.2`, the `turbo run` command cannot be executed in a subdirectory of a monorepository.
# see https://github.com/vercel/turbo/issues/1412
# Note: To be precise, this is the case for subdirectories where `turbo.json` files exist.

PROJECT_ROOT_PATH="$(git rev-parse --show-toplevel)"
RELATIVE_PWD="$(realpath --relative-to="${PROJECT_ROOT_PATH}" "${PWD}")"
readonly PROJECT_ROOT_PATH RELATIVE_PWD

exec_with_debug() {
  local quoted_args=() apos="'" quot='"'

  for arg in "$@"; do
    # If the argument is an empty string or contains spaces or special characters, wrap it in quotes.
    case "${arg}" in
      '' | *[' !$&()*;<>?[\]`{|}~'"${apos}${quot}"]* )
        case "${arg}" in
          # These characters cannot be wrapped in double quotes:
          # - !
          # - $
          # - \
          # - `
          # - "
          *['!$\`'"${quot}"]* )
            # see https://qiita.com/kawaz/items/f8d68f11d31aa3ea3d1c
            quoted_args+=("${apos}${arg//${apos}/${apos}${quot}${apos}${quot}${apos}}${apos}")
            ;;
          # Other characters can be wrapped in double quotes,
          # so arguments containing single quotes should be wrapped in double quotes.
          *"${apos}"* )
            quoted_args+=("${quot}${arg}${quot}")
            ;;
          # Arguments not containing single quotes are wrapped in single quotes.
          # Single-quote escaping is not required under this condition.
          * )
            quoted_args+=("${apos}${arg}${apos}")
            ;;
        esac
        ;;
      * )
        quoted_args+=("${arg}")
        ;;
    esac
  done

  echo '$' "${quoted_args[*]}"
  "$@"
}

pnpm_args=()
# see https://qiita.com/kawaz/items/1b61ee2dd4d1acc7cc94
if type turbo >/dev/null 2>&1; then
  :
else
  pnpm_args=(pnpm exec)
fi

readonly args=("$@")
tasks_end_index=0
# see https://stackoverflow.com/a/229606
# see https://qiita.com/Ping/items/f9b5175085026462b082#double-bracket--
while [[ ("${args[${tasks_end_index}]}" != '-'*) && ("${tasks_end_index}" -lt "${#args[@]}") ]]; do
  tasks_end_index=$(( tasks_end_index + 1 ))
done
# see https://stackoverflow.com/a/1336245
readonly tasks=("${args[@]: 0:${tasks_end_index}}")
readonly options=("${args[@]: ${tasks_end_index}}")

exec_with_debug cd "${PROJECT_ROOT_PATH}"
# Note: The `turbo run` command supports the `--cwd` option.
#       see https://turbo.build/repo/docs/reference/command-line-reference#--cwd
#       If we use this, there is no need to run the `cd` command.
#       However, in `turbo@1.8.2`, the relative path passed to the `--filter` option is not properly resolved.
#       The base directory for relative paths is still the current directory, not the directory changed with the `--cwd` option.
#       It is unclear whether this behavior is by design or a bug.
#       So we decided to use the `cd` command.
exec_with_debug "${pnpm_args[@]}" turbo run "${tasks[@]}" \
  --filter="./${RELATIVE_PWD}" "${options[@]}"
