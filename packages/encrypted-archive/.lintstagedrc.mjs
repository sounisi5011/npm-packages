// @ts-check
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(new URL('.', 'import.meta.url'));

/**
 * @param {string} pathname
 * @returns {string}
 */
function p(pathname) {
  return path.resolve(__dirname, pathname);
}

/**
 * @type {Object<string, import('../../.lintstagedrc.mjs').ConfigFunc>}
 */
export default {
  'src/**/*{.proto,_pb.js,_pb.d.ts}': () => [
    'pnpm run build-protobuf:src',
    `git add ${p('src/**/*.proto')} ${p('src/**/*_pb.js')} ${p('src/**/*_pb.d.ts')}`,
  ],
  'tests/unit/fixtures/*{.prototxt,.bin}': () => [
    'pnpm run build-protobuf:test',
    `git add ${p('tests/unit/fixtures/*.prototxt')} ${p('tests/unit/fixtures/*.bin')}`,
  ],
};
