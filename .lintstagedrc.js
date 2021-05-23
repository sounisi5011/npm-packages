// @ts-check
const path = require('path');

const findUp = require('find-up');

/**
 * @param {string} fullPath
 * @param {string} searchPath
 * @returns {boolean}
 */
function startsWith(fullPath, searchPath) {
  return fullPath.startsWith(
    (
      path.resolve(searchPath)
        .replace(new RegExp(`\\${path.sep}+$`), '')
    ) + path.sep,
  );
}

/**
 * @param {string|RegExp} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return typeof basename === 'string'
    ? filename => path.basename(filename) === basename
    : filename => basename.test(path.basename(filename));
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map(ext => ext.replace(/^\.?/, '.'));
  return filename => extList.includes(path.extname(filename));
}

/**
 * @template T
 * @param {readonly T[]} array
 * @returns {T[]}
 */
function unique(array) {
  return [...new Set(array)];
}

/**
 * @param {string|RegExp} searchValue
 * @param {string} replaceValue
 * @returns {function(string): string}
 */
function replace(searchValue, replaceValue) {
  return filename => filename.replace(searchValue, replaceValue);
}

module.exports = {
  /**
   * @param {string[]} filenames
   */
  '*': filenames => {
    /** @type {string[]} */
    const commands = [];

    commands.push(`prettier --write ${filenames.join(' ')}`);

    const pkgFiles = filenames.filter(baseFilter('package.json'));
    if (pkgFiles.length >= 1) {
      commands.push(
        `node ./scripts/format-package-json.js --write ${pkgFiles.join(' ')}`,
      );
    }

    const tsOrJsFiles = filenames.filter(extFilter('ts', 'js'));
    if (tsOrJsFiles.length >= 1) {
      commands.push(
        `eslint --fix ${tsOrJsFiles.join(' ')}`,
      );
    }

    const flatbuffersFiles = filenames.filter(extFilter('fbs'));
    if (flatbuffersFiles.length >= 1) {
      const generatedTsFiles = flatbuffersFiles.map(replace(/\.fbs$/, '_generated.ts'));
      commands.push(
        ...flatbuffersFiles
          .map(flatbuffersFile => `flatc --ts -o ${path.dirname(flatbuffersFile)} ${flatbuffersFile}`),
        `fix-flatbuffers-generated-ts ${generatedTsFiles.join(' ')}`,
        `git add ${generatedTsFiles.join(' ')}`,
      );
    }

    const protobufExtRegExp = /(?:\.proto|_pb\.js|_pb\.d\.ts)$/;
    const protobufTargetFiles = filenames.filter(baseFilter(protobufExtRegExp));
    if (protobufTargetFiles.length >= 1) {
      const sourceFiles = unique(protobufTargetFiles.map(replace(protobufExtRegExp, '.proto')));
      const generatedJsFiles = unique(protobufTargetFiles.map(replace(protobufExtRegExp, '_pb.js')));
      const generatedDtsFiles = unique(protobufTargetFiles.map(replace(protobufExtRegExp, '_pb.d.ts')));

      /** @type {Map<string, string[]>} */
      const sourceFileMap = new Map();
      for (const sourceFilepath of sourceFiles) {
        const sourceDirpath = path.dirname(sourceFilepath);
        const sourceFilepathList = sourceFileMap.get(sourceDirpath);
        if (sourceFilepathList) {
          sourceFilepathList.push(sourceFilepath);
        } else {
          sourceFileMap.set(sourceDirpath, [sourceFilepath]);
        }
      }

      commands.push(
        ...[...sourceFileMap.entries()].map(([sourceDir, sourceFileList]) => {
          const protocGenTsPath = findUp.sync('./node_modules/.bin/protoc-gen-ts', { cwd: sourceDir });
          if (typeof protocGenTsPath !== 'string') {
            throw new Error(`Processing '${sourceFileList[0]}'\n\`protoc-gen-ts\` command not found in: ${sourceDir}`);
          }
          return [
            `protoc`,
            `--plugin=protoc-gen-ts=${protocGenTsPath}`,
            `--js_out=import_style=commonjs,binary:${sourceDir}`,
            `--ts_out=${sourceDir}`,
            `--proto_path ${sourceDir}`,
            ...sourceFileList,
          ].join(' ');
        }),
        [
          `git add`,
          ...sourceFiles,
          ...generatedJsFiles,
          ...generatedDtsFiles,
        ].join(' '),
      );
    }

    if (filenames.some(filename => startsWith(filename, 'actions'))) {
      commands.push(
        `ultra --recursive --filter 'actions/**' build`,
        'git add ./actions/*/dist/**',
      );
    }

    return commands;
  },
};
