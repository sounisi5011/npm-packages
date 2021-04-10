// @ts-check

const { promises } = require('fs');

const prettierPackageJson = require('prettier-package-json');
const sortPackageJson = require('sort-package-json');

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

async function main() {
  const [, , ...commandArgs] = process.argv;
  const [optionArgs, filenameList] = commandArgs.reduce(([optionArgs, filenameList], arg) => {
    if (/^-/.test(arg)) {
      optionArgs.add(arg);
    } else {
      filenameList.push(arg);
    }
    return [optionArgs, filenameList];
  }, [new Set(), []]);

  if (filenameList.length < 1) {
    process.exitCode = 1;
    console.error(`The files to be formatted are not specified.`);
    return;
  }

  const formatDataList = await Promise.all(
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

  const nonFormattedDataList = formatDataList
    .filter(({ originalJsonText, formattedJsonText }) => originalJsonText !== formattedJsonText);

  if (optionArgs.has('--check')) {
    const invalidFilenameList = nonFormattedDataList.map(({ filename }) => filename);

    if (invalidFilenameList.length > 0) {
      process.exitCode = 1;
      console.error(
        `These files are not sorted:\n${invalidFilenameList.map(filename => `  * ${filename}`).join('\n')}`,
      );
    }
  } else if (optionArgs.has('--write')) {
    await Promise.all(nonFormattedDataList.map(async ({ filename, formattedJsonText }) => {
      await promises.writeFile(filename, formattedJsonText);
      console.log(`${filename} is formatted!`);
    }));
  } else {
    process.exitCode = 1;
    console.error(`The --check or --write option is required.`);
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
