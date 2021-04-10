#!/usr/bin/env node
// @ts-check

const spawn = require('cross-spawn');
const globby = require('globby');

async function main() {
  const [, , ...commandArgs] = process.argv;
  const subCommandIndex = commandArgs.findIndex(arg => !/^-/.test(arg));
  const globbyArgs = new Set(subCommandIndex >= 0 ? commandArgs.slice(0, subCommandIndex) : commandArgs);
  const subCommand = commandArgs[subCommandIndex];
  const subCommandArgs = subCommandIndex >= 0 ? commandArgs.slice(subCommandIndex + 1) : [];

  /** @type {globby.GlobbyOptions} */
  const globbyOptions = {
    absolute: globbyArgs.has('--absolute'),
    dot: globbyArgs.has('--dot'),
    gitignore: !globbyArgs.has('--no-gitignore'),
  };
  if (globbyOptions.gitignore) {
    globbyOptions.ignore = (Array.isArray(globbyOptions.ignore) ? globbyOptions.ignore : []).concat('**/.git/**');
  }

  if (!subCommand) {
    throw new Error('The command to be executed was not specified.');
  }

  const globReplacedArgs = (await Promise.all(subCommandArgs.map(async arg => {
    const match = /^\{\{([\s\S]+)\}\}$/.exec(arg);
    if (!match) return [arg];
    const [, pattern] = match;
    return await globby(pattern, globbyOptions);
  }))).reduce((args, arg) => [...args, ...arg], []);
  const child = spawn(subCommand, globReplacedArgs, { stdio: 'inherit' });
  return new Promise(resolve => {
    child.on('close', exitCode => {
      process.exitCode = exitCode;
      resolve();
    });
  });
}

(async () => {
  try {
    await main();
  } catch (error) {
    process.exitCode = 1;
    console.dir(error);
  }
})();
