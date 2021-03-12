#!/bin/bash

git config user.name  'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git remote add gh-token "https://${GITHUB_TOKEN}@github.com/sounisi5011/npm-packages.git"
git tag -d "${matrix_package_name}-v${outputs_major}" || true
git tag -d "${matrix_package_name}-v${outputs_major}.${outputs_minor}" || true
git push origin :"${matrix_package_name}-v${outputs_major}" || true
git push origin :"${matrix_package_name}-v${outputs_major}.${outputs_minor}" || true
git tag -a "${matrix_package_name}-v${outputs_major}" -m "Release ${matrix_package_name}@${outputs_major}.x"
git tag -a "${matrix_package_name}-v${outputs_major}.${outputs_minor}" -m "Release ${matrix_package_name}@${outputs_major}.${outputs_minor}.x"
git push origin "${matrix_package_name}-v${outputs_major}"
git push origin "${matrix_package_name}-v${outputs_major}.${outputs_minor}"
