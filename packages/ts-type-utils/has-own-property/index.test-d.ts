import { expectType } from 'tsd';

import type { hasOwnProperty } from '.';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

const obj1: {
    require: number;
    optional?: number;
    union_undef: number | undefined;
} = { require: 42, union_undef: undefined };

if (hasOwnProp(obj1, 'require')) {
    expectType<number>(obj1.require);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.require);
}

if (hasOwnProp(obj1, 'optional')) {
    expectType<number>(obj1.optional);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.optional);
}

if (hasOwnProp(obj1, 'union_undef')) {
    expectType<number | undefined>(obj1.union_undef);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<number | undefined>(obj1.union_undef);
}

if (hasOwnProp(obj1, 'nonExistent')) {
    expectType<unknown>(obj1.nonExistent);
}

const obj2: Record<string, boolean> = {};

if (hasOwnProp(obj2, 'prop')) {
    expectType<boolean>(obj2.prop);
} else {
    // Note: The `hasOwnProperty()` method checks that the specified object has its own properties.
    //       However, it does not check if it has any inherited properties.
    //       Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
    expectType<boolean | undefined>(obj2.prop);
}
