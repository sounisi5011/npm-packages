// @ts-check

const { promises: fsAsync } = require('fs');
const path = require('path');

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
 * @param {string} urlStr
 * @param {object} opts
 * @param {object} opts.pkg
 * @param {string} opts.rootURL
 * @returns {string}
 */
function replaceURL(urlStr, { pkg, rootURL }) {
  if (pkg.version) {
    if (urlStr.startsWith('https://img.shields.io/bundlephobia/') && !/\/\d+(?:\.\d+){2}$/.test(urlStr)) {
      return `${urlStr}/${pkg.version}`;
    }
    if (
      urlStr.startsWith('https://bundlephobia.com/result?')
      || urlStr.startsWith('https://packagephobia.com/badge?')
      || urlStr.startsWith('https://packagephobia.com/result?')
    ) {
      const origURL = new URL(urlStr);
      const p = origURL.searchParams.get('p');
      if (p) {
        origURL.search = createQuery(
          origURL.searchParams,
          { p: p.replace(/(?:@\d+(?:\.\d+){2})?$/, `@${pkg.version}`) },
        );
        return origURL.href;
      }
    }
  }
  if (rootURL) {
    if (urlStr.startsWith('./')) {
      return rootURL + urlStr.replace(/^\.\//, '');
    }
  }
  if (pkg.license) {
    if (urlStr.startsWith('https://img.shields.io/npm/l/')) {
      return `https://img.shields.io/static/v1${
        createQuery({
          label: 'license',
          message: pkg.license,
          color: 'green',
        })
      }`;
    }
  }
  return urlStr;
}

async function main() {
  const [, , tagName, ...filepathList] = process.argv;

  if (!tagName) {
    reportError(`Tag name is not specified.`);
    return;
  }

  if (filepathList.length < 1) {
    reportError(`Target files are not specified.`);
    return;
  }

  for (const filepath of filepathList) {
    try {
      const readmeText = await fsAsync.readFile(filepath, 'utf8');
      const pkg = require(path.resolve(path.dirname(filepath), 'package.json')) || {};

      const repoURL = pkg.repository
        && (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url)
          .replace(/^git\+/, '')
          .replace(/\.git$/, '');
      const directory = pkg.repository && typeof pkg.repository === 'object'
        ? pkg.repository.directory.replace(/\/*$/, '/')
        : '';
      const rootURL = repoURL ? `${repoURL}/tree/${tagName || 'main'}/${directory}` : '';

      /**
       * @param {string} url
       * @returns {string}
       */
      const replacer = url => {
        const newUrl = replaceURL(url, { pkg, rootURL });
        if (newUrl !== url) {
          console.log(`replace "${url}"\n     to "${newUrl}"`);
        }
        return newUrl;
      };

      const updatedReadmeText = readmeText
        .replace(/(?<=\()(?:https?:\/\/|\.{1,2}\/)[^)\s]+/g, replacer)
        .replace(/(?<=\]: *)(?:https?:\/\/|\.{1,2}\/)[^\s]+/g, replacer);

      if (readmeText !== updatedReadmeText) {
        await fsAsync.writeFile(filepath, updatedReadmeText);
      }
    } catch (error) {
      error.message += ` /// converting ${filepath}`;
      throw error;
    }
  }
}

main().catch(error => {
  process.exitCode = 1;
  console.error(error);
});
