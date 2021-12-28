import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';

import type { BaseKeyDerivationOptions } from '.';
import type { RequiredExcludeUndefined } from '../../utils/type';

const argon2AlgorithmList = ['argon2d', 'argon2id'] as const;

type Argon2Algorithm = (typeof argon2AlgorithmList)[number];
export interface Argon2Options extends BaseKeyDerivationOptions<Argon2Algorithm> {
    /**
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
     * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
     * > # 3 Specification of Argon2
     * > ## 3.1 Inputs
     * > * Degree of parallelism `p` determines how many independent (but synchronizing) computational chains can
     * >   be run. It may take any integer value from `1` to `2^24 − 1`.
     */
    parallelism?: number | undefined;
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
     * @see https://www.password-hashing.net/argon2-specs.pdf#page=5
     * > # 3 Specification of Argon2
     * > ## 3.1 Inputs
     * > * Number of iterations `t` (used to tune the running time independently of the memory size) can be any
     * >   integer number from `1` to `2^32 − 1`;
     */
    iterations?: number | undefined;
}
export type NormalizedArgon2Options = RequiredExcludeUndefined<Argon2Options>;

export const defaultArgon2Options: NormalizedArgon2Options = {
    algorithm: 'argon2d',
    iterations: 3,
    memory: 12,
    parallelism: 1,
};

export function isArgon2Options<T>(options: T): options is T extends Argon2Options ? T : never {
    if (!isPropAccessible(options) || typeof options !== 'object') return false;
    const { algorithm } = options;
    for (const type of argon2AlgorithmList) {
        if (algorithm === type) return true;
    }
    return false;
}
