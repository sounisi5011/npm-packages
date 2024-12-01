# Changelog


## [2.0.0](https://www.github.com/sounisi5011/npm-packages/compare/check-pid-file-v1.1.2...check-pid-file-v2.0.0) (2023-03-04)

### ⚠ BREAKING CHANGES

* **check-pid-file:** `@sounisi5011/check-pid-file` now supports the following semver ranges of node: `^14.13.1 || 16.x || >=18.x`

### Bug Fixes

* **check-pid-file:** drop support for Node.js 12, Node.js 15, and Node.js 17 ([#634](https://www.github.com/sounisi5011/npm-packages/issues/634)) ([5a893e7](https://www.github.com/sounisi5011/npm-packages/commit/5a893e71fc582ce91ebf4c12427532b310d0a8fb))
* **deps:** update dependency write-file-atomic to v5 ([#624](https://www.github.com/sounisi5011/npm-packages/issues/624)) ([d142677](https://www.github.com/sounisi5011/npm-packages/commit/d142677874d2530cde0be718c32054cbf58bda00))
* **package.json:** add "types" import condition to the `exports` field in `package.json` ([#644](https://www.github.com/sounisi5011/npm-packages/issues/644)) ([6fb0689](https://www.github.com/sounisi5011/npm-packages/commit/6fb0689f8640957f627df7ffccb155abfd593f16))

### Commits

<details><summary>show 30 commits</summary>

* [`85191ca`](https://www.github.com/sounisi5011/npm-packages/commit/85191ca52c0898cf6ba72bc4b80599a3f515fdf7) build(npm-scripts): introduce Turborepo ([#666](https://www.github.com/sounisi5011/npm-packages/issues/666))
* [`0024629`](https://www.github.com/sounisi5011/npm-packages/commit/0024629d84faec2ac7b5f581a118ce3d830bbb02) docs(readme): replace David DM badges with Libraries.io badges ([#649](https://www.github.com/sounisi5011/npm-packages/issues/649))
* [`6fb0689`](https://www.github.com/sounisi5011/npm-packages/commit/6fb0689f8640957f627df7ffccb155abfd593f16) fix(package.json): add "types" import condition to the `exports` field in `package.json` ([#644](https://www.github.com/sounisi5011/npm-packages/issues/644))
* [`b30d612`](https://www.github.com/sounisi5011/npm-packages/commit/b30d612bde9d3e7a61755d44ddb6439fb74221c8) chore(@sounisi5011/check-pid-file): update dependency jest to v29 ([#643](https://www.github.com/sounisi5011/npm-packages/issues/643))
* [`f78b526`](https://www.github.com/sounisi5011/npm-packages/commit/f78b5266711ac5f8070c003ce537da1257e125bc) build(typescript): add `tsconfig.base-node14.json` - `tsconfig.json` file for Node.js 14 ([#642](https://www.github.com/sounisi5011/npm-packages/issues/642))
* [`d142677`](https://www.github.com/sounisi5011/npm-packages/commit/d142677874d2530cde0be718c32054cbf58bda00) fix(deps): update dependency write-file-atomic to v5 ([#624](https://www.github.com/sounisi5011/npm-packages/issues/624))
* [`5a893e7`](https://www.github.com/sounisi5011/npm-packages/commit/5a893e71fc582ce91ebf4c12427532b310d0a8fb) fix(check-pid-file)!: drop support for Node.js 12, Node.js 15, and Node.js 17 ([#634](https://www.github.com/sounisi5011/npm-packages/issues/634))
* [`631a50f`](https://www.github.com/sounisi5011/npm-packages/commit/631a50ff6aa637281c03099ab8ba4838944a14e9) chore(deps): update dev dependencies ([#626](https://www.github.com/sounisi5011/npm-packages/issues/626))
* [`44a1eab`](https://www.github.com/sounisi5011/npm-packages/commit/44a1eab4ef5bb7052a376b14803e023b419b227a) chore(./scripts/fix-changelog.mjs): change the repository URL in the commit list ([#591](https://www.github.com/sounisi5011/npm-packages/issues/591))
* [`1d26592`](https://www.github.com/sounisi5011/npm-packages/commit/1d265929217127f0dd21f09d5a2a3eb7967c1b13) chore(deps): update test packages ([#564](https://www.github.com/sounisi5011/npm-packages/issues/564))
* [`8d39bdd`](https://www.github.com/sounisi5011/npm-packages/commit/8d39bdd7c8df1d4acf2c9652f7a95c0052246b7b) chore(deps): update dependency @swc/core to v1.2.212 ([#562](https://www.github.com/sounisi5011/npm-packages/issues/562))
* [`9e9b917`](https://www.github.com/sounisi5011/npm-packages/commit/9e9b9170b512a83bbcf9c4de57359319ba72f4c6) chore(deps): update dependency @swc/core to v1.2.211 ([#551](https://www.github.com/sounisi5011/npm-packages/issues/551))
* [`4bfbfb9`](https://www.github.com/sounisi5011/npm-packages/commit/4bfbfb996bb1acefe66aa5a652230c4d49de2efe) chore(deps): update dependency @swc/core to v1.2.208 ([#524](https://www.github.com/sounisi5011/npm-packages/issues/524))
* [`77ee60f`](https://www.github.com/sounisi5011/npm-packages/commit/77ee60fbba23429fcdf3996a8c1b5f11b4fbd54f) chore(deps): update test packages ([#526](https://www.github.com/sounisi5011/npm-packages/issues/526))
* [`6737058`](https://www.github.com/sounisi5011/npm-packages/commit/67370582b97d3a178dbe9185978ccb09c9d6c45e) test(jest): migrate from `ts-jest` to `@swc/jest` ([#518](https://www.github.com/sounisi5011/npm-packages/issues/518))
* [`6e1ca6d`](https://www.github.com/sounisi5011/npm-packages/commit/6e1ca6d71973256a35c35ad3b84868e29c6963c2) chore: fix `scripts/fix-changelog.mjs` ([#514](https://www.github.com/sounisi5011/npm-packages/issues/514))
* [`996e8b8`](https://www.github.com/sounisi5011/npm-packages/commit/996e8b812a5cd95da32f908c94991276e1029017) ci(release): auto-fix `CHANGELOG.md` before release ([#513](https://www.github.com/sounisi5011/npm-packages/issues/513))
* [`344220f`](https://www.github.com/sounisi5011/npm-packages/commit/344220f16633470cb29afa13f6c17f4c19140121) chore(deps): update dependency @types/jest to v28.1.3 ([#506](https://www.github.com/sounisi5011/npm-packages/issues/506))
* [`233dff6`](https://www.github.com/sounisi5011/npm-packages/commit/233dff684d4c37ec9bc97cb3058ac881b21d07da) chore(deps): update dependency typescript to v4.7.4 ([#497](https://www.github.com/sounisi5011/npm-packages/issues/497))
* [`3518682`](https://www.github.com/sounisi5011/npm-packages/commit/3518682d5b74e1dde62023a1b8d809b602b654a1) chore(deps): update test packages ([#489](https://www.github.com/sounisi5011/npm-packages/issues/489))
* [`497045f`](https://www.github.com/sounisi5011/npm-packages/commit/497045ff37e59697922cda9d13a5ab3862bb693a) chore: not using `@sounisi5011/run-if-supported` in workspace ([#490](https://www.github.com/sounisi5011/npm-packages/issues/490))
* [`d5e27f4`](https://www.github.com/sounisi5011/npm-packages/commit/d5e27f4621ab9e0cdec6725652c5e44291fd8449) chore(deps): update dependency @types/node to v12.20.55 ([#479](https://www.github.com/sounisi5011/npm-packages/issues/479))
* [`45a7048`](https://www.github.com/sounisi5011/npm-packages/commit/45a704829c6730597815411315e3cf69a0d55204) chore(deps): update dependency jest to v28.1.1 ([#476](https://www.github.com/sounisi5011/npm-packages/issues/476))
* [`36050e7`](https://www.github.com/sounisi5011/npm-packages/commit/36050e75f43a1ae07510b1457e3aca662a0f7959) chore(deps): update dependency @types/jest to v28.1.1 ([#470](https://www.github.com/sounisi5011/npm-packages/issues/470))
* [`8acee49`](https://www.github.com/sounisi5011/npm-packages/commit/8acee49cc87994fc89e70c69a1e3597fa16d32f6) chore(deps): update dependency typescript to v4.7.3 ([#466](https://www.github.com/sounisi5011/npm-packages/issues/466))
* [`8c787fa`](https://www.github.com/sounisi5011/npm-packages/commit/8c787fad5833ed47d4534b1f457d45308aebc1a8) chore(deps): update dependency ts-jest to v28.0.4 ([#458](https://www.github.com/sounisi5011/npm-packages/issues/458))
* [`6e0f615`](https://www.github.com/sounisi5011/npm-packages/commit/6e0f61590b7bd7e76af37e27deb2c60a3bab9a8a) chore(deps): update dependency @types/jest to v28 ([#460](https://www.github.com/sounisi5011/npm-packages/issues/460))
* [`d28396e`](https://www.github.com/sounisi5011/npm-packages/commit/d28396e5ab904f36ff62e34a7a39910e11f3c788) chore(deps): update dependency @types/node to v12.20.54 ([#455](https://www.github.com/sounisi5011/npm-packages/issues/455))
* [`7f4242a`](https://www.github.com/sounisi5011/npm-packages/commit/7f4242a4892c59f8d3ac0d483eb0b11910fa781e) test(eslint): disallow unused ESLint directive comments ([#448](https://www.github.com/sounisi5011/npm-packages/issues/448))
* [`580526a`](https://www.github.com/sounisi5011/npm-packages/commit/580526a06abf17164db306e6c17f302cfeeb5a41) chore(deps): update dependency eslint-plugin-jest to v26.4.2 ([#437](https://www.github.com/sounisi5011/npm-packages/issues/437))

</details>


## [1.1.2](https://www.github.com/sounisi5011/npm-packages/compare/check-pid-file-v1.1.1...check-pid-file-v1.1.2) (2022-05-28)

### Bug Fixes

* **deps:** update dependency write-file-atomic to v4 ([#378](https://www.github.com/sounisi5011/npm-packages/issues/378)) ([bcb6f81](https://www.github.com/sounisi5011/npm-packages/commit/bcb6f8117864ea90c6f69c8ebb31609b7ad2627c))
* **node:** support Node.js v18+ ([#428](https://www.github.com/sounisi5011/npm-packages/issues/428)) ([fe3aa4d](https://www.github.com/sounisi5011/npm-packages/commit/fe3aa4dc2b3830a3be20f979c79100298f4a8dc1))

### Commits

<details><summary>show 13 commits</summary>

* [`fa63d1f`](https://www.github.com/sounisi5011/npm-packages/commit/fa63d1ff29bfd4b5ed89de2cc6942661f66d8367) revert(check-pid-file): remove unintentionally included breaking changes ([#432](https://www.github.com/sounisi5011/npm-packages/issues/432))
* [`fe3aa4d`](https://www.github.com/sounisi5011/npm-packages/commit/fe3aa4dc2b3830a3be20f979c79100298f4a8dc1) fix(node): support Node.js v18+ ([#428](https://www.github.com/sounisi5011/npm-packages/issues/428))
* [`aa545ea`](https://www.github.com/sounisi5011/npm-packages/commit/aa545ea26f333c5fd2cbb0ad87a0bd4843754011) chore(deps): update test packages to v28 (major) ([#409](https://www.github.com/sounisi5011/npm-packages/issues/409))
* [`810a671`](https://www.github.com/sounisi5011/npm-packages/commit/810a67174b1b4b1a5da2b494a7b5672af8304aaa) chore(repo): support `exports` field in `package.json` ([#405](https://www.github.com/sounisi5011/npm-packages/issues/405))
* [`36f404d`](https://www.github.com/sounisi5011/npm-packages/commit/36f404d3cbc95a5f185b9bd950d3cd9bec43b4f1) chore(deps): update dependency typescript to v4.7.2 ([#394](https://www.github.com/sounisi5011/npm-packages/issues/394))
* [`2ac9051`](https://www.github.com/sounisi5011/npm-packages/commit/2ac90519a513eee5aa0512dc23c85d5d1d74c5e2) chore(deps): update dependency @types/node to v12.20.52 ([#376](https://www.github.com/sounisi5011/npm-packages/issues/376))
* [`70d79ca`](https://www.github.com/sounisi5011/npm-packages/commit/70d79ca740e38b1881099f65c29bdc1bc7e87c14) chore(deps): update test packages ([#375](https://www.github.com/sounisi5011/npm-packages/issues/375))
* [`bcb6f81`](https://www.github.com/sounisi5011/npm-packages/commit/bcb6f8117864ea90c6f69c8ebb31609b7ad2627c) fix(deps): update dependency write-file-atomic to v4 ([#378](https://www.github.com/sounisi5011/npm-packages/issues/378))
* [`8877bcc`](https://www.github.com/sounisi5011/npm-packages/commit/8877bcc0b8f753e7a9eea770cd40f571a2614efa) chore(deps): update test packages ([#345](https://www.github.com/sounisi5011/npm-packages/issues/345))
* [`1410348`](https://www.github.com/sounisi5011/npm-packages/commit/1410348f1f76051ba4eaca6a34ca7d10a45e369b) chore(deps): update dependency @types/write-file-atomic to v3.0.3 ([#341](https://www.github.com/sounisi5011/npm-packages/issues/341))
* [`052d18e`](https://www.github.com/sounisi5011/npm-packages/commit/052d18e536dd21ee7105d4e3e96edd026591d7c8) chore(deps): update dependency @types/node to v12.20.41 ([#339](https://www.github.com/sounisi5011/npm-packages/issues/339))
* [`fae5414`](https://www.github.com/sounisi5011/npm-packages/commit/fae541487534c51fa7b8487ba89029355a8e0e06) chore(deps): update test packages ([#326](https://www.github.com/sounisi5011/npm-packages/issues/326))
* [`a3864e0`](https://www.github.com/sounisi5011/npm-packages/commit/a3864e00b975f1e7a33bc4e3f125b2686bb6f81e) chore(deps): update dependency typescript to v4.5.4 ([#324](https://www.github.com/sounisi5011/npm-packages/issues/324))

</details>


## [1.1.1](https://www.github.com/sounisi5011/npm-packages/compare/check-pid-file-v1.1.0...check-pid-file-v1.1.1) (2021-12-09)

### Bug Fixes

* **publish:** fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315)) ([95a36db](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3))

### Commits

<details><summary>show 1 commits</summary>

* [`95a36db`](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3) fix(publish): fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315))

</details>


## [1.1.0](https://www.github.com/sounisi5011/npm-packages/compare/check-pid-file-v1.0.1...check-pid-file-v1.1.0) (2021-12-09)

### Features

* **node version:** support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273)) ([1654602](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f))

### Bug Fixes

* **publish:** fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311)) ([99fc7fe](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c))

### Commits

<details><summary>show 5 commits</summary>

* [`99fc7fe`](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c) fix(publish): fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311))
* [`b84232b`](https://www.github.com/sounisi5011/npm-packages/commit/b84232b2183bc425ed7815ebd6f556b3f3c4e41d) chore(deps): update dependency ts-jest to v27.1.1 ([#307](https://www.github.com/sounisi5011/npm-packages/issues/307))
* [`82d8639`](https://www.github.com/sounisi5011/npm-packages/commit/82d8639c18fbd0c0a1d072ebf80bd802aa729933) chore(deps): update dependency ts-jest to v27.1.0 ([#302](https://www.github.com/sounisi5011/npm-packages/issues/302))
* [`2b6090c`](https://www.github.com/sounisi5011/npm-packages/commit/2b6090c91e9f4675bd9869dae0f3bcac9e4eb487) chore(deps): update dependency jest to v27.4.3 ([#284](https://www.github.com/sounisi5011/npm-packages/issues/284))
* [`1654602`](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f) feat(node version): support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273))

</details>


## [1.0.1](https://www.github.com/sounisi5011/npm-packages/compare/check-pid-file-v1.0.0...check-pid-file-v1.0.1) (2021-11-27)

### Bug Fixes

* **check-pid-file:** allow `undefined` in optional properties ([#271](https://www.github.com/sounisi5011/npm-packages/issues/271)) ([9d2d17a](https://www.github.com/sounisi5011/npm-packages/commit/9d2d17a3e4166dd58e4a3106e00fe18e62a66f26))

### Commits

<details><summary>show 15 commits</summary>

* [`9d2d17a`](https://www.github.com/sounisi5011/npm-packages/commit/9d2d17a3e4166dd58e4a3106e00fe18e62a66f26) fix(check-pid-file): allow `undefined` in optional properties ([#271](https://www.github.com/sounisi5011/npm-packages/issues/271))
* [`bd56af3`](https://www.github.com/sounisi5011/npm-packages/commit/bd56af30d33a7aaeffd904c4101518da819f7ef8) chore(deps): update dependency typescript to v4.5.2 ([#267](https://www.github.com/sounisi5011/npm-packages/issues/267))
* [`13c58d0`](https://www.github.com/sounisi5011/npm-packages/commit/13c58d0cfc891160e679890edb894c252ffdfbc9) chore(deps): update dependency @types/jest to v27.0.3 ([#269](https://www.github.com/sounisi5011/npm-packages/issues/269))
* [`ea8d348`](https://www.github.com/sounisi5011/npm-packages/commit/ea8d3481af6860a876f83dc86a90c8c105514365) chore(deps): update dependency @types/node to v12.20.37 ([#258](https://www.github.com/sounisi5011/npm-packages/issues/258))
* [`3c39ed0`](https://www.github.com/sounisi5011/npm-packages/commit/3c39ed071988a52c4fdc8a960d997b96614d0bad) chore(deps): pin dependency @types/node to v12.20.36 ([#254](https://www.github.com/sounisi5011/npm-packages/issues/254))
* [`289c087`](https://www.github.com/sounisi5011/npm-packages/commit/289c087c96094a03a35bec44b8a0d2f379a9db56) chore(pnpm): replace `pnpx` commands with `pnpm exec` and `pnpm dlx` ([#251](https://www.github.com/sounisi5011/npm-packages/issues/251))
* [`3d30444`](https://www.github.com/sounisi5011/npm-packages/commit/3d30444c7e8ee0b592fd3e52f73bfd2e83410313) chore(deps): update dependency typescript to v4.4.4 ([#234](https://www.github.com/sounisi5011/npm-packages/issues/234))
* [`81728c6`](https://www.github.com/sounisi5011/npm-packages/commit/81728c6ac330ef8ff70c172cc38ff384c94de9d1) chore(deps): update dependency @types/jest to v27 ([#216](https://www.github.com/sounisi5011/npm-packages/issues/216))
* [`05a3468`](https://www.github.com/sounisi5011/npm-packages/commit/05a3468ddf952a43efa9e7bc5380dac66a521efa) chore(deps): update test packages ([#210](https://www.github.com/sounisi5011/npm-packages/issues/210))
* [`7642f12`](https://www.github.com/sounisi5011/npm-packages/commit/7642f12312ea4443c972fbe6e1a865ad54bf5c12) chore(deps): update dependency @types/readline-transform to v1.0.1 ([#199](https://www.github.com/sounisi5011/npm-packages/issues/199))
* [`204a644`](https://www.github.com/sounisi5011/npm-packages/commit/204a644ee8890b47abc35b85de745018a4f64e70) chore(deps): update dependency @types/jest to v26.0.24 ([#195](https://www.github.com/sounisi5011/npm-packages/issues/195))
* [`9374e69`](https://www.github.com/sounisi5011/npm-packages/commit/9374e69da19914ada15a99fae64bbd07f18a98c3) chore(deps): update dependency @types/signal-exit to v3.0.1 ([#193](https://www.github.com/sounisi5011/npm-packages/issues/193))
* [`e35e937`](https://www.github.com/sounisi5011/npm-packages/commit/e35e9373a30e46bd14085038ce6684d630ac583a) chore(deps): move the dependencies defined in the project root to within each submodule ([#200](https://www.github.com/sounisi5011/npm-packages/issues/200))
* [`49a7ab5`](https://www.github.com/sounisi5011/npm-packages/commit/49a7ab5d6892faa6c826d39e81231a9080a85eb9) chore(deps): update dependency @types/write-file-atomic to v3.0.2 ([#186](https://www.github.com/sounisi5011/npm-packages/issues/186))
* [`ab068c2`](https://www.github.com/sounisi5011/npm-packages/commit/ab068c217badd8cedb416e982e9d8c52eb894620) chore(deps): change the version range of @sounisi5011/run-if-supported package to `workspace:` range protocol ([#171](https://www.github.com/sounisi5011/npm-packages/issues/171))

</details>


## 1.0.0 (2021-06-24)

### Features

* **check-pid-file:** create a new package ([#144](https://www.github.com/sounisi5011/npm-packages/issues/144)) ([2ea2e54](https://www.github.com/sounisi5011/npm-packages/commit/2ea2e54bea467cbce0e9e573b10b7da29ca1470e))

### Commits

<details><summary>show 2 commits</summary>

* [`918ec3f`](https://github.com/sounisi5011/npm-packages/commit/918ec3f98f6819119a938be16048644b64834529) test(check-pid-file): fix the "remove pid file on finish" test ([#163](https://github.com/sounisi5011/npm-packages/issues/163))
* [`2ea2e54`](https://github.com/sounisi5011/npm-packages/commit/2ea2e54bea467cbce0e9e573b10b7da29ca1470e) feat(check-pid-file): create a new package ([#144](https://github.com/sounisi5011/npm-packages/issues/144))

</details>