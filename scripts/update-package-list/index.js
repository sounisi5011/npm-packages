// @ts-check

const { promises: fsAsync } = require('fs');
const path = require('path');

const hostedGitInfo = require('hosted-git-info');
const strictUriEncode = require('strict-uri-encode');
const validateNpmPkgName = require('validate-npm-package-name');
const { getWorkspaces, getWorkspaceRoot } = require('workspace-tools');

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

  const match = validateNpmPkgName.scopedPackagePattern.exec(packageName);
  return match ? match[2] : packageName;
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
 * @param {string} relativePackagePath
 * @returns {{ header: string, getVersionLink: function(object): string }}
 */
function getHeaderData(relativePackagePath) {
  const defaultHeaderData = {
    header: 'Packages',
    getVersionLink(data) {
      return `[![npm](https://img.shields.io/npm/v/${data.name}.svg)](https://www.npmjs.com/package/${data.name})`;
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

  const packageList = rootPackageList
    .filter(({ name, path: packagePath }) => name && pathStartsWith(packagePath, filedir))
    .filter(({ packageJson }) => !packageJson.private)
    .map(data => {
      const relativePackagePath = path.relative(packageRoot, data.path);
      const { header: headerText, getVersionLink } = getHeaderData(relativePackagePath);

      return {
        ...data,
        version: data.packageJson.version,
        get versionLink() {
          return getVersionLink(this);
        },
        localURL: path2url(path.relative(filedir, data.path)),
        noScopeName: omitScopeName(data.name),
        repoData: getRepoData(data.packageJson),
        packagePathURL: path2url(relativePackagePath),
        headerText,
      };
    });
  /** @type {Map<string, typeof packageList>} */
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
      return [
        `### ${headerText}`,
        '',
        '| Package | Version | Dependencies |',
        '|-|-|-|',
        ...dataList.sort(({ name: a }, { name: b }) => a.localeCompare(b)).map(data => {
          const packageLink = `[\`${data.name}\`](./${data.localURL})`;

          const davidDmBadge =
            `![Dependency Status](https://status.david-dm.org/gh/${data.repoData.user}/${data.repoData.project}.svg?path=${
              strictUriEncode(data.packagePathURL)
            })`;
          const davidDmLink =
            `[${davidDmBadge}](https://david-dm.org/${data.repoData.user}/${data.repoData.project}?path=${
              strictUriEncode(data.packagePathURL)
            })`;

          return `| ${packageLink} | ${data.versionLink} | ${davidDmLink} |`;
        }),
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

const headerTable = {
  'packages': 'Packages',
  'packages/cli': 'CLI',
  'packages/ts-type-utils': 'TypeScript Type Utilities',
  'actions': {
    header: 'GitHub Actions',
    getVersionLink(data) {
      const releaseTag = `${data.noScopeName}-v${data.version}`;
      return `[\`v${data.version}\`](${data.repoData.browse(data.packagePathURL, { committish: releaseTag })})`;
    },
  },
};

main().catch(error => {
  process.exitCode = 1;
  console.error(error);
});
