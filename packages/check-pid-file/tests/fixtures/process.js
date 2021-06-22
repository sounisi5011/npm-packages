// @ts-check

const path = require('path');
const { promisify } = require('util');

const { awaitMainFn } = require('@sounisi5011/cli-utils-top-level-await');

const { isProcessExist } = require('../../');

const sleepMs = promisify(setTimeout);

/**
 * @returns {string}
 */
function printTime() {
  const date = new Date();
  return (
    [
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ]
      .map(num => String(num).padStart(2, '0'))
      .join(':')
  ) + `.${String(date.getUTCMilliseconds()).padStart(3, '0')}`;
}

awaitMainFn(async () => {
  const [, , processName = 'process'] = process.argv;
  const pidFilepath = path.resolve(__dirname, `${processName}.pid`);

  /** @type {string} */
  let startTime;
  console.log(`[${process.pid} ${startTime = printTime()}] start`);
  await sleepMs(500);
  if (await isProcessExist(pidFilepath)) {
    console.error(`[${process.pid} ${startTime}~${printTime()}] other process is running`);
  } else {
    console.log(`[${process.pid} ${startTime}~${printTime()}] done`);
  }

  await sleepMs(5 * 60 * 1000);
});
