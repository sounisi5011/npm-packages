// @ts-check

const { promises } = require('fs');

const prettierPackageJson = require('prettier-package-json');
const sortPackageJson = require('sort-package-json');

/**
 * @typedef {{ filename: string, originalJsonText: string, formattedJsonText: string }} FormattedData
 */

/**
 * @param {readonly string[]} args
 */
function parseCommandArgs(args) {
  /** @type {Set<string>} */
  const optionArgsSet = new Set();
  /** @type {string[]} */
  const otherArgsList = [];

  for (const arg of args) {
    if (/^-/.test(arg)) {
      optionArgsSet.add(arg);
    } else {
      otherArgsList.push(arg);
    }
  }

  return { optionArgsSet, otherArgsList };
}

/**
 * @param {string} jsonText
 * @returns {string}
 */
function format(jsonText) {
  const jsonData = JSON.parse(jsonText);
  const formatted1 = prettierPackageJson.format(jsonData);
  const formatted2 = sortPackageJson(formatted1);
  return formatted2;
}

/**
 * @param {readonly string[]} filenameList
 * @returns {Promise<FormattedData[]>}
 */
async function getFormattedDataList(filenameList) {
  return await Promise.all(
    filenameList
      .map(async filename => {
        const originalJsonText = await promises.readFile(filename, 'utf8');
        const formattedJsonText = format(originalJsonText);
        return {
          filename,
          originalJsonText,
          formattedJsonText,
        };
      }),
  );
}

/**
 * @param {string} message
 */
function reportError(message) {
  process.exitCode = 1;
  console.error(message);
}

/**
 * @param {readonly FormattedData[]} nonFormattedDataList
 */
function processCheck(nonFormattedDataList) {
  const invalidFilenameList = nonFormattedDataList.map(({ filename }) => filename);

  if (invalidFilenameList.length > 0) {
    const fileList = invalidFilenameList.map(filename => `  * ${filename}`).join('\n');
    reportError(`These files are not sorted:\n${fileList}`);
  }
}

/**
 * @param {readonly FormattedData[]} nonFormattedDataList
 */
async function processWrite(nonFormattedDataList) {
  await Promise.all(nonFormattedDataList.map(async ({ filename, formattedJsonText }) => {
    await promises.writeFile(filename, formattedJsonText);
    console.log(`${filename} is formatted!`);
  }));
}

async function main() {
  const [, , ...commandArgs] = process.argv;
  const { optionArgsSet, otherArgsList: filenameList } = parseCommandArgs(commandArgs);

  if (filenameList.length < 1) {
    reportError(`The files to be formatted are not specified.`);
    return;
  }

  const formatDataList = await getFormattedDataList(filenameList);
  const nonFormattedDataList = formatDataList
    .filter(({ originalJsonText, formattedJsonText }) => originalJsonText !== formattedJsonText);

  if (optionArgsSet.has('--check')) {
    processCheck(nonFormattedDataList);
  } else if (optionArgsSet.has('--write')) {
    await processWrite(nonFormattedDataList);
  } else {
    reportError(`The --check or --write option is required.`);
  }
}

(async () => {
  try {
    await main();
  } catch (error) {
    process.exitCode = 1;
    console.dir(error);
  }
})();
