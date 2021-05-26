// @ts-check

const path = require('path');

/**
 * @param {string} pathname
 * @returns {string}
 */
function p(pathname) {
  return path.resolve(__dirname, pathname);
}

/**
 * @type {Object<string, function(Array<string>): Array<string>>}
 */
const exportMap = {
  'src/**/*{.proto,_pb.js,_pb.d.ts}': () => [
    'pnpm run build-protobuf:src',
    `git add ${p('src/**/*.proto')} ${p('src/**/*_pb.js')} ${p('src/**/*_pb.d.ts')}`,
  ],
  'tests/unit/fixtures/*{.prototxt,.bin}': () => [
    'pnpm run build-protobuf:test',
    `git add ${p('tests/unit/fixtures/*.prototxt')} ${p('tests/unit/fixtures/*.bin')}`,
  ],
};

module.exports = exportMap;
