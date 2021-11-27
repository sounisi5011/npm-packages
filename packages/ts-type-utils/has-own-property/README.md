# @sounisi5011/ts-type-util-has-own-property

[![Go to the latest release page on npm](https://img.shields.io/npm/v/@sounisi5011/ts-type-util-has-own-property.svg)](https://www.npmjs.com/package/@sounisi5011/ts-type-util-has-own-property)

Fix the type definition of the [`Object.prototype.hasOwnProperty()`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty) method.

## Installation

```sh
npm install @sounisi5011/ts-type-util-has-own-property
```

```sh
yarn add @sounisi5011/ts-type-util-has-own-property
```

```sh
pnpm add @sounisi5011/ts-type-util-has-own-property
```

## Usage

```ts
import { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

if (hasOwnProp(object, 'propertyName')) {
    // `object.propertyName` is available!
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(object, 'propertyName')) {
    // `object.propertyName` is available!
}
```

### Optional property

If an object has an optional property, it should not contain the type `undefined`.
The `hasOwnProperty` type removes the undef type that is implicitly added from the value of an optional property.

```ts
import { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

// ----- //

interface Obj {
    prop?: string;
}

const obj: Obj = {};

if (hasOwnProp(obj, 'prop')) {
    // `obj.prop` is `string` type.
    // Not `string | undefined` type!
}
```

#### Optional property for union types with `undefined`

Since TypeScript 4.4, when [the `exactOptionalPropertyTypes` option](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes) is enabled, [optional properties are no longer union types by default](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html#exact-optional-property-types---exactoptionalpropertytypes).
In this case, it is possible to specify the union type with `undefined` type as an optional property.
The `hasOwnProperty` type will not remove the `undefined` type of a union type whose `undefined` type has been explicitly specified.

```ts
import { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

// ----- //

interface Obj {
    prop?: string | undefined;
}

const obj: Obj = {};

if (hasOwnProp(obj, 'prop')) {
    // If the `exactOptionalPropertyTypes` option is true, `obj.prop` is `string | undefined` type.
    // If the `exactOptionalPropertyTypes` option is false, `obj.prop` is `string` type.
}
```

### Union type property with `undefined`

If it is not an optional property, the `undefined` type should not be removed.
The `hasOwnProperty` type properly distinguishes between optional properties and the union types of other properties.

```ts
import { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

// ----- //

interface Obj {
    prop: string | undefined;
}

const obj: Obj = { prop: undefined };

if (hasOwnProp(obj, 'prop')) {
    // `obj.prop` is `string | undefined` type.
    // Not `string` type!
}
```

### Non-existent property

We sometimes want to check for the existence of properties whose types are not defined.
The `hasOwnProperty` type assumes that the value of a non-existent property is of type `unknown`.

```ts
import { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

// ----- //

const obj = {};

if (hasOwnProp(obj, 'hoge')) {
    // `obj.hoge` is `unknown` type.
}
```
