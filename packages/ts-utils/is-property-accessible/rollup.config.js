// @ts-check

import renameExtensions from '@betit/rollup-plugin-rename-extensions';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
const options = {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
    }),
    renameExtensions({
      mappings: {
        '.js': '.cjs',
      },
    }),
  ],
};

export default options;
