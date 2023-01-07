// @ts-check

import { promises as fsAsync } from 'node:fs';
import * as path from 'node:path';

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import hostedGitInfo from 'hosted-git-info';
import strictUriEncode from 'strict-uri-encode';
import validateNpmPkgName from 'validate-npm-package-name';
import { getWorkspaceRoot, getWorkspaces } from 'workspace-tools';

/**
 * @typedef {Object<string, string | Partial<HeaderData>>} HeaderTable
 *
 * @typedef {Object} HeaderData
 * @property {string} header
 * @property {GetVersionLinkFn} getVersionLink
 * @property {GetDependenciesLinkFn} [getDependenciesLink]
 *
 * @typedef {function(PackageInfo, UtilFuncs): string} GetVersionLinkFn
 * @typedef {function(PackageInfo, UtilFuncs): (string | undefined)} GetDependenciesLinkFn
 *
 * @typedef {Object} PackageInfo
 * @property {import('workspace-tools').WorkspaceInfo[number]['name']} name
 * @property {import('workspace-tools').WorkspaceInfo[number]['path']} path
 * @property {import('workspace-tools').WorkspaceInfo[number]['packageJson']} packageJson
 * @property {string} version
 * @property {string} versionLink
 * @property {string} localURL
 * @property {string} noScopeName
 * @property {hostedGitInfo} repoData
 * @property {string} packagePathURL
 * @property {string} headerText
 * @property {string} headerText
 * @property {string | undefined} depsLink
 *
 * @typedef {Object} UtilFuncs
 * @property {typeof strictUriEncode} strictUriEncode
 */

/**
 * @param {string} message
 */
function reportError(message) {
  process.exitCode = 1;
  console.error(message);
}

/**
 * @param {string} targetPath
 * @param {string} searchPath
 * @returns {boolean}
 */
function pathStartsWith(targetPath, searchPath) {
  return path.normalize(targetPath).startsWith(`${searchPath}${path.sep}`);
}

/**
 * @param {string} pathtext
 * @returns {string}
 */
function path2url(pathtext) {
  return pathtext.replace(new RegExp(`[\\${path.sep}]`, 'g'), '/');
}

/**
 * @param {string} packageName
 * @returns {string}
 */
function omitScopeName(packageName) {
  const result = validateNpmPkgName(packageName);
  if (!result.validForNewPackages) {
    const errorList = (result.errors || []).concat(result.warnings || []);
    throw new Error(
      `Invalid package name detected: ${packageName}`
        + errorList
          .map(reason => `\n  - ${reason}`)
          .join(''),
    );
  }

  return packageName.replace(/^@[^/]+\//, '');
}

/**
 * @param {object} pkg
 * @returns {hostedGitInfo}
 */
function getRepoData(pkg) {
  const repositoryURL = pkg.repository && typeof pkg.repository !== 'string' ? pkg.repository.url : pkg.repository;
  return hostedGitInfo.fromUrl(repositoryURL);
}

/**
 * @param {string} header
 * @returns {string}
 *
 * @see https://gist.github.com/asabaylus/3071099#gistcomment-1593627
 * @see https://github.com/gjtorikian/html-pipeline/blob/main/lib/html/pipeline/toc_filter.rb#L29-L67
 * @see https://docs.ruby-lang.org/ja/latest/doc/spec=2fregexp.html#string
 */
function headerText2markdownAnchor(header) {
  const PUNCTUATION_REGEXP = /[^\p{Letter}\p{Mark}\p{Decimal_Number}\p{Connector_Punctuation}\- ]/gu;
  return header
    .replace(/[a-zA-Z]+/g, c => c.toLowerCase())
    .replace(PUNCTUATION_REGEXP, '')
    .replace(/ +/g, '-');
}

/**
 * @param {HeaderTable} headerTable
 * @param {string} relativePackagePath
 * @returns {HeaderData}
 */
function getHeaderData(headerTable, relativePackagePath) {
  /** @type {HeaderData} */
  const defaultHeaderData = {
    header: 'Packages',
    getVersionLink(data) {
      const releaseTag = `${data.noScopeName}-v${data.version}`;
      return `[\`v${data.version}\`](${data.repoData.browse(data.packagePathURL, { committish: releaseTag })})`;
    },
  };
  do {
    const headerData = headerTable[path2url(relativePackagePath)];
    if (typeof headerData === 'string') {
      return {
        ...defaultHeaderData,
        header: headerData || defaultHeaderData.header,
      };
    } else if (headerData) {
      return {
        ...defaultHeaderData,
        ...headerData,
      };
    }
    relativePackagePath = path.dirname(relativePackagePath);
  } while (relativePackagePath && relativePackagePath !== '.');
  return defaultHeaderData;
}

/**
 * @param {string} filepath
 * @param {import('workspace-tools').WorkspaceInfo} rootPackageList
 * @param {string} packageRoot
 */
async function updateMarkdown(filepath, rootPackageList, packageRoot) {
  const filedir = path.dirname(filepath);

  /** @type {Object<string, string | { header?: string, getVersionLink?: function(object): string }>} */
  const headerTable = await import(path.resolve(filedir, '.package-list.js'))
    .then(mod => mod.default)
    .catch(() => ({}));

  const packageList = rootPackageList
    .filter(({ name, path: packagePath }) => name && pathStartsWith(packagePath, filedir))
    .filter(({ packageJson }) => !packageJson.private)
    .map(data => {
      const relativePackagePath = path.relative(packageRoot, data.path);
      const { header: headerText, getVersionLink, getDependenciesLink } = getHeaderData(
        headerTable,
        relativePackagePath,
      );

      /** @type {PackageInfo} */
      const packageInfo = {
        ...data,
        version: data.packageJson.version,
        get versionLink() {
          return getVersionLink(this, { strictUriEncode });
        },
        localURL: path2url(path.relative(filedir, data.path)),
        noScopeName: omitScopeName(data.name),
        repoData: getRepoData(data.packageJson),
        packagePathURL: path2url(relativePackagePath),
        headerText,
        get depsLink() {
          if (typeof getDependenciesLink === 'function') {
            return getDependenciesLink(this, { strictUriEncode });
          }
          return undefined;
        },
      };
      return packageInfo;
    });
  /** @type {Map<string, PackageInfo[]>} */
  const packageMap = new Map();
  for (const data of packageList) {
    const prevList = packageMap.get(data.headerText);
    if (prevList) {
      prevList.push(data);
    } else {
      packageMap.set(data.headerText, [data]);
    }
  }

  const navigationText = [...packageMap.keys()]
    .map(headerText => {
      return `- [${headerText}](#${headerText2markdownAnchor(headerText)})`;
    })
    .join('\n');
  const listText = [...packageMap.entries()]
    .map(([headerText, dataList]) => {
      const rowDataList = dataList
        .sort(({ name: a }, { name: b }) => a.localeCompare(b))
        .map(data => {
          return {
            'Package': `[\`${data.name}\`](./${data.localURL})`,
            'Version': data.versionLink,
            'Dependencies': data.depsLink,
          };
        });
      const isExistColumn = rowDataList.reduce(
        /**
         * @param {Object<string, boolean>} isExistColumn
         */
        (isExistColumn, rowData) => {
          for (const [columnName, columnValue] of Object.entries(rowData)) {
            isExistColumn[columnName] = isExistColumn[columnName] || Boolean(columnValue);
          }
          return isExistColumn;
        },
        {},
      );
      /**
       * @typedef {string[]} ColumnTextList
       * @type {ColumnTextList}
       */
      const columnNameList = Object.entries(isExistColumn)
        .filter(([, isExist]) => isExist)
        .map(([columnName]) => columnName);
      /** @type {ColumnTextList[]} */
      const rowList = [
        columnNameList.map(columnName => ` ${columnName} `),
        columnNameList.map(() => '-'),
        ...rowDataList.map(rowData => {
          const columnList = Object.entries(rowData)
            .filter(([columnName]) => isExistColumn[columnName])
            .map(([, columnValue]) => columnValue ? ` ${columnValue} ` : '');
          return columnList;
        }),
      ];
      return [
        `### ${headerText}`,
        '',
        ...rowList.map(columnList => `|${columnList.join('|')}|`),
      ].join('\n');
    })
    .join('\n\n');

  const origText = await fsAsync.readFile(filepath, 'utf8');
  const updatedText = origText.replace(
    /(?:(?:^|(?<=[\r\n]))## List of packages(?:\n.*)?)?$/s,
    [
      '## List of packages',
      '',
      navigationText,
      '',
      listText,
      '',
    ].join('\n'),
  );

  if (origText !== updatedText) {
    console.log(`Update ${filepath}`);
    await fsAsync.writeFile(filepath, updatedText);
  }
}

async function main() {
  const cwd = process.cwd();
  const [, , ...commandArgs] = process.argv;
  const filepathList = commandArgs
    .map(filename => path.resolve(cwd, filename))
    .filter(filename => /^\.md$/i.test(path.extname(filename)));

  if (filepathList.length < 1) {
    reportError(`Target files are not specified.`);
    return;
  }

  const packageRoot = getWorkspaceRoot(cwd);
  const packageList = getWorkspaces(cwd);

  for (const filepath of filepathList) {
    try {
      await updateMarkdown(filepath, packageList, packageRoot);
    } catch (error) {
      /** @type {string} */
      const message = error.message;
      error.message += (message.includes('\n') ? '\n' : ' /// ') + `updating ${filepath}`;
      throw error;
    }
  }
}

awaitMainFn(main);
