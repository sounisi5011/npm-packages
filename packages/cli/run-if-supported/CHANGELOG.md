# Changelog


### [2.0.1](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v2.0.0...run-if-supported-v2.0.1) (2023-03-04)


### Bug Fixes

* **deps:** update dependency npm-install-checks to v6 ([#622](https://www.github.com/sounisi5011/npm-packages/issues/622)) ([8e29276](https://www.github.com/sounisi5011/npm-packages/commit/8e2927643397249dd81ccb71d4511d8f4259e4d7))

## [2.0.0](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.1.1...run-if-supported-v2.0.0) (2022-06-27)

### ⚠ BREAKING CHANGES

Require Node.js `>=14.13.1`. This is the smallest version that supports [ESM (ECMAScript modules)], [`node:` imports] and [`ow@1.0.0`].

[ESM (ECMAScript modules)]: https://nodejs.org/api/esm.html#modules-ecmascript-modules
[`node:` imports]: https://nodejs.org/api/esm.html#node-imports
[`ow@1.0.0`]: https://github.com/sindresorhus/ow/releases/tag/v1.0.0

* **deps:** update dependency ow to v1 (#488)
* **run-if-supported:** * feat(run-if-supported)!: update source codes from CommonJS to ESM

### Features

* **run-if-supported:** support for older Node.js 14 and Node.js v15 ([#496](https://www.github.com/sounisi5011/npm-packages/issues/496)) ([05c1aa0](https://www.github.com/sounisi5011/npm-packages/commit/05c1aa0e87138b667ded5f8fedffca2ca069064d))
* **run-if-supported:** update source codes from CommonJS to ESM ([#471](https://www.github.com/sounisi5011/npm-packages/issues/471)) ([fadca92](https://www.github.com/sounisi5011/npm-packages/commit/fadca92d0489eb033afbf26361783d5ae914acd1))

### Bug Fixes

* **@sounisi5011/run-if-supported:** change supported version range to `>=14.13.1` ([#522](https://www.github.com/sounisi5011/npm-packages/issues/522)) ([905dbe3](https://www.github.com/sounisi5011/npm-packages/commit/905dbe369f27f00b7a23903487738b60db73e747))
* **deps:** update dependency npm-install-checks to v5 ([#416](https://www.github.com/sounisi5011/npm-packages/issues/416)) ([a235342](https://www.github.com/sounisi5011/npm-packages/commit/a235342b49fe797f5236b6aae3fda4832d87c537))
* **deps:** update dependency ow to v1 ([#488](https://www.github.com/sounisi5011/npm-packages/issues/488)) ([1b73ae5](https://www.github.com/sounisi5011/npm-packages/commit/1b73ae583fb013ea4938927937a70f1bcd2b104d))
* **deps:** update dependency parse-json to v6 ([#243](https://www.github.com/sounisi5011/npm-packages/issues/243)) ([467a570](https://www.github.com/sounisi5011/npm-packages/commit/467a570c8107f001b28645e6cebc8b7d4d900f48))
* **deps:** update dependency pkg-up to v4 ([#244](https://www.github.com/sounisi5011/npm-packages/issues/244)) ([c438f79](https://www.github.com/sounisi5011/npm-packages/commit/c438f79ed2bd13da135f56b3126b6fa5ae3be409))
* **node:** support Node.js v18+ ([#428](https://www.github.com/sounisi5011/npm-packages/issues/428)) ([fe3aa4d](https://www.github.com/sounisi5011/npm-packages/commit/fe3aa4dc2b3830a3be20f979c79100298f4a8dc1))

### Commits

<details><summary>show 39 commits</summary>

* [`905dbe3`](https://www.github.com/sounisi5011/npm-packages/commit/905dbe369f27f00b7a23903487738b60db73e747) fix(@sounisi5011/run-if-supported): change supported version range to `>=14.13.1` ([#522](https://www.github.com/sounisi5011/npm-packages/issues/522))
* [`6737058`](https://www.github.com/sounisi5011/npm-packages/commit/67370582b97d3a178dbe9185978ccb09c9d6c45e) test(jest): migrate from `ts-jest` to `@swc/jest` ([#518](https://www.github.com/sounisi5011/npm-packages/issues/518))
* [`d54b9ce`](https://www.github.com/sounisi5011/npm-packages/commit/d54b9ce73d617ec97e37c44a0c678b3e850f5a05) chore(@sounisi5011/run-if-supported): update dev dependency execa to v6 ([#516](https://www.github.com/sounisi5011/npm-packages/issues/516))
* [`6e1ca6d`](https://www.github.com/sounisi5011/npm-packages/commit/6e1ca6d71973256a35c35ad3b84868e29c6963c2) chore: fix `scripts/fix-changelog.mjs` ([#514](https://www.github.com/sounisi5011/npm-packages/issues/514))
* [`996e8b8`](https://www.github.com/sounisi5011/npm-packages/commit/996e8b812a5cd95da32f908c94991276e1029017) ci(release): auto-fix `CHANGELOG.md` before release ([#513](https://www.github.com/sounisi5011/npm-packages/issues/513))
* [`8a47605`](https://www.github.com/sounisi5011/npm-packages/commit/8a47605bfbadd327f5c983527f00352abc53fc23) chore(deps): update dependency type-fest to v2.14.0 ([#511](https://www.github.com/sounisi5011/npm-packages/issues/511))
* [`2a9d4b4`](https://www.github.com/sounisi5011/npm-packages/commit/2a9d4b42ea2d03ea62e94044a1a79c67a5633efb) chore(deps): update dependency @swc/core to v1.2.205 ([#510](https://www.github.com/sounisi5011/npm-packages/issues/510))
* [`344220f`](https://www.github.com/sounisi5011/npm-packages/commit/344220f16633470cb29afa13f6c17f4c19140121) chore(deps): update dependency @types/jest to v28.1.3 ([#506](https://www.github.com/sounisi5011/npm-packages/issues/506))
* [`05c1aa0`](https://www.github.com/sounisi5011/npm-packages/commit/05c1aa0e87138b667ded5f8fedffca2ca069064d) feat(run-if-supported): support for older Node.js 14 and Node.js v15 ([#496](https://www.github.com/sounisi5011/npm-packages/issues/496))
* [`233dff6`](https://www.github.com/sounisi5011/npm-packages/commit/233dff684d4c37ec9bc97cb3058ac881b21d07da) chore(deps): update dependency typescript to v4.7.4 ([#497](https://www.github.com/sounisi5011/npm-packages/issues/497))
* [`c74c3a0`](https://www.github.com/sounisi5011/npm-packages/commit/c74c3a0364fac3bb40a7698666d01e73bed2c22c) chore(deps): update dependency @swc/core to v1.2.204 ([#499](https://www.github.com/sounisi5011/npm-packages/issues/499))
* [`3518682`](https://www.github.com/sounisi5011/npm-packages/commit/3518682d5b74e1dde62023a1b8d809b602b654a1) chore(deps): update test packages ([#489](https://www.github.com/sounisi5011/npm-packages/issues/489))
* [`1f70ca8`](https://www.github.com/sounisi5011/npm-packages/commit/1f70ca889109f28f4086dcfb9721b4d6a5167809) chore(deps): update dependency type-fest to v2.13.1 ([#486](https://www.github.com/sounisi5011/npm-packages/issues/486))
* [`c438f79`](https://www.github.com/sounisi5011/npm-packages/commit/c438f79ed2bd13da135f56b3126b6fa5ae3be409) fix(deps): update dependency pkg-up to v4 ([#244](https://www.github.com/sounisi5011/npm-packages/issues/244))
* [`467a570`](https://www.github.com/sounisi5011/npm-packages/commit/467a570c8107f001b28645e6cebc8b7d4d900f48) fix(deps): update dependency parse-json to v6 ([#243](https://www.github.com/sounisi5011/npm-packages/issues/243))
* [`7bc3502`](https://www.github.com/sounisi5011/npm-packages/commit/7bc35020d857a1db00b3f4db5cf9eee56cae2af3) chore(deps): update dependency is-plain-obj to v4 ([#113](https://www.github.com/sounisi5011/npm-packages/issues/113))
* [`1b73ae5`](https://www.github.com/sounisi5011/npm-packages/commit/1b73ae583fb013ea4938927937a70f1bcd2b104d) fix(deps)!: update dependency ow to v1 ([#488](https://www.github.com/sounisi5011/npm-packages/issues/488))
* [`497045f`](https://www.github.com/sounisi5011/npm-packages/commit/497045ff37e59697922cda9d13a5ab3862bb693a) chore: not using `@sounisi5011/run-if-supported` in workspace ([#490](https://www.github.com/sounisi5011/npm-packages/issues/490))
* [`fadca92`](https://www.github.com/sounisi5011/npm-packages/commit/fadca92d0489eb033afbf26361783d5ae914acd1) feat(run-if-supported)!: update source codes from CommonJS to ESM ([#471](https://www.github.com/sounisi5011/npm-packages/issues/471))
* [`d5e27f4`](https://www.github.com/sounisi5011/npm-packages/commit/d5e27f4621ab9e0cdec6725652c5e44291fd8449) chore(deps): update dependency @types/node to v12.20.55 ([#479](https://www.github.com/sounisi5011/npm-packages/issues/479))
* [`45a7048`](https://www.github.com/sounisi5011/npm-packages/commit/45a704829c6730597815411315e3cf69a0d55204) chore(deps): update dependency jest to v28.1.1 ([#476](https://www.github.com/sounisi5011/npm-packages/issues/476))
* [`36050e7`](https://www.github.com/sounisi5011/npm-packages/commit/36050e75f43a1ae07510b1457e3aca662a0f7959) chore(deps): update dependency @types/jest to v28.1.1 ([#470](https://www.github.com/sounisi5011/npm-packages/issues/470))
* [`8acee49`](https://www.github.com/sounisi5011/npm-packages/commit/8acee49cc87994fc89e70c69a1e3597fa16d32f6) chore(deps): update dependency typescript to v4.7.3 ([#466](https://www.github.com/sounisi5011/npm-packages/issues/466))
* [`8c787fa`](https://www.github.com/sounisi5011/npm-packages/commit/8c787fad5833ed47d4534b1f457d45308aebc1a8) chore(deps): update dependency ts-jest to v28.0.4 ([#458](https://www.github.com/sounisi5011/npm-packages/issues/458))
* [`6e0f615`](https://www.github.com/sounisi5011/npm-packages/commit/6e0f61590b7bd7e76af37e27deb2c60a3bab9a8a) chore(deps): update dependency @types/jest to v28 ([#460](https://www.github.com/sounisi5011/npm-packages/issues/460))
* [`d28396e`](https://www.github.com/sounisi5011/npm-packages/commit/d28396e5ab904f36ff62e34a7a39910e11f3c788) chore(deps): update dependency @types/node to v12.20.54 ([#455](https://www.github.com/sounisi5011/npm-packages/issues/455))
* [`fe3aa4d`](https://www.github.com/sounisi5011/npm-packages/commit/fe3aa4dc2b3830a3be20f979c79100298f4a8dc1) fix(node): support Node.js v18+ ([#428](https://www.github.com/sounisi5011/npm-packages/issues/428))
* [`a235342`](https://www.github.com/sounisi5011/npm-packages/commit/a235342b49fe797f5236b6aae3fda4832d87c537) fix(deps)!: update dependency npm-install-checks to v5 ([#416](https://www.github.com/sounisi5011/npm-packages/issues/416))
* [`aa545ea`](https://www.github.com/sounisi5011/npm-packages/commit/aa545ea26f333c5fd2cbb0ad87a0bd4843754011) chore(deps): update test packages to v28 (major) ([#409](https://www.github.com/sounisi5011/npm-packages/issues/409))
* [`a3149d9`](https://www.github.com/sounisi5011/npm-packages/commit/a3149d9a8d914a8ce285beb38e2a609ddd446b7c) chore(deps): update dependency type-fest to v2.13.0 ([#393](https://www.github.com/sounisi5011/npm-packages/issues/393))
* [`810a671`](https://www.github.com/sounisi5011/npm-packages/commit/810a67174b1b4b1a5da2b494a7b5672af8304aaa) chore(repo): support `exports` field in `package.json` ([#405](https://www.github.com/sounisi5011/npm-packages/issues/405))
* [`36f404d`](https://www.github.com/sounisi5011/npm-packages/commit/36f404d3cbc95a5f185b9bd950d3cd9bec43b4f1) chore(deps): update dependency typescript to v4.7.2 ([#394](https://www.github.com/sounisi5011/npm-packages/issues/394))
* [`2ac9051`](https://www.github.com/sounisi5011/npm-packages/commit/2ac90519a513eee5aa0512dc23c85d5d1d74c5e2) chore(deps): update dependency @types/node to v12.20.52 ([#376](https://www.github.com/sounisi5011/npm-packages/issues/376))
* [`70d79ca`](https://www.github.com/sounisi5011/npm-packages/commit/70d79ca740e38b1881099f65c29bdc1bc7e87c14) chore(deps): update test packages ([#375](https://www.github.com/sounisi5011/npm-packages/issues/375))
* [`bd207d1`](https://www.github.com/sounisi5011/npm-packages/commit/bd207d183229be99cce0d57495d5f66a1f28d10e) chore(deps): update dependency type-fest to v2.9.0 ([#348](https://www.github.com/sounisi5011/npm-packages/issues/348))
* [`8877bcc`](https://www.github.com/sounisi5011/npm-packages/commit/8877bcc0b8f753e7a9eea770cd40f571a2614efa) chore(deps): update test packages ([#345](https://www.github.com/sounisi5011/npm-packages/issues/345))
* [`052d18e`](https://www.github.com/sounisi5011/npm-packages/commit/052d18e536dd21ee7105d4e3e96edd026591d7c8) chore(deps): update dependency @types/node to v12.20.41 ([#339](https://www.github.com/sounisi5011/npm-packages/issues/339))
* [`fae5414`](https://www.github.com/sounisi5011/npm-packages/commit/fae541487534c51fa7b8487ba89029355a8e0e06) chore(deps): update test packages ([#326](https://www.github.com/sounisi5011/npm-packages/issues/326))
* [`a3864e0`](https://www.github.com/sounisi5011/npm-packages/commit/a3864e00b975f1e7a33bc4e3f125b2686bb6f81e) chore(deps): update dependency typescript to v4.5.4 ([#324](https://www.github.com/sounisi5011/npm-packages/issues/324))

</details>


## [1.1.1](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.1.0...run-if-supported-v1.1.1) (2021-12-09)

### Bug Fixes

* **publish:** fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315)) ([95a36db](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3))

### Commits

<details><summary>show 1 commits</summary>

* [`95a36db`](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3) fix(publish): fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315))

</details>


## [1.1.0](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.5...run-if-supported-v1.1.0) (2021-12-09)

### Features

* **node version:** support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273)) ([1654602](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f))

### Bug Fixes

* **publish:** fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311)) ([99fc7fe](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c))
* **run-if-supported:** fix examples in help message ([#308](https://www.github.com/sounisi5011/npm-packages/issues/308)) ([d6682bd](https://www.github.com/sounisi5011/npm-packages/commit/d6682bd9dd7cdab6afaec0298f619fd13c8e1c90))

### Commits

<details><summary>show 13 commits</summary>

* [`99fc7fe`](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c) fix(publish): fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311))
* [`b84232b`](https://www.github.com/sounisi5011/npm-packages/commit/b84232b2183bc425ed7815ebd6f556b3f3c4e41d) chore(deps): update dependency ts-jest to v27.1.1 ([#307](https://www.github.com/sounisi5011/npm-packages/issues/307))
* [`d6682bd`](https://www.github.com/sounisi5011/npm-packages/commit/d6682bd9dd7cdab6afaec0298f619fd13c8e1c90) fix(run-if-supported): fix examples in help message ([#308](https://www.github.com/sounisi5011/npm-packages/issues/308))
* [`82d8639`](https://www.github.com/sounisi5011/npm-packages/commit/82d8639c18fbd0c0a1d072ebf80bd802aa729933) chore(deps): update dependency ts-jest to v27.1.0 ([#302](https://www.github.com/sounisi5011/npm-packages/issues/302))
* [`c63bab8`](https://www.github.com/sounisi5011/npm-packages/commit/c63bab89e344057e0b6237061912430dcdcf8332) chore(run-if-supported): pin dependency @types/node to v12.20.37 ([#299](https://www.github.com/sounisi5011/npm-packages/issues/299))
* [`6458743`](https://www.github.com/sounisi5011/npm-packages/commit/6458743dc48678529f56e4a336bbafb51b15c906) chore(deps): update dependency type-fest to v2.8.0 ([#289](https://www.github.com/sounisi5011/npm-packages/issues/289))
* [`2b6090c`](https://www.github.com/sounisi5011/npm-packages/commit/2b6090c91e9f4675bd9869dae0f3bcac9e4eb487) chore(deps): update dependency jest to v27.4.3 ([#284](https://www.github.com/sounisi5011/npm-packages/issues/284))
* [`3d7de76`](https://www.github.com/sounisi5011/npm-packages/commit/3d7de76c87b8f3cddc2d7258ef0654e2148efcb2) chore(run-if-supported): enable the `exactOptionalPropertyTypes` option in `tsconfig.json` ([#296](https://www.github.com/sounisi5011/npm-packages/issues/296))
* [`1654602`](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f) feat(node version): support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273))
* [`bd56af3`](https://www.github.com/sounisi5011/npm-packages/commit/bd56af30d33a7aaeffd904c4101518da819f7ef8) chore(deps): update dependency typescript to v4.5.2 ([#267](https://www.github.com/sounisi5011/npm-packages/issues/267))
* [`13c58d0`](https://www.github.com/sounisi5011/npm-packages/commit/13c58d0cfc891160e679890edb894c252ffdfbc9) chore(deps): update dependency @types/jest to v27.0.3 ([#269](https://www.github.com/sounisi5011/npm-packages/issues/269))
* [`4b3e7ec`](https://www.github.com/sounisi5011/npm-packages/commit/4b3e7ecaa8dd9da3c5da29da514effb38f1ec6f5) chore(deps): update dependency type-fest to v2.6.0 ([#260](https://www.github.com/sounisi5011/npm-packages/issues/260))
* [`289c087`](https://www.github.com/sounisi5011/npm-packages/commit/289c087c96094a03a35bec44b8a0d2f379a9db56) chore(pnpm): replace `pnpx` commands with `pnpm exec` and `pnpm dlx` ([#251](https://www.github.com/sounisi5011/npm-packages/issues/251))

</details>


## [1.0.5](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.4...run-if-supported-v1.0.5) (2021-11-05)

### Bug Fixes

* **deps:** update dependency ow to ^0.28.0 ([#208](https://www.github.com/sounisi5011/npm-packages/issues/208)) ([fa50ded](https://www.github.com/sounisi5011/npm-packages/commit/fa50ded2e39af3d3367d6d51bd4af6de62a77db1))

### Commits

<details><summary>show 10 commits</summary>

* [`3d30444`](https://www.github.com/sounisi5011/npm-packages/commit/3d30444c7e8ee0b592fd3e52f73bfd2e83410313) chore(deps): update dependency typescript to v4.4.4 ([#234](https://www.github.com/sounisi5011/npm-packages/issues/234))
* [`1eb7fd1`](https://www.github.com/sounisi5011/npm-packages/commit/1eb7fd187dbcfaff2040233e23d5a5dfccfc65eb) chore(deps): update eslint packages (major) ([#237](https://www.github.com/sounisi5011/npm-packages/issues/237))
* [`81728c6`](https://www.github.com/sounisi5011/npm-packages/commit/81728c6ac330ef8ff70c172cc38ff384c94de9d1) chore(deps): update dependency @types/jest to v27 ([#216](https://www.github.com/sounisi5011/npm-packages/issues/216))
* [`a073093`](https://www.github.com/sounisi5011/npm-packages/commit/a07309353e5026cffd195eb38aab02af5731d7d9) chore(deps): update dependency type-fest to v2 ([#215](https://www.github.com/sounisi5011/npm-packages/issues/215))
* [`deaa0ae`](https://www.github.com/sounisi5011/npm-packages/commit/deaa0ae8c1e5d42f3849dc26a31c13cb1931b1ce) chore(deps): update dependency type-fest to v1.4.0 ([#212](https://www.github.com/sounisi5011/npm-packages/issues/212))
* [`05a3468`](https://www.github.com/sounisi5011/npm-packages/commit/05a3468ddf952a43efa9e7bc5380dac66a521efa) chore(deps): update test packages ([#210](https://www.github.com/sounisi5011/npm-packages/issues/210))
* [`fa50ded`](https://www.github.com/sounisi5011/npm-packages/commit/fa50ded2e39af3d3367d6d51bd4af6de62a77db1) fix(deps): update dependency ow to ^0.28.0 ([#208](https://www.github.com/sounisi5011/npm-packages/issues/208))
* [`c2d567d`](https://www.github.com/sounisi5011/npm-packages/commit/c2d567de0ccf532555beeb69a52d4cd55f7524d3) chore(deps): update dependency type-fest to v1.2.2 ([#198](https://www.github.com/sounisi5011/npm-packages/issues/198))
* [`204a644`](https://www.github.com/sounisi5011/npm-packages/commit/204a644ee8890b47abc35b85de745018a4f64e70) chore(deps): update dependency @types/jest to v26.0.24 ([#195](https://www.github.com/sounisi5011/npm-packages/issues/195))
* [`e35e937`](https://www.github.com/sounisi5011/npm-packages/commit/e35e9373a30e46bd14085038ce6684d630ac583a) chore(deps): move the dependencies defined in the project root to within each submodule ([#200](https://www.github.com/sounisi5011/npm-packages/issues/200))

</details>


## [1.0.4](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.3...run-if-supported-v1.0.4) (2021-07-05)

### Bug Fixes

* **deps:** update dependency ow to ^0.26.0 ([#168](https://www.github.com/sounisi5011/npm-packages/issues/168)) ([468be03](https://www.github.com/sounisi5011/npm-packages/commit/468be035ecd1f84bbc266c87f4aaa34b65159926))

### Commits

<details><summary>show 2 commits</summary>

* [`468be03`](https://www.github.com/sounisi5011/npm-packages/commit/468be035ecd1f84bbc266c87f4aaa34b65159926) fix(deps): update dependency ow to ^0.26.0 ([#168](https://www.github.com/sounisi5011/npm-packages/issues/168))
* [`ab068c2`](https://www.github.com/sounisi5011/npm-packages/commit/ab068c217badd8cedb416e982e9d8c52eb894620) chore(deps): change the version range of @sounisi5011/run-if-supported package to `workspace:` range protocol ([#171](https://www.github.com/sounisi5011/npm-packages/issues/171))

</details>


## [1.0.3](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.2...run-if-supported-v1.0.3) (2021-06-24)

### Bug Fixes

* **deps:** update dependency ow to ^0.24.0 ([#139](https://www.github.com/sounisi5011/npm-packages/issues/139)) ([571a11b](https://www.github.com/sounisi5011/npm-packages/commit/571a11b4a9a7082a2cdaaf08a389d29e6d525262))

### Commits

<details><summary>show 2 commits</summary>

* [`777444a`](https://www.github.com/sounisi5011/npm-packages/commit/777444addec1f763e28d1199e9d98eb5529f21d5) chore(deps): update dependency type-fest to v1.2.1 ([#149](https://www.github.com/sounisi5011/npm-packages/issues/149))
* [`571a11b`](https://www.github.com/sounisi5011/npm-packages/commit/571a11b4a9a7082a2cdaaf08a389d29e6d525262) fix(deps): update dependency ow to ^0.24.0 ([#139](https://www.github.com/sounisi5011/npm-packages/issues/139))

</details>


## [1.0.2](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.1...run-if-supported-v1.0.2) (2021-06-05)

### Bug Fixes

* introduce `@sounisi5011/cli-utils-top-level-await` ([#130](https://www.github.com/sounisi5011/npm-packages/issues/130)) ([75c5002](https://www.github.com/sounisi5011/npm-packages/commit/75c500258f09b19ba045c1e3da1a135d274ed296))
* introduce `@sounisi5011/ts-utils-is-property-accessible` ([#133](https://www.github.com/sounisi5011/npm-packages/issues/133)) ([c88a772](https://www.github.com/sounisi5011/npm-packages/commit/c88a772b3c8327d7c983aefb1f3cdbd3499b5f11))

### Commits

<details><summary>show 4 commits</summary>

* [`c88a772`](https://www.github.com/sounisi5011/npm-packages/commit/c88a772b3c8327d7c983aefb1f3cdbd3499b5f11) fix: introduce `@sounisi5011/ts-utils-is-property-accessible` ([#133](https://www.github.com/sounisi5011/npm-packages/issues/133))
* [`75c5002`](https://www.github.com/sounisi5011/npm-packages/commit/75c500258f09b19ba045c1e3da1a135d274ed296) fix: introduce `@sounisi5011/cli-utils-top-level-await` ([#130](https://www.github.com/sounisi5011/npm-packages/issues/130))
* [`231d651`](https://www.github.com/sounisi5011/npm-packages/commit/231d65115da2f796c4682e6589d38171a47d0029) chore(deps): update dependency type-fest to v1.2.0 ([#124](https://www.github.com/sounisi5011/npm-packages/issues/124))
* [`d2b4e74`](https://www.github.com/sounisi5011/npm-packages/commit/d2b4e744cc7651a518c2757cb5f7bc4adccc0811) chore(deps): update dependency execa to v5.1.1 ([#122](https://www.github.com/sounisi5011/npm-packages/issues/122))

</details>


## [1.0.1](https://www.github.com/sounisi5011/npm-packages/compare/run-if-supported-v1.0.0...run-if-supported-v1.0.1) (2021-05-28)

### Bug Fixes

* **run-if-supported:** validate `package.json` and display it with human readable error messages ([#112](https://www.github.com/sounisi5011/npm-packages/issues/112)) ([79f4b6b](https://www.github.com/sounisi5011/npm-packages/commit/79f4b6bbed78abac69a2b600dd4b1ea97ed2b2cf))

### Commits

<details><summary>show 3 commits</summary>

* [`79f4b6b`](https://www.github.com/sounisi5011/npm-packages/commit/79f4b6bbed78abac69a2b600dd4b1ea97ed2b2cf) fix(run-if-supported): validate `package.json` and display it with human readable error messages ([#112](https://www.github.com/sounisi5011/npm-packages/issues/112))
* [`64c608b`](https://www.github.com/sounisi5011/npm-packages/commit/64c608b59aea94e996e0fbfd0e541e9249d44900) ci(publish): auto convert `README.md` when publishing ([#107](https://www.github.com/sounisi5011/npm-packages/issues/107))
* [`b39315f`](https://www.github.com/sounisi5011/npm-packages/commit/b39315f28efc88512966411183c890ceff3ee6cc) docs: auto update badges included in `README.md` ([#106](https://www.github.com/sounisi5011/npm-packages/issues/106))

</details>


## 1.0.0 (2021-05-25)

### Features

* **run-if-supported:** create a new cli package ([#80](https://www.github.com/sounisi5011/npm-packages/issues/80)) ([696bf0f](https://www.github.com/sounisi5011/npm-packages/commit/696bf0fbb71be4cfb32ac37a20462e2f7132370d))

### Commits

<details><summary>show 2 commits</summary>

* [`6039610`](https://github.com/sounisi5011/npm-packages/commit/60396108c82d822f3d2419329e98c53409019ef1) chore(deps): pin dependency @types/parse-json to 4.0.0 ([#83](https://github.com/sounisi5011/npm-packages/issues/83))
* [`696bf0f`](https://github.com/sounisi5011/npm-packages/commit/696bf0fbb71be4cfb32ac37a20462e2f7132370d) feat(run-if-supported): create a new cli package ([#80](https://github.com/sounisi5011/npm-packages/issues/80))

</details>
