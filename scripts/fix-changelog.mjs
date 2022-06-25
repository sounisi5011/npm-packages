// @ts-check

/**
 * Make the following fixes to `CHANGELOG.md` generated by `release-please-action@v2`:
 *
 * + Insert the "Commits" section
 * + Fix the heading levels
 *
 * Usage: node scripts/fix-changelog.mjs ./path/to/package-root
 */

import { promises as fsAsync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import { execa } from 'execa';

/**
 * @see https://semver.org/#backusnaur-form-grammar-for-valid-semver-versions
 */
const SEMVER_REGEXP = /[0-9]+(?:\.[0-9]+){2}(?:-[.0-9a-zA-Z-]+)?(?:\+[.0-9a-zA-Z-]+)?/;
const VERSION_HEADING_REGEXP = new RegExp(
  String.raw
    `\n+^###? *(?:<(\w+)[^>]*>)?(?<heading_text>(?:${SEMVER_REGEXP.source}|\[${SEMVER_REGEXP.source}\]\([^)]+/compare/(?<base_ref>[^\s)]+?)\.{2,3}(?<head_ref>[^\s)]+?)\)) \([0-9]{4,}(?:-[0-9]{1,2}){2}\))(?:</\1>)?$`,
  'gm',
);
const COMMITS_SECTION_REGEXP = /^### *Commits$(?:\n(?!#)[^\n]*)*\n*/m;

const REPO_URL_PREFIX = 'https://www.github.com/sounisi5011/npm-packages';

/**
 * @param {*} value
 * @param {NodeJS.WriteStream | null} targetStream
 * @return {string}
 */
function inspect(value, targetStream = null) {
  /**
   * @see https://github.com/nodejs/node/blob/v18.4.0/lib/internal/console/constructor.js#L317-L319
   */
  const isColorEnabled = Boolean(
    targetStream
      && targetStream.isTTY
      && (typeof targetStream.getColorDepth === 'function' ? targetStream.getColorDepth() > 2 : true),
  );
  return util.inspect(value, { colors: isColorEnabled });
}

/**
 * @typedef {Object} ReplaceInfo
 * @property {number} start
 * @property {number} end
 * @property {string} str
 *
 * @param {string} input
 * @param {readonly ReplaceInfo[]} replaceList
 * @return {string}
 */
function replaceMulti(input, replaceList) {
  if (replaceList.length < 1) return input;

  const sortedReplaceList = [...replaceList].sort((a, b) => {
    if (a.start < b.start) return -1;
    if (b.start < a.start) return +1;

    if (a.end < b.end) return +1;
    if (b.end < a.end) return -1;

    return 0;
  });

  return [
    input.substring(0, sortedReplaceList[0].start ?? 0),
    ...sortedReplaceList.flatMap(({ end, str }, index, list) => {
      const next = list[index + 1];
      return [
        str,
        input.substring(end, next?.start ?? Infinity),
      ];
    }),
  ].join('');
}

/**
 * @typedef {Object} CommitData
 * @property {string} shortHash
 * @property {string} longHash
 * @property {string} title
 * @property {readonly string[]} tagList
 *
 * @param {string} targetDirpath
 * @param {string} defaultBrunch
 * @return {Promise<CommitData[]>}
 */
async function getCommitList(targetDirpath, defaultBrunch) {
  /**
   * @see https://qiita.com/isuke/items/35b192b0899872aa7b03
   */
  const commandResult = await execa('git', [
    'log',
    '--pretty=format:hash:%h %H\ntitle:%s\ntags:%D\n',
    '--decorate-refs=tags',
    defaultBrunch,
    '--',
    targetDirpath,
  ]);
  return commandResult.stdout.split(/\n{2,}/)
    .flatMap(line => {
      const match = /^hash:(\w+) (\w+)\ntitle:([^\n]+)\ntags:(.*)$/.exec(line);
      if (!match) return [];
      const [, shortHash, longHash, title, tagsStr] = match;
      const tagList = tagsStr
        /**
         * Git tags can include ",".
         * So do not split by ",".
         * Always split by ", ".
         * This is safe because Git tags cannot contain spaces.
         */
        .split(/, +/)
        .flatMap(tagStr => {
          const match = /^tag: +(\S+)/.exec(tagStr);
          return match ? [match[1]] : [];
        });
      return {
        shortHash,
        longHash,
        title,
        tagList,
      };
    });
}

/**
 * Returns only those commits within the specified tags.
 * @param {readonly CommitData[]} commitList
 * @param {Object} tagRange
 * @param {string|undefined} tagRange.head Tag name for the start of range. If non-existent tag or undefined, included from the 0th commit.
 * @param {string|undefined} tagRange.base Tag name for the end of range. If undefined, include up to the oldest commit.
 * @return {CommitData[]}
 */
function filterCommitList(commitList, tagRange) {
  /** @type {CommitData[]} */
  const targetCommitList = [];
  const { head: headTag, base: baseTag } = tagRange;

  /**
   * If the `tagRange.head` is undefined or does not yet exist (has not been released),
   * set the initial value to `true` and include the latest commits.
   * Note: Since a Git tag with an empty string cannot be created,
   *       there is no need to consider the difference between `undefined` and an empty string.
   */
  let isInner = !headTag || !commitList.some(({ tagList }) => tagList.includes(headTag));
  for (const commit of commitList) {
    if (baseTag && commit.tagList.includes(baseTag)) isInner = false;
    if (isInner) targetCommitList.push(commit);
    if (headTag && commit.tagList.includes(headTag)) isInner = true;
  }
  return targetCommitList;
}

/**
 * @param {RegExpMatchArray} headingMatch
 * @param {readonly CommitData[]} commitList
 * @param {{ start: number, end: number }} sectionRange
 * @return {Promise<ReplaceInfo>}
 */
async function fixChangelogSection(headingMatch, commitList, sectionRange) {
  const changelogText = headingMatch.input ?? '';
  const headingLine = headingMatch[0];
  const sectionBody = changelogText.substring(sectionRange.start + headingLine.length, sectionRange.end).trim();
  const headingText = headingMatch.groups?.heading_text.trim() ?? '';

  const newHeadingLine = `## ${headingText}`;

  const formattedSectionBody = sectionBody
    .replace(COMMITS_SECTION_REGEXP, '')
    .replace(/\n{3,}#/g, '\n\n#')
    .trim();
  const commitsSectionText = (
    `### Commits\n\n<details><summary>show ${commitList.length} commits</summary>\n\n`
    + commitList
      .map(commit => {
        const commitURL = `${REPO_URL_PREFIX}/commit/${commit.longHash}`;
        const commitTitle = commit.title.replace(/#([0-9]+)/g, `[$&](${REPO_URL_PREFIX}/issues/$1)`);
        return `* [\`${commit.shortHash}\`](${commitURL}) ${commitTitle}`;
      })
      .join('\n')
    + '\n\n</details>'
  );
  const newSectionBody = [
    formattedSectionBody,
    commitsSectionText,
  ].filter(str => str !== '').join('\n\n');

  return {
    str: `\n\n\n${newHeadingLine}\n\n${newSectionBody}`,
    ...sectionRange,
  };
}

/**
 * @param {string} defaultBrunch
 * @return {(packageRootPath: string) => Promise<string | null>}
 */
function fixChangelog(defaultBrunch) {
  return async packageRootPath => {
    const { changelogPath, changelogText } = await fsAsync.readFile(packageRootPath, 'utf8')
      .then(changelogText => ({ changelogPath: packageRootPath, changelogText }))
      .catch(async error => {
        if (error.code !== 'EISDIR') throw error;

        const changelogPath = path.resolve(packageRootPath, 'CHANGELOG.md');
        const changelogText = await fsAsync.readFile(changelogPath, 'utf8');
        return { changelogPath, changelogText };
      });

    const commitList = await getCommitList(path.dirname(changelogPath), defaultBrunch);

    const newChangelogText = replaceMulti(
      changelogText,
      await Promise.all(
        [...changelogText.matchAll(VERSION_HEADING_REGEXP)]
          .map((headingMatch, index, headingList) => {
            const prevHeadingMatch = headingList[index - 1];
            const nextHeadingMatch = headingList[index + 1];
            return fixChangelogSection(
              headingMatch,
              filterCommitList(
                commitList,
                {
                  head: headingMatch.groups?.head_ref ?? prevHeadingMatch?.groups?.base_ref,
                  base: headingMatch.groups?.base_ref,
                },
              ),
              {
                start: (headingMatch.index ?? 0),
                end: nextHeadingMatch?.index ?? Infinity,
              },
            );
          }),
      ),
    );

    if (newChangelogText === changelogText) return null;
    await fsAsync.writeFile(changelogPath, newChangelogText);
    return changelogPath;
  };
}

awaitMainFn(async () => {
  const cwd = process.cwd();
  const [, , ...packageRootPathList] = process.argv;
  const defaultBrunch = process.env.GITHUB_BASE_REF || 'main';

  if (packageRootPathList.length < 1) throw new Error('Target dirs are not specified.');
  const packageRootFullpathList = packageRootPathList
    .map(packageRootPath => path.resolve(cwd, packageRootPath));

  const errorList = (await Promise.allSettled(packageRootFullpathList.map(fixChangelog(defaultBrunch))))
    .flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        if (typeof result.value === 'string') {
          console.log(`updated '${path.relative(cwd, result.value)}'`);
        }
        return [];
      }
      return [{
        packageRootPath: packageRootFullpathList[index],
        error: result.reason,
      }];
    });

  if (errorList.length >= 1) {
    throw errorList
      .map(({ packageRootPath, error }) =>
        `fixing '${path.relative(cwd, packageRootPath)}'\n` + inspect(error, process.stderr).replace(/^(?!$)/gm, '  ')
      )
      .join('\n\n');
  }
});
