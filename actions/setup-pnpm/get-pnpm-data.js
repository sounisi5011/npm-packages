function main() {
  const path = require('path');
  const pkgJsonPath = path.resolve('package.json');
  const pkg = require(pkgJsonPath);
  console.log(`Loaded ${pkgJsonPath}`);

  const { engines } = pkg;
  if (!engines) throw new Error('`engines` field is not defined');
  if (typeof engines !== 'object') throw new Error('`engines` field is not object value');

  const pnpmVersionRange = engines.pnpm;
  if (!pnpmVersionRange) throw new Error('`engines.pnpm` field is not defined');
  if (typeof pnpmVersionRange !== 'string') throw new Error('`engines.pnpm` field is not string value');

  console.log(`Detect pnpm version: ${pnpmVersionRange}`);
  console.log(`::set-output name=pnpm-version-range::${pnpmVersionRange || ''}`);
}

try {
  main();
} catch (error) {
  process.exitCode = 1;
  console.error(error.message);
}
