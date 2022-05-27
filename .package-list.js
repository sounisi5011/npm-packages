// @ts-check

/*
 * This file is used by `./scripts/update-package-list`
 */

/** @type {import("./scripts/update-package-list/index.mjs").HeaderData['getVersionLink']} */
function createNpmBadge(data) {
  const npmBadge = `![npm](https://img.shields.io/npm/v/${data.name}.svg)`;
  return `[${npmBadge}](https://www.npmjs.com/package/${data.name})`;
}

/** @type {import("./scripts/update-package-list/index.mjs").HeaderTable} */
const list = {
  'packages': {
    header: 'Packages',
    getVersionLink: createNpmBadge,
  },
  'packages/cli': {
    header: 'CLI',
    getVersionLink: createNpmBadge,
  },
  'packages/cli-utils': {
    header: 'CLI Utilities',
    getVersionLink: createNpmBadge,
  },
  'packages/ts-utils': {
    header: 'TypeScript Utilities',
    getVersionLink: createNpmBadge,
  },
  'packages/ts-type-utils': {
    header: 'TypeScript Type Utilities',
    getVersionLink: createNpmBadge,
  },
  'packages/jest-matchers': {
    header: 'Jest Matchers',
    getVersionLink: createNpmBadge,
  },
  'actions': 'GitHub Actions',
};

module.exports = list;
