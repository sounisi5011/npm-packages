import argon2 from 'argon2';

import type { Argon2HashFn } from '../argon2';

const typeRecord = {
    argon2d: argon2.argon2d,
    argon2id: argon2.argon2id,
} as const;

const argon2Hash: Argon2HashFn = async options => {
    return await argon2.hash(options.password, {
        salt: Buffer.from(options.salt),
        timeCost: options.iterations,
        memoryCost: options.memory,
        hashLength: options.hashLength,
        parallelism: options.parallelism,
        type: typeRecord[options.algorithm],
        raw: true,
    });
};

export { argon2Hash };
