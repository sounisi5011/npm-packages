import argon2 from 'argon2-browser';

import type { BaseKeyDerivationOptions, GetKDFResult } from '.';

const typeNameList = ['argon2d', 'argon2id'] as const;

export type Argon2Algorithm = (typeof typeNameList)[number];
export interface Argon2Options extends BaseKeyDerivationOptions {
    algorithm: Argon2Algorithm;
    iterations?: number;
    memory?: number;
    parallelism?: number;
}
export type NormalizedArgon2Options = Required<Argon2Options>;

export const defaultOptions: NormalizedArgon2Options = {
    algorithm: 'argon2d',
    iterations: 3,
    memory: 12,
    parallelism: 1,
};

/**
 * > 9 Recommended parameters
 * > 5. Select the salt length. 128 bits is sufficient for all applications, but can be reduced to 64 bits in the case
 * >    of space constraints.
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.ory.sh/choose-recommended-argon2-parameters-password-hashing/
 */
const SALT_LEN = 128 / 8;

export function isArgon2Options<T extends Partial<BaseKeyDerivationOptions>>(
    options: T,
): options is T extends Argon2Options ? T : never {
    for (const type of typeNameList) {
        if (options.algorithm === type) return true;
    }
    return false;
}

export function getArgon2KDF(options: Readonly<Argon2Options>): GetKDFResult<NormalizedArgon2Options> {
    const normalizedOptions = { ...defaultOptions, ...options };

    let type: argon2.ArgonType;
    if (normalizedOptions.algorithm === 'argon2d') {
        type = argon2.ArgonType.Argon2d;
    } else if (normalizedOptions.algorithm === 'argon2id') {
        type = argon2.ArgonType.Argon2id;
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new TypeError(`Invalid Argon2 type received: ${normalizedOptions.algorithm}`);
    }

    return {
        async deriveKey(password, salt, keyLengthBytes) {
            const { hash: key } = await argon2.hash({
                pass: password,
                salt,
                time: normalizedOptions.iterations,
                mem: normalizedOptions.memory,
                hashLen: keyLengthBytes,
                parallelism: normalizedOptions.parallelism,
                type,
            });
            return { key, normalizedOptions };
        },
        saltLength: SALT_LEN,
    };
}
