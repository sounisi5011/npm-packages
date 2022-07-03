import type { RequiredExcludeUndefined } from '../../utils/type';
import type { BaseKeyDerivationOptions, GetKDFResult } from '../key-derivation-function';

export const argon2TypeNameList = ['argon2d', 'argon2id'] as const;

export type Argon2Algorithm = (typeof argon2TypeNameList)[number];
export interface Argon2Options extends BaseKeyDerivationOptions {
    algorithm: Argon2Algorithm;
    iterations?: number | undefined;
    memory?: number | undefined;
    parallelism?: number | undefined;
}
export type NormalizedArgon2Options = RequiredExcludeUndefined<Argon2Options>;

interface Argon2HashOptions extends NormalizedArgon2Options {
    password: string | Buffer;
    salt: Uint8Array;
    hashLength: number;
}
export type Argon2HashFn = (options: Argon2HashOptions) => Promise<Uint8Array>;

export type GetArgon2KDFResult = GetKDFResult<NormalizedArgon2Options>;
