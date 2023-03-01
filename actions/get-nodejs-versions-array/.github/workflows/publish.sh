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

update_git_tag "${matrix_package_name_without_scope}-v${outputs_major}"                  "Release ${matrix_package_name_with_scope}@${outputs_major}.x"
update_git_tag "${matrix_package_name_without_scope}-v${outputs_major}.${outputs_minor}" "Release ${matrix_package_name_with_scope}@${outputs_major}.${outputs_minor}.x"
