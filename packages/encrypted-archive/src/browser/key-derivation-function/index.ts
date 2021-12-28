import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type { GetKDF } from '../../core/types/key-derivation-function';
import { defaultArgon2Options, isArgon2Options } from '../../core/types/key-derivation-function/argon2';
import { cond, printObject } from '../../core/utils';
import { getArgon2KDF } from './argon2';

const defaultValue = {
    options: defaultArgon2Options,
    getKDF: getArgon2KDF,
};

export const getKDF: GetKDF = options =>
    cond(options)
        .case(isArgon2Options, getArgon2KDF)
        .case(
            (options): options is undefined => options === undefined,
            () => defaultValue.getKDF(defaultValue.options),
        )
        .default((options: never) => {
            if (options && (Object.prototype.hasOwnProperty.call as hasOwnProperty)(options, 'algorithm')) {
                const { algorithm } = options;
                throw new TypeError(
                    `Unknown KDF (Key Derivation Function) algorithm was received: ${
                        printObject(algorithm, { passThroughString: true })
                    }`,
                );
            }
            throw new TypeError(`Unknown deriveKey options was received: ${printObject(options)}`);
        });
