// @ts-check

const path = require('path');
const { promisify } = require('util');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

const { isProcessExist } = require('../../');

const sleepMs = promisify(setTimeout);

awaitMainFn(async () => {
  const [, , processName = 'process'] = process.argv;
  const pidFilepath = path.resolve(__dirname, `${processName}.pid`);

  console.log(`[${process.pid}] start`);
  await sleepMs(500);
  if (await isProcessExist(pidFilepath, {})) {
    console.error(`[${process.pid}] other process is running`);
  } else {
    console.log(`[${process.pid}] done`);
  }

  await sleepMs(5 * 60 * 1000);
});
