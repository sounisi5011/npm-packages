#!/usr/bin/env node
// @ts-check

import { awaitMainFn } from '@sounisi5011/cli-utils-top-level-await';
import { spawn } from 'cross-spawn';
import { globby } from 'globby';

/**
 * @param {readonly string[]} args
 */
function parseCommandArgs(args) {
  const subCommandIndex = args.findIndex(arg => !/^-/.test(arg));
  if (subCommandIndex >= 0) {
    return {
      globbyArgsSet: new Set(args.slice(0, subCommandIndex)),
      subCommand: args[subCommandIndex],
      subCommandArgs: args.slice(subCommandIndex + 1),
    };
  } else {
    return {
      globbyArgsSet: new Set(args),
      subCommand: undefined,
      subCommandArgs: [],
    };
  }
}

/**
 * @param {Set<string>} globbyArgsSet
 */
function getGlobbyOptions(globbyArgsSet) {
  /** @type {import('globby').Options} */
  const globbyOptions = {
    absolute: globbyArgsSet.has('--absolute'),
    dot: globbyArgsSet.has('--dot'),
    gitignore: !globbyArgsSet.has('--no-gitignore'),
    followSymbolicLinks: globbyArgsSet.has('--follow-symlink'),
  };
  if (globbyOptions.gitignore) {
    globbyOptions.ignore = (Array.isArray(globbyOptions.ignore) ? globbyOptions.ignore : []).concat('**/.git/**');
  }
  return globbyOptions;
}

/**
 * @param {import('globby').Options} globbyOptions
 * @returns {(arg: string) => Promise<string[]>}
 */
function replaceGlob(globbyOptions) {
  return async arg => {
    const match = /^\{\{([\s\S]+)\}\}$/.exec(arg);
    if (!match) return [arg];
    const [, pattern] = match;
    return await globby(pattern, globbyOptions);
  };
}

/**
 * @template T
 * @param {T[][]} array
 * @returns {T[]}
 */
function flatArray(array) {
  return array.reduce((args, arg) => [...args, ...arg], []);
}

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {import('child_process').SpawnOptions} options
 * @returns {Promise<void}
 */
async function spawnAsync(command, args, options) {
  const child = spawn(command, args, options);
  return new Promise(resolve => {
    child.on('close', exitCode => {
      process.exitCode = exitCode;
      resolve();
    });
  });
}

async function main() {
  const [, , ...commandArgs] = process.argv;
  const { globbyArgsSet, subCommand, subCommandArgs } = parseCommandArgs(commandArgs);

  if (!subCommand) throw new Error('The command to be executed was not specified.');

  const globbyOptions = getGlobbyOptions(globbyArgsSet);
  const globReplacedArgs = flatArray(await Promise.all(subCommandArgs.map(replaceGlob(globbyOptions))));
  await spawnAsync(subCommand, globReplacedArgs, { stdio: 'inherit' });
}

awaitMainFn(main);
