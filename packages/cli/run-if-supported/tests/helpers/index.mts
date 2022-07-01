import path from 'node:path';
import url from 'node:url';

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(dirname, '../..');

export function getFixturesPath(subpath: string): string {
    return path.resolve(dirname, '../fixtures', subpath);
}
