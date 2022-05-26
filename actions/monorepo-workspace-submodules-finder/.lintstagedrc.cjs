const path = require('path');

module.exports = () => [
  'pnpm build-with-cache',
  `git add ${path.resolve(__dirname, 'dist')}`,
];
