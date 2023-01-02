# Changelog


## [0.1.0](https://www.github.com/sounisi5011/npm-packages/compare/encrypted-archive-v0.0.4...encrypted-archive-v0.1.0) (2021-12-09)

### Features

* **node version:** support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273)) ([1654602](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f))

### Bug Fixes

* **encrypted-archive:** allow `undefined` in optional properties ([#280](https://www.github.com/sounisi5011/npm-packages/issues/280)) ([5854358](https://www.github.com/sounisi5011/npm-packages/commit/58543587b3cb200a5ee2f5746818a851ebd386e6))
* **publish:** fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311)) ([99fc7fe](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c))
* **publish:** fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315)) ([95a36db](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3))

### Commits

<details><summary>show 38 commits</summary>

* [`95a36db`](https://www.github.com/sounisi5011/npm-packages/commit/95a36db45185784b37cdbf3843746b3e808d67b3) fix(publish): fix glob pattern of including `CHANGELOG.md` in the `files` field of `package.json` files ([#315](https://www.github.com/sounisi5011/npm-packages/issues/315))
* [`99fc7fe`](https://www.github.com/sounisi5011/npm-packages/commit/99fc7fe66eb180b7aeeaa10b60951b3767cbae3c) fix(publish): fix `files` field in `package.json` files to ensure appropriate files are published ([#311](https://www.github.com/sounisi5011/npm-packages/issues/311))
* [`b84232b`](https://www.github.com/sounisi5011/npm-packages/commit/b84232b2183bc425ed7815ebd6f556b3f3c4e41d) chore(deps): update dependency ts-jest to v27.1.1 ([#307](https://www.github.com/sounisi5011/npm-packages/issues/307))
* [`77af985`](https://www.github.com/sounisi5011/npm-packages/commit/77af985dff237a203e5f614d895e49fe22ec215e) chore(encrypted-archive): enable the `useUnknownInCatchVariables` option ([#309](https://www.github.com/sounisi5011/npm-packages/issues/309))
* [`82d8639`](https://www.github.com/sounisi5011/npm-packages/commit/82d8639c18fbd0c0a1d072ebf80bd802aa729933) chore(deps): update dependency ts-jest to v27.1.0 ([#302](https://www.github.com/sounisi5011/npm-packages/issues/302))
* [`6e86bae`](https://www.github.com/sounisi5011/npm-packages/commit/6e86bae71ca2015e70bb119a9577cad8085a33a0) chore(encrypted-archive): pin dependency @types/node to v12.20.37 ([#300](https://www.github.com/sounisi5011/npm-packages/issues/300))
* [`daac9b6`](https://www.github.com/sounisi5011/npm-packages/commit/daac9b63a5edb058bb8677f8106c59f29c7a2343) chore(deps): update dependency jest-extended to v1.2.0 ([#285](https://www.github.com/sounisi5011/npm-packages/issues/285))
* [`2b6090c`](https://www.github.com/sounisi5011/npm-packages/commit/2b6090c91e9f4675bd9869dae0f3bcac9e4eb487) chore(deps): update dependency jest to v27.4.3 ([#284](https://www.github.com/sounisi5011/npm-packages/issues/284))
* [`9f860e4`](https://www.github.com/sounisi5011/npm-packages/commit/9f860e4710043436c4f1a64f36f23d94e645d158) chore(encrypted-archive): update tsconfig file structure ([#297](https://www.github.com/sounisi5011/npm-packages/issues/297))
* [`d9d817a`](https://www.github.com/sounisi5011/npm-packages/commit/d9d817a50d120e2dd1207939a7320326ca3981cf) test(encrypted-archive): monitor memory usage of sub-processes instead of test code ([#291](https://www.github.com/sounisi5011/npm-packages/issues/291))
* [`bf9c47f`](https://www.github.com/sounisi5011/npm-packages/commit/bf9c47fa1a757725de66c99eb6716e469b3bac19) test(encrypted-archive): enable the `exactOptionalPropertyTypes` option in `tsconfig.json` ([#282](https://www.github.com/sounisi5011/npm-packages/issues/282))
* [`5854358`](https://www.github.com/sounisi5011/npm-packages/commit/58543587b3cb200a5ee2f5746818a851ebd386e6) fix(encrypted-archive): allow `undefined` in optional properties ([#280](https://www.github.com/sounisi5011/npm-packages/issues/280))
* [`1654602`](https://www.github.com/sounisi5011/npm-packages/commit/1654602f39c434a9a72bb996a3dfd3d454c13e2f) feat(node version): support Node.js v17 ([#273](https://www.github.com/sounisi5011/npm-packages/issues/273))
* [`bd56af3`](https://www.github.com/sounisi5011/npm-packages/commit/bd56af30d33a7aaeffd904c4101518da819f7ef8) chore(deps): update dependency typescript to v4.5.2 ([#267](https://www.github.com/sounisi5011/npm-packages/issues/267))
* [`13c58d0`](https://www.github.com/sounisi5011/npm-packages/commit/13c58d0cfc891160e679890edb894c252ffdfbc9) chore(deps): update dependency @types/jest to v27.0.3 ([#269](https://www.github.com/sounisi5011/npm-packages/issues/269))
* [`2459936`](https://www.github.com/sounisi5011/npm-packages/commit/24599365b57d9984d02883970e4a66142d81b491) test(encrypted-archive): replace `.toThrowWithMessageFixed()` matchers to `.toThrowWithMessage()` matchers ([#246](https://www.github.com/sounisi5011/npm-packages/issues/246))
* [`075a76a`](https://www.github.com/sounisi5011/npm-packages/commit/075a76aa0976886a882ab2437408f9f9be756b59) test(encrypted-archive): introduce `@sounisi5011/jest-binary-data-matchers` ([#245](https://www.github.com/sounisi5011/npm-packages/issues/245))
* [`3d30444`](https://www.github.com/sounisi5011/npm-packages/commit/3d30444c7e8ee0b592fd3e52f73bfd2e83410313) chore(deps): update dependency typescript to v4.4.4 ([#234](https://www.github.com/sounisi5011/npm-packages/issues/234))
* [`9c92c92`](https://www.github.com/sounisi5011/npm-packages/commit/9c92c924f7a10978f7af20944c1d67945ad544a0) chore(deps): update dependency jest-extended to v1 ([#235](https://www.github.com/sounisi5011/npm-packages/issues/235))
* [`81ed2fb`](https://www.github.com/sounisi5011/npm-packages/commit/81ed2fb602d564dbea18c2bd6fed7143ba471043) docs(encrypted-archive): set the background color to the SVG images generated by bytefield-svg ([#242](https://www.github.com/sounisi5011/npm-packages/issues/242))
* [`29a50da`](https://www.github.com/sounisi5011/npm-packages/commit/29a50da8b2419e4435c2c8e1352a4f2900e556a7) chore(deps): update dependency bytefield-svg to v1.6.0 ([#230](https://www.github.com/sounisi5011/npm-packages/issues/230))
* [`3f77eb5`](https://www.github.com/sounisi5011/npm-packages/commit/3f77eb503fcf4b8047955847ec82cab94839781d) chore(deps): update dependency multicodec to v3.2.1 ([#231](https://www.github.com/sounisi5011/npm-packages/issues/231))
* [`34f2b3c`](https://www.github.com/sounisi5011/npm-packages/commit/34f2b3c6337a7738158d32a7e0b808dca1f0a440) chore(deps): update dependency combinate to v1.1.7 ([#219](https://www.github.com/sounisi5011/npm-packages/issues/219))
* [`3cb996b`](https://www.github.com/sounisi5011/npm-packages/commit/3cb996bb5a2b9417f175c27bd36b7fb627c31a0b) chore(deps): update dependency @types/google-protobuf to v3.15.5 ([#217](https://www.github.com/sounisi5011/npm-packages/issues/217))
* [`81728c6`](https://www.github.com/sounisi5011/npm-packages/commit/81728c6ac330ef8ff70c172cc38ff384c94de9d1) chore(deps): update dependency @types/jest to v27 ([#216](https://www.github.com/sounisi5011/npm-packages/issues/216))
* [`613078b`](https://www.github.com/sounisi5011/npm-packages/commit/613078bf2ee61a6d64351d12d95a121397a6fa83) chore(deps): update dependency grpc_tools_node_protoc_ts to v5.3.2 ([#214](https://www.github.com/sounisi5011/npm-packages/issues/214))
* [`05a3468`](https://www.github.com/sounisi5011/npm-packages/commit/05a3468ddf952a43efa9e7bc5380dac66a521efa) chore(deps): update test packages ([#210](https://www.github.com/sounisi5011/npm-packages/issues/210))
* [`628284d`](https://www.github.com/sounisi5011/npm-packages/commit/628284d0ccfcf3d1b5f925648f15364530c7100e) chore(deps): update eslint packages ([#205](https://www.github.com/sounisi5011/npm-packages/issues/205))
* [`5f1838c`](https://www.github.com/sounisi5011/npm-packages/commit/5f1838c9118e02f50e4d1e7fa312d08a61ceb702) chore(deps): update dependency @types/bl to v5.0.2 ([#229](https://www.github.com/sounisi5011/npm-packages/issues/229))
* [`cfc9a3f`](https://www.github.com/sounisi5011/npm-packages/commit/cfc9a3f8500d8bc982613f3cd4e8181de49f3287) build(npm-scripts): use ultra-runner to enable caching in builds ([#202](https://www.github.com/sounisi5011/npm-packages/issues/202))
* [`6b4c328`](https://www.github.com/sounisi5011/npm-packages/commit/6b4c328952df1b79cad869be1ddf88fa00133c80) chore(deps): update dependency @types/argon2-browser to v1.18.1 ([#197](https://www.github.com/sounisi5011/npm-packages/issues/197))
* [`204a644`](https://www.github.com/sounisi5011/npm-packages/commit/204a644ee8890b47abc35b85de745018a4f64e70) chore(deps): update dependency @types/jest to v26.0.24 ([#195](https://www.github.com/sounisi5011/npm-packages/issues/195))
* [`78179cd`](https://www.github.com/sounisi5011/npm-packages/commit/78179cdbd81c87ae507e1295f72a6c55bd2702d2) chore(deps): update dependency @types/google-protobuf to v3.15.3 ([#194](https://www.github.com/sounisi5011/npm-packages/issues/194))
* [`e35e937`](https://www.github.com/sounisi5011/npm-packages/commit/e35e9373a30e46bd14085038ce6684d630ac583a) chore(deps): move the dependencies defined in the project root to within each submodule ([#200](https://www.github.com/sounisi5011/npm-packages/issues/200))
* [`ab068c2`](https://www.github.com/sounisi5011/npm-packages/commit/ab068c217badd8cedb416e982e9d8c52eb894620) chore(deps): change the version range of @sounisi5011/run-if-supported package to `workspace:` range protocol ([#171](https://www.github.com/sounisi5011/npm-packages/issues/171))
* [`9bda859`](https://www.github.com/sounisi5011/npm-packages/commit/9bda859b688d8c1c50344d911bbd41dfc2484907) chore(deps): update dependency multicodec to v3.1.0 ([#165](https://www.github.com/sounisi5011/npm-packages/issues/165))
* [`14a33c5`](https://www.github.com/sounisi5011/npm-packages/commit/14a33c5a825cc0bdfbc89f84cd43b24f1d39bf34) chore(deps): update dependency @types/argon2-browser to v1.18.0 ([#151](https://www.github.com/sounisi5011/npm-packages/issues/151))
* [`cd51338`](https://www.github.com/sounisi5011/npm-packages/commit/cd513388d86b2f4b984556657097d1eae844748e) chore(deps): update dependency grpc_tools_node_protoc_ts to v5.3.0 ([#147](https://www.github.com/sounisi5011/npm-packages/issues/147))

</details>


## [0.0.4](https://www.github.com/sounisi5011/npm-packages/compare/encrypted-archive-v0.0.3...encrypted-archive-v0.0.4) (2021-06-05)

### Bug Fixes

* introduce `@sounisi5011/ts-utils-is-property-accessible` ([#133](https://www.github.com/sounisi5011/npm-packages/issues/133)) ([c88a772](https://www.github.com/sounisi5011/npm-packages/commit/c88a772b3c8327d7c983aefb1f3cdbd3499b5f11))

### Commits

<details><summary>show 10 commits</summary>

* [`f302a5a`](https://www.github.com/sounisi5011/npm-packages/commit/f302a5ab9fe56086701713f01a66cf1cb15fed22) chore(eslint): enable `import/order` rules for `*.ts` files ([#137](https://www.github.com/sounisi5011/npm-packages/issues/137))
* [`c88a772`](https://www.github.com/sounisi5011/npm-packages/commit/c88a772b3c8327d7c983aefb1f3cdbd3499b5f11) fix: introduce `@sounisi5011/ts-utils-is-property-accessible` ([#133](https://www.github.com/sounisi5011/npm-packages/issues/133))
* [`2acdfe5`](https://www.github.com/sounisi5011/npm-packages/commit/2acdfe52b04db041bdf54939b96ee7ccffb044fe) chore(deps): update dependency combinate to v1.1.5 ([#121](https://www.github.com/sounisi5011/npm-packages/issues/121))
* [`e5bde51`](https://www.github.com/sounisi5011/npm-packages/commit/e5bde5108bbdcdc4facd9bfcf602e70bd6592b32) chore(dprint): use the dprint CLI instead of eslint-plugin-dprint ([#116](https://www.github.com/sounisi5011/npm-packages/issues/116))
* [`d9ae618`](https://www.github.com/sounisi5011/npm-packages/commit/d9ae6185db87f2e0fa220e40354d566246debe95) chore(deps): update dependency @sounisi5011/run-if-supported to v1.0.1 ([#115](https://www.github.com/sounisi5011/npm-packages/issues/115))
* [`64c608b`](https://www.github.com/sounisi5011/npm-packages/commit/64c608b59aea94e996e0fbfd0e541e9249d44900) ci(publish): auto convert `README.md` when publishing ([#107](https://www.github.com/sounisi5011/npm-packages/issues/107))
* [`b39315f`](https://www.github.com/sounisi5011/npm-packages/commit/b39315f28efc88512966411183c890ceff3ee6cc) docs: auto update badges included in `README.md` ([#106](https://www.github.com/sounisi5011/npm-packages/issues/106))
* [`b79d71a`](https://www.github.com/sounisi5011/npm-packages/commit/b79d71a50b0dab622bc63b6db2d5c25c73ed5fbc) build(lint-staged): run lint-staged in submodules on commit ([#90](https://www.github.com/sounisi5011/npm-packages/issues/90))
* [`31bba3c`](https://www.github.com/sounisi5011/npm-packages/commit/31bba3ce78612818fa309a6107dacc34309e61d2) chore(eslint): remove eslint-disable comments targeted by the `@typescript-eslint/dot-notation` rule ([#88](https://www.github.com/sounisi5011/npm-packages/issues/88))
* [`f6ac3e1`](https://www.github.com/sounisi5011/npm-packages/commit/f6ac3e1814a68f7490d6920b2ea23edc2a5cfe93) chore: remove `@sounisi5011/scripts--run-if-supported-node` ([#85](https://www.github.com/sounisi5011/npm-packages/issues/85))

</details>


## [0.0.3](https://www.github.com/sounisi5011/npm-packages/compare/encrypted-archive-v0.0.2...encrypted-archive-v0.0.3) (2021-05-22)

### Bug Fixes

* **encrypted-archive:** replace `generator-transform-stream` package with `@sounisi5011/stream-transform-from` package ([#73](https://www.github.com/sounisi5011/npm-packages/issues/73)) ([dce2edc](https://www.github.com/sounisi5011/npm-packages/commit/dce2edcec971222b67cf51e5563ad202c2de8257))

### Commits

<details><summary>show 3 commits</summary>

* [`79a9d57`](https://www.github.com/sounisi5011/npm-packages/commit/79a9d5777c03e760cf796e1f5cff96c59ec4eafa) docs(encrypted-archive): generate example code for Runkit when publishing a package ([#75](https://www.github.com/sounisi5011/npm-packages/issues/75))
* [`dce2edc`](https://www.github.com/sounisi5011/npm-packages/commit/dce2edcec971222b67cf51e5563ad202c2de8257) fix(encrypted-archive): replace `generator-transform-stream` package with `@sounisi5011/stream-transform-from` package ([#73](https://www.github.com/sounisi5011/npm-packages/issues/73))
* [`7230e4e`](https://www.github.com/sounisi5011/npm-packages/commit/7230e4e19cea6ab922eb306fc0e58d6a8f1be4ff) chore(deps): update eslint packages ([#69](https://www.github.com/sounisi5011/npm-packages/issues/69))

</details>


## [0.0.2](https://www.github.com/sounisi5011/npm-packages/compare/encrypted-archive-v0.0.1...encrypted-archive-v0.0.2) (2021-05-18)

### Bug Fixes

* **encrypted-archive:** fix the settings and custom scripts for publishing ([#66](https://www.github.com/sounisi5011/npm-packages/issues/66)) ([4cf93e0](https://www.github.com/sounisi5011/npm-packages/commit/4cf93e0005d7d6e5db00c9e0ac57ec05c40e6eb7))

### Commits

<details><summary>show 1 commits</summary>

* [`4cf93e0`](https://www.github.com/sounisi5011/npm-packages/commit/4cf93e0005d7d6e5db00c9e0ac57ec05c40e6eb7) fix(encrypted-archive): fix the settings and custom scripts for publishing ([#66](https://www.github.com/sounisi5011/npm-packages/issues/66))

</details>


## 0.0.1 (2021-05-18)

### Features

* **encrypted-archive:** create a new package  ([#44](https://www.github.com/sounisi5011/npm-packages/issues/44)) ([b033bb7](https://www.github.com/sounisi5011/npm-packages/commit/b033bb7a9671bd025862ffd7888acaeec422d8d3))

### Commits

<details><summary>show 6 commits</summary>

* [`8786459`](https://github.com/sounisi5011/npm-packages/commit/8786459ad377fb52563a8414a1ebfbc2bd297576) chore(deps): update dependency grpc_tools_node_protoc_ts to v5.2.2 ([#58](https://github.com/sounisi5011/npm-packages/issues/58))
* [`9c36128`](https://github.com/sounisi5011/npm-packages/commit/9c3612893edb4d3fa3b78fe8d278b3327218c9f8) chore(deps): update dependency combinate to v1.1.4 ([#55](https://github.com/sounisi5011/npm-packages/issues/55))
* [`eebe27a`](https://github.com/sounisi5011/npm-packages/commit/eebe27a93ede3f2e42eec590d21e869bddcc6483) chore(deps): update eslint packages ([#42](https://github.com/sounisi5011/npm-packages/issues/42))
* [`df8cbbf`](https://github.com/sounisi5011/npm-packages/commit/df8cbbffd5fac3134a9f5782c157258779a2e198) chore: modify the SemVer range of supported Node.js ([#61](https://github.com/sounisi5011/npm-packages/issues/61))
* [`33bf90a`](https://github.com/sounisi5011/npm-packages/commit/33bf90aec2298fe821871999714a1c8ab19a3624) chore(node): drop support for Node.js 10 ([#59](https://github.com/sounisi5011/npm-packages/issues/59))
* [`b033bb7`](https://github.com/sounisi5011/npm-packages/commit/b033bb7a9671bd025862ffd7888acaeec422d8d3) feat(encrypted-archive): create a new package  ([#44](https://github.com/sounisi5011/npm-packages/issues/44))

</details>