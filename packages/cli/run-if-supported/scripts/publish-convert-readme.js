const fs = require('fs');
const path = require('path');

const getPath = pathname => path.resolve(__dirname, pathname);

const pkgPath = getPath('../package.json');
const readmePath = getPath('../README.md');

const pkg = require(pkgPath);

/**
 * @param {string} name
 * @returns {string|undefined}
 */
function lookupEnv(name) {
  for (const [envName, value] of Object.entries(process.env)) {
    if (envName.toLowerCase() === name.toLowerCase()) {
      return value;
    }
  }
  return undefined;
}

const repoURL = pkg.repository
  && (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url)
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');
const directory = pkg.repository && typeof pkg.repository === 'object'
  ? pkg.repository.directory.replace(/\/*$/, '/')
  : '';
const tagName = lookupEnv('outputs_tag_name');
const rootURL = repoURL ? `${repoURL}/tree/${tagName || 'main'}/${directory}` : '';

/**
 * @param {string} url
 * @returns {string}
 */
function replaceURL(url) {
  if (pkg.version) {
    if (url.startsWith('https://img.shields.io/bundlephobia/') && !/\/\d+(?:\.\d+){2}$/.test(url)) {
      return `${url}/${pkg.version}`;
    }
    if (
      url.startsWith('https://bundlephobia.com/result?p=')
      || url.startsWith('https://packagephobia.com/badge?p=')
      || url.startsWith('https://packagephobia.com/result?p=')
    ) {
      return url.replace(/(?:@\d+(?:\.\d+){2})?$/, `@${pkg.version}`);
    }
  }
  if (rootURL) {
    if (url.startsWith('./')) {
      return rootURL + url.replace(/^\.\//, '');
    }
  }
  if (pkg.license) {
    if (url.startsWith('https://img.shields.io/npm/l/')) {
      return `https://img.shields.io/static/v1?label=license&message=${encodeURIComponent(pkg.license)}&color=green`;
    }
  }
  if (pkg.engines && pkg.engines.node && url.startsWith('https://img.shields.io/node/v/')) {
    return `https://img.shields.io/static/v1?label=node&message=${
      encodeURIComponent(pkg.engines.node)
    }&color=brightgreen`;
  }
  return url;
}

const readmeText = fs.readFileSync(readmePath, 'utf8');

const updatedReadmeText = readmeText
  .replace(/(?<=\()(?:https?:\/\/|\.{1,2}\/)[^)\s]+/g, url => {
    const newUrl = replaceURL(url);
    if (newUrl !== url) {
      console.log(`replace "${url}"\n     to "${newUrl}"`);
    }
    return newUrl;
  })
  .replace(/(?<=\]: *)(?:https?:\/\/|\.{1,2}\/)[^\s]+/g, url => {
    const newUrl = replaceURL(url);
    if (newUrl !== url) {
      console.log(`replace "${url}"\n     to "${newUrl}"`);
    }
    return newUrl;
  });

fs.writeFileSync(readmePath, updatedReadmeText);
