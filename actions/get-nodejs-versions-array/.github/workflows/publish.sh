#!/bin/bash

git config user.name  'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git remote add gh-token "https://${GITHUB_TOKEN}@github.com/sounisi5011/npm-packages.git"

update_git_tag() {
  local tag_name="$1"
  local tag_message="$2"
  git tag -d "${tag_name}" || true
  git push origin :"${tag_name}" || true
  git tag -a "${tag_name}" -m "${tag_message}"
  git push origin "${tag_name}"
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

cd "${GIT_ROOT_PATH}" || ! echo "[!] Move to '${GIT_ROOT_PATH}' failed"
echo '::group::$' git checkout "refs/tags/${latestTagName}"
if git checkout "refs/tags/${latestTagName}"; then
  echo '::endgroup::'

  echo '::group::$' git merge --no-commit "${GIT_RELEASE_COMMIT_REF}"
  # Tries to merge in order to keep a Git history.
  # However, the merge content is not used here.
  # Therefore, we disable automatic commit.
  git merge --no-commit "${GIT_RELEASE_COMMIT_REF}" || true
  echo '::endgroup::'
else
  echo '::endgroup::'
  echo '[!] This action has not yet been published'
  # shellcheck disable=SC2154
  git switch -c "action-only--${outputs_tag_name}"
fi

echo '::group::Delete everything except the ".git" directory'
find "${GIT_ROOT_PATH}" -maxdepth 1 -mindepth 1 -type d -name '.git' -prune -o -print0 | xargs -0 rm -rf
ls -lhpa
echo '::endgroup::'

echo '::group::Restore only files required for custom actions'
git restore --source="${GIT_RELEASE_COMMIT_REF}" "${PKG_ROOT_DIRNAME}"/{action.yaml,dist}
mv "${GIT_ROOT_PATH}/${PKG_ROOT_DIRNAME}"/* "${GIT_ROOT_PATH}/"
ls -lhpa
echo '::endgroup::'

echo '::group::Create README.md file'
{
  echo '> **Note**'
  echo '> This place is a copy in [the `'"${PKG_ROOT_DIRNAME}"'` directory] of [the commit specified by the '"${outputs_tag_name}"' tag]'
  # shellcheck disable=SC2016
  echo '> If you want to contribute, please move to [the `main` branch]!'
  echo
  # shellcheck disable=SC2016
  echo '[the `main` branch]:' "${GITHUB_URL_PREFIX}/tree/main/${PKG_ROOT_DIRNAME}"
  echo '[the commit specified by the '"${outputs_tag_name}"' tag]:' "${GITHUB_URL_PREFIX}/tree/${outputs_tag_name}"
  echo '[the `'"${PKG_ROOT_DIRNAME}"'` directory]:' "${GITHUB_URL_PREFIX}/tree/${outputs_tag_name}/${PKG_ROOT_DIRNAME}"
} > "${GIT_ROOT_PATH}/README.md"
cat "${GIT_ROOT_PATH}/README.md"
echo '::endgroup::'

echo '::group::Create CHANGELOG.md file'
{
  echo "Please see ${GITHUB_URL_PREFIX}/blob/${outputs_tag_name}/${PKG_ROOT_DIRNAME}/CHANGELOG.md"
} > "${GIT_ROOT_PATH}/CHANGELOG.md"
cat "${GIT_ROOT_PATH}/CHANGELOG.md"
echo '::endgroup::'

echo '::group::Create LICENSE file'
licenseFilename="${PKG_ROOT_DIRNAME}/LICENSE"
# see https://stackoverflow.com/a/444317
# see https://stackoverflow.com/a/4709925
if git ls-tree -r --name-only --full-name "${GIT_RELEASE_COMMIT_REF}" | grep -qxF "${licenseFilename}"; then
  :
elif git ls-tree --name-only --full-name "${GIT_RELEASE_COMMIT_REF}" | grep -qxF 'LICENSE'; then
  licenseFilename='LICENSE'
else
  licenseFilename=''
fi
if [ -z "${licenseFilename}" ]; then
  echo "::warning::LICENSE file not found in release commit ( ${GIT_RELEASE_COMMIT_REF} )"
else
  {
    echo "Please see ${GITHUB_URL_PREFIX}/blob/${outputs_tag_name}/${licenseFilename}"
  } > "${GIT_ROOT_PATH}/LICENSE"
  cat "${GIT_ROOT_PATH}/LICENSE"
fi
echo '::endgroup::'

echo '::group::Add commit'
git add --all
git commit --reuse-message="${GIT_RELEASE_COMMIT_REF}" --no-verify
echo '::endgroup::'

echo '::group::Add Git Tags'
update_git_tag "${latestTagName}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}.${outputs_minor}" "${tagMessage}"
update_git_tag "${TAG_NAME_PREFIX}-v${outputs_major}.${outputs_minor}.${outputs_patch}" "${tagMessage}"
echo '::endgroup::'
