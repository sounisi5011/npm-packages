#!/bin/bash

readonly MAJOR_TAG_NAME="${matrix_package_name_without_scope}-v${outputs_major}"
readonly MINOR_TAG_NAME="${matrix_package_name_without_scope}-v${outputs_major}.${outputs_minor}"

git config user.name  'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git remote add gh-token "https://${GITHUB_TOKEN}@github.com/sounisi5011/npm-packages.git"
git tag -d "${MAJOR_TAG_NAME}" || true
git tag -d "${MINOR_TAG_NAME}" || true
git push origin :"${MAJOR_TAG_NAME}" || true
git push origin :"${MINOR_TAG_NAME}" || true
git tag -a "${MAJOR_TAG_NAME}" -m "Release ${matrix_package_name_with_scope}@${outputs_major}.x"
git tag -a "${MINOR_TAG_NAME}" -m "Release ${matrix_package_name_with_scope}@${outputs_major}.${outputs_minor}.x"
git push origin "${MAJOR_TAG_NAME}"
git push origin "${MINOR_TAG_NAME}"
