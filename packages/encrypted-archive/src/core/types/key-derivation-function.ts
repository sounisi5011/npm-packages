import type { RequiredExcludeUndefined } from '../utils/type';
import type { Argon2HashFn, Argon2Options } from './key-derivation-function/argon2';

export interface BaseKeyDerivationOptions {
    algorithm: string;
}

export type KeyDerivationOptions = Argon2Options;
export type NormalizedKeyDerivationOptions = RequiredExcludeUndefined<KeyDerivationOptions>;

export interface GetKDFResult<T extends NormalizedKeyDerivationOptions> {
    deriveKey: (
        password: Uint8Array,
        salt: Uint8Array,
        keyLengthBytes: number,
    ) => Promise<Uint8Array>;
    saltLength: number;
    normalizedOptions: T;
}

export interface KDFBuiltinAPIRecord {
    argon2Hash: Argon2HashFn;
}
