import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

export const hasOwnProp = Object.prototype.hasOwnProperty.call as hasOwnProperty;
