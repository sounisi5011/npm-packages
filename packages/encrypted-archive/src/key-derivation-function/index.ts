import { cond, printObject } from '../utils';
import { Argon2Options, defaultOptions as defaultArgon2Options, getArgon2KDF, isArgon2Options } from './argon2';

import type { InputDataType } from '../types';
import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

const defaultValue = {
    options: defaultArgon2Options,
    getKDF: getArgon2KDF,
};

export interface BaseKeyDerivationOptions {
    algorithm: string;
}

export type KeyDerivationOptions = Argon2Options;
export type NormalizedKeyDerivationOptions = Required<KeyDerivationOptions>;

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
