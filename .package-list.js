// @ts-check

/*
 * This file is used by `./scripts/update-package-list`
 */

/** @type {import("./scripts/update-package-list/index.mjs").GetVersionLinkFn} */
function createNpmBadge(data) {
  const npmBadge = `![npm](https://img.shields.io/npm/v/${data.name}.svg)`;
  return `[${npmBadge}](https://www.npmjs.com/package/${data.name})`;
}

/** @type {import("./scripts/update-package-list/index.mjs").GetDependenciesLinkFn} */
function createLibrariesioBadge(data) {
  return `![Dependencies Status](https://img.shields.io/librariesio/release/npm/${data.name})`;
}

/** @type {import("./scripts/update-package-list/index.mjs").HeaderTable} */
const list = {
  'packages': {
    header: 'Packages',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'packages/cli': {
    header: 'CLI',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'packages/cli-utils': {
    header: 'CLI Utilities',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'packages/ts-utils': {
    header: 'TypeScript Utilities',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'packages/ts-type-utils': {
    header: 'TypeScript Type Utilities',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'packages/jest-matchers': {
    header: 'Jest Matchers',
    getVersionLink: createNpmBadge,
    getDependenciesLink: createLibrariesioBadge,
  },
  'actions': 'GitHub Actions',
};

module.exports = list;
