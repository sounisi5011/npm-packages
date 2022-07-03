import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type {
    GetKDFResult,
    KDFBuiltinAPIRecord,
    KeyDerivationOptions,
    NormalizedKeyDerivationOptions,
} from '../types/key-derivation-function';
import { cond, printObject } from '../utils';
import { defaultOptions as defaultArgon2Options, getArgon2KDF, isArgon2Options } from './argon2';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const defaultGetKDF = (builtin: KDFBuiltinAPIRecord) => getArgon2KDF(builtin.argon2Hash)(defaultArgon2Options);

export const getKDF = (
    builtin: KDFBuiltinAPIRecord,
    options: Readonly<KeyDerivationOptions> | undefined,
): GetKDFResult<NormalizedKeyDerivationOptions> =>
    cond(options)
        .case(isArgon2Options, getArgon2KDF(builtin.argon2Hash))
        .case(
            (options): options is undefined => options === undefined,
            () => defaultGetKDF(builtin),
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
