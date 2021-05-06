import { getPropFromValue, printObject } from '../../utils';
import type { Cond2, OneOrMoreReadonlyArray } from '../../utils/type';

export function validateNumberField(value: number, opts: { fieldName: string; dataName: string }): number {
    if (value < 1) {
        throw new Error(`${opts.fieldName} field in ${opts.dataName} is not defined or zero value`);
    }
    return value;
}

export function validateBytesField(value: Uint8Array, opts: { fieldName: string; dataName: string }): Uint8Array {
    if (value.byteLength < 1) {
        throw new Error(`${opts.fieldName} field in ${opts.dataName} is not defined or zero length`);
    }
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
            enum2value: (enumItem: TEnum, opts: { fieldName: string; dataName: string }) => TValue;
            value2enum: (value: TValue) => TEnum;
        }
    )
);
export function createEnum2value<TValue>(): (
    <TEnumKey extends string, TEnum>(enumRecord: Record<TEnumKey, TEnum>) => (
        (pair: ReadonlyArray<readonly [TEnum, TValue]>) => {
            enum2value: (enumItem: TEnum, opts: { fieldName: string; dataName: string }) => TValue;
            value2enum: (value: TValue) => TEnum;
        }
    )
) {
    return enumRecord =>
        pair => {
            const enum2valueMap = new Map(pair.map(([e, v]) => [e, { data: v }]));
            const value2enumMap = new Map(pair.map(([e, v]) => [v, { data: e }]));

            return {
                enum2value: (enumItem, { fieldName, dataName }) => {
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
