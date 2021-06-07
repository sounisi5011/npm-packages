// @ts-check

const { promises: fsPromises } = require('fs');
const path = require('path');
const { promisify } = require('util');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');
const makeDir = require('make-dir');

const { isProcessExist } = require('../../');

const sleepMs = promisify(setTimeout);

awaitMainFn(async () => {
  const [, , processName = 'process'] = process.argv;
  const pidFilepath = path.resolve(__dirname, `${processName}.pid`);
  const outputPidFile = path.resolve(__dirname, 'pid-result', processName, String(process.pid));

  console.log(`[${process.pid}] start`);
  await sleepMs(500);
  if (await isProcessExist(pidFilepath, {})) {
    console.error(`[${process.pid}] other process is running`);
    return;
  }

  await makeDir(path.dirname(outputPidFile));
  await fsPromises.writeFile(outputPidFile, '');

  await sleepMs(500);
  console.log(`[${process.pid}] done`);
});
