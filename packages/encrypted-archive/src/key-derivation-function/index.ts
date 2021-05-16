import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type { InputDataType } from '../types';
import { cond, printObject } from '../utils';
import type { OverrideProp } from '../utils/type';
import { Argon2Options, defaultOptions as defaultArgon2Options, getArgon2KDF, isArgon2Options } from './argon2';

const defaultValue = {
    options: defaultArgon2Options,
    getKDF: getArgon2KDF,
};
export type DefaultKeyDerivationOptions = OverrideProp<Argon2Options, { algorithm?: undefined }>;

export interface BaseKeyDerivationOptions {
    algorithm: string;
}

type KeyDerivationOptionsWithoutDefault = Argon2Options;
export type KeyDerivationOptions = KeyDerivationOptionsWithoutDefault | DefaultKeyDerivationOptions;
export type NormalizedKeyDerivationOptions = Required<KeyDerivationOptionsWithoutDefault>;

export interface GetKDFResult<T extends NormalizedKeyDerivationOptions> {
    deriveKey: (
        password: InputDataType,
        salt: Uint8Array,
        keyLengthBytes: number,
    ) => Promise<Uint8Array>;
    saltLength: number;
    normalizedOptions: T;
}

export const getKDF = (
    options: Readonly<KeyDerivationOptions> | undefined,
): GetKDFResult<NormalizedKeyDerivationOptions> =>
    cond(options)
        .case(isArgon2Options, getArgon2KDF)
        .case(
            (options): options is (undefined | { algorithm?: undefined }) => !options || !options.algorithm,
            options => {
                const defaultOptions = defaultValue.options;
                const normalizedOptions = { ...defaultOptions, ...options, algorithm: defaultOptions.algorithm };
                return defaultValue.getKDF(normalizedOptions);
            },
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
