import argon2 from 'argon2-browser';

import type { BaseKeyDerivationOptions, GetKDFResult } from '.';
import { bufferFrom, printObject } from '../utils';
import type { objectEntries } from '../utils/type';

const argon2TypeRecord = {
    argon2d: argon2.ArgonType.Argon2d,
    argon2id: argon2.ArgonType.Argon2id,
};
const argon2TypeMap = new Map((Object.entries as objectEntries)(argon2TypeRecord).map(([k, type]) => [k, { type }]));
const typeNameList = [...argon2TypeMap.keys()];

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

export function isArgon2Options<T extends (Partial<BaseKeyDerivationOptions> | undefined)>(
    options: T,
): options is T extends Argon2Options ? T : never {
    if (options === undefined) return false;
    for (const type of typeNameList) {
        if (options.algorithm === type) return true;
    }
    return false;
}

export function getArgon2KDF(options: Readonly<Argon2Options>): GetKDFResult<NormalizedArgon2Options> {
    const normalizedOptions = { ...defaultOptions, ...options };

    const foundType = argon2TypeMap.get(normalizedOptions.algorithm);
    if (!foundType) {
        throw new TypeError(
            `Invalid Argon2 type received: ${printObject(normalizedOptions.algorithm, { passThroughString: true })}`,
        );
    }

    return {
        deriveKey: async (password, salt, keyLengthBytes) =>
            (await argon2.hash({
                pass: bufferFrom(password),
                salt,
                time: normalizedOptions.iterations,
                mem: normalizedOptions.memory,
                hashLen: keyLengthBytes,
                parallelism: normalizedOptions.parallelism,
                type: foundType.type,
            })).hash,
        saltLength: SALT_LEN,
        normalizedOptions,
    };
}
