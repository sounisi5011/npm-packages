import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

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
    deriveKey: (password: string | Buffer, salt: Uint8Array, keyLengthBytes: number) => Promise<{
        key: Uint8Array;
        normalizedOptions: T;
    }>;
    saltLength: number;
}

export function getKDF(
    options: Readonly<KeyDerivationOptions> | undefined,
): GetKDFResult<NormalizedKeyDerivationOptions> {
    if (options && isArgon2Options(options)) return getArgon2KDF(options);
    if (!options || !options.algorithm) {
        const normalizedOptions = { ...defaultValue.options, ...options, algorithm: defaultValue.options.algorithm };
        return defaultValue.getKDF(normalizedOptions);
    }

    if (options && (Object.prototype.hasOwnProperty.call as hasOwnProperty)(options, 'algorithm')) {
        // @ts-expect-error Property 'algorithm' does not exist on type 'never'.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new TypeError(`Unknown KDF (Key Derivation Function) algorithm was received: ${options.algorithm}`);
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new TypeError(`Unknown deriveKey options was received: ${options}`);
}
