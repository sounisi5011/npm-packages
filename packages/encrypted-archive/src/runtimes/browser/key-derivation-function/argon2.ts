import { ArgonType, hash } from 'argon2-browser';

import type { Argon2HashFn } from '../../../core/types/key-derivation-function/argon2';

const typeRecord = {
    argon2d: ArgonType.Argon2d,
    argon2id: ArgonType.Argon2id,
} as const;

export const argon2Hash: Argon2HashFn = async options => {
    const result = await hash({
        pass: options.password,
        salt: options.salt,
        time: options.iterations,
        mem: options.memory,
        hashLen: options.hashLength,
        parallelism: options.parallelism,
        type: typeRecord[options.algorithm],
    });
    return result.hash;
};
