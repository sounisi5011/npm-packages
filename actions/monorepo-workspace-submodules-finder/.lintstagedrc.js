const path = require('path');

module.exports = () => [
  'pnpm build',
  `git add ${path.resolve(__dirname, 'dist')}`,
];
