# Supported runtime

## Node.js

_This table is used for [forward compatibility testing](../tests/compatibility.ts). So it will always be updated._

| `@sounisi5011/encrypted-archive` version range | Supported Node.js version range | Details |
|-|-|-|
| `> 0.1.0` | `*` | |
| `<= 0.1.0` | `< 18.1.0` | The `argon2-browser` in dependencies [does not work with Node.js 18.1.0 or later](https://github.com/antelle/argon2-browser/issues/81). |
