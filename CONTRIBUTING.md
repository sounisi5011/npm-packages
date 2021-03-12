# Contributing

## Short Rules

* MUST NOT commit to the `main` branch.
* MUST NOT merge locally into the `main` branch. MUST use Pull Request.
* MUST NOT use "merge commit" or "Rebase and merge". MUST use "Squash and merge".
* Pull Request titles MUST comply with [Conventional Commits spec].
* git commit message SHOULD follow [Conventional Commits spec].
* If you make a fix that changes behavior (feature addition, bug fix, etc), you MUST add a test codes that fails before the fixes and succeeds after the fixes.

[Conventional Commits spec]: https://www.conventionalcommits.org/

## Developing

### Brunch Workflow

We use [GitHub Flow](https://guides.github.com/introduction/flow/).

### Versioning

We use [Semantic Versioning](https://semver.org/).

### Requirement

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.js.org/)

### Setup

```sh
$ git clone https://github.com/sounisi5011/npm-packages.git
$ cd ./npm-packages/
$ pnpm install
```

### Running linting/tests

#### Lint & Test

```sh
$ pnpm test
```

#### Lint

```sh
$ pnpm run lint
```

#### Test

```sh
$ pnpm run test:unit-test
```

#### Format

```sh
$ pnpm run fmt
```

##### Format only `*.json` and `*.yaml`

```sh
$ pnpm run fmt:config
```

##### Format only `package.json`

```sh
$ pnpm run fmt:pkg
```

##### Format only `*.js` and `*.ts`

```sh
$ pnpm run fmt:xs
```
