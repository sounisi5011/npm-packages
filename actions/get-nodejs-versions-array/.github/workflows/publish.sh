#!/bin/bash

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

  echo '[command]' "${quoted_args[*]}" >&2
  "$@"
}

git config user.name  'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git remote add gh-token "https://${GITHUB_TOKEN}@github.com/sounisi5011/npm-packages.git"

update_git_tag() {
  local tag_name="$1"
  local tag_message="$2"
  exec_with_debug git tag -d "${tag_name}" || true
  exec_with_debug git push origin :"${tag_name}" || true
  exec_with_debug git tag -a "${tag_name}" -m "${tag_message}"
  exec_with_debug git push origin "${tag_name}"
}

# shellcheck disable=SC2154
readonly tagMessage="Release ${matrix_package_name_with_scope}@${outputs_major}.${outputs_minor}.${outputs_patch}"

# shellcheck disable=SC2154
update_git_tag "${matrix_package_name_without_scope}-v${outputs_major}" "${tagMessage}"
update_git_tag "${matrix_package_name_without_scope}-v${outputs_major}.${outputs_minor}" "${tagMessage}"

# Try to create a commit having an action directly under the repository.
# This allows users to use this action without having to specify a directory name.
GIT_ROOT_PATH="$(git rev-parse --show-toplevel)"
GIT_RELEASE_COMMIT_REF="$(git rev-parse HEAD)"
PKG_ROOT_DIRNAME="$(realpath --relative-to="${GIT_ROOT_PATH}" "${PWD}")"
readonly GIT_ROOT_PATH GIT_RELEASE_COMMIT_REF PKG_ROOT_DIRNAME
readonly GITHUB_URL_PREFIX='https://github.com/sounisi5011/npm-packages'
readonly TAG_NAME_PREFIX='actions/get-nodejs-versions-array'
readonly latestTagName="${TAG_NAME_PREFIX}-latest"

echo '::group::Show vars'
echo "GIT_ROOT_PATH: '${GIT_ROOT_PATH}'"
echo "GIT_RELEASE_COMMIT_REF: '${GIT_RELEASE_COMMIT_REF}'"
echo "PKG_ROOT_DIRNAME: '${PKG_ROOT_DIRNAME}'"
echo '::endgroup::'

exec_with_debug cd "${GIT_ROOT_PATH}" || ! echo "[!] Move to '${GIT_ROOT_PATH}' failed"

# see https://stackoverflow.com/a/54635270
exec_with_debug git fetch --no-tags origin tag "${latestTagName}" || true

if exec_with_debug git checkout "refs/tags/${latestTagName}"; then
  # Tries to merge in order to keep a Git history.
  # However, the merge content is not used here.
  # Therefore, we disable automatic commit.
  exec_with_debug git merge --no-commit --allow-unrelated-histories "${GIT_RELEASE_COMMIT_REF}" || true
else
  echo '[!] This action has not yet been published'
  # shellcheck disable=SC2154
  exec_with_debug git switch -c "action-only--${outputs_tag_name}"
fi

echo '::group::Delete everything except the ".git" directory'
exec_with_debug find "${GIT_ROOT_PATH}" -maxdepth 1 -mindepth 1 -type d -name '.git' -prune -o -print0 | xargs -0 rm -rf
ls -lhpa
echo '::endgroup::'

echo '::group::Restore only files required for custom actions'
exec_with_debug git restore --source="${GIT_RELEASE_COMMIT_REF}" "${PKG_ROOT_DIRNAME}"/{action.yaml,dist}
exec_with_debug mv "${GIT_ROOT_PATH}/${PKG_ROOT_DIRNAME}"/* "${GIT_ROOT_PATH}/"
ls -lhpa
echo '::endgroup::'

echo '::group::Create package.json file'
# This JavaScript action is written in ECMAScript modules, so this file is required.
echo '{"type":"module"}' > "${GIT_ROOT_PATH}/package.json"
exec_with_debug cat "${GIT_ROOT_PATH}/package.json"
echo '::endgroup::'

echo '::group::Create README.md file'
{
  echo '> **Note**  '
  echo '> This place is a copy in [the `'"${PKG_ROOT_DIRNAME}"'` directory] of [the commit specified by the '"${outputs_tag_name}"' tag].  '
  # shellcheck disable=SC2016
  echo '> If you want to contribute, please move to [the `main` branch]!'
  echo
  # shellcheck disable=SC2016
  echo '[the `main` branch]:' "${GITHUB_URL_PREFIX}/tree/main/${PKG_ROOT_DIRNAME}"
  echo '[the commit specified by the '"${outputs_tag_name}"' tag]:' "${GITHUB_URL_PREFIX}/tree/${outputs_tag_name}"
  echo '[the `'"${PKG_ROOT_DIRNAME}"'` directory]:' "${GITHUB_URL_PREFIX}/tree/${outputs_tag_name}/${PKG_ROOT_DIRNAME}"
} > "${GIT_ROOT_PATH}/README.md"
exec_with_debug cat "${GIT_ROOT_PATH}/README.md"
echo '::endgroup::'

echo '::group::Create CHANGELOG.md file'
{
  echo "Please see ${GITHUB_URL_PREFIX}/blob/${outputs_tag_name}/${PKG_ROOT_DIRNAME}/CHANGELOG.md"
} > "${GIT_ROOT_PATH}/CHANGELOG.md"
exec_with_debug cat "${GIT_ROOT_PATH}/CHANGELOG.md"
echo '::endgroup::'

echo '::group::Create LICENSE file'
exec_with_debug git ls-tree -r --name-only --full-name "${GIT_RELEASE_COMMIT_REF}" ':(top)' | grep -F LICENSE
licenseFilename=''
for filename in "${PKG_ROOT_DIRNAME}/LICENSE" 'LICENSE'; do
  # see https://stackoverflow.com/a/444317
  if [ -n "$(exec_with_debug git ls-tree --name-only "${GIT_RELEASE_COMMIT_REF}" ":(top)${filename}")" ]; then
    licenseFilename="${filename}"
    break
  fi
done
if [ -z "${licenseFilename}" ]; then
  echo "::warning::LICENSE file not found in release commit ( ${GIT_RELEASE_COMMIT_REF} )"
else
  {
    echo "Please see ${GITHUB_URL_PREFIX}/blob/${outputs_tag_name}/${licenseFilename}"
  } > "${GIT_ROOT_PATH}/LICENSE"
  exec_with_debug cat "${GIT_ROOT_PATH}/LICENSE"
fi
echo '::endgroup::'

echo '::group::Add commit'
exec_with_debug git add --all
exec_with_debug git commit --reuse-message="${GIT_RELEASE_COMMIT_REF}" --no-verify
echo '::endgroup::'

echo '::group::Add Git Tags'
update_git_tag "${latestTagName}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}.${outputs_minor}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}.${outputs_minor}.${outputs_patch}" "${tagMessage}"
echo '::endgroup::'
