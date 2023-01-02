import type { BaseKeyDerivationOptions, GetKDFResult } from '../key-derivation-function';
import type { RequiredExcludeUndefined } from '../utils';

export const argon2TypeNameList = ['argon2d', 'argon2id'] as const;

export type Argon2Algorithm = (typeof argon2TypeNameList)[number];
export interface Argon2Options extends BaseKeyDerivationOptions {
    algorithm: Argon2Algorithm;
    /**
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
     * @see https://www.password-hashing.net/argon2-specs.pdf#page=5
     * > # 3 Specification of Argon2
     * > ## 3.1 Inputs
     * > * Number of iterations `t` (used to tune the running time independently of the memory size) can be any
     * >   integer number from `1` to `2^32 − 1`;
     */
    iterations?: number | undefined;
    /**
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
     * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
     * > # 3 Specification of Argon2
     * > ## 3.1 Inputs
     * > * Memory size `m` can be any integer number of kilobytes from `8p` to `2^32 − 1`. The actual number of blocks
     * >   is `m′`, which is `m` rounded down to the nearest multiple of `4p`.
     */
    memory?: number | undefined;
    /**
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
     * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
     * > # 3 Specification of Argon2
     * > ## 3.1 Inputs
     * > * Degree of parallelism `p` determines how many independent (but synchronizing) computational chains can
     * >   be run. It may take any integer value from `1` to `2^24 − 1`.
     */
    parallelism?: number | undefined;
}
export type NormalizedArgon2Options = RequiredExcludeUndefined<Argon2Options>;

interface Argon2HashOptions extends NormalizedArgon2Options {
    password: string | Uint8Array;
    salt: Uint8Array;
    hashLength: number;
}
export type Argon2HashFn = (options: Argon2HashOptions) => Promise<Uint8Array>;

export type GetArgon2KDFResult = GetKDFResult<NormalizedArgon2Options>;
