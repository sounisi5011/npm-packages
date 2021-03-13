import { expectType } from 'tsd';

import type { hasOwnProperty } from '.';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

const obj1: {
    require: number;
    optional?: number;
    union_undef: number | undefined;
} = { require: 42, union_undef: undefined };

expectType<number>(obj1.require);
expectType<number | undefined>(obj1.optional);
expectType<number | undefined>(obj1.union_undef);

if (hasOwnProp(obj1, 'require')) {
    expectType<number>(obj1.require);

    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.require);
}

if (hasOwnProp(obj1, 'optional')) {
    expectType<number>(obj1.optional);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.union_undef);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.optional);
}

if (hasOwnProp(obj1, 'union_undef')) {
    expectType<number | undefined>(obj1.union_undef);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.union_undef);
}

if (hasOwnProp(obj1, 'nonExistent')) {
    expectType<unknown>(obj1.nonExistent);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
}

/* eslint-disable @typescript-eslint/dot-notation */
// Note: Currently, the `dot-notation` rule for `@typescript-eslint/eslint-plugin@4.17.0` conflicts with TypeScript's `noPropertyAccessFromIndexSignature` option
//       see https://github.com/typescript-eslint/typescript-eslint/issues/3104
// TODO: If `@typescript-eslint/eslint-plugin` supports the `noPropertyAccessFromIndexSignature` option, remove this comment.

const obj2: Record<string, boolean> = {};

expectType<boolean | undefined>(obj2['other']);
if (hasOwnProp(obj2, 'prop')) {
    expectType<boolean>(obj2.prop);

    expectType<boolean | undefined>(obj2['other']);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<boolean | undefined>(obj2['prop']);

    expectType<boolean | undefined>(obj2['other']);
}
