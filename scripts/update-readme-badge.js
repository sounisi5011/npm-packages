// @ts-check

const { promises: fsAsync } = require('fs');
const path = require('path');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

/**
 * @param {string} str
 */
function rfc3986(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * @param {Array<Object<string, string> | URLSearchParams>} paramsList
 * @returns {string}
 */
function createQuery(...paramsList) {
  /** @type {Map<string, string>} */
  const paramsMap = new Map();
  for (const params of paramsList) {
    for (const [name, value] of (params instanceof URLSearchParams ? params : Object.entries(params))) {
      paramsMap.set(name, value);
    }
  }
  const queryText = [...paramsMap.entries()]
    .map(([name, value]) => `${rfc3986(name)}=${rfc3986(value)}`)
    .join('&');
  return queryText ? `?${queryText}` : '';
}

/**
 * @param {string} message
 */
function reportError(message) {
  process.exitCode = 1;
  console.error(message);
}

/**
 * @param {string} filepath
 */
function tryReadJson(filepath) {
  try {
    return require(filepath);
  } catch {}
}

const NPM_BADGE =
  /\[!\[Go to the latest release page on npm\]\(https:\/\/img\.shields\.io\/npm\/v\/(?:(?!\.svg\))[^)])+\.svg\)\]\(https:\/\/(?:www\.)?npmjs\.com\/package\/[^)]+\)/g;

/**
 * @param {*} pkg
 * @returns {function(string): string}
 */
function replaceNpm(pkg) {
  const pkgName = pkg.name;
  return origText => {
    if (!pkgName) return origText;
    const badgeText = `![Go to the latest release page on npm](https://img.shields.io/npm/v/${pkgName}.svg)`;
    return `[${badgeText}](https://www.npmjs.com/package/${pkgName})`;
  };
}

const NODE_VERSION_BADGE =
  /!\[Supported Node\.js version(?::[^\]]+)?\]\((https:\/\/img\.shields\.io\/(?:node\/v\/|static\/v1\?)[^)]+)\)/g;

/**
 * @param {*} pkg
 * @returns {function(*, string): string}
 */
function replaceNodeVersion(pkg) {
  return (_, origURL) => {
    const nodeVersionRange = (pkg.engines || {}).node;
    if (!nodeVersionRange) {
      throw new Error(`engines.node field is not defined`);
    }

    const badgeURL = `https://img.shields.io/static/v1${
      createQuery(
        { label: 'node', message: '', color: 'brightgreen' },
        new URL(origURL).searchParams,
        { message: nodeVersionRange },
      )
    }`;

    const badgeText = `![Supported Node.js version: ${nodeVersionRange}](${badgeURL})`;
    return badgeText;
  };
}

const BUNDLEPHOBIA_BADGE =
  /\[!\[Minified Bundle Size Details\]\(https:\/\/img\.shields\.io\/bundlephobia\/min\/[^)]+\)\]\(https:\/\/bundlephobia\.com\/result\?p=[^)]+\)/g;

/**
 * @param {*} pkg
 * @returns {function(string): string}
 */
function replaceBundlephobia(pkg) {
  const pkgName = pkg.name;
  return origText => {
    if (!pkgName) return origText;
    const badgeText = `![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/${pkgName})`;
    return `[${badgeText}](https://bundlephobia.com/result${createQuery({ p: pkgName })})`;
  };
}

const PACKAGEPHOBIA_BADGE =
  /\[!\[Install Size Details\]\(https:\/\/packagephobia\.com\/badge\?p=[^)]+\)\]\(https:\/\/packagephobia\.com\/result\?p=[^)]+\)/g;

/**
 * @param {*} pkg
 * @returns {function(string): string}
 */
function replacePackagephobia(pkg) {
  const pkgName = pkg.name;
  return origText => {
    if (!pkgName) return origText;
    const badgeText = `![Install Size Details](https://packagephobia.com/badge${createQuery({ p: pkgName })})`;
    return `[${badgeText}](https://packagephobia.com/result${createQuery({ p: pkgName })})`;
  };
}

const DAVID_DM_BADGE =
  /\[!\[Dependencies Status\]\(https:\/\/status\.david-dm\.org\/gh\/(?:(?!\.svg\))[^?#)])+\.svg(?:[?#][^)]*)?\)\]\(https:\/\/david-dm\.org\/[^)]+\)/g;

/**
 * @param {*} pkg
 * @param {string} dirname
 * @returns {function(string): string}
 */
function replaceDavidDM(pkg, dirname) {
  const repoURL = pkg.repository
    && (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url)
      .replace(/^git\+/, '')
      .replace(/\.git$/, '');
  const repoPath = repoURL && new URL(repoURL).pathname.replace(/^\/+/, '');
  return origText => {
    if (!repoURL) return origText;
    const badgeText = `![Dependencies Status](https://status.david-dm.org/gh/${repoPath}.svg${
      createQuery(dirname ? { path: dirname } : {})
    })`;
    return `[${badgeText}](https://david-dm.org/${repoPath}${createQuery(dirname ? { path: dirname } : {})})`;
  };
}

async function main() {
  const [, , ...commandArgs] = process.argv;
  const filepathList = commandArgs
    .filter(filename => /^readme\.md$/i.test(path.basename(filename)))
    .map(filename => path.resolve(filename));

  if (filepathList.length < 1) {
    reportError(`Target files are not specified.`);
    return;
  }

  for (const filepath of filepathList) {
    try {
      const readmeText = await fsAsync.readFile(filepath, 'utf8');
      const pkg = tryReadJson(path.resolve(path.dirname(filepath), 'package.json')) || {};

      const updatedReadmeText = readmeText
        .replace(NPM_BADGE, replaceNpm(pkg))
        .replace(NODE_VERSION_BADGE, replaceNodeVersion(pkg))
        .replace(BUNDLEPHOBIA_BADGE, replaceBundlephobia(pkg))
        .replace(PACKAGEPHOBIA_BADGE, replacePackagephobia(pkg))
        .replace(DAVID_DM_BADGE, replaceDavidDM(pkg, path.relative(process.cwd(), path.dirname(filepath))));

      if (readmeText !== updatedReadmeText) {
        await fsAsync.writeFile(filepath, updatedReadmeText);
      }
    } catch (error) {
      error.message += ` /// updating ${filepath}`;
      throw error;
    }
  }
}

awaitMainFn(main);
