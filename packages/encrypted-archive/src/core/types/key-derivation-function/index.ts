import type { RequiredExcludeUndefined } from '../utils';
import type { Argon2Options } from './argon2';

export interface BaseKeyDerivationOptions<TAlgorithm extends string> {
    algorithm: TAlgorithm;
}
export type KeyDerivationOptions = Argon2Options;
export type NormalizedKeyDerivationOptions = RequiredExcludeUndefined<KeyDerivationOptions>;

export type GetKDF = (options: Readonly<KeyDerivationOptions> | undefined) => KDFData<NormalizedKeyDerivationOptions>;
export interface KDFData<TNormalizedOptions extends NormalizedKeyDerivationOptions> {
    deriveKey: (
        password: Uint8Array,
        salt: Uint8Array,
        keyLengthBytes: number,
    ) => Promise<Uint8Array>;
    saltLength: number;
    normalizedOptions: TNormalizedOptions;
}
