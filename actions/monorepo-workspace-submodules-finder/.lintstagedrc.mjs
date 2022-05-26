import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(new URL('.', 'import.meta.url'));

export default () => [
  'pnpm build-with-cache',
  `git add ${path.resolve(__dirname, 'dist')}`,
];
