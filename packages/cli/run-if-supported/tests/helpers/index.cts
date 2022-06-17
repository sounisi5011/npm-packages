import * as path from 'node:path';

export const PACKAGE_ROOT = path.resolve(__dirname, '../..');

export function getFixturesPath(subpath: string): string {
    return path.resolve(__dirname, '../fixtures', subpath);
}
