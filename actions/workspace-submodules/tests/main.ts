import pkg from '../package.json';
import { getPackageDataList, PackageData } from '../src/main';

describe('getPackageDataList()', () => {
    it('package data should be included', async () => {
        const packageData: PackageData = {
            'path-git-relative': 'actions/workspace-submodules',
            'package-name': pkg.name,
            'version': pkg.version ?? null,
            'is-private': pkg.private ?? false,
        };
        await expect(getPackageDataList()).resolves.toContainEqual(packageData);
    });
});
