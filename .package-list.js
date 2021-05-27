// @ts-check

/*
 * This file is used by `./scripts/update-package-list.js`
 */

/** @type {import("./scripts/update-package-list").HeaderData['getVersionLink']} */
function createNpmBadge(data) {
  const npmBadge = `![npm](https://img.shields.io/npm/v/${data.name}.svg)`;
  return `[${npmBadge}](https://www.npmjs.com/package/${data.name})`;
}

/** @type {import("./scripts/update-package-list").HeaderTable} */
const list = {
  'packages': {
    header: 'Packages',
    getVersionLink: createNpmBadge,
  },
  'packages/cli': {
    header: 'CLI',
    getVersionLink: createNpmBadge,
  },
  'packages/ts-type-utils': {
    header: 'TypeScript Type Utilities',
    getVersionLink: createNpmBadge,
  },
  'actions': 'GitHub Actions',
};

module.exports = list;
