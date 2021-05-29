import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import { getPackageDataList, PackageData } from '../src/main';
import pkg from '../package.json';

describe('getPackageDataList()', () => {
    it('package data should be included', async () => {
        const packageData: PackageData = {
            'path-git-relative': 'actions/monorepo-workspace-submodules-finder',
            'package-name': pkg.name,
            'version': pkg.version ?? null,
            // eslint-disable-next-line jest/no-if
            'is-private': (Object.prototype.hasOwnProperty.call as hasOwnProperty)(pkg, 'private')
                ? Boolean(pkg.private)
                : false,
        };
        await expect(getPackageDataList()).resolves.toContainEqual(packageData);
    });
});
