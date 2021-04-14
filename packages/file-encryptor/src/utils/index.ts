import { inspect } from 'util';

import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type { objectEntries } from './type';

export const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;

export function getPropFromValue<T extends string, U>(rec: Record<T, U>, value: U): T | null {
    const findEntry = (Object.entries as objectEntries)(rec).find(([, val]) => val === value);
    return findEntry ? findEntry[0] : null;
}

export function number2hex(template: TemplateStringsArray, ...substitutions: number[]): string {
    return template
        .map((str, index) => {
            if (index === 0) return str;
            const value = substitutions[index - 1];
            if (typeof value === 'number') return `0x${value.toString(16).toUpperCase()}${str}`;
            return String(value) + str;
        })
        .join('');
}

export function printObject(value: unknown): string {
    return inspect(value, { breakLength: Infinity });
}
