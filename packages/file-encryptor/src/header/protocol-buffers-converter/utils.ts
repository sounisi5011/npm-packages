import { getPropFromValue, printObject } from '../../utils';
import type { Cond2, Nullable, OneOrMoreReadonlyArray } from '../../utils/type';

function reportNonDefinedField(opts: { fieldName: string; dataName: string }): never {
    throw new Error(`${opts.fieldName} field in ${opts.dataName} is not defined`);
}

export function validateNumberField(
    value: Nullable<number>,
    exists: boolean,
    opts: { fieldName: string; dataName: string },
): number {
    if (!exists || typeof value !== 'number') reportNonDefinedField(opts);
    return value;
}

export function validateBytesField(
    value: Uint8Array,
    exists: boolean,
    opts: { fieldName: string; dataName: string },
): Uint8Array {
    if (!exists) reportNonDefinedField(opts);
    return value;
}

export function createEnum2value<TValue>(): (
    <TEnumKey extends string, TEnum>(enumRecord: Record<TEnumKey, TEnum>) => (
        <TEnum2 extends TEnum, TValue2 extends TValue>(
            /**
             * Type checking asserts that all enum combinations are specified
             * @see https://stackoverflow.com/a/60132060/4907315
             */
            pair:
                & OneOrMoreReadonlyArray<readonly [TEnum2, TValue2]>
                & Cond2<{
                    cond1: {
                        actual: TEnum2;
                        expected: TEnum;
                        onlyMatch: 'Invalid: All value types must be specified';
                    };
                    cond2: {
                        actual: TValue2;
                        expected: TValue;
                        onlyMatch: 'Invalid: All Enum type values must be specified';
                    };
                    allMatch: unknown;
                    notAllMatch: 'Invalid: All Enum type values and all value types must be specified';
                }>,
        ) => {
            enum2value: (
                enumItem: Nullable<TEnum2>,
                exists: boolean,
                opts: { fieldName: string; dataName: string },
            ) => TValue2;
            value2enum: (value: TValue2) => TEnum2;
        }
    )
) {
    return enumRecord =>
        pair => {
            const enum2valueMap = new Map(pair.map(([e, v]) => [e, { data: v }]));
            const value2enumMap = new Map(pair.map(([e, v]) => [v, { data: e }]));

            type TEnum2 = (typeof enum2valueMap) extends Map<infer U, unknown> ? U : never;
            const isEnumType = enum2valueMap.has.bind(enum2valueMap) as (value: unknown) => value is TEnum2;

            return {
                enum2value: (enumItem, exists, { fieldName, dataName }) => {
                    if (!exists || (!isEnumType(enumItem) && (enumItem === undefined || enumItem === null))) {
                        reportNonDefinedField({ fieldName, dataName });
                    }
                    const value = enum2valueMap.get(enumItem);
                    if (value) return value.data;
                    throw new Error(
                        `The value in the ${fieldName} field in the ${dataName} is unknown.`
                            + ` Received: ${getPropFromValue(enumRecord, enumItem) ?? printObject(enumItem)}`,
                    );
                },
                value2enum: value => {
                    const enumItem = value2enumMap.get(value);
                    if (enumItem) return enumItem.data;
                    throw new Error(`Unknown Argon2 algorithm received: ${printObject(value)}`);
                },
            };
        };
}
