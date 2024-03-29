// @ts-check

const path = require('path');

const baseConfig = require('../../.lintstagedrc.cjs');

/** @type {import('../../.lintstagedrc.cjs').LintStagedConfig} */
module.exports = async filenames => [
  ...(await baseConfig(filenames)),
  'pnpm build-with-cache',
  `git add ${path.resolve(__dirname, 'dist')}`,
];
