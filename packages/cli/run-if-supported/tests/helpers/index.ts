import * as path from 'node:path';
import * as url from 'node:url';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(__dirname, '../..');

export function getFixturesPath(subpath: string): string {
    return path.resolve(__dirname, '../fixtures', subpath);
}
