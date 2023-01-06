// @ts-check

import _renameExtensions from '@betit/rollup-plugin-rename-extensions';
import typescript from '@rollup/plugin-typescript';

/* eslint-disable dot-notation */
/** @type {typeof _renameExtensions} */
const renameExtensions = typeof _renameExtensions !== 'function' && typeof _renameExtensions['default'] === 'function'
  // The default export from the CommonJS package will not work if the native Node ES modules are used.
  // To get the default export, the "default" property must be used.
  ? _renameExtensions['default']
  : _renameExtensions;
/* eslint-enable */

// The "@betit/rollup-plugin-rename-extensions" ignores the TypeScript sourceMap and generates an incorrect sourceMap.
// Therefore, disable the generation of the sourceMap.
const generateSourceMap = false;

/** @type {import('rollup').RollupOptions} */
const options = {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: generateSourceMap,
  },
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
      inlineSources: false,
      sourceMap: generateSourceMap,
      // Disables the generation of type definition files.
      // Because the tsc command generates the type definition files.
      declaration: false,
      composite: false,
    }),
    renameExtensions({
      mappings: {
        '.js': '.cjs',
      },
    }),
  ],
};

export default options;
