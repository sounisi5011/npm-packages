import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type { GetKDF } from '../../core/types/key-derivation-function';
import { defaultArgon2Options, isArgon2Options } from '../../core/types/key-derivation-function/argon2';
import { cond, passThroughString } from '../../core/utils';
import type { BuiltinInspectRecord } from '../../types/builtin';
import { createGetArgon2KDF } from './argon2';

const defaultValue = {
    options: defaultArgon2Options,
    createGetKDF: createGetArgon2KDF,
};

export function createGetKDF(builtin: BuiltinInspectRecord): GetKDF {
    return options =>
        cond(options)
            .case(isArgon2Options, createGetArgon2KDF(builtin))
            .case(
                (options): options is undefined => options === undefined,
                () => defaultValue.createGetKDF(builtin)(defaultValue.options),
            )
            .default((options: never) => {
                if (options && (Object.prototype.hasOwnProperty.call as hasOwnProperty)(options, 'algorithm')) {
                    const { algorithm } = options;
                    throw new TypeError(
                        `Unknown KDF (Key Derivation Function) algorithm was received: ${
                            passThroughString(builtin.inspect, algorithm)
                        }`,
                    );
                }
                throw new TypeError(`Unknown deriveKey options was received: ${builtin.inspect(options)}`);
            });
}
