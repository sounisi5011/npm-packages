import { expectAssignable, expectNotAssignable, expectType } from 'tsd';

import type { hasOwnProperty } from '.';

const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

const obj1: {
    require: number;
    optional?: number;
    union_undef: number | undefined;
    optional_union_undef?: boolean | undefined;
} = { require: 42, union_undef: undefined };

expectType<number>(obj1.require);
expectType<number | undefined>(obj1.optional);
expectType<number | undefined>(obj1.union_undef);

if (hasOwnProp(obj1, 'require')) {
    expectType<number>(obj1.require);

    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */

    /**
     * @todo If we found a way to do this, comment out this test:
     *       How to change `obj1` to any type except `never` in the `else` condition of a type guard
     */
    // expectType<number | undefined>(obj1.require);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj1, 'require')) {
    expectType<number>(obj1.require);

    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */

    /**
     * @todo If we found a way to do this, comment out this test:
     *       How to change `obj1` to any type except `never` in the `else` condition of a type guard
     */
    // expectType<number | undefined>(obj1.require);
}

if (hasOwnProp(obj1, 'optional')) {
    expectType<number>(obj1.optional);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.union_undef);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<number | undefined>(obj1.optional);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj1, 'optional')) {
    expectType<number>(obj1.optional);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.union_undef);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<number | undefined>(obj1.optional);
}

if (hasOwnProp(obj1, 'union_undef')) {
    expectType<number | undefined>(obj1.union_undef);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */

    /**
     * @todo If we found a way to do this, comment out this test:
     *       How to change `obj1` to any type except `never` in the `else` condition of a type guard
     */
    // expectType<number | undefined>(obj1.union_undef);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj1, 'union_undef')) {
    expectType<number | undefined>(obj1.union_undef);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<boolean | undefined>(obj1.optional_union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */

    /**
     * @todo If we found a way to do this, comment out this test:
     *       How to change `obj1` to any type except `never` in the `else` condition of a type guard
     */
    // expectType<number | undefined>(obj1.union_undef);
}

if (hasOwnProp(obj1, 'optional_union_undef')) {
    expectType<boolean | undefined>(obj1.optional_union_undef);
    expectAssignable<{
        optional_union_undef: boolean | undefined;
    }>(obj1);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<boolean | undefined>(obj1.optional_union_undef);
    expectNotAssignable<{
        optional_union_undef: boolean | undefined;
    }>(obj1);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj1, 'optional_union_undef')) {
    expectType<boolean | undefined>(obj1.optional_union_undef);
    expectAssignable<{
        optional_union_undef: boolean | undefined;
    }>(obj1);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<boolean | undefined>(obj1.optional_union_undef);
    expectNotAssignable<{
        optional_union_undef: boolean | undefined;
    }>(obj1);
}

if (hasOwnProp(obj1, 'nonExistent')) {
    expectType<unknown>(obj1.nonExistent);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj1, 'nonExistent')) {
    expectType<unknown>(obj1.nonExistent);

    expectType<number>(obj1.require);
    expectType<number | undefined>(obj1.optional);
    expectType<number | undefined>(obj1.union_undef);
}

const obj2: Record<string, boolean> = {};

expectType<boolean | undefined>(obj2['other']);

if (hasOwnProp(obj2, 'prop')) {
    expectType<boolean>(obj2.prop);
    expectType<boolean | undefined>(obj2['other']);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<boolean | undefined>(obj2['prop']);
    expectType<boolean | undefined>(obj2['other']);
}

if ((Object.prototype.hasOwnProperty.call as hasOwnProperty)(obj2, 'prop')) {
    expectType<boolean>(obj2.prop);
    expectType<boolean | undefined>(obj2['other']);
} else {
    /**
     * The `hasOwnProperty()` method checks that the specified object has its own properties.
     * However, it does not check if it has any inherited properties.
     * Even if the `hasOwnProperty()` method returns `false`, there is still a possibility that the specified object has the checked property.
     */
    expectType<boolean | undefined>(obj2['prop']);
    expectType<boolean | undefined>(obj2['other']);
}
